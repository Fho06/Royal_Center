import { NextResponse } from "next/server";
import { getPool, sql } from "@/lib/db";
import jwt from "jsonwebtoken";
import crypto from "crypto";

/* ---------- AUTH ---------- */
function getUserFromRequest(req: Request) {
  const auth = req.headers.get("authorization");
  if (!auth) return null;

  try {
    return jwt.verify(auth.replace("Bearer ", ""), process.env.JWT_SECRET!) as {
      userId: number;
    };
  } catch {
    return null;
  }
}

/* ---------- ORDER NUMBER ---------- */
/**
 * Public order number format: RC-######## (8 digits)
 * Example: RC-38492017
 */
function generateOrderNumber() {
  const prefix = "RC";

  const min = 10_000_000;
  const max = 99_999_999;
  const rand = crypto.randomInt(min, max + 1);

  return `${prefix}-${rand}`;
}

/* ===============================
   GET /api/orders
   USER ORDER HISTORY (NO DRAFTS)
   =============================== */
export async function GET(req: Request) {
  try {
    const user = getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");

    const pool = await getPool();
    const request = pool.request().input("user_id", sql.Int, user.userId);

    let whereClause = `
      WHERE o.user_id = @user_id
      AND o.status NOT IN ('pending_payment', 'draft')
    `;

    if (status && status !== "all") {
      request.input("status", sql.VarChar, status);
      whereClause += " AND o.status = @status";
    }

    const result = await request.query(`
      SELECT
        o.order_number,
        o.total_amount,
        o.status,
        s.label AS status_label,
        o.created_at,
        u.phone
      FROM orders o
      JOIN order_statuses s ON s.code = o.status
      JOIN users u ON u.user_id = o.user_id
      ${whereClause}
      ORDER BY o.created_at DESC
    `);

    return NextResponse.json({ orders: result.recordset });
  } catch (err) {
    console.error("Orders fetch error:", err);
    return NextResponse.json({ error: "Failed to fetch orders" }, { status: 500 });
  }
}

/* ===============================
   POST /api/orders
   CREATE REAL ORDER
   =============================== */
export async function POST(req: Request) {
  try {
    const user = getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const {
      items,
      address_id,
      fulfillment_type = "delivery",
      tip_amount = 0,
      payment_method = "pagomovil",
      notes = null,
    } = await req.json();

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "No items provided" }, { status: 400 });
    }

    if (!["delivery", "pickup"].includes(fulfillment_type)) {
      return NextResponse.json({ error: "Invalid fulfillment type" }, { status: 400 });
    }

    if (fulfillment_type === "delivery" && !address_id) {
      return NextResponse.json(
        { error: "Address required for delivery" },
        { status: 400 }
      );
    }

    const TAX_RATE = 0.16;
    const pool = await getPool();
    const tx = new sql.Transaction(pool);
    await tx.begin();

    try {
      /* ===============================
         GET LATEST EXCHANGE RATE (USD → BS)
         =============================== */
      const rateRes = await tx.request().query(`
        SELECT TOP 1 rate_bs
        FROM exchange_rates
        WHERE currency = 'USD'
        ORDER BY rate_date DESC, created_at DESC
      `);

      if (rateRes.recordset.length === 0) {
        throw new Error("Exchange rate not available");
      }

      const exchangeRate = Number(rateRes.recordset[0].rate_bs);
      let address: any = null;

      /* ===============================
         VALIDATE ADDRESS (DELIVERY ONLY)
         =============================== */
      if (fulfillment_type === "delivery") {
        const addressRes = await tx
          .request()
          .input("address_id", sql.Int, address_id)
          .input("user_id", sql.Int, user.userId)
          .query(`
            SELECT *
            FROM user_addresses
            WHERE address_id = @address_id
              AND user_id = @user_id
          `);

        if (addressRes.recordset.length === 0) {
          throw new Error("Invalid address");
        }

        address = addressRes.recordset[0];
      }

      let subtotal = 0;
      let taxAmount = 0;

      /* ===============================
         VALIDATE ITEMS + TOTALS
         =============================== */
      for (const item of items) {
        const res = await tx
          .request()
          .input("id", sql.VarChar, item.item_id)
          .query(`
            SELECT price_usd, stock, is_tax_exempt
            FROM items
            WHERE id = @id
          `);

        if (res.recordset.length === 0) {
          throw new Error("Item not found");
        }

        const dbItem = res.recordset[0];

        if (item.quantity > dbItem.stock) {
          throw new Error("Insufficient stock");
        }

        const lineSubtotal = dbItem.price_usd * item.quantity;
        subtotal += lineSubtotal;

        if (!dbItem.is_tax_exempt) {
          taxAmount += lineSubtotal * TAX_RATE;
        }
      }

      const totalBs = subtotal * exchangeRate;

      const MAX_TRIES = 5;
      let orderNumber = "";

      for (let i = 0; i < MAX_TRIES; i++) {
        orderNumber = generateOrderNumber();

        try {
          /* ===============================
             CREATE ORDER
             =============================== */
          const orderRes = await tx
            .request()
            .input("user_id", sql.Int, user.userId)
            .input("order_number", sql.VarChar(30), orderNumber)
            .input("subtotal", sql.Decimal(12, 2), subtotal)
            .input("tax", sql.Decimal(12, 2), taxAmount)
            .input("total", sql.Decimal(12, 2), totalBs)
            .input("address_id", sql.Int, address_id ?? null)
            .input("fulfillment_type", sql.VarChar, fulfillment_type)
            .input("tip_amount", sql.Decimal(12, 2), tip_amount)
            .input("payment_method", sql.VarChar, payment_method)
            .input("notes", sql.NVarChar(sql.MAX), notes)
            .query(`
              INSERT INTO orders (
                user_id,
                order_number,
                subtotal,
                tax_amount,
                total_amount,
                address_id,
                fulfillment_type,
                tip_amount,
                payment_method,
                notes,
                status
              )
              OUTPUT INSERTED.id
              VALUES (
                @user_id,
                @order_number,
                @subtotal,
                @tax,
                @total,
                @address_id,
                @fulfillment_type,
                @tip_amount,
                @payment_method,
                @notes,
                'pending_payment'
              )
            `);

          const orderId = orderRes.recordset[0].id;

          /* ===============================
             SNAPSHOT ITEMS
             =============================== */
          for (const item of items) {
            const itemRes = await tx
              .request()
              .input("id", sql.VarChar, item.item_id)
              .query(`
                SELECT price_usd, is_tax_exempt
                FROM items
                WHERE id = @id
              `);

            const dbItem = itemRes.recordset[0];

            await tx
              .request()
              .input("order_id", sql.Int, orderId)
              .input("item_id", sql.VarChar, item.item_id)
              .input("quantity", sql.Int, item.quantity)
              .input("price", sql.Decimal(10, 2), dbItem.price_usd)
              .input("is_tax_exempt", sql.Bit, dbItem.is_tax_exempt)
              .input("tax_rate", sql.Decimal(5, 4), 0)
              .query(`
                INSERT INTO order_items (
                  order_id,
                  item_id,
                  quantity,
                  price,
                  is_tax_exempt,
                  tax_rate
                )
                VALUES (
                  @order_id,
                  @item_id,
                  @quantity,
                  @price,
                  @is_tax_exempt,
                  @tax_rate
                )
              `);
          }

          /* ===============================
             SNAPSHOT ADDRESS (DELIVERY ONLY, NON-BLOCKING)
             =============================== */
          if (address) {
            try {
              await tx
                .request()
                .input("order_id", sql.Int, orderId)
                .input("label", sql.VarChar, address.label)
                .input("address_1", sql.VarChar, address.address_1)
                .input("address_2", sql.VarChar, address.address_2)
                .input("country", sql.VarChar, address.country)
                .input("state", sql.VarChar, address.state)
                .input("city", sql.VarChar, address.city)
                .input("municipio", sql.VarChar, address.municipio)
                .query(`
                  INSERT INTO order_addresses (
                    order_id,
                    label,
                    address_1,
                    address_2,
                    country,
                    state,
                    city,
                    municipio
                  )
                  VALUES (
                    @order_id,
                    @label,
                    @address_1,
                    @address_2,
                    @country,
                    @state,
                    @city,
                    @municipio
                  )
                `);
            } catch (e) {
              console.warn("Order address snapshot failed:", e);
            }
          }

          await tx.commit();

          return NextResponse.json({
            orderId,
            order_number: orderNumber,
          });
        } catch (e: any) {
          const msg = String(e?.message || "");
          const num = Number(e?.number);
          const isUniqueViolation =
            num === 2601 ||
            num === 2627 ||
            msg.includes("UNIQUE") ||
            msg.includes("duplicate");

          if (!isUniqueViolation) throw e;
          // else retry
        }
      }

      throw new Error("Failed to generate unique order number. Please retry.");
    } catch (err) {
      await tx.rollback();
      throw err;
    }
  } catch (err: any) {
    console.error("Order create error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to create order" },
      { status: 500 }
    );
  }
}

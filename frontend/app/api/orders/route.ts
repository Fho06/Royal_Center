import { NextResponse } from "next/server";
import { getPool, sql } from "@/lib/db";
import jwt from "jsonwebtoken";

/* ---------- AUTH ---------- */
function getUserFromRequest(req: Request) {
  const auth = req.headers.get("authorization");
  if (!auth) return null;

  try {
    return jwt.verify(
      auth.replace("Bearer ", ""),
      process.env.JWT_SECRET!
    ) as { userId: number; role?: string };
  } catch {
    return null;
  }
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
    const request = pool
      .request()
      .input("user_id", sql.Int, user.userId);

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
        o.id,
        o.total_amount,
        o.status,
        s.label AS status_label,
        o.created_at
      FROM orders o
      JOIN order_statuses s ON s.code = o.status
      ${whereClause}
      ORDER BY o.created_at DESC
    `);

    return NextResponse.json({ orders: result.recordset });
  } catch (err) {
    console.error("Orders fetch error:", err);
    return NextResponse.json(
      { error: "Failed to fetch orders" },
      { status: 500 }
    );
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

    const { items } = await req.json();
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "No items provided" },
        { status: 400 }
      );
    }

    const TAX_RATE = 0.16;

    const pool = await getPool();
    const tx = new sql.Transaction(pool);
    await tx.begin();

    try {
      let subtotal = 0;
      let taxAmount = 0;

      // 1️⃣ Validate + calculate totals
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

      const totalAmount = subtotal + taxAmount;

      // 2️⃣ Create order
      const orderRes = await tx
        .request()
        .input("user_id", sql.Int, user.userId)
        .input("subtotal", sql.Decimal(10, 2), subtotal)
        .input("tax", sql.Decimal(10, 2), taxAmount)
        .input("total", sql.Decimal(10, 2), totalAmount)
        .query(`
          INSERT INTO orders (
            user_id,
            subtotal,
            tax_amount,
            total_amount,
            status
          )
          OUTPUT INSERTED.id
          VALUES (
            @user_id,
            @subtotal,
            @tax,
            @total,
            'pending_payment'
          )
        `);

      const orderId = orderRes.recordset[0].id;

      // 3️⃣ Snapshot order items
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
          .input(
            "tax_rate",
            sql.Decimal(5, 4),
            dbItem.is_tax_exempt ? 0 : TAX_RATE
          )
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

      await tx.commit();
      return NextResponse.json({ orderId });
    } catch (err) {
      await tx.rollback();
      throw err;
    }
  } catch (err) {
    console.error("Order create error:", err);
    return NextResponse.json(
      { error: "Failed to create order" },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { getPool, sql } from "@/lib/db";
import jwt from "jsonwebtoken";

function getUserFromRequest(req: Request) {
  const auth = req.headers.get("authorization");
  if (!auth) return null;

  const token = auth.replace("Bearer ", "");
  try {
    return jwt.verify(token, process.env.JWT_SECRET!) as {
      userId: number;
      role?: string;
    };
  } catch {
    return null;
  }
}

/* ===============================
   GET /api/orders
   Supports ?status=
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

    let whereClause = "WHERE o.user_id = @user_id";

    if (status) {
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

    const pool = await getPool();
    const tx = new sql.Transaction(pool);
    await tx.begin();

    try {
      let total = 0;

      /* ---------- VALIDATE + CALCULATE ---------- */
      for (const item of items) {
        const priceRes = await tx
          .request()
          .input("id", sql.VarChar, item.item_id)
          .query(`
            SELECT price_usd, stock
            FROM items
            WHERE id = @id
          `);

        if (priceRes.recordset.length === 0) {
          throw new Error("Item not found");
        }

        const dbItem = priceRes.recordset[0];

        if (item.quantity > dbItem.stock) {
          throw new Error("Insufficient stock");
        }

        total += dbItem.price_usd * item.quantity;
      }

      /* ---------- CREATE ORDER ---------- */
      const orderRes = await tx
        .request()
        .input("user_id", sql.Int, user.userId)
        .input("total", sql.Decimal(10, 2), total)
        .query(`
          INSERT INTO orders (user_id, total_amount, status)
          OUTPUT INSERTED.id
          VALUES (@user_id, @total, 'pending_payment')
        `);

      const orderId = orderRes.recordset[0].id;

      /* ---------- INSERT ITEMS + UPDATE STOCK ---------- */
      for (const item of items) {
        const priceRes = await tx
          .request()
          .input("id", sql.VarChar, item.item_id)
          .query(`
            SELECT price_usd
            FROM items
            WHERE id = @id
          `);

        const price = priceRes.recordset[0].price_usd;

        await tx
          .request()
          .input("order_id", sql.Int, orderId)
          .input("item_id", sql.VarChar, item.item_id)
          .input("quantity", sql.Int, item.quantity)
          .input("price", sql.Decimal(10, 2), price)
          .query(`
            INSERT INTO order_items (order_id, item_id, quantity, price)
            VALUES (@order_id, @item_id, @quantity, @price)
          `);

        await tx
          .request()
          .input("id", sql.VarChar, item.item_id)
          .input("qty", sql.Int, item.quantity)
          .query(`
            UPDATE items
            SET stock = stock - @qty
            WHERE id = @id
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
      { error: "Failed to place order" },
      { status: 500 }
    );
  }
}

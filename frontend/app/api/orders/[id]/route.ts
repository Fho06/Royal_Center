import { NextResponse } from "next/server";
import { getPool, sql } from "@/lib/db";
import jwt from "jsonwebtoken";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    /* ---------- AUTH ---------- */
    const auth = req.headers.get("authorization");
    if (!auth) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const token = auth.replace("Bearer ", "");
    const user = jwt.verify(token, process.env.JWT_SECRET!) as {
      userId: number;
    };

    /* ---------- PARAM ---------- */
    const { id } = await params;
    const orderId = Number(id);

    if (!Number.isFinite(orderId)) {
      return NextResponse.json(
        { error: "Invalid order id" },
        { status: 400 }
      );
    }

    /* ---------- DB ---------- */
    const pool = await getPool();

    /* ---------- ORDER ---------- */
    const orderRes = await pool
      .request()
      .input("id", sql.Int, orderId)
      .input("user_id", sql.Int, user.userId)
      .query(`
        SELECT
          o.id,
          o.total_amount,
          o.status,
          s.label AS status_label,
          o.created_at
        FROM orders o
        JOIN order_statuses s
          ON s.code = o.status
        WHERE o.id = @id
          AND o.user_id = @user_id
      `);

    if (orderRes.recordset.length === 0) {
      return NextResponse.json(
        { error: "Order not found" },
        { status: 404 }
      );
    }

    /* ---------- ITEMS ---------- */
    const itemsRes = await pool
      .request()
      .input("order_id", sql.Int, orderId)
      .query(`
        SELECT
          i.name,
          oi.quantity,
          oi.price
        FROM order_items oi
        JOIN items i
          ON i.id = oi.item_id
        WHERE oi.order_id = @order_id
      `);

    return NextResponse.json({
      order: orderRes.recordset[0],
      items: itemsRes.recordset,
    });
  } catch (err) {
    console.error("Order detail error:", err);
    return NextResponse.json(
      { error: "Failed to load order" },
      { status: 500 }
    );
  }
}

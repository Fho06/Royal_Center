import { NextResponse } from "next/server";
import { getPool, sql } from "@/lib/db";
import jwt from "jsonwebtoken";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ orderNumber: string }> }
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

    /* ---------- PARAM (Next 16 FIX) ---------- */
    const { orderNumber } = await params;

    if (!orderNumber) {
      return NextResponse.json(
        { error: "Invalid order number" },
        { status: 400 }
      );
    }

    /* ---------- DB ---------- */
    const pool = await getPool();

    /* ---------- ORDER (OWNERSHIP) ---------- */
    const orderRes = await pool
      .request()
      .input("order_number", sql.VarChar, orderNumber)
      .input("user_id", sql.Int, user.userId)
      .query(`
        SELECT
          o.order_number,
          o.subtotal,
          o.tip_amount,
          o.delivery_fee,
          o.total_amount,
          o.status,
          s.label AS status_label,
          o.created_at,
          CONVERT(
            varchar(33),
            o.created_at AT TIME ZONE 'UTC'
                        AT TIME ZONE 'SA Western Standard Time',
            126
          ) AS created_at_ve
        FROM orders o
        JOIN order_statuses s
          ON s.code = o.status
        WHERE o.order_number = @order_number
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
      .input("order_number", sql.VarChar, orderNumber)
      .query(`
        SELECT
          i.name,
          oi.quantity,
          oi.price
        FROM order_items oi
        JOIN items i
          ON i.id = oi.item_id
        JOIN orders o
          ON o.id = oi.order_id
        WHERE o.order_number = @order_number
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

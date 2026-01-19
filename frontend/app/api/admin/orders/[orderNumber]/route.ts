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
      .query(`
        SELECT
          o.order_number,

          /* USER */
          u.phone,
          u.email,
          CONCAT(
            COALESCE(u.first_name, ''),
            ' ',
            COALESCE(u.last_name, '')
          ) AS customer_name,

          /* ORDER */
          o.status,
          s.label AS status_label,
          o.payment_method,
          o.fulfillment_type,
          o.notes,

          /* MONEY */
          o.subtotal,
          o.tax_amount,
          o.tip_amount,
          o.delivery_fee,
          o.total_amount,

          /* ADDRESS (nullable) */
          a.address_1,
          a.address_2,
          a.city,
          a.state,
          a.country,

          /* DATES */
          o.created_at,
          CONVERT(
            varchar(33),
            o.created_at AT TIME ZONE 'UTC'
                        AT TIME ZONE 'SA Western Standard Time',
            126
          ) AS created_at_ve

        FROM orders o
        LEFT JOIN users u
          ON u.user_id = o.user_id
        LEFT JOIN user_addresses a
          ON a.address_id = o.address_id
        LEFT JOIN order_statuses s
          ON s.code = o.status

        WHERE o.order_number = @order_number
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

import { NextResponse } from "next/server";
import { getPool, sql } from "@/lib/db";
import jwt from "jsonwebtoken";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const auth = req.headers.get("authorization");
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const token = auth.replace("Bearer ", "");
  const user = jwt.verify(token, process.env.JWT_SECRET!) as any;

  const pool = await getPool();

  const order = await pool
    .request()
    .input("id", sql.Int, Number(params.id))
    .input("user_id", sql.Int, user.userId)
    .query(`
      SELECT id, total_amount, created_at
      FROM orders
      WHERE id = @id AND user_id = @user_id
    `);

  if (order.recordset.length === 0) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  const items = await pool
    .request()
    .input("order_id", sql.Int, Number(params.id))
    .query(`
      SELECT i.name, oi.quantity, oi.price
      FROM order_items oi
      JOIN items i ON i.id = oi.item_id
      WHERE oi.order_id = @order_id
    `);

  return NextResponse.json({
    order: order.recordset[0],
    items: items.recordset,
  });
}

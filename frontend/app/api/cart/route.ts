import { NextResponse } from "next/server";
import { getPool, sql } from "@/lib/db";
import jwt from "jsonwebtoken";

function getUser(req: Request) {
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

export async function GET(req: Request) {
  const user = getUser(req);
  if (!user) return NextResponse.json({ items: [] });

  const pool = await getPool();

  const res = await pool
    .request()
    .input("user_id", sql.Int, user.userId)
    .query(`
      SELECT
        ci.item_id,
        i.name,
        i.price_usd AS price,
        ci.quantity
      FROM cart_items ci
      JOIN items i ON i.id = ci.item_id
      WHERE ci.user_id = @user_id
    `);

  return NextResponse.json({ items: res.recordset });
}

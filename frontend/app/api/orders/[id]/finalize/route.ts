import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { getPool, sql } from "@/lib/db";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = req.headers.get("authorization");
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = jwt.verify(
    auth.replace("Bearer ", ""),
    process.env.JWT_SECRET!
  ) as { userId: number };

  const { id } = await params;
  const orderId = Number(id);

  const pool = await getPool();
  const tx = new sql.Transaction(pool);

  try {
    await tx.begin();

    // Lock order
    await tx
      .request()
      .input("id", sql.Int, orderId)
      .input("user_id", sql.Int, user.userId)
      .query(`
        UPDATE orders
        SET status = 'pending_payment'
        WHERE id = @id AND user_id = @user_id AND status = 'draft'
      `);

    // Deduct stock here (SAFE)
    await tx
      .request()
      .input("order_id", sql.Int, orderId)
      .query(`
        UPDATE items
        SET stock = stock - oi.quantity
        FROM order_items oi
        WHERE items.id = oi.item_id
          AND oi.order_id = @order_id
      `);

    await tx.commit();
    return NextResponse.json({ success: true });
  } catch {
    await tx.rollback();
    return NextResponse.json(
      { error: "Failed to finalize order" },
      { status: 500 }
    );
  }
}

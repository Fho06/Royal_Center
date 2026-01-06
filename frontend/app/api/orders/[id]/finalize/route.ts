import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { getPool, sql } from "@/lib/db";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const auth = req.headers.get("authorization");
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = jwt.verify(
    auth.replace("Bearer ", ""),
    process.env.JWT_SECRET!
  ) as { userId: number };

  const orderId = Number(id);
  if (!Number.isFinite(orderId)) {
    return NextResponse.json({ error: "Invalid order id" }, { status: 400 });
  }

  const pool = await getPool();
  const tx = new sql.Transaction(pool);

  try {
    await tx.begin();

    /* ---------- FETCH PHONE TO SNAPSHOT ---------- */
    const phoneRes = await tx
      .request()
      .input("user_id", sql.Int, user.userId)
      .query(`
        SELECT phone
        FROM users
        WHERE id = @user_id
      `);

    if (phoneRes.recordset.length === 0) {
      throw new Error("User not found");
    }

    const phone = phoneRes.recordset[0].phone;

    /* ---------- LOCK ORDER + SNAPSHOT PHONE ---------- */
    const updateRes = await tx
      .request()
      .input("id", sql.Int, orderId)
      .input("user_id", sql.Int, user.userId)
      .input("phone", sql.VarChar, phone)
      .query(`
        UPDATE orders
        SET
          status = 'pending_payment',
          phone_snapshot = @phone
        WHERE id = @id
          AND user_id = @user_id
          AND status = 'draft'
      `);

    if (updateRes.rowsAffected[0] === 0) {
      throw new Error("Order not in draft state");
    }

    /* ---------- DEDUCT STOCK ---------- */
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

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

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const user = getUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const orderId = Number(params.id);
  const pool = await getPool();
  const tx = new sql.Transaction(pool);
  await tx.begin();

  try {
    const itemsRes = await tx
      .request()
      .input("order_id", sql.Int, orderId)
      .query(`
        SELECT oi.item_id, oi.quantity, i.stock
        FROM order_items oi
        JOIN items i ON i.id = oi.item_id
        WHERE oi.order_id = @order_id
      `);

    for (const item of itemsRes.recordset) {
      if (item.quantity > item.stock) {
        throw new Error("Insufficient stock");
      }

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

    await tx
      .request()
      .input("id", sql.Int, orderId)
      .query(`
        UPDATE orders
        SET status = 'pending_payment'
        WHERE id = @id
      `);

    await tx.commit();
    return NextResponse.json({ success: true });
  } catch (err) {
    await tx.rollback();
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 400 }
    );
  }
}

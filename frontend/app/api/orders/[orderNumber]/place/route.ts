import { NextResponse } from "next/server";
import { getPool, sql } from "@/lib/db";
import jwt from "jsonwebtoken";

/* ===============================
   AUTH HELPER
   =============================== */
function getUser(req: Request) {
  const auth = req.headers.get("authorization");
  if (!auth) return null;

  try {
    return jwt.verify(
      auth.replace("Bearer ", ""),
      process.env.JWT_SECRET!
    ) as { userId: number };
  } catch {
    return null;
  }
}

/* ===============================
   POST /api/orders/[orderNumber]/place
   =============================== */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ orderNumber: string }> }
) {
  const { orderNumber } = await params;

  if (!orderNumber) {
    return NextResponse.json(
      { error: "Invalid order number" },
      { status: 400 }
    );
  }

  const user = getUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const pool = await getPool();
  const tx = new sql.Transaction(pool);
  await tx.begin();

  try {
    /* ---------- RESOLVE ORDER (OWNERSHIP CHECK) ---------- */
    const orderRes = await tx
      .request()
      .input("order_number", sql.VarChar, orderNumber)
      .input("user_id", sql.Int, user.userId)
      .query(`
        SELECT id
        FROM orders
        WHERE order_number = @order_number
          AND user_id = @user_id
      `);

    if (orderRes.recordset.length === 0) {
      throw new Error("Order not found");
    }

    const orderId = orderRes.recordset[0].id;

    /* ---------- LOAD ORDER ITEMS ---------- */
    const itemsRes = await tx
      .request()
      .input("order_id", sql.Int, orderId)
      .query(`
        SELECT
          oi.item_id,
          oi.quantity,
          i.stock
        FROM order_items oi
        JOIN items i ON i.id = oi.item_id
        WHERE oi.order_id = @order_id
      `);

    if (itemsRes.recordset.length === 0) {
      throw new Error("Order has no items");
    }

    /* ---------- VALIDATE + DEDUCT STOCK ---------- */
    for (const item of itemsRes.recordset) {
      if (item.quantity > item.stock) {
        throw new Error("Insufficient stock");
      }

      await tx
        .request()
        .input("item_id", sql.VarChar, item.item_id)
        .input("qty", sql.Int, item.quantity)
        .query(`
          UPDATE items
          SET stock = stock - @qty
          WHERE id = @item_id
        `);
    }

    /* ---------- UPDATE ORDER STATUS ---------- */
    await tx
      .request()
      .input("order_id", sql.Int, orderId)
      .query(`
        UPDATE orders
        SET status = 'pending_payment'
        WHERE id = @order_id
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

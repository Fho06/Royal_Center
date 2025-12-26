import { NextResponse } from "next/server";
import { getPool, sql } from "@/lib/db";
import jwt from "jsonwebtoken";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = req.headers.get("authorization");
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = jwt.verify(
    auth.replace("Bearer ", ""),
    process.env.JWT_SECRET!
  ) as { userId: number };

  const { id } = await params;
  const orderId = Number(id);
  const { items } = await req.json();

  if (!Array.isArray(items)) {
    return NextResponse.json({ error: "Invalid items" }, { status: 400 });
  }

  const pool = await getPool();
  const tx = new sql.Transaction(pool);

  try {
    await tx.begin();

    // Verify ownership + draft status
    const orderRes = await tx
      .request()
      .input("id", sql.Int, orderId)
      .input("user_id", sql.Int, user.userId)
      .query(`
        SELECT status
        FROM orders
        WHERE id = @id AND user_id = @user_id
      `);

    if (
      orderRes.recordset.length === 0 ||
      orderRes.recordset[0].status !== "draft"
    ) {
      await tx.rollback();
      return NextResponse.json(
        { error: "Order is not editable" },
        { status: 409 }
      );
    }

    // Remove old items
    await tx
      .request()
      .input("order_id", sql.Int, orderId)
      .query(`DELETE FROM order_items WHERE order_id = @order_id`);

    let total = 0;

    // Insert new items
    for (const item of items) {
      const priceRes = await tx
        .request()
        .input("id", sql.VarChar, item.item_id)
        .query(`SELECT price_usd FROM items WHERE id = @id`);

      const price = priceRes.recordset[0].price_usd;
      total += price * item.quantity;

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
    }

    // Update total
    await tx
      .request()
      .input("total", sql.Decimal(10, 2), total)
      .input("order_id", sql.Int, orderId)
      .query(`
        UPDATE orders
        SET total_amount = @total
        WHERE id = @order_id
      `);

    await tx.commit();
    return NextResponse.json({ success: true });
  } catch {
    await tx.rollback();
    return NextResponse.json(
      { error: "Failed to update order" },
      { status: 500 }
    );
  }
}

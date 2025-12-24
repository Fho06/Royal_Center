import { NextResponse } from "next/server";
import { getPool, sql } from "@/lib/db";
import jwt from "jsonwebtoken";

export const runtime = "nodejs";

function getUserId(req: Request) {
  const auth = req.headers.get("authorization");
  if (!auth) return null;

  const token = auth.split(" ")[1];
  const payload = jwt.verify(token, process.env.JWT_SECRET!) as any;
  return payload.userId;
}

export async function POST(req: Request) {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { items } = await req.json();
    if (!items || items.length === 0) {
      return NextResponse.json(
        { error: "No items" },
        { status: 400 }
      );
    }

    const pool = await getPool();
    const tx = new sql.Transaction(pool);

    await tx.begin();

    const orderResult = await tx
      .request()
      .input("user_id", sql.Int, userId)
      .query(`
        INSERT INTO orders (user_id, total_amount)
        OUTPUT INSERTED.id
        VALUES (@user_id, 0)
      `);

    const orderId = orderResult.recordset[0].id;
    let total = 0;

    for (const item of items) {
      const priceRes = await tx
        .request()
        .input("id", sql.VarChar, item.item_id)
        .query(`
          SELECT price_usd
          FROM items
          WHERE id = @id
        `);

      const price = priceRes.recordset[0].price_usd;
      total += price * item.quantity;

      await tx.request()
        .input("order_id", sql.Int, orderId)
        .input("item_id", sql.VarChar, item.item_id)
        .input("quantity", sql.Int, item.quantity)
        .input("price", sql.Decimal(10, 2), price)
        .query(`
          INSERT INTO order_items
          (order_id, item_id, quantity, price)
          VALUES (@order_id, @item_id, @quantity, @price)
        `);
    }

    await tx.request()
      .input("total", sql.Decimal(10, 2), total)
      .input("id", sql.Int, orderId)
      .query(`
        UPDATE orders
        SET total_amount = @total
        WHERE id = @id
      `);

    await tx.commit();

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Order error:", err);
    return NextResponse.json(
      { error: "Order failed" },
      { status: 500 }
    );
  }
}

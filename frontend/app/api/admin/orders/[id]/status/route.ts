import { NextResponse } from "next/server";
import { getPool, sql } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    requireAdmin(req);

    const { id } = await params;
    const { status: newStatus } = await req.json();

    if (!newStatus) {
      return NextResponse.json(
        { error: "Missing status" },
        { status: 400 }
      );
    }

    const pool = await getPool();
    const tx = new sql.Transaction(pool);
    await tx.begin();

    try {
      // 1️⃣ Fetch current status
      const currentRes = await tx
        .request()
        .input("id", sql.Int, Number(id))
        .query(`
          SELECT status
          FROM orders
          WHERE id = @id
        `);

      if (currentRes.recordset.length === 0) {
        throw new Error("Order not found");
      }

      const currentStatus = currentRes.recordset[0].status;

      // 2️⃣ Deduct stock ONLY when transitioning → order_placed
      if (
        currentStatus !== "order_placed" &&
        newStatus === "order_placed"
      ) {
        await tx.request().input("order_id", sql.Int, Number(id)).query(`
          UPDATE i
          SET i.stock = i.stock - oi.quantity
          FROM items i
          JOIN order_items oi ON oi.item_id = i.id
          WHERE oi.order_id = @order_id
        `);
      }

      // 3️⃣ Restore stock ONLY if cancelling an already placed order
      if (
        currentStatus === "order_placed" &&
        newStatus === "cancelled"
      ) {
        await tx.request().input("order_id", sql.Int, Number(id)).query(`
          UPDATE i
          SET i.stock = i.stock + oi.quantity
          FROM items i
          JOIN order_items oi ON oi.item_id = i.id
          WHERE oi.order_id = @order_id
        `);
      }

      // 4️⃣ Update order status
      await tx
        .request()
        .input("id", sql.Int, Number(id))
        .input("status", sql.VarChar, newStatus)
        .query(`
          UPDATE orders
          SET status = @status
          WHERE id = @id
        `);

      await tx.commit();
      return NextResponse.json({ success: true });
    } catch (err) {
      await tx.rollback();
      throw err;
    }
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Unauthorized" },
      { status: err.message === "Unauthorized" ? 401 : 500 }
    );
  }
}

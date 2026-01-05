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
    const orderId = Number(id);

    if (!Number.isFinite(orderId)) {
      return NextResponse.json(
        { error: "Invalid order id" },
        { status: 400 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const newStatus = body?.status as string | undefined;

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
      /* ---------- FETCH CURRENT STATUS ---------- */
      const currentRes = await tx
        .request()
        .input("id", sql.Int, orderId)
        .query(`
          SELECT status
          FROM orders
          WHERE id = @id
        `);

      if (currentRes.recordset.length === 0) {
        throw new Error("Order not found");
      }

      const currentStatus = currentRes.recordset[0].status;

      /* ---------- VALIDATE NEW STATUS EXISTS ---------- */
      const statusRes = await tx
        .request()
        .input("code", sql.VarChar, newStatus)
        .query(`
          SELECT is_terminal
          FROM order_statuses
          WHERE code = @code
        `);

      if (statusRes.recordset.length === 0) {
        return NextResponse.json(
          { error: "Invalid status" },
          { status: 400 }
        );
      }

      const newIsTerminal = statusRes.recordset[0].is_terminal;

      /* ---------- BLOCK CHANGES FROM TERMINAL STATES ---------- */
      const currentTerminalRes = await tx
        .request()
        .input("code", sql.VarChar, currentStatus)
        .query(`
          SELECT is_terminal
          FROM order_statuses
          WHERE code = @code
        `);

      if (
        currentTerminalRes.recordset[0]?.is_terminal === 1
      ) {
        return NextResponse.json(
          { error: "Cannot change a terminal order" },
          { status: 400 }
        );
      }

      /* ---------- STOCK LOGIC ---------- */
      if (
        currentStatus !== "order_placed" &&
        newStatus === "order_placed"
      ) {
        const stockCheck = await tx
          .request()
          .input("order_id", sql.Int, orderId)
          .query(`
            SELECT i.id
            FROM items i
            JOIN order_items oi ON oi.item_id = i.id
            WHERE oi.order_id = @order_id
              AND i.stock < oi.quantity
          `);

        if (stockCheck.recordset.length > 0) {
          throw new Error("Insufficient stock");
        }

        await tx
          .request()
          .input("order_id", sql.Int, orderId)
          .query(`
            UPDATE i
            SET i.stock = i.stock - oi.quantity
            FROM items i
            JOIN order_items oi ON oi.item_id = i.id
            WHERE oi.order_id = @order_id
          `);
      }

      if (
        currentStatus === "order_placed" &&
        (newStatus === "cancelled" || newStatus === "refunded")
      ) {
        await tx
          .request()
          .input("order_id", sql.Int, orderId)
          .query(`
            UPDATE i
            SET i.stock = i.stock + oi.quantity
            FROM items i
            JOIN order_items oi ON oi.item_id = i.id
            WHERE oi.order_id = @order_id
          `);
      }

      /* ---------- UPDATE STATUS ---------- */
      await tx
        .request()
        .input("id", sql.Int, orderId)
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
    let status = 500;

    if (err?.message === "Unauthorized") status = 401;
    else if (err?.message === "Forbidden") status = 403;
    else if (err?.message === "Order not found") status = 404;
    else if (err?.message?.includes("stock")) status = 409;

    return NextResponse.json(
      { error: err?.message || "Failed to update order status" },
      { status }
    );
  }
}

import { NextResponse } from "next/server";
import { getPool, sql } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ paymentId: string }> }
) {
  let admin;
  try {
    admin = requireAdmin(req);
  } catch (e: any) {
    const msg = e?.message;
    return NextResponse.json(
      { error: msg === "FORBIDDEN" ? "Forbidden" : "Unauthorized" },
      { status: msg === "FORBIDDEN" ? 403 : 401 }
    );
  }

  const { paymentId } = await params;
  const id = Number(paymentId);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: "Invalid payment id" }, { status: 400 });
  }

  const { note } = await req.json().catch(() => ({ note: null }));

  const pool = await getPool();
  const tx = new sql.Transaction(pool);

  try {
    await tx.begin();

    const payRes = await new sql.Request(tx)
      .input("id", sql.Int, id)
      .query(`
        SELECT id, order_id, status
        FROM dbo.payments WITH (UPDLOCK, ROWLOCK)
        WHERE id = @id
      `);

    if (payRes.recordset.length === 0) {
      await tx.rollback();
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    const payment = payRes.recordset[0];
    if (payment.status !== "submitted") {
      await tx.rollback();
      return NextResponse.json(
        { error: `Payment is not submitted (current: ${payment.status})` },
        { status: 409 }
      );
    }

    await new sql.Request(tx)
      .input("id", sql.Int, id)
      .input("admin_id", sql.Int, admin.userId)
      .input("note", sql.VarChar, note ?? null)
      .query(`
        UPDATE dbo.payments
        SET status = 'rejected',
            reviewed_by = @admin_id,
            reviewed_at = SYSUTCDATETIME(),
            review_note = @note
        WHERE id = @id
      `);

    await new sql.Request(tx)
      .input("order_id", sql.Int, payment.order_id)
      .query(`
        UPDATE dbo.orders
        SET status = 'pending_payment'
        WHERE id = @order_id
      `);

    await tx.commit();

    return NextResponse.json({ message: "Payment rejected", order_id: payment.order_id });
  } catch {
    try { await tx.rollback(); } catch {}
    return NextResponse.json({ error: "Failed to reject payment" }, { status: 500 });
  }
}

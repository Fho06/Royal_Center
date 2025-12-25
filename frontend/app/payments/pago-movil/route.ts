import { NextResponse } from "next/server";
import { getPool, sql } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

type Body = {
  order_id: number;
  receiving_account_id?: number; // optional
  sender_bank: string;
  reference_number: string;
  amount: number;
  phone_last4?: string;
};

export async function POST(req: Request) {
  let user;
  try {
    user = requireAuth(req);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const {
    order_id,
    receiving_account_id,
    sender_bank,
    reference_number,
    amount,
    phone_last4,
  } = body;

  if (!order_id || !sender_bank || !reference_number || amount == null) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 }
    );
  }

  // basic validation (no assumptions about exact formats)
  if (String(reference_number).trim().length < 4) {
    return NextResponse.json({ error: "Invalid reference number" }, { status: 400 });
  }

  const pool = await getPool();
  const tx = new sql.Transaction(pool);

  try {
    await tx.begin();

    // 1) Verify order ownership + status
    const orderRes = await new sql.Request(tx)
      .input("order_id", sql.Int, order_id)
      .input("user_id", sql.Int, user.userId)
      .query(`
        SELECT id, user_id, total_amount, status
        FROM dbo.orders
        WHERE id = @order_id AND user_id = @user_id
      `);

    if (orderRes.recordset.length === 0) {
      await tx.rollback();
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const order = orderRes.recordset[0];

    // Require correct state
    if (order.status !== "pending_payment") {
      await tx.rollback();
      return NextResponse.json(
        { error: `Order is not pending payment (current: ${order.status})` },
        { status: 409 }
      );
    }

    // 2) Amount must match order total exactly (your current totals are DECIMAL, so keep it strict)
    const orderTotal = Number(order.total_amount);
    const submittedAmount = Number(amount);

    if (Number.isNaN(submittedAmount) || submittedAmount <= 0) {
      await tx.rollback();
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }

    if (submittedAmount !== orderTotal) {
      await tx.rollback();
      return NextResponse.json(
        { error: "Amount mismatch with order total" },
        { status: 400 }
      );
    }

    // 3) Insert payment proof
    // Unique constraint on (method, reference_number) will enforce uniqueness.
    const insertRes = await new sql.Request(tx)
      .input("order_id", sql.Int, order_id)
      .input("user_id", sql.Int, user.userId)
      .input("method", sql.VarChar, "pago_movil")
      .input("receiving_account_id", sql.Int, receiving_account_id ?? null)
      .input("sender_bank", sql.VarChar, sender_bank.trim())
      .input("reference_number", sql.VarChar, reference_number.trim())
      .input("amount", sql.Decimal(18, 2), submittedAmount)
      .input("phone_last4", sql.VarChar, phone_last4?.trim() ?? null)
      .query(`
        INSERT INTO dbo.payments
          (order_id, user_id, method, receiving_account_id, sender_bank, reference_number, amount, phone_last4, status)
        OUTPUT INSERTED.id
        VALUES
          (@order_id, @user_id, @method, @receiving_account_id, @sender_bank, @reference_number, @amount, @phone_last4, 'submitted')
      `);

    const paymentId = insertRes.recordset[0].id;

    // 4) Update order status to under_review
    await new sql.Request(tx)
      .input("order_id", sql.Int, order_id)
      .query(`
        UPDATE dbo.orders
        SET status = 'under_review'
        WHERE id = @order_id
      `);

    await tx.commit();

    return NextResponse.json({
      message: "Payment submitted for review",
      payment_id: paymentId,
      order_id,
      new_order_status: "under_review",
    });
  } catch (err: any) {
    try { await tx.rollback(); } catch {}

    // Handle duplicate reference constraint
    const msg = String(err?.message ?? "");
    if (msg.toLowerCase().includes("ux_payments_reference_method")) {
      return NextResponse.json(
        { error: "Reference number already used" },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: "Failed to submit payment" },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { getPool, sql } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

type Body = {
  order_number: string;
  receiving_account_id?: number;
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
    order_number,
    receiving_account_id,
    sender_bank,
    reference_number,
    amount,
    phone_last4,
  } = body;

  if (!order_number || !sender_bank || !reference_number || amount == null) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 }
    );
  }

  if (String(reference_number).trim().length < 4) {
    return NextResponse.json(
      { error: "Invalid reference number" },
      { status: 400 }
    );
  }

  const pool = await getPool();
  const tx = new sql.Transaction(pool);

  try {
    await tx.begin();

    /* --------------------------------------------------
       1) Resolve order + verify ownership + status
       -------------------------------------------------- */
    const orderRes = await new sql.Request(tx)
      .input("order_number", sql.VarChar, order_number)
      .input("user_id", sql.Int, user.userId)
      .query(`
        SELECT id, total_amount, status
        FROM dbo.orders
        WHERE order_number = @order_number
          AND user_id = @user_id
      `);

    if (orderRes.recordset.length === 0) {
      await tx.rollback();
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const order = orderRes.recordset[0];
    const orderId = order.id;

    if (order.status !== "pending_payment") {
      await tx.rollback();
      return NextResponse.json(
        { error: `Order is not pending payment (current: ${order.status})` },
        { status: 409 }
      );
    }

    /* --------------------------------------------------
       2) Prevent duplicate payment submissions
       -------------------------------------------------- */
    const existingPayment = await new sql.Request(tx)
      .input("order_id", sql.Int, orderId)
      .query(`
        SELECT 1
        FROM dbo.payments
        WHERE order_id = @order_id
          AND status IN ('submitted', 'approved')
      `);

    if (existingPayment.recordset.length > 0) {
      await tx.rollback();
      return NextResponse.json(
        { error: "Payment already submitted for this order" },
        { status: 409 }
      );
    }

    /* --------------------------------------------------
       3) Validate amount
       -------------------------------------------------- */
    const orderTotal = Number(order.total_amount);
    const submittedAmount = Number(amount);

    if (!Number.isFinite(submittedAmount) || submittedAmount <= 0) {
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

    /* --------------------------------------------------
       4) Insert payment (snapshot order_number)
       -------------------------------------------------- */
    const insertRes = await new sql.Request(tx)
      .input("order_id", sql.Int, orderId)
      .input("order_number", sql.VarChar, order_number)
      .input("user_id", sql.Int, user.userId)
      .input("method", sql.VarChar, "pago_movil")
      .input("receiving_account_id", sql.Int, receiving_account_id ?? null)
      .input("sender_bank", sql.VarChar, sender_bank.trim())
      .input("reference_number", sql.VarChar, reference_number.trim())
      .input("amount", sql.Decimal(18, 2), submittedAmount)
      .input("phone_last4", sql.VarChar, phone_last4?.trim() ?? null)
      .query(`
        INSERT INTO dbo.payments
          (order_id, order_number, user_id, method, receiving_account_id, sender_bank, reference_number, amount, phone_last4, status)
        OUTPUT INSERTED.id
        VALUES
          (@order_id, @order_number, @user_id, @method, @receiving_account_id, @sender_bank, @reference_number, @amount, @phone_last4, 'submitted')
      `);

    const paymentId = insertRes.recordset[0].id;

    /* --------------------------------------------------
       5) Move order → under_review
       -------------------------------------------------- */
    await new sql.Request(tx)
      .input("order_id", sql.Int, orderId)
      .query(`
        UPDATE dbo.orders
        SET status = 'under_review'
        WHERE id = @order_id
      `);

    await tx.commit();

    return NextResponse.json({
      message: "Payment submitted for review",
      payment_id: paymentId,
      order_number,
      new_order_status: "under_review",
    });
  } catch (err: any) {
    try {
      await tx.rollback();
    } catch {}

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

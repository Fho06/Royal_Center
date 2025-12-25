import { NextResponse } from "next/server";
import { getPool, sql } from "@/lib/db";
import { requireAdmin } from "@//lib/auth";

export async function GET(req: Request) {
  try {
    requireAdmin(req);
  } catch (e: any) {
    const msg = e?.message;
    return NextResponse.json(
      { error: msg === "FORBIDDEN" ? "Forbidden" : "Unauthorized" },
      { status: msg === "FORBIDDEN" ? 403 : 401 }
    );
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") ?? "submitted";

  const pool = await getPool();
  const res = await pool
    .request()
    .input("status", sql.VarChar, status)
    .query(`
      SELECT
        p.id, p.order_id, p.user_id, p.method, p.sender_bank, p.reference_number,
        p.amount, p.phone_last4, p.status, p.submitted_at,
        o.total_amount, o.status AS order_status, o.created_at AS order_created_at,
        u.email
      FROM dbo.payments p
      JOIN dbo.orders o ON o.id = p.order_id
      JOIN dbo.users u ON u.id = p.user_id
      WHERE p.status = @status
      ORDER BY p.submitted_at DESC
    `);

  return NextResponse.json({ payments: res.recordset });
}

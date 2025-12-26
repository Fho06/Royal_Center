import { NextResponse } from "next/server";
import { getPool, sql } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    // ✅ Admin auth (kept from original)
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

  const result = await pool
    .request()
    .input("status", sql.VarChar(50), status)
    .query(`
      SELECT
        p.id,
        p.order_id,
        p.user_id,
        p.amount,
        p.method,
        p.reference_number,
        p.sender_bank,
        p.phone_last4,
        p.status,
        p.created_at,
        u.email
      FROM dbo.payments p
      JOIN dbo.users u ON u.id = p.user_id
      WHERE p.status = @status
      ORDER BY p.created_at ASC
    `);

  return NextResponse.json({ payments: result.recordset });
}

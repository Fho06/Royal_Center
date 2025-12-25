import { NextResponse } from "next/server";
import { getPool, sql } from "@/lib/db";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const method = searchParams.get("method") ?? "pago_movil";

  const pool = await getPool();
  const result = await pool
    .request()
    .input("method", sql.VarChar, method)
    .query(`
      SELECT id, method, bank_name, bank_code, phone, rif, beneficiary_name, currency
      FROM dbo.payment_accounts
      WHERE method = @method AND active = 1
      ORDER BY id ASC
    `);

  return NextResponse.json({ accounts: result.recordset });
}

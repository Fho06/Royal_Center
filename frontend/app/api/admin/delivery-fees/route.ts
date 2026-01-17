import { NextResponse } from "next/server";
import { getPool, sql } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";

export async function GET(req: Request) {
  const admin = await requireAdmin(req);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const pool = await getPool();
  const result = await pool.query(`
    SELECT id, min_amount, max_amount, fee, is_active
    FROM delivery_fee_rules
    ORDER BY min_amount ASC
  `);

  return NextResponse.json(result.recordset);
}

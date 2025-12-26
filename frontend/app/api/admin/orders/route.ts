import { NextResponse } from "next/server";
import { getPool, sql } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";

export async function GET(req: Request) {
  try {
    requireAdmin(req);

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");

    const pool = await getPool();
    const request = pool.request();

    let where = "";
    if (status) {
      request.input("status", sql.VarChar, status);
      where = "WHERE o.status = @status";
    }

    const result = await request.query(`
      SELECT
        o.id,
        o.total_amount,
        o.status,
        s.label AS status_label,
        o.created_at,
        u.email
      FROM orders o
      JOIN users u ON u.id = o.user_id
      JOIN order_statuses s ON s.code = o.status
      ${where}
      ORDER BY o.created_at DESC
    `);

    return NextResponse.json({ orders: result.recordset });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

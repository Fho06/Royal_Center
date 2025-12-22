import { NextResponse } from "next/server";
import { getPool } from "@/lib/db";

export async function GET() {
  const pool = await getPool();

  const result = await pool.request().query(`
    SELECT id, name, level, parent_id
    FROM dbo.categories
    ORDER BY level, name
  `);

  return NextResponse.json({ categories: result.recordset });
}

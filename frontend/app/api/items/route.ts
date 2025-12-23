import { NextResponse } from "next/server";
import { getPool } from "@/lib/db";

export async function GET() {
  try {
    const pool = await getPool();

    const result = await pool.request().query(`
      SELECT
        i.id,
        i.name,
        i.price_usd,
        i.stock,
        c.name AS category
      FROM dbo.items i
      JOIN dbo.categories c ON c.id = i.category_id
      WHERE i.active = 1
      ORDER BY i.name
    `);
    const items = result.recordset;

    return NextResponse.json({ items, total: result.recordset });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Failed to fetch items" },
      { status: 500 }
    );
  }
}

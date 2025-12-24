import { NextResponse } from "next/server";
import { getPool } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const pool = await getPool();
    const { searchParams } = new URL(req.url);

    // ✅ Parse + clamp (VERY IMPORTANT)
    const limit = Math.min(
      Math.max(Number(searchParams.get("limit")) || 20, 1),
      100
    );

    const offset = Math.max(
      Number(searchParams.get("offset")) || 0,
      0
    );

    // 1️⃣ Total count
    const countResult = await pool.request().query(`
      SELECT COUNT(*) AS total
      FROM dbo.items
      WHERE active = 1
    `);

    const total = countResult.recordset[0].total;

    // 2️⃣ Paginated query (INLINE limit/offset)
    const itemsResult = await pool.request().query(`
      SELECT
        id,
        name,
        price_usd,
        stock,
        category_id
      FROM dbo.items
      WHERE active = 1
      ORDER BY name
      OFFSET ${offset} ROWS
      FETCH NEXT ${limit} ROWS ONLY
    `);

    return NextResponse.json({
      items: itemsResult.recordset,
      total,
    });
  } catch (err) {
    console.error("Items error:", err);
    return NextResponse.json(
      { error: "Failed to fetch items" },
      { status: 500 }
    );
  }
}

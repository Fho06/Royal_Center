import { NextRequest, NextResponse } from "next/server";
import { getPool, sql } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const location = searchParams.get("location") ?? "all";

    const pool = await getPool();

    const result = await pool
      .request()
      .input("location", sql.VarChar, location)
      .query(`
        WITH resolved_items AS (
          SELECT
            i.id,
            i.name,
            i.price_usd,
            i.category_id,
            CASE
              WHEN @location = 'all'
                THEN COALESCE(SUM(inv.stock), i.stock, 0)
              ELSE
                COALESCE(
                  MAX(CASE WHEN inv.ubic = @location THEN inv.stock END),
                  i.stock,
                  0
                )
            END AS available_stock
          FROM items i
          LEFT JOIN item_stock inv ON inv.item_id = i.id
          WHERE i.active = 1
          GROUP BY
            i.id,
            i.name,
            i.price_usd,
            i.category_id,
            i.stock
        )

        SELECT
          fp.slot,
          fp.position,
          r.id,
          r.name,
          r.price_usd,
          r.available_stock,
          r.category_id
        FROM featured_products fp
        JOIN resolved_items r ON r.id = fp.item_id
      `);

    const featured: Record<string, Record<number, any>> = {};

    for (const r of result.recordset as any[]) {
      if (!featured[r.slot]) featured[r.slot] = {};

      featured[r.slot][Number(r.position)] = {
        id: r.id,
        name: r.name,
        price_usd: r.price_usd,
        available_stock: r.available_stock,
        category_id: r.category_id,
      };
    }

    return NextResponse.json({ featured });
  } catch (err) {
    console.error("Featured GET error:", err);
    return NextResponse.json(
      { error: "Failed to fetch featured products" },
      { status: 500 }
    );
  }
}

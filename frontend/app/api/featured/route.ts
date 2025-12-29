import { NextResponse } from "next/server";
import { getPool, sql } from "@/lib/db";

export async function GET() {
  try {
    const pool = await getPool();

    const result = await pool.request().query(`
      SELECT
        fp.slot,
        fp.position,
        i.id,
        i.name,
        i.price_usd,
        i.stock,
        i.category_id
      FROM featured_products fp
      JOIN items i ON i.id = fp.item_id
      WHERE i.active = 1
    `);

    // shape: { [slot]: { [position]: item } }
    const featured: Record<string, Record<number, any>> = {};

    for (const r of result.recordset as any[]) {
      if (!featured[r.slot]) featured[r.slot] = {};
      featured[r.slot][Number(r.position)] = {
        id: r.id,
        name: r.name,
        price_usd: r.price_usd,
        stock: r.stock,
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

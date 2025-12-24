import { NextResponse } from "next/server";
import { getPool, sql } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const pool = await getPool();
    const { searchParams } = new URL(req.url);

    // ---------- pagination ----------
    const limit = Math.min(
      Math.max(Number(searchParams.get("limit")) || 20, 1),
      100
    );
    const offset = Math.max(Number(searchParams.get("offset")) || 0, 0);

    // ---------- filters ----------
    const search = searchParams.get("search");
    const inStockOnly = searchParams.get("in_stock") === "1";
    const categoryId = searchParams.get("category_id");
    const subcategoryId = searchParams.get("subcategory_id");

    const where: string[] = ["i.active = 1"];

    if (search) {
      where.push("i.name LIKE @search");
    }
    if (inStockOnly) {
      where.push("i.stock > 0");
    }
    if (subcategoryId) {
      where.push("i.category_id = @subcategoryId");
    } else if (categoryId) {
      where.push(`
        i.category_id IN (
          SELECT id FROM dbo.categories WHERE parent_id = @categoryId
        )
      `);
    }

    const whereClause = where.length
      ? `WHERE ${where.join(" AND ")}`
      : "";

    // ---------- COUNT ----------
    const countReq = pool.request();
    if (search) countReq.input("search", sql.NVarChar, `%${search}%`);
    if (categoryId) countReq.input("categoryId", sql.Int, Number(categoryId));
    if (subcategoryId)
      countReq.input("subcategoryId", sql.Int, Number(subcategoryId));

    const countResult = await countReq.query(`
      SELECT COUNT(*) AS total
      FROM dbo.items i
      ${whereClause}
    `);

    const total = countResult.recordset[0].total;

    // ---------- DATA ----------
    const dataReq = pool.request();
    if (search) dataReq.input("search", sql.NVarChar, `%${search}%`);
    if (categoryId) dataReq.input("categoryId", sql.Int, Number(categoryId));
    if (subcategoryId)
      dataReq.input("subcategoryId", sql.Int, Number(subcategoryId));

    const itemsResult = await dataReq.query(`
      SELECT
        i.id,
        i.name,
        i.price_usd,
        i.stock,
        i.category_id
      FROM dbo.items i
      ${whereClause}
      ORDER BY i.name
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

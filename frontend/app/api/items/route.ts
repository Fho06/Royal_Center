import { NextResponse } from "next/server";
import { getPool, sql } from "@/lib/db";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const limit = Number(searchParams.get("limit")) || 20;
    const offset = Number(searchParams.get("offset")) || 0;
    const search = searchParams.get("search")?.trim();

    const categoryId = searchParams.get("category_id");
    const subcategoryId = searchParams.get("subcategory_id");
    const inStockOnly = searchParams.get("in_stock") === "1";

    const pool = await getPool();

    /* ---------- SEARCH + FILTER LOGIC ---------- */

    const where: string[] = ["i.active = 1"];
    const params: Record<string, any> = { limit, offset };

    if (search) {
      const words = search
        .toLowerCase()
        .split(/\s+/)
        .filter(Boolean);

      words.forEach((word, index) => {
        where.push(`LOWER(i.name) LIKE @w${index}`);
        params[`w${index}`] = `%${word}%`;
      });
    } else {
      // Categories ONLY apply when NOT searching
      if (subcategoryId) {
        where.push("i.category_id = @subcategoryId");
        params.subcategoryId = Number(subcategoryId);
      } else if (categoryId) {
        where.push(`
          i.category_id IN (
            SELECT id FROM categories
            WHERE parent_id = @categoryId OR id = @categoryId
          )
        `);
        params.categoryId = Number(categoryId);
      }
    }

    if (inStockOnly) {
      where.push("i.stock > 0");
    }
    


    /* ---------- COUNT ---------- */
    const whereClause =
      where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";

    const countQuery = `
      SELECT COUNT(*) AS total
      FROM items i
      ${whereClause}
    `;

    const countReq = pool.request();
    Object.entries(params).forEach(([k, v]) => {
      if (!["limit", "offset"].includes(k)) {
        countReq.input(k, v);
      }
    });

    const countResult = await countReq.query(countQuery);
    const total = countResult.recordset[0].total;

    /* ---------- DATA ---------- */

    const dataQuery = `
      SELECT
        i.id,
        i.name,
        i.price_usd,
        i.stock,
        i.category_id
      FROM items i
      ${whereClause}
      ORDER BY i.name
      OFFSET @offset ROWS
      FETCH NEXT @limit ROWS ONLY
    `;

    const dataReq = pool.request();
    Object.entries(params).forEach(([k, v]) => {
      dataReq.input(k, v);
    });

    const result = await dataReq.query(dataQuery);

    return NextResponse.json({
      items: result.recordset,
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

import { NextResponse } from "next/server";
import { getPool, sql } from "@/lib/db";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const limit = Number(searchParams.get("limit")) || 20;
    const offset = Number(searchParams.get("offset")) || 0;

    const search = searchParams.get("search")?.trim() ?? "";

    const categoryId =
      searchParams.get("category_id") && searchParams.get("category_id") !== "all"
        ? Number(searchParams.get("category_id"))
        : null;

    const subcategoryId =
      searchParams.get("subcategory_id") &&
      searchParams.get("subcategory_id") !== "all"
        ? Number(searchParams.get("subcategory_id"))
        : null;

    const inStockOnly = searchParams.get("in_stock") === "1";

    const pool = await getPool();

    /* =========================
       COUNT QUERY (ELIGIBILITY ONLY)
       ========================= */
    const countReq = pool
      .request()
      .input("search", sql.NVarChar, search)
      .input("category_id", sql.Int, categoryId)
      .input("subcategory_id", sql.Int, subcategoryId);

    const countQuery = `
      SELECT COUNT(*) AS total
      FROM items i
      WHERE
        i.active = 1
        AND (
          @search = ''
          OR i.name LIKE '%' + @search + '%'
          OR i.name LIKE @search + '%'
          OR DIFFERENCE(i.name, @search) >= 3
          OR i.id LIKE '%' + @search + '%'
        )
        ${inStockOnly ? "AND i.stock > 0" : ""}
    `;

    const countResult = await countReq.query(countQuery);
    const total = countResult.recordset[0].total;

    /* =========================
       DATA QUERY (RANKING + FILLERS)
       ========================= */
    const dataReq = pool
      .request()
      .input("search", sql.NVarChar, search)
      .input("category_id", sql.Int, categoryId)
      .input("subcategory_id", sql.Int, subcategoryId)
      .input("offset", sql.Int, offset)
      .input("limit", sql.Int, limit);

    const dataQuery = `
      SELECT *
      FROM (
        SELECT
          i.id,
          i.name,
          i.price_usd,
          i.stock,
          i.category_id,

          (
            CASE
              /* =========================
                STRONG TEXT MATCHES
                ========================= */
              WHEN i.name LIKE '%' + @search + '%' THEN 200
              WHEN i.name LIKE @search + '%' THEN 180
              WHEN i.name LIKE LEFT(@search, 4) + '%' THEN 160

              /* typo / phonetic, but still prefix-anchored */
              WHEN
                DIFFERENCE(i.name, @search) >= 3
                AND i.name LIKE LEFT(@search, 4) + '%'
              THEN 140

              /* SKU */
              WHEN i.id LIKE '%' + @search + '%' THEN 130

              /* =========================
                FILLERS (ONLY IF SEARCH IS WEAK)
                ========================= */
              WHEN
                LEN(@search) <= 4
                AND @subcategory_id IS NOT NULL
                AND i.category_id = @subcategory_id
              THEN 30

              WHEN
                LEN(@search) <= 4
                AND @category_id IS NOT NULL
                AND i.category_id IN (
                  SELECT id
                  FROM categories
                  WHERE parent_id = @category_id OR id = @category_id
                )
              THEN 15

              ELSE 0
            END
          ) AS relevance_score

        FROM items i
        WHERE
          i.active = 1
          AND (
            @search = ''

            /* strong matches */
            OR i.name LIKE '%' + @search + '%'
            OR i.name LIKE @search + '%'
            OR i.name LIKE LEFT(@search, 4) + '%'

            /* typo match (guarded by prefix) */
            OR (
              DIFFERENCE(i.name, @search) >= 3
              AND i.name LIKE LEFT(@search, 4) + '%'
            )

            /* SKU */
            OR i.id LIKE '%' + @search + '%'

            /* fillers allowed ONLY when search is short */
            OR (
              LEN(@search) <= 4
              AND @subcategory_id IS NOT NULL
              AND i.category_id = @subcategory_id
            )
            OR (
              LEN(@search) <= 4
              AND @category_id IS NOT NULL
              AND i.category_id IN (
                SELECT id
                FROM categories
                WHERE parent_id = @category_id OR id = @category_id
              )
            )
          )
          ${inStockOnly ? "AND i.stock > 0" : ""}
      ) ranked
      ORDER BY
        ranked.relevance_score DESC,
        ranked.stock DESC,
        ranked.name
      OFFSET @offset ROWS
      FETCH NEXT @limit ROWS ONLY
    `;

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

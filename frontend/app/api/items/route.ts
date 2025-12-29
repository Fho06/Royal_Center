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

    /* ======================================================
       DATA QUERY — PRIMARY UNION FILLERS
       ====================================================== */
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
        /* ---------- PRIMARY SEARCH RESULTS ---------- */
        SELECT
          i.id,
          i.name,
          i.price_usd,
          i.stock,
          i.category_id,

          CASE
            /* =========================
              EXACT & PREFIX MATCHES
              ========================= */
            WHEN i.name LIKE '%' + @search + '%' THEN 220
            WHEN i.name LIKE @search + '%' THEN 200

            /* strong typo correction via prefix */
            WHEN i.name LIKE LEFT(@search, 4) + '%' THEN 180

            /* phonetic ONLY if prefix(4) matches */
            WHEN
              DIFFERENCE(i.name, @search) >= 3
              AND i.name LIKE LEFT(@search, 4) + '%'
            THEN 165

            /* SKU / reference */
            WHEN i.id LIKE '%' + @search + '%' THEN 140

            ELSE 0
          END AS relevance_score,

          1 AS sort_group
        FROM items i
        WHERE
          i.active = 1
          AND @search <> ''
          AND (
            i.name LIKE '%' + @search + '%'
            OR i.name LIKE @search + '%'
            OR DIFFERENCE(i.name, @search) >= 3
            OR i.id LIKE '%' + @search + '%'
          )
          ${inStockOnly ? "AND i.stock > 0" : ""}

        UNION ALL

        /* ---------- FILLER RESULTS ---------- */
        SELECT
          i.id,
          i.name,
          i.price_usd,
          i.stock,
          i.category_id,

          0 AS relevance_score,
          2 AS sort_group
        FROM items i
        WHERE
          i.active = 1
          AND i.id NOT IN (
            SELECT id
            FROM items
            WHERE
              active = 1
              AND (
                name LIKE '%' + @search + '%'
                OR name LIKE @search + '%'
                OR DIFFERENCE(name, @search) >= 3
                OR id LIKE '%' + @search + '%'
              )
          )
          AND (
            (@subcategory_id IS NOT NULL AND i.category_id = @subcategory_id)
            OR
            (@category_id IS NOT NULL AND i.category_id IN (
              SELECT id FROM categories
              WHERE parent_id = @category_id OR id = @category_id
            ))
          )
          ${inStockOnly ? "AND i.stock > 0" : ""}
      ) results
      ORDER BY
        sort_group ASC,
        relevance_score DESC,
        stock DESC,
        name
      OFFSET @offset ROWS
      FETCH NEXT @limit ROWS ONLY
    `;

    const itemsResult = await dataReq.query(dataQuery);

    /* ======================================================
       COUNT QUERY (MUST MATCH UNION ELIGIBILITY)
       ====================================================== */
    const countReq = pool
      .request()
      .input("search", sql.NVarChar, search)
      .input("category_id", sql.Int, categoryId)
      .input("subcategory_id", sql.Int, subcategoryId);

    const countQuery = `
      SELECT COUNT(*) AS total
      FROM (
        /* ---------- PRIMARY SEARCH RESULTS ---------- */
        SELECT i.id
        FROM items i
        WHERE
          i.active = 1
          AND @search <> ''
          AND (
            i.name LIKE '%' + @search + '%'
            OR i.name LIKE @search + '%'
            OR i.name LIKE LEFT(@search, 4) + '%'
            OR (
              DIFFERENCE(i.name, @search) >= 3
              AND i.name LIKE LEFT(@search, 4) + '%'
            )
            OR i.id LIKE '%' + @search + '%'
          )

        UNION ALL

        /* ---------- FILLER RESULTS ---------- */
        SELECT i.id
        FROM items i
        WHERE
          i.active = 1
          AND i.id NOT IN (
            SELECT id
            FROM items
            WHERE
              active = 1
              AND (
                name LIKE '%' + @search + '%'
                OR name LIKE @search + '%'
                OR name LIKE LEFT(@search, 4) + '%'
                OR (
                  DIFFERENCE(name, @search) >= 3
                  AND name LIKE LEFT(@search, 4) + '%'
                )
                OR id LIKE '%' + @search + '%'
              )
          )
          AND (
            (@subcategory_id IS NOT NULL AND i.category_id = @subcategory_id)
            OR
            (@category_id IS NOT NULL AND i.category_id IN (
              SELECT id FROM categories
              WHERE parent_id = @category_id OR id = @category_id
            ))
          )
      ) counted
    `;


    const total = (await countReq.query(countQuery)).recordset[0].total;

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

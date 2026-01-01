import { NextRequest, NextResponse } from "next/server";
import { getPool, sql } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const limit = Number(searchParams.get("limit")) || 20;
    const offset = Number(searchParams.get("offset")) || 0;

    const FACET_PAGE_COUNT = 3;
    const facetLimit = limit * FACET_PAGE_COUNT;

    const search = searchParams.get("search")?.trim() ?? "";
    const inStockOnly = searchParams.get("in_stock") === "1";

    const minPrice = searchParams.get("price_min")
      ? Number(searchParams.get("price_min"))
      : null;

    const maxPrice = searchParams.get("price_max")
      ? Number(searchParams.get("price_max"))
      : null;

    const subcategoryIds = searchParams.get("subcategory_ids");
    const categoryIds = searchParams.get("category_ids");

    const pool = await getPool();

    /* ======================================================
       DATA QUERY — PRIMARY + FILLER (UNCHANGED LOGIC)
       ====================================================== */
    const dataReq = pool
      .request()
      .input("search", sql.NVarChar, search)
      .input("offset", sql.Int, offset)
      .input("limit", sql.Int, limit)
      .input("min_price", sql.Decimal(10, 2), minPrice)
      .input("max_price", sql.Decimal(10, 2), maxPrice)
      .input("subcategory_ids", sql.NVarChar, subcategoryIds)
      .input("category_ids", sql.NVarChar, categoryIds);

    const dataQuery = `
      SELECT
        id, name, price_usd, stock, category_id
      FROM (
        SELECT
          i.id,
          i.name,
          i.price_usd,
          i.stock,
          i.category_id,

          CASE
            WHEN i.name = @search THEN 400
            WHEN i.name LIKE @search + '%' THEN 300
            WHEN i.name LIKE @search + ' %'
              OR i.name LIKE '% ' + @search + '%'
            THEN 260
            WHEN i.name LIKE '%' + @search + '%' THEN 220
            WHEN DIFFERENCE(i.name, @search) >= 3
              AND i.name LIKE LEFT(@search, 4) + '%'
            THEN 165
            WHEN i.id LIKE '%' + @search + '%' THEN 140
            ELSE 0
          END AS relevance_score,

          LEN(i.name) AS name_len,
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
          AND (@min_price IS NULL OR i.price_usd >= @min_price)
          AND (@max_price IS NULL OR i.price_usd <= @max_price)
          AND (
            @subcategory_ids IS NULL
            OR i.category_id IN (
              SELECT value FROM STRING_SPLIT(@subcategory_ids, ',')
            )
          )
          AND (
            @subcategory_ids IS NOT NULL
            OR @category_ids IS NULL
            OR i.category_id IN (
              SELECT id FROM categories
              WHERE parent_id IN (
                SELECT value FROM STRING_SPLIT(@category_ids, ',')
              )
              OR id IN (
                SELECT value FROM STRING_SPLIT(@category_ids, ',')
              )
            )
          )

        UNION ALL

        SELECT
          i.id,
          i.name,
          i.price_usd,
          i.stock,
          i.category_id,
          0 AS relevance_score,
          LEN(i.name) AS name_len,
          2 AS sort_group
        FROM items i
        WHERE
          i.active = 1
          AND i.id NOT IN (
            SELECT id FROM items
            WHERE active = 1
              AND (
                name LIKE '%' + @search + '%'
                OR name LIKE @search + '%'
                OR DIFFERENCE(name, @search) >= 3
                OR id LIKE '%' + @search + '%'
              )
          )
          ${inStockOnly ? "AND i.stock > 0" : ""}
          AND (@min_price IS NULL OR i.price_usd >= @min_price)
          AND (@max_price IS NULL OR i.price_usd <= @max_price)
          AND (
            @subcategory_ids IS NULL
            OR i.category_id IN (
              SELECT value FROM STRING_SPLIT(@subcategory_ids, ',')
            )
          )
          AND (
            @subcategory_ids IS NOT NULL
            OR @category_ids IS NULL
            OR i.category_id IN (
              SELECT id FROM categories
              WHERE parent_id IN (
                SELECT value FROM STRING_SPLIT(@category_ids, ',')
              )
              OR id IN (
                SELECT value FROM STRING_SPLIT(@category_ids, ',')
              )
            )
          )
      ) results
      ORDER BY
        sort_group ASC,
        relevance_score DESC,
        name_len ASC,
        stock DESC,
        name
      OFFSET @offset ROWS
      FETCH NEXT @limit ROWS ONLY
    `;

    const itemsResult = await dataReq.query(dataQuery);

    /* ======================================================
       COUNT QUERY (UNCHANGED - still your logic)
       ====================================================== */
    const countReq = pool
      .request()
      .input("search", sql.NVarChar, search)
      .input("min_price", sql.Decimal(10, 2), minPrice)
      .input("max_price", sql.Decimal(10, 2), maxPrice)
      .input("subcategory_ids", sql.NVarChar, subcategoryIds)
      .input("category_ids", sql.NVarChar, categoryIds);

    const countQuery = `
      SELECT COUNT(*) AS total
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
        AND (@min_price IS NULL OR i.price_usd >= @min_price)
        AND (@max_price IS NULL OR i.price_usd <= @max_price)
        AND (
          @subcategory_ids IS NULL
          OR i.category_id IN (
            SELECT value FROM STRING_SPLIT(@subcategory_ids, ',')
          )
        )
        AND (
          @subcategory_ids IS NOT NULL
          OR @category_ids IS NULL
          OR i.category_id IN (
            SELECT id FROM categories
            WHERE parent_id IN (
              SELECT value FROM STRING_SPLIT(@category_ids, ',')
            )
            OR id IN (
              SELECT value FROM STRING_SPLIT(@category_ids, ',')
            )
          )
        )
    `;

    const total = (await countReq.query(countQuery)).recordset[0].total;

    /* ======================================================
       PRICE BOUNDS (UNCHANGED)
       ====================================================== */
    const boundsReq = pool.request().input("search", sql.NVarChar, search);

    const boundsQuery = `
      SELECT
        MIN(i.price_usd) AS min_price,
        MAX(i.price_usd) AS max_price
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
    `;

    const bounds = (await boundsReq.query(boundsQuery)).recordset[0];

    /* ======================================================
       FACETS — FIXED
       ✅ Facets do NOT shrink based on selected categories/subcategories.
       ✅ Only depends on search + (optional) stock + (optional) price range.
       ====================================================== */
    const facetsReq = pool
      .request()
      .input("search", sql.NVarChar, search)
      .input("min_price", sql.Decimal(10, 2), minPrice)
      .input("max_price", sql.Decimal(10, 2), maxPrice)
      .input("facet_limit", sql.Int, facetLimit);

    const facetsQuery = `
      SELECT DISTINCT
        i.category_id        AS subcategory_id,
        c.parent_id          AS category_id
      FROM (
        SELECT TOP (@facet_limit)
          i.category_id,
          CASE
            WHEN i.name = @search THEN 400
            WHEN i.name LIKE @search + '%' THEN 300
            WHEN i.name LIKE @search + ' %'
              OR i.name LIKE '% ' + @search + '%'
            THEN 260
            WHEN i.name LIKE '%' + @search + '%' THEN 220
            WHEN DIFFERENCE(i.name, @search) >= 3
              AND i.name LIKE LEFT(@search, 4) + '%'
            THEN 165
            WHEN i.id LIKE '%' + @search + '%' THEN 140
            ELSE 0
          END AS relevance_score,
          LEN(i.name) AS name_len,
          i.stock,
          i.name
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
          AND (@min_price IS NULL OR i.price_usd >= @min_price)
          AND (@max_price IS NULL OR i.price_usd <= @max_price)
        ORDER BY
          relevance_score DESC,
          name_len ASC,
          i.stock DESC,
          i.name
      ) i
      JOIN categories c ON c.id = i.category_id
    `;

    const facetRows = (await facetsReq.query(facetsQuery)).recordset;

    const facets = {
      categories: [
        ...new Set(facetRows.map((r: any) => r.category_id).filter(Boolean)),
      ],
      subcategories: [
        ...new Set(facetRows.map((r: any) => r.subcategory_id)),
      ],
    };

    return NextResponse.json({
      items: itemsResult.recordset,
      total,
      priceBounds: {
        min: bounds?.min_price ?? null,
        max: bounds?.max_price ?? null,
      },
      facets,
    });
  } catch (err) {
    console.error("Items error:", err);
    return NextResponse.json(
      { error: "Failed to fetch items" },
      { status: 500 }
    );
  }
}

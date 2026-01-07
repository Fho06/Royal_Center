import { NextRequest, NextResponse } from "next/server";
import { getPool, sql } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const MAX_LIMIT = 100;
    const limit = Math.min(
      Math.max(Number(searchParams.get("limit")) || 20, 1),
      MAX_LIMIT
    );
    const offset = Number(searchParams.get("offset")) || 0;

    const FACET_PAGE_COUNT = 2;
    const facetLimit = limit * FACET_PAGE_COUNT;

    const search = searchParams.get("search")?.trim() ?? "";
    const inStockOnly = searchParams.get("in_stock") === "1";
    const location = searchParams.get("location") ?? "all";

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
       DATA QUERY — PRIMARY + FILLER
       ====================================================== */
    const dataReq = pool
      .request()
      .input("search", sql.NVarChar, search)
      .input("offset", sql.Int, offset)
      .input("limit", sql.Int, limit)
      .input("min_price", sql.Decimal(10, 2), minPrice)
      .input("max_price", sql.Decimal(10, 2), maxPrice)
      .input("subcategory_ids", sql.NVarChar, subcategoryIds)
      .input("category_ids", sql.NVarChar, categoryIds)
      .input("location", sql.VarChar, location);

    const dataQuery = `
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
          i.id, i.name, i.price_usd, i.category_id, i.stock
      )

      SELECT
        id, name, price_usd, category_id, available_stock
      FROM (
        SELECT
          r.*,
          CASE
            WHEN r.name = @search THEN 400
            WHEN r.name LIKE @search + '%' THEN 300
            WHEN r.name LIKE @search + ' %'
              OR r.name LIKE '% ' + @search + '%'
            THEN 260
            WHEN r.name LIKE '%' + @search + '%' THEN 220
            WHEN DIFFERENCE(r.name, @search) >= 3
              AND r.name LIKE LEFT(@search, 4) + '%'
            THEN 165
            WHEN r.id LIKE '%' + @search + '%' THEN 140
            ELSE 0
          END AS relevance_score,
          LEN(r.name) AS name_len,
          1 AS sort_group
        FROM resolved_items r
        WHERE
          @search <> ''
          AND (
            r.name LIKE '%' + @search + '%'
            OR r.name LIKE @search + '%'
            OR DIFFERENCE(r.name, @search) >= 3
            OR r.id LIKE '%' + @search + '%'
          )
          ${inStockOnly ? "AND r.available_stock > 0" : ""}
          AND (@min_price IS NULL OR r.price_usd >= @min_price)
          AND (@max_price IS NULL OR r.price_usd <= @max_price)
          AND (
            @subcategory_ids IS NULL
            OR r.category_id IN (
              SELECT value FROM STRING_SPLIT(@subcategory_ids, ',')
            )
          )
          AND (
            @subcategory_ids IS NOT NULL
            OR @category_ids IS NULL
            OR r.category_id IN (
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
          r.*,
          0 AS relevance_score,
          LEN(r.name) AS name_len,
          2 AS sort_group
        FROM resolved_items r
        WHERE
          r.id NOT IN (
            SELECT id FROM resolved_items
            WHERE
              @search <> ''
              AND (
                name LIKE '%' + @search + '%'
                OR name LIKE @search + '%'
                OR DIFFERENCE(name, @search) >= 3
                OR id LIKE '%' + @search + '%'
              )
          )
          ${inStockOnly ? "AND r.available_stock > 0" : ""}
          AND (@min_price IS NULL OR r.price_usd >= @min_price)
          AND (@max_price IS NULL OR r.price_usd <= @max_price)
      ) results
      ORDER BY
        sort_group ASC,
        relevance_score DESC,
        name_len ASC,
        available_stock DESC,
        name
      OFFSET @offset ROWS
      FETCH NEXT @limit ROWS ONLY
    `;

    const itemsResult = await dataReq.query(dataQuery);

    /* ======================================================
       COUNT QUERY — SAME CTE
       ====================================================== */
    const countReq = pool
      .request()
      .input("search", sql.NVarChar, search)
      .input("min_price", sql.Decimal(10, 2), minPrice)
      .input("max_price", sql.Decimal(10, 2), maxPrice)
      .input("subcategory_ids", sql.NVarChar, subcategoryIds)
      .input("category_ids", sql.NVarChar, categoryIds)
      .input("location", sql.VarChar, location);

    const countQuery = `
      WITH resolved_items AS (
        SELECT
          i.id,
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
        GROUP BY i.id, i.price_usd, i.category_id, i.stock
      )
      SELECT COUNT(*) AS total
      FROM resolved_items r
      WHERE
        @search <> ''
        ${inStockOnly ? "AND r.available_stock > 0" : ""}
        AND (@min_price IS NULL OR r.price_usd >= @min_price)
        AND (@max_price IS NULL OR r.price_usd <= @max_price)
        AND (
          @subcategory_ids IS NULL
          OR r.category_id IN (
            SELECT value FROM STRING_SPLIT(@subcategory_ids, ',')
          )
        )
        AND (
          @subcategory_ids IS NOT NULL
          OR @category_ids IS NULL
          OR r.category_id IN (
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
       FACETS — SAME CTE
       ====================================================== */
    const facetsReq = pool
      .request()
      .input("search", sql.NVarChar, search)
      .input("min_price", sql.Decimal(10, 2), minPrice)
      .input("max_price", sql.Decimal(10, 2), maxPrice)
      .input("facet_limit", sql.Int, facetLimit)
      .input("location", sql.VarChar, location);

    const facetsQuery = `
      WITH resolved_items AS (
        SELECT
          i.id,
          i.name,
          i.category_id,
          i.price_usd,
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
          i.id, i.name, i.category_id, i.price_usd, i.stock
      )
      SELECT DISTINCT
        r.category_id AS subcategory_id,
        c.parent_id   AS category_id
      FROM (
        SELECT TOP (@facet_limit) *
        FROM resolved_items
        WHERE
          @search <> ''
          ${inStockOnly ? "AND available_stock > 0" : ""}
          AND (@min_price IS NULL OR price_usd >= @min_price)
          AND (@max_price IS NULL OR price_usd <= @max_price)
        ORDER BY available_stock DESC
      ) r
      JOIN categories c ON c.id = r.category_id
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

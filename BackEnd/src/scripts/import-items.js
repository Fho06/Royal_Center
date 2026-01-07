require("dotenv").config();
const sql = require("mssql");

const path = require("path");
require("dotenv").config({
  path: path.resolve(__dirname, "../../.env"),
});


/* =========================
   CONFIG
   ========================= */
const sourceConfig = {
  server: process.env.COMMON_SERVER,
  
  port: Number(process.env.COMMON_PORT || 1433),
  user: process.env.ERP_DB_USER,
  password: process.env.ERP_DB_PASS,
  database: process.env.ERP_DB_NAME,
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
};

const targetConfig = {
  server: process.env.COMMON_SERVER,
  port: Number(process.env.COMMON_PORT || 1433),
  user: process.env.WEB_DB_USER,
  password: process.env.WEB_DB_PASS,
  database: process.env.WEB_DB_NAME,
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
};

/* =========================
   TAX CONFIG
   ========================= */
const TAX_RATE = 0.16;

async function importItems() {
  let sourcePool;
  let targetPool;

  try {
    /* =========================
       CONNECT
       ========================= */
    console.log("🔌 Connecting to ERP...");
    sourcePool = await new sql.ConnectionPool(sourceConfig).connect();

    console.log("🔌 Connecting to Website SQL...");
    targetPool = await new sql.ConnectionPool(targetConfig).connect();

    /* =========================
       FETCH PRODUCTS
       ========================= */
    console.log("📦 Fetching products...");
    const { recordset: productRows } = await sourcePool.query(`
      SELECT
        CodProd    AS product_id,
        Descrip    AS name,
        Precio2    AS price_usd,
        Existen    AS stock,
        CodInst    AS category_id,
        EsExento   AS is_tax_exempt
      FROM dbo.SAPROD
    `);

    console.log(`✅ Retrieved ${productRows.length} products`);

    /* =========================
       BUILD ITEMS TVP
       ========================= */
    const itemsTVP = new sql.Table("dbo.ItemImportType");
    itemsTVP.columns.add("id", sql.NVarChar(50));
    itemsTVP.columns.add("name", sql.NVarChar(255));
    itemsTVP.columns.add("category_id", sql.Int);
    itemsTVP.columns.add("price_usd", sql.Decimal(18, 2));
    itemsTVP.columns.add("stock", sql.Int);
    itemsTVP.columns.add("unit", sql.NVarChar(50));
    itemsTVP.columns.add("active", sql.Bit);
    itemsTVP.columns.add("is_tax_exempt", sql.Bit);

    let skippedItems = 0;

    for (const row of productRows) {
      const id = String(row.product_id || "").trim();
      const name = row.name?.trim();
      const categoryId = parseInt(row.category_id, 10);

      if (!id || !name || !Number.isInteger(categoryId)) {
        skippedItems++;
        continue;
      }

      const basePrice = Number(row.price_usd) || 0;
      const isTaxExempt = row.is_tax_exempt === 1;

      const finalPrice = isTaxExempt
        ? basePrice
        : Number((basePrice * (1 + TAX_RATE)).toFixed(2));

      itemsTVP.rows.add(
        id,
        name,
        categoryId,
        finalPrice,
        Math.max(0, Number(row.stock || 0)),
        "UN",
        1,
        isTaxExempt ? 1 : 0
      );
    }

    console.log(`⏭️ Skipped invalid items: ${skippedItems}`);
    console.log(`🚀 Importing ${itemsTVP.rows.length} items...`);

    /* =========================
       ITEMS MERGE (FIRST)
       ========================= */
    await targetPool
      .request()
      .input("items", itemsTVP)
      .query(`
        MERGE dbo.items AS t
        USING @items AS s
        ON t.id = s.id
        WHEN MATCHED THEN
          UPDATE SET
            name = s.name,
            category_id = s.category_id,
            price_usd = s.price_usd,
            stock = s.stock,
            unit = s.unit,
            active = s.active,
            is_tax_exempt = s.is_tax_exempt
        WHEN NOT MATCHED THEN
          INSERT (
            id, name, category_id, price_usd,
            stock, unit, active, is_tax_exempt
          )
          VALUES (
            s.id, s.name, s.category_id, s.price_usd,
            s.stock, s.unit, s.active, s.is_tax_exempt
          );
      `);

    console.log("✅ Items table synced");

    /* =========================
       FETCH VALID ITEM IDS
       ========================= */
    const { recordset: validItems } = await targetPool.query(`
      SELECT id FROM dbo.items
    `);

    const validItemSet = new Set(validItems.map(r => r.id));

    /* =========================
       FETCH LOCATION STOCK
       ========================= */
    console.log("📍 Fetching location stock...");
    const { recordset: stockRows } = await sourcePool.query(`
      SELECT
        CodProd AS item_id,
        CodUbic AS ubic,
        Existen AS stock
      FROM EAROYAL.dbo.SAEXIS
    `);

    /* =========================
       BUILD STOCK TVP
       ========================= */
    const stockTVP = new sql.Table("dbo.ItemStockImportType");
    stockTVP.columns.add("item_id", sql.VarChar(50));
    stockTVP.columns.add("ubic", sql.NVarChar(50));
    stockTVP.columns.add("stock", sql.Int);

    const missingItems = new Set();
    let skippedStock = 0;

    for (const row of stockRows) {
      const itemId = String(row.item_id || "").trim();
      const ubic = String(row.ubic || "").trim();

      if (!validItemSet.has(itemId)) {
        missingItems.add(itemId);
        skippedStock++;
        continue;
      }

      stockTVP.rows.add(
        itemId,
        ubic,
        Math.max(0, Number(row.stock || 0))
      );
    }

    console.log(`🚀 Importing ${stockTVP.rows.length} item_stock rows...`);

    /* =========================
       STOCK MERGE (SECOND)
       ========================= */
    await targetPool
      .request()
      .input("stock", stockTVP)
      .query(`
        MERGE dbo.item_stock AS t
        USING @stock AS s
        ON t.item_id = s.item_id
       AND t.ubic = s.ubic
        WHEN MATCHED THEN
          UPDATE SET stock = s.stock
        WHEN NOT MATCHED THEN
          INSERT (item_id, ubic, stock)
          VALUES (s.item_id, s.ubic, s.stock);
      `);

    /* =========================
       LOG MISSING ITEMS
       ========================= */
    if (missingItems.size > 0) {
      console.warn("⚠️ item_stock skipped (missing items):");
      console.warn([...missingItems].slice(0, 20));
      if (missingItems.size > 20) {
        console.warn(`...and ${missingItems.size - 20} more`);
      }
    }

    console.log(`⏭️ Skipped ${skippedStock} stock rows`);
    console.log("🎉 Import completed successfully");

  } catch (err) {
    console.error("❌ Import failed:", err);
  } finally {
    if (sourcePool) await sourcePool.close();
    if (targetPool) await targetPool.close();
    process.exit(0);
  }
}

importItems();

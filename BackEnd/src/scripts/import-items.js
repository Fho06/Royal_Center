require("dotenv").config();
const sql = require("mssql");

/* =========================
   CONFIG
   ========================= */
const sourceConfig = {
  user: process.env.SRC_DB_USER,
  password: process.env.SRC_DB_PASS,
  server: process.env.SRC_DB_SERVER,
  port: Number(process.env.SRC_DB_PORT || 1433),
  database: process.env.SRC_DB_NAME,
  options: {
    encrypt: true,
    trustServerCertificate: true,
  },
};

const targetConfig = {
  server: process.env.AZ_DB_SERVER,
  user: process.env.AZ_DB_USER,
  password: process.env.AZ_DB_PASS,
  database: process.env.AZ_DB_NAME,
  options: {
    encrypt: true,
    trustServerCertificate: false,
  },
};

/* =========================
   TAX CONFIG
   ========================= */
const TAX_RATE = 0.16; // adjust if needed

async function importItems() {
  let sourcePool;
  let targetPool;

  try {
    console.log("🔌 Connecting to ERP...");
    sourcePool = await new sql.ConnectionPool(sourceConfig).connect();

    console.log("📦 Fetching products...");
    const { recordset } = await sourcePool.query(`
      SELECT
        CodProd    AS product_id,
        Descrip    AS name,
        Precio2    AS price_usd,
        Existen    AS stock,
        CodInst    AS category_id,
        EsExento   AS is_tax_exempt
      FROM dbo.SAPROD
    `);

    console.log(`✅ Retrieved ${recordset.length} rows`);

    console.log("🔌 Connecting to Azure SQL...");
    targetPool = await new sql.ConnectionPool(targetConfig).connect();

    /* =========================
       BUILD TVP
       ========================= */
    const tvp = new sql.Table("dbo.ItemImportType");
    tvp.columns.add("id", sql.NVarChar(50));
    tvp.columns.add("name", sql.NVarChar(255));
    tvp.columns.add("category_id", sql.Int);
    tvp.columns.add("price_usd", sql.Decimal(18, 2));
    tvp.columns.add("stock", sql.Int);
    tvp.columns.add("unit", sql.NVarChar(50));
    tvp.columns.add("active", sql.Bit);
    tvp.columns.add("is_tax_exempt", sql.Bit);

    let skipped = 0;

    for (const row of recordset) {
      const id = String(row.product_id || "").trim();
      const name = row.name?.trim();
      const categoryId = parseInt(row.category_id, 10);

      if (!id || !name || !Number.isInteger(categoryId)) {
        skipped++;
        continue;
      }

      const basePrice = Number(row.price_usd) || 0;
      const isTaxExempt = row.is_tax_exempt === 1;

      const finalPrice = isTaxExempt
        ? basePrice
        : Number((basePrice * (1 + TAX_RATE)).toFixed(2));

      tvp.rows.add(
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

    console.log(`⏭️ Skipped invalid: ${skipped}`);
    console.log(`🚀 Importing ${tvp.rows.length} rows...`);

    /* =========================
       SINGLE MERGE
       ========================= */
    await targetPool
      .request()
      .input("items", tvp)
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

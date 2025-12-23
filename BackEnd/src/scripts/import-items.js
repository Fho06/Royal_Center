/**
 * One-time script to import products from SAPROD (ERP)
 * into shop_db.dbo.items
 */

require("dotenv").config();
const sql = require("mssql");

/* =========================
   SOURCE DATABASE (ERP)
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

/* =========================
   TARGET DATABASE (AZURE)
   ========================= */
const targetConfig = {
  server: process.env.AZ_DB_SERVER,   // xxx.database.windows.net
  user: process.env.AZ_DB_USER,
  password: process.env.AZ_DB_PASS,
  database: process.env.AZ_DB_NAME,   // shop_db
  options: {
    encrypt: true,
    trustServerCertificate: false,
  },
};

async function importItems() {
  let sourcePool;
  let targetPool;

  try {
    console.log("🔌 Connecting to ERP...");
    sourcePool = await new sql.ConnectionPool(sourceConfig).connect();

    console.log("📦 Fetching products from SAPROD...");
    const { recordset: products } = await sourcePool.query(`
      SELECT
        CodProd  AS product_id,
        Descrip  AS name,
        Precio2  AS price_usd,
        Existen  AS stock,
        CodInst  AS category_id
      FROM dbo.SAPROD
    `);

    console.log(`✅ Found ${products.length} products`);

    console.log("🔌 Connecting to Azure SQL...");
    targetPool = await new sql.ConnectionPool(targetConfig).connect();

    let imported = 0;
    let skipped = 0;

    for (const row of products) {
      const id = String(row.product_id).trim();
      const name = row.name?.trim();
      const categoryId = parseInt(row.category_id, 10);
      const priceUSD = Number(row.price_usd) || 0;
      const stock = Math.max(0, Number(row.stock || 0));

      if (!id || !name || !Number.isInteger(categoryId)) {
        skipped++;
        continue;
      }

      await targetPool
        .request()
        .input("id", sql.VarChar(50), id)
        .input("name", sql.NVarChar(255), name)
        .input("category_id", sql.Int, categoryId)
        .input("price_usd", sql.Decimal(18, 2), priceUSD)
        .input("stock", sql.Int, stock)
        .input("unit", sql.NVarChar(50), "UN")
        .input("active", sql.Bit, 1)
        .query(`
          MERGE dbo.items AS t
          USING (SELECT @id AS id) s
          ON t.id = s.id
          WHEN MATCHED THEN
            UPDATE SET
              name = @name,
              category_id = @category_id,
              price_usd = @price_usd,
              stock = @stock,
              unit = @unit,
              active = @active
          WHEN NOT MATCHED THEN
            INSERT (
              id,
              name,
              category_id,
              price_usd,
              stock,
              unit,
              active
            )
            VALUES (
              @id,
              @name,
              @category_id,
              @price_usd,
              @stock,
              @unit,
              @active
            );
        `);

      imported++;
    }

    console.log("🎉 Import finished");
    console.log(`📥 Imported / Updated: ${imported}`);
    console.log(`⏭️ Skipped (invalid): ${skipped}`);

  } catch (err) {
    console.error("❌ Import failed:");
    console.error(err);
  } finally {
    if (sourcePool) await sourcePool.close();
    if (targetPool) await targetPool.close();
    process.exit(0);
  }
}

importItems();

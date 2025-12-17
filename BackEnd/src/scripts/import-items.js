/**
 * One-time script to import products from SAPROD (remote SQL Server)
 * into local shop_db.dbo.items table
 */

require("dotenv").config();
const sql = require("mssql");

/* =========================
   SOURCE DATABASE (REMOTE)
   ========================= */
const sourceConfig = {
  user: process.env.SRC_DB_USER,
  password: process.env.SRC_DB_PASS,
  server: process.env.SRC_DB_SERVER,
  port: Number(process.env.SRC_DB_PORT || 1433),
  database: process.env.SRC_DB_NAME,
  options: {
    encrypt: true,
    trustServerCertificate: true
  }
};

/* =========================
   TARGET DATABASE (LOCAL)
   ========================= */
const targetConfig = {
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  server: process.env.DB_SERVER,
  database: process.env.DB_NAME,
  options: {
    encrypt: true,
    trustServerCertificate: true
  }
};

async function importItems() {
  let sourcePool;
  let targetPool;

  try {
    console.log("🔌 Connecting to SOURCE database...");
    sourcePool = await new sql.ConnectionPool(sourceConfig).connect();

    console.log("📦 Fetching products from SAPROD...");
    const sourceResult = await sourcePool.request().query(`
      SELECT
        CodProd,
        Descrip,
        Precio2,
        Existen
      FROM SAPROD
    `);

    console.log(`✅ Found ${sourceResult.recordset.length} products`);

    console.log("🔌 Connecting to TARGET database...");
    targetPool = await new sql.ConnectionPool(targetConfig).connect();

    let imported = 0;
    let skipped = 0;

    for (const row of sourceResult.recordset) {
      const sourceProductId = row.CodProd;
      const name = row.Descrip?.trim();
      const priceUSD = Number(row.Precio2);
      const stock = row.Existen > 0 ? row.Existen : 0;

      if (!sourceProductId || !name || priceUSD <= 0) {
        skipped++;
        continue;
      }

      await targetPool
        .request()
        .input("source_product_id", sql.VarChar, String(sourceProductId))
        .input("name", sql.VarChar, name)
        .input("description", sql.VarChar, "")
        .input("price", sql.Decimal(10, 2), priceUSD)
        .input("stock", sql.Int, stock)
        .query(`
          INSERT INTO dbo.items
            (source_product_id, name, description, price, stock)
          VALUES
            (@source_product_id, @name, @description, @price, @stock)
        `);

      imported++;
    }

    console.log("🎉 Import finished");
    console.log(`📥 Imported: ${imported}`);
    console.log(`⏭️ Skipped: ${skipped}`);

  } catch (err) {
    console.error("❌ Import failed:");
    console.error(err);
  } finally {
    if (sourcePool) await sourcePool.close();
    if (targetPool) await targetPool.close();
  }
}

importItems();

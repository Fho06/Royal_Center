/**
 * ERP → shop_db items sync
 * SAFE for re-runs
 * SAFE for Azure SQL
 * DOES NOT modify ERP
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
    trustServerCertificate: true
  }
};

/* =========================
   TARGET DATABASE (AZURE)
   ========================= */
const targetConfig = {
  user: process.env.AZ_DB_USER,
  password: process.env.AZ_DB_PASS,
  server: process.env.AZ_DB_SERVER, // xxx.database.windows.net
  database: process.env.AZ_DB_NAME, // shop_db
  options: {
    encrypt: true,
    trustServerCertificate: false
  },
  pool: {
    max: 5,
    min: 0,
    idleTimeoutMillis: 30000
  }
};

async function importItems() {
  let sourcePool;
  let targetPool;

  try {
    console.log("🔌 Connecting to ERP (SOURCE) database...");
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

    console.log("🔌 Connecting to Azure (TARGET) database...");
    targetPool = await new sql.ConnectionPool(targetConfig).connect();

    let imported = 0;
    let skipped = 0;

    for (const row of sourceResult.recordset) {
      const productId = String(row.CodProd).trim(); // preserve leading zeros
      const name = row.Descrip?.trim();
      const priceUSD = Number(row.Precio2);
      const stock = row.Existen > 0 ? row.Existen : 0;

      // Basic validation
      if (!productId || !name || isNaN(priceUSD) || priceUSD <= 0) {
        skipped++;
        continue;
      }

      await targetPool
        .request()
        .input("id", sql.VarChar(50), productId)
        .input("name", sql.NVarChar(255), name)
        .input("category_id", sql.Int, 1) // TEMP category (fixed later by category sync)
        .input("price_usd", sql.Decimal(18, 2), priceUSD)
        .input("stock", sql.Int, stock)
        .input("unit", sql.NVarChar(50), "UN")
        .input("active", sql.Bit, 1)
        .query(`
          IF NOT EXISTS (SELECT 1 FROM dbo.items WHERE id = @id)
          BEGIN
            INSERT INTO dbo.items
              (id, name, category_id, price_usd, stock, unit, active)
            VALUES
              (@id, @name, @category_id, @price_usd, @stock, @unit, @active)
          END
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

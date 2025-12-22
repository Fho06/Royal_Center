/**
 * ERP → shop_db categories & subcategories sync
 * FK-safe (two-pass)
 * Re-runnable
 * Azure SQL compatible
 */

require("dotenv").config();
const sql = require("mssql");

/* =========================
   SOURCE DATABASE (ERP)
   ========================= */
const sourceConfig = {
  server: process.env.ERP_DB_SERVER,
  port: Number(process.env.ERP_DB_PORT || 1433),
  user: process.env.ERP_DB_USER,
  password: process.env.ERP_DB_PASS,
  database: process.env.ERP_DB_NAME,
  options: {
    encrypt: false,               // ERP often doesn't support TLS
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
  pool: {
    max: 5,
    min: 0,
    idleTimeoutMillis: 30000,
  },
};

async function run() {
  let sourcePool;
  let targetPool;

  try {
    /* ---------- CONNECT SOURCE ---------- */
    console.log("🔌 Connecting to ERP...");
    sourcePool = await new sql.ConnectionPool(sourceConfig).connect();

    const { recordset: categories } = await sourcePool.query(`
      SELECT CodInst, Descrip, Nivel, InsPadre
      FROM dbo.SAINSTA
    `);

    console.log(`📦 Fetched ${categories.length} category records`);

    /* ---------- CONNECT TARGET ---------- */
    console.log("🔌 Connecting to Azure shop_db...");
    targetPool = await new sql.ConnectionPool(targetConfig).connect();

    /* ======================================================
       PASS 1 — INSERT LEVEL 1 (TOP-LEVEL CATEGORIES)
       ====================================================== */
    const level1 = categories.filter(c => c.Nivel === 1);

    console.log(`➡️ Inserting ${level1.length} level-1 categories`);

    for (const row of level1) {
      await targetPool
        .request()
        .input("id", sql.Int, row.CodInst)
        .input("name", sql.NVarChar(255), row.Descrip?.trim())
        .input("level", sql.Int, 1)
        .input("parent_id", sql.Int, null)
        .query(`
          IF NOT EXISTS (SELECT 1 FROM dbo.categories WHERE id = @id)
          BEGIN
            INSERT INTO dbo.categories (id, name, level, parent_id)
            VALUES (@id, @name, @level, @parent_id)
          END
        `);
    }

    /* ======================================================
       PASS 2 — INSERT LEVEL 2 (SUBCATEGORIES)
       ====================================================== */
    const level2 = categories.filter(c => c.Nivel === 2);

    console.log(`➡️ Inserting ${level2.length} level-2 subcategories`);

    for (const row of level2) {
      await targetPool
        .request()
        .input("id", sql.Int, row.CodInst)
        .input("name", sql.NVarChar(255), row.Descrip?.trim())
        .input("level", sql.Int, 2)
        .input("parent_id", sql.Int, row.InsPadre)
        .query(`
          IF NOT EXISTS (SELECT 1 FROM dbo.categories WHERE id = @id)
          BEGIN
            INSERT INTO dbo.categories (id, name, level, parent_id)
            VALUES (@id, @name, @level, @parent_id)
          END
        `);
    }

    console.log("✅ Categories & subcategories imported successfully");

  } catch (err) {
    console.error("❌ Category import failed:");
    console.error(err);
    process.exit(1);
  } finally {
    if (sourcePool) await sourcePool.close();
    if (targetPool) await targetPool.close();
    process.exit(0);
  }
}

run();

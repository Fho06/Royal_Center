require("dotenv").config();
const sql = require("mssql");

/* ---------- SOURCE (ERP) CONFIG ---------- */
const sourceConfig = {
  server: process.env.ERP_DB_SERVER,
  port: Number(process.env.ERP_DB_PORT),
  user: process.env.ERP_DB_USER,
  password: process.env.ERP_DB_PASS,
  database: process.env.ERP_DB_NAME,
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
};

/* ---------- TARGET (shop_db) CONFIG ---------- */
const targetConfig = {
  server: process.env.DB_SERVER,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  options: {
    encrypt: true,
    trustServerCertificate: true,
  },
};

async function run() {
  /* ---------- SOURCE ---------- */
  const sourcePool = await new sql.ConnectionPool(sourceConfig).connect();

  const { recordset: categories } = await sourcePool.query(`
    SELECT CodInst, Descrip, Nivel, InsPadre
    FROM dbo.SAINSTA
  `);

  /* ---------- TARGET ---------- */
  const targetPool = await new sql.ConnectionPool(targetConfig).connect();

  console.log(`Importing ${categories.length} categories...`);

  for (const row of categories) {
    await targetPool
      .request()
      .input("id", sql.Int, row.CodInst)
      .input("name", sql.NVarChar, row.Descrip)
      .input("level", sql.Int, row.Nivel)
      .input(
        "parent_id",
        sql.Int,
        row.Nivel === 2 ? row.InsPadre : null
      )
      .query(`
        IF NOT EXISTS (SELECT 1 FROM dbo.categories WHERE id = @id)
        INSERT INTO dbo.categories (id, name, level, parent_id)
        VALUES (@id, @name, @level, @parent_id)
      `);
  }

  console.log("✅ Categories imported correctly");
  process.exit(0);
}

run().catch(err => {
  console.error("❌ Import failed:", err);
  process.exit(1);
});

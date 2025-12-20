require("dotenv").config();
const sql = require("mssql");

async function test() {
  await sql.connect({
    server: process.env.ERP_DB_SERVER,
    port: parseInt(process.env.ERP_DB_PORT),
    user: process.env.ERP_DB_USER,
    password: process.env.ERP_DB_PASS,
    database: process.env.ERP_DB_NAME,
    options: {
      encrypt: false,
      trustServerCertificate: true,
    },
  });

  const result = await sql.query(`SELECT TOP 5 CodInst, Descrip FROM dbo.SAINSTA`);
  console.log(result.recordset);
  process.exit(0);
}

test().catch(console.error);

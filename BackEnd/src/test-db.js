const { sql, poolPromise } = require("./config/db");

async function test() {
  const pool = await poolPromise;
  const result = await pool
    .request()
    .query("SELECT GETDATE() AS now");

  console.log(result.recordset);
}

test();

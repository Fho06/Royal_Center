require("dotenv").config({ path: ".env" });

const sql = require("mssql");

console.log("DB_SERVER:", process.env.DB_SERVER);


const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  server: process.env.DB_SERVER,
  database: process.env.DB_NAME,
  options: {
    encrypt: true,
    trustServerCertificate: true,
    enableArithAbort: true
    }
};

const poolPromise = new sql.ConnectionPool(config)
  .connect()
  .then(pool => {
    console.log("Connected to SQL Server");
    return pool;
  })
  .catch(err => {
    console.error("Database Connection Failed:", err);
  });

module.exports = {
  sql,
  poolPromise
};

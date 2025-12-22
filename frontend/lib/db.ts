import sql from "mssql";

const config: sql.config = {
  user: process.env.AZ_DB_USER,
  password: process.env.AZ_DB_PASS,
  server: process.env.AZ_DB_SERVER!,
  database: process.env.AZ_DB_NAME!,
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
if (!process.env.AZ_DB_SERVER) {
  throw new Error("AZ_DB_SERVER is not defined");
}

let pool: sql.ConnectionPool | null = null;

export async function getPool() {
  if (!pool) {
    pool = await sql.connect(config);
  }
  return pool;
}
//hi
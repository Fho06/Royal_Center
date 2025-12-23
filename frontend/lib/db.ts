import sql from "mssql";

if (!process.env.AZ_DB_SERVER) {
  throw new Error("AZ_DB_SERVER is not defined");
}

const config: sql.config = {
  user: process.env.AZ_DB_USER,
  password: process.env.AZ_DB_PASS,
  server: process.env.AZ_DB_SERVER,
  database: process.env.AZ_DB_NAME,
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

// Global cache (IMPORTANT for Next.js)
declare global {
  // eslint-disable-next-line no-var
  var _sqlPool: sql.ConnectionPool | undefined;
}

export async function getPool(): Promise<sql.ConnectionPool> {
  if (!global._sqlPool) {
    global._sqlPool = await sql.connect(config);
  }
  return global._sqlPool;
}

export { sql };

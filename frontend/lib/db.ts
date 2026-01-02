import sql from "mssql";

if (!process.env.COMMON_SERVER) {
  throw new Error("COMMON_SERVER is not defined");
}

const config: sql.config = {
  user: process.env.WEB_DB_USER,
  password: process.env.WEB_DB_PASS,
  server: process.env.COMMON_SERVER,
  port: Number(process.env.COMMON_PORT) || 1433,
  database: process.env.WEB_DB_NAME,
  options: {
    encrypt: false,
    trustServerCertificate: true,
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

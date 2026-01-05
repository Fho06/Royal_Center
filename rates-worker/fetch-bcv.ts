import axios from "axios";
import * as XLSX from "xlsx";
import sql from "mssql";
import "dotenv/config";
import https from "https";
import * as cheerio from "cheerio";



/* =========================
   CONFIG
   ========================= */

// BCV moves this file often → try multiple known paths
const BCV_XLS_URLS = [
  "https://www.bcv.org.ve/sites/default/files/estadisticas/tipo-cambio-de-referencia-smc.xls",
  "https://www.bcv.org.ve/sites/default/files/estadisticas/tipo_cambio_referencia_smc.xls",
  "https://www.bcv.org.ve/sites/default/files/estadisticas/Tipo%20de%20Cambio%20Referencia%20SMC.xls",
  "https://www.bcv.org.ve/sites/default/files/estadisticas/tipocambio.xls",
];

// BCV has a broken cert chain → scope TLS override to BCV only
const bcvHttpsAgent = new https.Agent({
  rejectUnauthorized: false,
});

/* =========================
   DB CONNECTION
   ========================= */

const dbConfig: sql.config = {
  server: process.env.COMMON_SERVER!,
  database: process.env.WEB_DB_NAME!,
  user: process.env.WEB_DB_USER!,
  password: process.env.WEB_DB_PASS!,
  port: Number(process.env.COMMON_PORT || 1433),
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
};

/* =========================
   DOWNLOAD BCV XLS (ROBUST)
   ========================= */

async function downloadBCVXls(): Promise<Buffer> {
  let lastError: unknown;

  for (const url of BCV_XLS_URLS) {
    try {
      const res = await axios.get(url, {
        responseType: "arraybuffer",
        timeout: 15000,
        httpsAgent: bcvHttpsAgent,
        validateStatus: (status) => status === 200,
      });

      console.log(`[BCV] Using XLS source: ${url}`);
      return Buffer.from(res.data);
    } catch (err) {
      console.warn(`[BCV] Failed URL: ${url}`);
      lastError = err;
    }
  }

  throw new Error("All BCV XLS URLs failed", { cause: lastError });
}

/* =========================
   PARSE USD RATE
   ========================= */


async function fetchBCVUSD() {
  const res = await axios.get("https://www.bcv.org.ve/", {
    timeout: 15000,
    httpsAgent: bcvHttpsAgent,
  });

  const $ = cheerio.load(res.data);

  // USD is rendered inside: <div id="dolar"><strong>...</strong></div>
  const raw = $("#dolar strong").first().text().trim();

  if (!raw) {
    throw new Error("USD rate not found in BCV HTML (selector #dolar strong)");
  }

  // Venezuelan number format: 304,67960000
  const usdRate = Number(raw.replace(/\./g, "").replace(",", "."));

  if (Number.isNaN(usdRate)) {
    throw new Error(`Invalid USD rate parsed: "${raw}"`);
  }

  return {
    rate: usdRate,
    date: new Date(), // BCV uses today's reference implicitly
  };
}


/* =========================
   SAVE TO DB (IDEMPOTENT)
   ========================= */

async function saveRate(rate: number, date: Date) {
  const pool = await sql.connect(dbConfig);

  await pool
    .request()
    .input("date", sql.Date, date)
    .input("rate", sql.Decimal(18, 8), rate)
    .query(`
      MERGE exchange_rates AS t
      USING (SELECT @date AS rate_date) s
      ON t.rate_date = s.rate_date AND t.currency = 'USD'
      WHEN NOT MATCHED THEN
        INSERT (rate_date, currency, rate_bs)
        VALUES (@date, 'USD', @rate);
    `);

  await pool.close();
}

/* =========================
   MAIN
   ========================= */

(async () => {
  try {
    const { rate, date } = await fetchBCVUSD();
    await saveRate(rate, date);

    console.log(
      `[BCV] Stored USD rate ${rate} for ${date.toISOString().slice(0, 10)}`
    );
  } catch (err) {
    console.error("[BCV] Failed:", err);
    process.exit(1);
  }
})();

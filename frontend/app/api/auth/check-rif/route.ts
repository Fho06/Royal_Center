import { NextResponse } from "next/server";
import { getPool, sql } from "@/lib/db";

function formatRIF(raw: string) {
  const cleaned = raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (!/^[A-Z]\d{8}$/.test(cleaned)) return null;
  return cleaned;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const rif = (searchParams.get("rif") || "").trim();

    const formatted = formatRIF(rif);
    if (!formatted) {
      return NextResponse.json({ exists: false, invalid: true });
    }

    const pool = await getPool();
    const result = await pool
      .request()
      .input("rif", sql.VarChar(20), formatted)
      .query(`SELECT TOP 1 1 AS found FROM dbo.users WHERE rif = @rif;`);

    return NextResponse.json({ exists: result.recordset.length > 0, invalid: false });
  } catch (e) {
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}

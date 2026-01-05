import { NextResponse } from "next/server";
import { getPool, sql } from "@/lib/db";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const phoneRaw = (searchParams.get("phone") || "").trim();

    if (!phoneRaw) {
      return NextResponse.json(
        { error: "phone is required" },
        { status: 400 }
      );
    }

    const digits = phoneRaw.replace(/\D/g, "");

    const pool = await getPool();

    const result = await pool
      .request()
      .input("digits", sql.VarChar(20), digits)
      .query(`
        SELECT TOP 1 1 AS found
        FROM dbo.users
        WHERE REPLACE(
                REPLACE(
                  REPLACE(
                    REPLACE(phone, '+', ''),
                  ' ', ''),
                '-', ''),
              CHAR(160), '') = @digits
      `);

    return NextResponse.json({
      exists: result.recordset.length > 0,
    });
  } catch (err) {
    console.error("check-phone failed:", err);
    return NextResponse.json(
      { error: "failed" },
      { status: 500 }
    );
  }
}

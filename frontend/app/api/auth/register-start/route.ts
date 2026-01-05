import { NextResponse } from "next/server";
import { getPool, sql } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const {
      phone,
      email,
      accountType,
      firstName,
      lastName,
      gender,
      companyName,
      rif,
    } = body;

    if (!phone || !accountType || !rif) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const pool = await getPool();

    /* --------------------------------
       HARD BLOCK: phone already exists
       -------------------------------- */
    const phoneCheck = await pool
      .request()
      .input("phone", sql.VarChar(20), phone)
      .query(`
        SELECT 1
        FROM users
        WHERE phone = @phone
      `);

    if (phoneCheck.recordset.length > 0) {
      return NextResponse.json(
        { error: "Phone already registered" },
        { status: 409 }
      );
    }

    /* --------------------------------
       HARD BLOCK: rif already exists
       -------------------------------- */
    const rifCheck = await pool
      .request()
      .input("rif", sql.VarChar(20), rif)
      .query(`
        SELECT 1
        FROM users
        WHERE rif = @rif
      `);

    if (rifCheck.recordset.length > 0) {
      return NextResponse.json(
        { error: "RIF already registered" },
        { status: 409 }
      );
    }

    /* --------------------------------
       CREATE INACTIVE USER
       -------------------------------- */
    const result = await pool
      .request()
      .input("phone", sql.VarChar(20), phone)
      .input("email", sql.VarChar(255), email || null)
      .input("account_type", sql.VarChar(50), accountType)
      .input("first_name", sql.VarChar(100), firstName || null)
      .input("last_name", sql.VarChar(100), lastName || null)
      .input("gender", sql.VarChar(20), gender || null)
      .input("company_name", sql.VarChar(255), companyName || null)
      .input("rif", sql.VarChar(20), rif)
      .query(`
        INSERT INTO users (
          phone,
          email,
          account_type,
          first_name,
          last_name,
          gender,
          company_name,
          rif,
          terms_accepted_at,
          phone_verified,
          passcode_hash
        )
        OUTPUT INSERTED.user_id
        VALUES (
          @phone,
          @email,
          @account_type,
          @first_name,
          @last_name,
          @gender,
          @company_name,
          @rif,
          SYSUTCDATETIME(),
          0,
          NULL
        );
      `);

    const userId = result.recordset[0].user_id;

    return NextResponse.json({ userId });
  } catch (err) {
    console.error("register-start error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

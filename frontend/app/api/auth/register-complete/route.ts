import { NextResponse } from "next/server";
import { getPool, sql } from "@/lib/db";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

/* =========================
   HELPERS
   ========================= */
function formatRIF(raw: string) {
  const cleaned = raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (cleaned.length < 9) return null;

  const letter = cleaned[0];
  const body = cleaned.slice(1, -1);
  const digit = cleaned.slice(-1);

  return `${letter}-${body}-${digit}`;
}

export async function POST(req: Request) {
  /* =========================
     ENV VALIDATION (FAIL FAST)
     ========================= */
  if (!process.env.JWT_SECRET) {
    console.error("JWT_SECRET is not defined");
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 }
    );
  }

  try {
    const {
      phone, // WITHOUT +58
      email,
      accountType,
      firstName,
      lastName,
      gender,
      companyName,
      rif,
      termsAccepted,
      passcode, // 4 digits
    } = await req.json();

    /* =========================
       BASIC VALIDATION
       ========================= */
    if (!phone || !termsAccepted || !/^\d{4}$/.test(passcode)) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (!["natural", "juridico"].includes(accountType)) {
      return NextResponse.json(
        { error: "Invalid account type" },
        { status: 400 }
      );
    }

    const fullPhone = `+58${phone}`;

    /* =========================
       ACCOUNT TYPE VALIDATION
       ========================= */
    let formattedRif: string | null = null;

    if (accountType === "natural") {
      if (!firstName || !lastName || !["male", "female"].includes(gender)) {
        return NextResponse.json(
          { error: "Natural requires first name, last name, and gender" },
          { status: 400 }
        );
      }
    } else {
      if (!companyName || !rif) {
        return NextResponse.json(
          { error: "Juridico requires company name and RIF" },
          { status: 400 }
        );
      }

      formattedRif = formatRIF(rif);
      if (!formattedRif) {
        return NextResponse.json(
          { error: "Invalid RIF format" },
          { status: 400 }
        );
      }
    }

    /* =========================
       HASH PASSCODE
       ========================= */
    const passcodeHash = await bcrypt.hash(passcode, 10);

    const pool = await getPool();
    const tx = pool.transaction();

    /* =========================
       TRANSACTION START
       ========================= */
    await tx.begin();

    try {
      const result = await tx
        .request()
        .input("phone", sql.VarChar(15), fullPhone)
        .input("email", sql.VarChar(255), email || null)
        .input("account_type", sql.VarChar(10), accountType)
        .input("first_name", sql.VarChar(100), firstName || null)
        .input("last_name", sql.VarChar(150), lastName || null)
        .input("gender", sql.VarChar(6), gender || null)
        .input("company_name", sql.VarChar(255), companyName || null)
        .input("rif", sql.VarChar(15), formattedRif)
        .input("passcode_hash", sql.VarChar(255), passcodeHash)
        .input("terms_accepted_at", sql.DateTime, new Date())
        .query(`
          INSERT INTO dbo.users (
            phone,
            email,
            account_type,
            first_name,
            last_name,
            gender,
            company_name,
            rif,
            passcode_hash,
            otp_verified,
            role,
            terms_accepted_at
          )
          OUTPUT INSERTED.user_id, INSERTED.role
          VALUES (
            @phone,
            @email,
            @account_type,
            @first_name,
            @last_name,
            @gender,
            @company_name,
            @rif,
            @passcode_hash,
            1,
            'user',
            @terms_accepted_at
          )
        `);

      const user = result.recordset[0];

      const token = jwt.sign(
        {
          userId: user.user_id,
          role: user.role,
        },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
      );

      await tx.commit();
      return NextResponse.json({ token });

    } catch (err) {
      await tx.rollback();
      throw err;
    }

  } catch (err: any) {
    if (err?.number === 2627) {
      return NextResponse.json(
        { error: "Account already exists" },
        { status: 409 }
      );
    }

    console.error("Register-complete error:", err);
    return NextResponse.json(
      { error: "Registration failed" },
      { status: 500 }
    );
  }
}

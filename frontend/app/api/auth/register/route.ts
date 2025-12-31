import { NextResponse } from "next/server";
import { getPool, sql } from "@/lib/db";

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
  try {
    const {
      phone,
      email,
      accountType,
      firstName,
      lastName,
      gender,
      companyName,
      rif,
      termsAccepted,
    } = await req.json();

    /* =========================
       BASE VALIDATION
       ========================= */
    if (!phone || !termsAccepted) {
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

    /* =========================
       ACCOUNT-TYPE VALIDATION
       ========================= */
    let formattedRif: string | null = null;

    if (accountType === "natural") {
      if (
        !firstName ||
        !lastName ||
        !["male", "female"].includes(gender)
      ) {
        return NextResponse.json(
          {
            error:
              "Natural account requires first name, last name, and gender",
          },
          { status: 400 }
        );
      }
    }

    if (accountType === "juridico") {
      if (!companyName || !rif) {
        return NextResponse.json(
          { error: "Juridico account requires company name and RIF" },
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
       INSERT
       ========================= */
    const pool = await getPool();

    await pool
      .request()
      .input("phone", sql.VarChar(15), phone)
      .input("email", sql.VarChar(255), email || null)
      .input("account_type", sql.VarChar(10), accountType)
      .input("first_name", sql.VarChar(100), firstName || null)
      .input("last_name", sql.VarChar(150), lastName || null)
      .input("gender", sql.VarChar(6), gender || null)
      .input("company_name", sql.VarChar(255), companyName || null)
      .input("rif", sql.VarChar(15), formattedRif)
      .input("terms_accepted_at", sql.DateTime, new Date())
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
          otp_verified,
          terms_accepted_at
        )
        VALUES (
          @phone,
          @email,
          @account_type,
          @first_name,
          @last_name,
          @gender,
          @company_name,
          @rif,
          1,
          @terms_accepted_at
        )
      `);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    if (err?.number === 2627) {
      return NextResponse.json(
        { error: "Account already exists" },
        { status: 409 }
      );
    }

    console.error("Register error:", err);
    return NextResponse.json(
      { error: "Registration failed" },
      { status: 500 }
    );
  }
}

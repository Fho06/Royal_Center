import { NextResponse } from "next/server";
import { getPool, sql } from "@/lib/db";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

/* =========================
   HELPERS
   ========================= */

function formatRIF(raw: string) {
  if (!raw) return null;

  const cleaned = raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (cleaned.length < 9) return null;

  return raw
}

/* =========================
   ACCOUNT TYPES
   ========================= */
const VALID_ACCOUNT_TYPES = [
  "natural",
  "extranjero",
  "juridico",
  "rif_persona_natural",
  "rif_v",
  "rif_e",
  "gobierno",
  "pasaporte",
] as const;

type AccountType = (typeof VALID_ACCOUNT_TYPES)[number];

export async function POST(req: Request) {
  /* =========================
     ENV VALIDATION
     ========================= */
  if (!process.env.JWT_SECRET) {
    console.error("❌ JWT_SECRET missing");
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 }
    );
  }

  try {
    const body = await req.json();

    console.log("📥 Register payload:", body);

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
    } = body;

    /* =========================
       BASIC VALIDATION
       ========================= */
    if (!phone || !termsAccepted || !/^\d{4}$/.test(passcode)) {
      console.error("❌ Missing basic fields");
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const normalizedAccountType = String(accountType).toLowerCase();

    if (
      !VALID_ACCOUNT_TYPES.includes(
        normalizedAccountType as AccountType
      )
    ) {
      console.error(
        "❌ Invalid account type:",
        normalizedAccountType
      );
      return NextResponse.json(
        { error: "Invalid account type" },
        { status: 400 }
      );
    }

    const isJuridico = normalizedAccountType === "juridico";

    /* =========================
       RIF (REQUIRED FOR ALL)
       ========================= */
    const formattedRif = formatRIF(rif);
    if (!formattedRif) {
      console.error("❌ Invalid RIF:", rif);
      return NextResponse.json(
        { error: "Invalid RIF format" },
        { status: 400 }
      );
    }

    /* =========================
       ACCOUNT TYPE VALIDATION
       ========================= */
    if (isJuridico) {
      if (!companyName) {
        console.error("❌ Missing company name");
        return NextResponse.json(
          { error: "Company name is required" },
          { status: 400 }
        );
      }
    } else {
      if (
        !firstName ||
        !lastName ||
        !["femenino", "masculino"].includes(gender)
      ) {
        console.error("❌ Missing personal info", {
          firstName,
          lastName,
          gender,
        });
        return NextResponse.json(
          { error: "Información Personal Requerida" },
          { status: 400 }
        );
      }
    }

    const fullPhone = `+58${phone}`;
    const passcodeHash = await bcrypt.hash(passcode, 10);

    console.log("📝 Creating user:", {
      phone: fullPhone,
      accountType: normalizedAccountType,
      rif: formattedRif,
      isJuridico,
    });

    /* =========================
       DB INSERT (TRANSACTION)
       ========================= */
    const pool = await getPool();
    const tx = pool.transaction();

    await tx.begin();

    try {
      const result = await tx
        .request()
        .input("phone", sql.VarChar(15), fullPhone)
        .input("email", sql.VarChar(255), email || null)
        .input(
          "account_type",
          sql.VarChar(30),
          normalizedAccountType
        )
        .input(
          "first_name",
          sql.VarChar(100),
          isJuridico ? null : firstName
        )
        .input(
          "last_name",
          sql.VarChar(150),
          isJuridico ? null : lastName
        )
        .input(
          "gender",
          sql.VarChar(10),
          isJuridico ? null : gender
        )
        .input(
          "company_name",
          sql.VarChar(255),
          isJuridico ? companyName : null
        )
        .input("rif", sql.VarChar(20), formattedRif)
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

      console.log("✅ User created:", user.user_id);

      return NextResponse.json({ token });
    } catch (err) {
      await tx.rollback();
      console.error("🔥 Transaction failed:", err);
      throw err;
    }
  } catch (err: any) {
    if (err?.number === 2627) {
      console.error("⚠️ Duplicate account");
      return NextResponse.json(
        { error: "Account already exists" },
        { status: 409 }
      );
    }

    console.error("🔥 Register-complete error:", err);
    return NextResponse.json(
      { error: "Registration failed" },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { getPool, sql } from "@/lib/db";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

/* =========================
   HELPERS
   ========================= */

const VALID_RIF_PREFIX = new Set(["V", "E", "J", "G", "P"]);

/** Accepts things like "V12345678", "v-12345678", "V 12345678" */
function formatRIF(raw: string) {
  if (!raw) return null;

  const cleaned = raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
  // Must be 1 letter + 8 digits
  if (!/^[A-Z]\d{8}$/.test(cleaned)) return null;

  const prefix = cleaned[0];
  if (!VALID_RIF_PREFIX.has(prefix)) return null;

  return cleaned; // canonical form: "V12345678"
}

/** Try to infer which unique constraint failed (optional but helpful) */
function guessDuplicateField(err: any) {
  const msg = String(err?.message || "").toLowerCase();
  // These checks depend on your SQL constraint/index names.
  // If you have named constraints like UQ_users_phone / UQ_users_rif, match those.
  if (msg.includes("phone")) return "phone";
  if (msg.includes("rif")) return "rif";
  return null;
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
  if (!process.env.JWT_SECRET) {
    console.error("❌ JWT_SECRET missing");
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
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
      rif,          // should be like "V12345678" from frontend
      termsAccepted,
      passcode,     // 4 digits
    } = body;

    /* =========================
       BASIC VALIDATION
       ========================= */
    if (!phone || !termsAccepted || !/^\d{4}$/.test(String(passcode || ""))) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Optional: ensure phone is digits only (since you store "+58" + digits)
    if (!/^\d{7,11}$/.test(String(phone))) {
      return NextResponse.json({ error: "Invalid phone format" }, { status: 400 });
    }

    const normalizedAccountType = String(accountType).toLowerCase();

    if (!VALID_ACCOUNT_TYPES.includes(normalizedAccountType as AccountType)) {
      return NextResponse.json({ error: "Invalid account type" }, { status: 400 });
    }

    const isJuridico = normalizedAccountType === "juridico";

    /* =========================
       RIF (REQUIRED FOR ALL)
       ========================= */
    const formattedRif = formatRIF(String(rif || ""));
    if (!formattedRif) {
      return NextResponse.json(
        { error: "Invalid RIF format (must be letter + 8 digits, e.g. V12345678)" },
        { status: 400 }
      );
    }

    /* =========================
       ACCOUNT TYPE VALIDATION
       ========================= */
    if (isJuridico) {
      if (!companyName) {
        return NextResponse.json({ error: "Company name is required" }, { status: 400 });
      }
    } else {
      if (!firstName || !lastName || !["femenino", "masculino"].includes(gender)) {
        return NextResponse.json({ error: "Información Personal Requerida" }, { status: 400 });
      }
    }

    const fullPhone = `+58${phone}`;
    const passcodeHash = await bcrypt.hash(String(passcode), 10);

    const pool = await getPool();
    const tx = pool.transaction();
    await tx.begin();

    try {
      /* =========================
         OPTIONAL: pre-check duplicates
         (gives cleaner errors than relying on 2627)
         ========================= */
      const dup = await tx
        .request()
        .input("phone", sql.VarChar(15), fullPhone)
        .input("rif", sql.VarChar(20), formattedRif)
        .query(`
          SELECT
            MAX(CASE WHEN phone = @phone THEN 1 ELSE 0 END) AS phone_exists,
            MAX(CASE WHEN rif = @rif THEN 1 ELSE 0 END) AS rif_exists
          FROM dbo.users
          WHERE phone = @phone OR rif = @rif;
        `);

      const row = dup.recordset?.[0];
      if (row?.phone_exists) {
        await tx.rollback();
        return NextResponse.json(
          { error: "Phone already exists", field: "phone" },
          { status: 409 }
        );
      }
      if (row?.rif_exists) {
        await tx.rollback();
        return NextResponse.json(
          { error: "RIF already exists", field: "rif" },
          { status: 409 }
        );
      }

      const result = await tx
        .request()
        .input("phone", sql.VarChar(15), fullPhone)
        .input("email", sql.VarChar(255), email || null)
        .input("account_type", sql.VarChar(30), normalizedAccountType)
        .input("first_name", sql.VarChar(100), isJuridico ? null : firstName)
        .input("last_name", sql.VarChar(150), isJuridico ? null : lastName)
        .input("gender", sql.VarChar(10), isJuridico ? null : gender)
        .input("company_name", sql.VarChar(255), isJuridico ? companyName : null)
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
          );
        `);

      const user = result.recordset[0];

      const token = jwt.sign(
        { userId: user.user_id, role: user.role },
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
    // Unique constraint violation
    if (err?.number === 2627) {
      const field = guessDuplicateField(err);
      return NextResponse.json(
        { error: "Account already exists", field },
        { status: 409 }
      );
    }

    console.error("🔥 Register error:", err);
    return NextResponse.json({ error: "Registration failed" }, { status: 500 });
  }
}

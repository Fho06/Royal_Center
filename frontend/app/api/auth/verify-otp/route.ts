import { NextResponse } from "next/server";
import crypto from "crypto";
import { getPool, sql } from "@/lib/db";

/* ===============================
   HELPERS
   =============================== */

function hashOTP(otp: string): string {
  return crypto.createHash("sha256").update(otp).digest("hex");
}

/* ===============================
   POST /api/auth/verify-otp
   =============================== */

export async function POST(req: Request) {
  try {
    const { phone, otp } = await req.json();

    if (!phone || !otp) {
      return NextResponse.json(
        { error: "Missing phone or otp" },
        { status: 400 }
      );
    }

    // 🔐 Normalize phone EXACTLY like send-otp
    const normalizedPhone =
      phone.startsWith("+") ? phone : `+58${phone}`;

    const pool = await getPool();
    const otpHash = hashOTP(String(otp));
    const now = new Date();

    /* --------------------------------
       Fetch user with OTP
       -------------------------------- */
    const result = await pool
      .request()
      .input("phone", sql.VarChar(20), normalizedPhone)
      .input("hash", sql.VarChar(64), otpHash)
      .query(`
        SELECT
          otp_expires_at,
          phone_verified
        FROM users
        WHERE phone = @phone
          AND otp_code_hash = @hash
      `);

    if (result.recordset.length === 0) {
      return NextResponse.json(
        { error: "Código inválido" },
        { status: 400 }
      );
    }

    const row = result.recordset[0];

    if (row.phone_verified) {
      return NextResponse.json(
        { error: "Teléfono ya verificado" },
        { status: 400 }
      );
    }

    if (!row.otp_expires_at || new Date(row.otp_expires_at) < now) {
      return NextResponse.json(
        { error: "El código expiró" },
        { status: 400 }
      );
    }

    /* --------------------------------
       Mark phone as verified
       -------------------------------- */
    await pool
      .request()
      .input("phone", sql.VarChar(20), normalizedPhone)
      .query(`
        UPDATE users
        SET
          phone_verified = 1,
          otp_code_hash = NULL,
          otp_expires_at = NULL
        WHERE phone = @phone
      `);

    return NextResponse.json({ verified: true });
  } catch (err) {
    console.error("verify-otp error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

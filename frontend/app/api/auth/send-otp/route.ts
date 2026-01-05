import { NextResponse } from "next/server";
import crypto from "crypto";
import { getPool, sql } from "@/lib/db";

/* ===============================
   CONFIG
   =============================== */

const OTP_TTL_MS = 5 * 60 * 1000; // 5 minutes
const OTP_RESEND_COOLDOWN_MS = 60 * 1000; // 60 seconds

/* ===============================
   HELPERS
   =============================== */

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function hashOTP(otp: string): string {
  return crypto.createHash("sha256").update(otp).digest("hex");
}

/* ===============================
   POST /api/auth/send-otp
   =============================== */

export async function POST(req: Request) {
  try {
    const { phone } = await req.json();

    if (!phone) {
      return NextResponse.json(
        { error: "Missing phone" },
        { status: 400 }
      );
    }

    // Normalize phone (SMS-only, Venezuela default)
    const normalizedPhone =
      phone.startsWith("+") ? phone : `+58${phone}`;

    // Guard Infobip config
    if (
      !process.env.INFOBIP_BASE_URL ||
      !process.env.INFOBIP_API_KEY
    ) {
      console.error("❌ Infobip env vars missing");
      return NextResponse.json(
        { error: "SMS service not configured" },
        { status: 500 }
      );
    }

    const pool = await getPool();

    /* --------------------------------
       Ensure user exists & inactive
       -------------------------------- */
    const userRes = await pool
      .request()
      .input("phone", sql.VarChar(20), normalizedPhone)
      .query(`
        SELECT
          user_id,
          phone_verified,
          otp_expires_at
        FROM users
        WHERE phone = @phone
      `);

    if (userRes.recordset.length === 0) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    const user = userRes.recordset[0];

    if (user.phone_verified) {
      return NextResponse.json(
        { error: "Phone already verified" },
        { status: 400 }
      );
    }

    /* --------------------------------
       Simple resend cooldown
       -------------------------------- */
    if (
      user.otp_expires_at &&
      new Date(user.otp_expires_at) >
        new Date(Date.now() - OTP_RESEND_COOLDOWN_MS)
    ) {
      return NextResponse.json(
        { error: "OTP recently sent. Please wait." },
        { status: 429 }
      );
    }

    /* --------------------------------
       Generate OTP
       -------------------------------- */
    const otp = generateOTP();
    const otpHash = hashOTP(otp);
    const expiresAt = new Date(Date.now() + OTP_TTL_MS);

    /* --------------------------------
       Store OTP on user row
       -------------------------------- */
    await pool
      .request()
      .input("phone", sql.VarChar(20), normalizedPhone)
      .input("hash", sql.VarChar(64), otpHash)
      .input("exp", sql.DateTime2, expiresAt)
      .query(`
        UPDATE users
        SET
          otp_code_hash = @hash,
          otp_expires_at = @exp
        WHERE phone = @phone
      `);

    /* --------------------------------
       DEBUG LOGS (DEV ONLY)
       -------------------------------- */
    console.log("📲 send-otp called");
    console.log("📞 Phone:", normalizedPhone);

    if (process.env.NODE_ENV !== "production") {
      console.log("🔐 DEV OTP:", otp);
    }

    console.log("⏱ OTP expires at:", expiresAt);

    /* --------------------------------
       Send SMS via Infobip
       -------------------------------- */
    const res = await fetch(
      `${process.env.INFOBIP_BASE_URL}/sms/2/text/advanced`,
      {
        method: "POST",
        headers: {
          Authorization: `App ${process.env.INFOBIP_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: [
            {
              from: process.env.INFOBIP_SENDER || "TEST",
              destinations: [{ to: normalizedPhone }],
              text: `Tu código de verificación es ${otp}. Expira en 5 minutos.`,
            },
          ],
        }),
      }
    );

    const responseText = await res.text();

    console.log("📡 Infobip status:", res.status);
    console.log("📡 Infobip response:", responseText);

    if (!res.ok) {
      console.error("❌ Infobip error:", responseText);
      return NextResponse.json(
        { error: "Failed to send OTP" },
        { status: 502 }
      );
    }

    return NextResponse.json({ sent: true });
  } catch (err) {
    console.error("🔥 send-otp error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

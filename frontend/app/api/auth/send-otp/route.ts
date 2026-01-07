import { NextResponse } from "next/server";
import crypto from "crypto";
import twilio from "twilio";
import { getPool, sql } from "@/lib/db";

export const runtime = "nodejs";

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

    // Normalize phone (Venezuela default)
    const normalizedPhone =
      phone.startsWith("+") ? phone : `+58${phone}`;

    // Guard Twilio config
    if (
      !process.env.TWILIO_ACCOUNT_SID ||
      !process.env.TWILIO_AUTH_TOKEN ||
      !process.env.TWILIO_WHATSAPP_FROM
    ) {
      console.error("❌ Twilio WhatsApp env vars missing");
      return NextResponse.json(
        { error: "Messaging service not configured" },
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
       Resend cooldown
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
       Store OTP
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
       Send WhatsApp OTP (PRODUCTION)
       -------------------------------- */
    const client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );

    try {
      const message = await client.messages.create({
        from: process.env.TWILIO_WHATSAPP_FROM,
        to: `whatsapp:${normalizedPhone}`,

        // MUST match approved template
        contentSid: process.env.TWILIO_OTP_TEMPLATE_SID,
        contentVariables: JSON.stringify({
          "1": otp,
          "2": "5",
        }),
      });

      console.log("📨 WhatsApp SID:", message.sid);
    } catch (err: any) {
      console.error(
        "❌ WhatsApp PROD OTP failed:",
        err.code,
        err.message
      );

      return NextResponse.json(
        { error: "Failed to send WhatsApp OTP" },
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

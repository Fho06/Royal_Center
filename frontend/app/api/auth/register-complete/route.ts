import { NextResponse } from "next/server";
import { getPool, sql } from "@/lib/db";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

/* =========================
   POST /auth/register-complete
   ========================= */

export async function POST(req: Request) {
  if (!process.env.JWT_SECRET) {
    console.error("❌ JWT_SECRET missing");
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 }
    );
  }

  try {
    const body = await req.json();
    const { phone, passcode } = body;

    /* =========================
       BASIC VALIDATION (ONLY WHAT MATTERS NOW)
       ========================= */

    if (!phone || !/^\d{4}$/.test(String(passcode || ""))) {
      return NextResponse.json(
        { error: "Missing phone or invalid passcode" },
        { status: 400 }
      );
    }

    if (!/^\d{7,11}$/.test(String(phone))) {
      return NextResponse.json(
        { error: "Invalid phone format" },
        { status: 400 }
      );
    }

    // Normalize phone exactly like send-otp / verify-otp
    const normalizedPhone = `+58${phone}`;

    const passcodeHash = await bcrypt.hash(String(passcode), 10);

    const pool = await getPool();
    const tx = pool.transaction();
    await tx.begin();

    try {
      /* =========================
         FINALIZE EXISTING USER
         ========================= */

      const result = await tx
        .request()
        .input("phone", sql.VarChar(20), normalizedPhone)
        .input("passcode_hash", sql.VarChar(255), passcodeHash)
        .query(`
          UPDATE users
          SET
            passcode_hash = @passcode_hash
          OUTPUT INSERTED.user_id, INSERTED.role
          WHERE phone = @phone
            AND phone_verified = 1
            AND passcode_hash IS NULL;
        `);

      if (result.recordset.length === 0) {
        await tx.rollback();
        return NextResponse.json(
          {
            error:
              "OTP not verified or account already activated",
          },
          { status: 403 }
        );
      }

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
  } catch (err) {
    console.error("🔥 register-complete error:", err);
    return NextResponse.json(
      { error: "Registration failed" },
      { status: 500 }
    );
  }
}

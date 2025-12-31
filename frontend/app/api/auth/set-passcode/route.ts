import { NextResponse } from "next/server";
import { getPool, sql } from "@/lib/db";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  try {
    const { phone, passcode } = await req.json();

    if (!phone || !/^\d{4}$/.test(passcode)) {
      return NextResponse.json(
        { error: "Invalid passcode" },
        { status: 400 }
      );
    }

    const fullPhone = `+58${phone}`;
    const hash = await bcrypt.hash(passcode, 10);
    const pool = await getPool();

    const result = await pool
      .request()
      .input("phone", sql.VarChar(15), fullPhone)
      .input("passcode_hash", sql.VarChar(255), hash)
      .query(`
        UPDATE users
        SET passcode_hash = @passcode_hash
        WHERE phone = @phone
          AND otp_verified = 1
      `);

    if (result.rowsAffected[0] === 0) {
      return NextResponse.json(
        { error: "User not found or OTP not verified" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Set passcode error:", err);
    return NextResponse.json(
      { error: "Failed to set passcode" },
      { status: 500 }
    );
  }
}

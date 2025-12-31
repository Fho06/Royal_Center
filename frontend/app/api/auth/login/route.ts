import { NextResponse } from "next/server";
import { getPool, sql } from "@/lib/db";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

export async function POST(req: Request) {
  try {
    const { phone, passcode } = await req.json();

    if (!phone || !/^\d{4}$/.test(passcode)) {
      return NextResponse.json(
        { error: "Phone and 4-digit passcode required" },
        { status: 400 }
      );
    }

    // ✅ Normalize phone (FRONTEND SENDS WITHOUT +58)
    const fullPhone = `+58${phone}`;

    const pool = await getPool();

    const result = await pool
      .request()
      .input("phone", sql.VarChar(15), fullPhone)
      .query(`
        SELECT user_id, passcode_hash, role
        FROM dbo.users
        WHERE phone = @phone
          AND otp_verified = 1
      `);

    if (result.recordset.length === 0) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    const user = result.recordset[0];

    if (!user.passcode_hash) {
      return NextResponse.json(
        { error: "Passcode not set" },
        { status: 403 }
      );
    }

    const valid = await bcrypt.compare(
      passcode,
      user.passcode_hash
    );

    if (!valid) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    const token = jwt.sign(
      {
        userId: user.user_id,
        role: user.role,
      },
      process.env.JWT_SECRET!,
      { expiresIn: "7d" }
    );

    return NextResponse.json({ token });
  } catch (err) {
    console.error("Login error:", err);
    return NextResponse.json(
      { error: "Login failed" },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { getPool, sql } from "@/lib/db";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    if (!email || password.length < 6) {
      return NextResponse.json(
        { error: "Invalid input" },
        { status: 400 }
      );
    }

    const hash = await bcrypt.hash(password, 10);
    const pool = await getPool();

    await pool
      .request()
      .input("email", sql.VarChar, email)
      .input("password", sql.VarChar, hash)
      .query(`
        INSERT INTO users (email, password_hash)
        VALUES (@email, @password)
      `);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    if (err?.number === 2627) {
      return NextResponse.json(
        { error: "User already exists" },
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

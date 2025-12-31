import { NextResponse } from "next/server";
import { getPool, sql } from "@/lib/db";
import jwt from "jsonwebtoken";

/* ===============================
   AUTH
   =============================== */
function getUser(req: Request) {
  const auth = req.headers.get("authorization");
  if (!auth) return null;

  try {
    return jwt.verify(
      auth.replace("Bearer ", ""),
      process.env.JWT_SECRET!
    ) as { userId: number };
  } catch {
    return null;
  }
}

/* ===============================
   GET /api/profile
   =============================== */
export async function GET(req: Request) {
  const user = getUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const pool = await getPool();

  const result = await pool
    .request()
    .input("user_id", sql.Int, user.userId)
    .query(`
      SELECT
        phone,
        email,
        first_name,
        last_name,
        gender,
        dob_day,
        dob_month,
        dob_year
      FROM dbo.users
      WHERE user_id = @user_id
    `);

  if (result.recordset.length === 0) {
    return NextResponse.json(
      { error: "Profile not found" },
      { status: 404 }
    );
  }

  return NextResponse.json({ profile: result.recordset[0] });
}

/* ===============================
   PUT /api/profile
   =============================== */
export async function PUT(req: Request) {
  const user = getUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const pool = await getPool();

  await pool
    .request()
    .input("user_id", sql.Int, user.userId)
    .input("first_name", sql.VarChar(100), body.firstName || null)
    .input("last_name", sql.VarChar(150), body.lastName || null)
    .input("gender", sql.VarChar(6), body.gender || null)
    .input("dob_day", sql.Int, body.dobDay || null)
    .input("dob_month", sql.VarChar(15), body.dobMonth || null)
    .input("dob_year", sql.Int, body.dobYear || null)
    .query(`
      UPDATE dbo.users
      SET
        first_name = @first_name,
        last_name = @last_name,
        gender = @gender,
        dob_day = @dob_day,
        dob_month = @dob_month,
        dob_year = @dob_year
      WHERE user_id = @user_id
    `);

  return NextResponse.json({ success: true });
}

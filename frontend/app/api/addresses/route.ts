import { NextResponse } from "next/server";
import { getPool, sql } from "@/lib/db";
import jwt from "jsonwebtoken";

/* ===============================
   AUTH HELPER
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
   GET /api/addresses
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
        address_id,
        label,
        address_1,
        address_2,
        country,
        state,
        city,
        municipio,
        is_default,
        created_at
      FROM dbo.user_addresses
      WHERE user_id = @user_id
      ORDER BY is_default DESC, created_at DESC
    `);

  return NextResponse.json({ addresses: result.recordset });
}

/* ===============================
   POST /api/addresses
   =============================== */
export async function POST(req: Request) {
  const user = getUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const {
    label,
    address_1,
    address_2,
    country,
    state,
    city,
    municipio,
    is_default,
  } = await req.json();

  if (!address_1 || !country || !state || !city || !municipio) {
    return NextResponse.json(
      { error: "Missing required address fields" },
      { status: 400 }
    );
  }

  const pool = await getPool();
  const tx = new sql.Transaction(pool);
  await tx.begin();

  try {
    // If this address is default → unset previous defaults
    if (is_default) {
      await tx
        .request()
        .input("user_id", sql.Int, user.userId)
        .query(`
          UPDATE dbo.user_addresses
          SET is_default = 0
          WHERE user_id = @user_id
        `);
    }

    await tx
      .request()
      .input("user_id", sql.Int, user.userId)
      .input("label", sql.VarChar(50), label || null)
      .input("address_1", sql.VarChar(255), address_1)
      .input("address_2", sql.VarChar(255), address_2 || null)
      .input("country", sql.VarChar(100), country)
      .input("state", sql.VarChar(100), state)
      .input("city", sql.VarChar(100), city)
      .input("municipio", sql.VarChar(100), municipio)
      .input("is_default", sql.Bit, is_default ? 1 : 0)
      .query(`
        INSERT INTO dbo.user_addresses (
          user_id,
          label,
          address_1,
          address_2,
          country,
          state,
          city,
          municipio,
          is_default
        )
        VALUES (
          @user_id,
          @label,
          @address_1,
          @address_2,
          @country,
          @state,
          @city,
          @municipio,
          @is_default
        )
      `);

    await tx.commit();
    return NextResponse.json({ success: true });
  } catch (err) {
    await tx.rollback();
    console.error("Create address error:", err);
    return NextResponse.json(
      { error: "Failed to create address" },
      { status: 500 }
    );
  }
}

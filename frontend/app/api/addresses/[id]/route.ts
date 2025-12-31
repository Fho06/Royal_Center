import { NextRequest, NextResponse } from "next/server";
import { getPool, sql } from "@/lib/db";
import jwt from "jsonwebtoken";

/* ===============================
   AUTH HELPER
   =============================== */
function getUser(req: NextRequest) {
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
   PUT /api/addresses/:id
   =============================== */
export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const user = getUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const addressId = Number(id);

  if (!Number.isFinite(addressId)) {
    return NextResponse.json(
      { error: "Invalid address id" },
      { status: 400 }
    );
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

    const result = await tx
      .request()
      .input("address_id", sql.Int, addressId)
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
        UPDATE dbo.user_addresses
        SET
          label = @label,
          address_1 = @address_1,
          address_2 = @address_2,
          country = @country,
          state = @state,
          city = @city,
          municipio = @municipio,
          is_default = @is_default
        WHERE address_id = @address_id
          AND user_id = @user_id
      `);

    if (result.rowsAffected[0] === 0) {
      throw new Error("Address not found");
    }

    await tx.commit();
    return NextResponse.json({ success: true });
  } catch (err) {
    await tx.rollback();
    console.error("Update address error:", err);
    return NextResponse.json(
      { error: "Failed to update address" },
      { status: 500 }
    );
  }
}

/* ===============================
   DELETE /api/addresses/:id
   =============================== */
export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const user = getUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const addressId = Number(id);

  if (!Number.isFinite(addressId)) {
    return NextResponse.json(
      { error: "Invalid address id" },
      { status: 400 }
    );
  }

  const pool = await getPool();

  await pool
    .request()
    .input("address_id", sql.Int, addressId)
    .input("user_id", sql.Int, user.userId)
    .query(`
      DELETE FROM dbo.user_addresses
      WHERE address_id = @address_id
        AND user_id = @user_id
    `);

  return NextResponse.json({ success: true });
}

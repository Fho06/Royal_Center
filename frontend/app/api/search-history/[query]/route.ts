import { NextRequest, NextResponse } from "next/server";
import { getPool, sql } from "@/lib/db";
import jwt from "jsonwebtoken";

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

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ query: string }> }
) {
  const user = getUser(req);
  if (!user) {
    return NextResponse.json({ ok: true });
  }

  const { query } = await context.params;

  const pool = await getPool();

  await pool
    .request()
    .input("user_id", sql.Int, user.userId)
    .input("query", sql.NVarChar(255), decodeURIComponent(query))
    .query(`
      DELETE FROM search_history
      WHERE user_id = @user_id AND query = @query
    `);

  return NextResponse.json({ ok: true });
}

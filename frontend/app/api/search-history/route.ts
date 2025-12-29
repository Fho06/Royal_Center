import { NextResponse } from "next/server";
import { getPool, sql } from "@/lib/db";
import jwt from "jsonwebtoken";

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

export async function GET(req: Request) {
  const user = getUser(req);
  if (!user) {
    return NextResponse.json([], { status: 200 });
  }

  const pool = await getPool();

  const result = await pool
    .request()
    .input("user_id", sql.Int, user.userId)
    .query(`
      SELECT TOP 8 query
      FROM search_history
      WHERE user_id = @user_id
      ORDER BY created_at DESC
    `);

  return NextResponse.json(
    result.recordset.map(r => r.query)
  );
}

export async function POST(req: Request) {
  const user = getUser(req);
  if (!user) {
    return NextResponse.json({ ok: true });
  }

  const { query } = await req.json();
  if (!query || typeof query !== "string") {
    return NextResponse.json({ error: "Invalid query" }, { status: 400 });
  }

  const pool = await getPool();

  await pool
    .request()
    .input("user_id", sql.Int, user.userId)
    .input("query", sql.NVarChar(255), query.trim())
    .query(`
      MERGE search_history AS t
      USING (SELECT @user_id AS user_id, @query AS query) AS s
      ON t.user_id = s.user_id AND t.query = s.query
      WHEN MATCHED THEN
        UPDATE SET created_at = SYSDATETIME()
      WHEN NOT MATCHED THEN
        INSERT (user_id, query)
        VALUES (@user_id, @query);
    `);

  return NextResponse.json({ ok: true });
}


import { NextResponse } from "next/server";
import { getPool, sql } from "@/lib/db";
import jwt from "jsonwebtoken";

/* ---------- ADMIN AUTH ---------- */
function requireAdmin(req: Request) {
  const auth = req.headers.get("authorization");
  if (!auth) throw new Error("Unauthorized");

  const token = auth.replace("Bearer ", "");
  const user = jwt.verify(token, process.env.JWT_SECRET!) as {
    userId: number;
    role?: string;
  };

  if (user.role !== "admin") {
    throw new Error("Forbidden");
  }

  return user;
}

/* ===============================
   GET /api/admin/orders
   =============================== */
export async function GET(req: Request) {
  try {
    requireAdmin(req);

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");

    const pool = await getPool();
    const request = pool.request();

    let whereClause = "";
    if (status && status !== "all") {
      request.input("status", sql.VarChar, status);
      whereClause = "WHERE o.status = @status";
    }

    const result = await request.query(`
      SELECT
        o.id,
        o.total_amount,
        o.status,
        s.label AS status_label,
        o.created_at,
        u.email
      FROM orders o
      JOIN users u ON u.id = o.user_id
      JOIN order_statuses s ON s.code = o.status
      ${whereClause}
      ORDER BY o.created_at DESC
    `);

    return NextResponse.json({ orders: result.recordset });
  } catch (err: any) {
    const msg = err.message || "Failed to fetch admin orders";

    return NextResponse.json(
      { error: msg },
      {
        status:
          msg === "Unauthorized"
            ? 401
            : msg === "Forbidden"
            ? 403
            : 500,
      }
    );
  }
}

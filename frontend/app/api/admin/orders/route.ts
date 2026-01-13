import { NextResponse } from "next/server";
import { getPool, sql } from "@/lib/db";
import jwt from "jsonwebtoken";

/* ---------- ADMIN AUTH ---------- */
function requireAdmin(req: Request) {
  const auth = req.headers.get("authorization");
  if (!auth) {
    return { error: "Unauthorized", status: 401 } as const;
  }

  try {
    const token = auth.replace("Bearer ", "");
    const user = jwt.verify(token, process.env.JWT_SECRET!) as {
      userId: number;
      role?: string;
    };

    if (user.role !== "admin") {
      return { error: "Forbidden", status: 403 } as const;
    }

    return { user } as const;
  } catch {
    return { error: "Unauthorized", status: 401 } as const;
  }
}

/* ===============================
   GET /api/admin/orders
   =============================== */
export async function GET(req: Request) {
  /* ---------- AUTH ---------- */
  const authResult = requireAdmin(req);
  if ("error" in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    );
  }

  try {
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
        o.order_number,
        o.created_at,
        o.status,
        s.label AS status_label,

        o.total_amount,
        o.subtotal,
        o.tax_amount,
        o.tip_amount,

        o.fulfillment_type,
        o.payment_method,
        o.notes,

        u.email,
        u.phone,

        ua.label        AS address_label,
        ua.address_1,
        ua.address_2,
        ua.city,
        ua.state,
        ua.municipio,
        ua.country

      FROM orders o
      JOIN users u
        ON u.user_id = o.user_id

      JOIN order_statuses s
        ON s.code = o.status

      LEFT JOIN user_addresses ua
        ON ua.address_id = o.address_id
       AND ua.user_id = o.user_id

      ${whereClause}

      ORDER BY o.created_at DESC
    `);

    return NextResponse.json({ orders: result.recordset });
  } catch (err) {
    console.error("Admin orders fetch error:", err);
    return NextResponse.json(
      { error: "Failed to fetch admin orders" },
      { status: 500 }
    );
  }
}

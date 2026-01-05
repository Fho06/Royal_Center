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
   GET /api/admin/orders/[id]
   =============================== */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    requireAdmin(req);

    // ✅ REQUIRED in App Router (Turbo)
    const { id } = await params;
    const orderId = Number(id);

    if (!Number.isFinite(orderId)) {
      return NextResponse.json(
        { error: "Invalid order id" },
        { status: 400 }
      );
    }

    const pool = await getPool();

    /* ---------- ORDER CORE ---------- */
    const orderRes = await pool
      .request()
      .input("id", sql.Int, orderId)
      .query(`
        SELECT
          o.id,
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
        JOIN users u ON u.user_id = o.user_id
        JOIN order_statuses s ON s.code = o.status
        LEFT JOIN user_addresses ua
          ON ua.address_id = o.address_id
         AND ua.user_id = o.user_id

        WHERE o.id = @id
      `);

    if (orderRes.recordset.length === 0) {
      return NextResponse.json(
        { error: "Order not found" },
        { status: 404 }
      );
    }

    /* ---------- ORDER ITEMS ---------- */
    const itemsRes = await pool
      .request()
      .input("order_id", sql.Int, orderId)
      .query(`
        SELECT
          oi.item_id,
          i.name,
          oi.quantity,
          oi.price,
          oi.is_tax_exempt
        FROM order_items oi
        JOIN items i ON i.id = oi.item_id
        WHERE oi.order_id = @order_id
      `);

    return NextResponse.json({
      order: orderRes.recordset[0],
      items: itemsRes.recordset,
    });
  } catch (err: any) {
    const msg = err.message || "Failed to fetch order";

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

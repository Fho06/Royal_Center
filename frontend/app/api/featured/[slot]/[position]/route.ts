import { NextRequest, NextResponse } from "next/server";
import { getPool, sql } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";

/* =========================
   CONSTANTS
   ========================= */

const ALLOWED_SLOTS = new Set([
  "hero_left",
  "hero_right",
  "group_1",
  "group_2",
  "group_3",
  "group_4",
]);

function isValidPosition(slot: string, position: number) {
  if (slot === "hero_left" || slot === "hero_right") {
    return position === 1;
  }
  if (slot.startsWith("group_")) {
    return position >= 1 && position <= 4;
  }
  return false;
}

/* =========================
   PUT /api/featured/:slot/:position
   ========================= */

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ slot: string; position: string }> }
) {
  try {
    // 📦 body
    const body = await req.json();
    const { item_id } = body;
    
    // 🔐 auth
    requireAdmin(req);

    // 🔓 params (async in modern Next.js)
    const { slot: rawSlot, position: rawPosition } =
      await context.params;

    const slot = rawSlot.trim();
    const position = Number(rawPosition);

    // 🧪 validate slot / position
    if (!ALLOWED_SLOTS.has(slot) || !isValidPosition(slot, position)) {
      console.error("INVALID SLOT/POSITION", {
        rawSlot,
        slot,
        position,
      });

      return NextResponse.json(
        { error: "Invalid slot/position" },
        { status: 400 }
      );
    }



    if (!item_id) {
      return NextResponse.json(
        { error: "Missing item_id" },
        { status: 400 }
      );
    }

    const pool = await getPool();

    // 🔍 validate item exists
    const exists = await pool
      .request()
      .input("item_id", sql.VarChar, item_id)
      .query(`
        SELECT id
        FROM items
        WHERE id = @item_id AND active = 1
      `);

    if (exists.recordset.length === 0) {
      return NextResponse.json(
        { error: "Item not found" },
        { status: 404 }
      );
    }

    // 🔁 upsert featured product
    await pool
      .request()
      .input("slot", sql.VarChar, slot)
      .input("position", sql.Int, position)
      .input("item_id", sql.VarChar, item_id)
      .query(`
        MERGE featured_products AS t
        USING (SELECT @slot AS slot, @position AS position) AS s
        ON t.slot = s.slot AND t.position = s.position
        WHEN MATCHED THEN
          UPDATE SET item_id = @item_id
        WHEN NOT MATCHED THEN
          INSERT (slot, position, item_id)
          VALUES (@slot, @position, @item_id);
      `);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    const msg = err?.message || "";

    if (msg === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (msg === "Forbidden") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    console.error("Featured PUT error:", err);
    return NextResponse.json(
      { error: "Failed to update featured product" },
      { status: 500 }
    );
  }
}

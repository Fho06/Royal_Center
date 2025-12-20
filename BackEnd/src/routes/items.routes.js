const express = require("express");
const { sql, poolPromise } = require("../config/db");
const { requireAuth, requireAdmin } = require("../middleware/auth.middleware");

const router = express.Router();

/**
 * GET /api/items
 * Public: list all items (LOCAL DB)
 */
router.get("/items", async (req, res) => {
  try {
    const pool = await poolPromise;

    // ---------- PAGINATION ----------
    const limit = Number(req.query.limit) || 20;
    const offset = Number(req.query.offset) || 0;

    // ---------- FILTERS ----------
    const search = req.query.search || "";
    const categoryId = req.query.category_id || null;
    const subcategoryId = req.query.subcategory_id || null;
    const inStock = req.query.in_stock === "1";
    const sort = req.query.sort; // asc | desc

    // ---------- BUILD REQUEST ----------
    const request = pool.request();

    request.input("limit", sql.Int, limit);
    request.input("offset", sql.Int, offset);
    request.input("search", sql.NVarChar, `%${search}%`);

    if (categoryId) request.input("categoryId", sql.Int, categoryId);
    if (subcategoryId) request.input("subcategoryId", sql.Int, subcategoryId);

    // ---------- WHERE CLAUSE ----------
    let whereClause = `WHERE i.name LIKE @search`;

    if (subcategoryId) {
      // Subcategory → direct match
      whereClause += ` AND i.category_id = @subcategoryId`;
    } else if (categoryId) {
      // Main category → via parent_id
      whereClause += ` AND c.parent_id = @categoryId`;
    }

    if (inStock) {
      whereClause += ` AND i.stock > 0`;
    }

    // ---------- ORDER BY ----------
    let orderBy = "i.name ASC"; // default

    if (sort === "asc") {
      orderBy = "i.price_usd ASC";
    } else if (sort === "desc") {
      orderBy = "i.price_usd DESC";
    }

    // ---------- COUNT QUERY ----------
    const countResult = await request.query(`
      SELECT COUNT(*) AS total
      FROM dbo.items i
      JOIN dbo.categories c ON c.id = i.category_id
      ${whereClause}
    `);

    const total = countResult.recordset[0].total;

    // ---------- ITEMS QUERY ----------
    const itemsResult = await request.query(`
      SELECT
        i.id,
        i.name,
        i.price_usd AS price,
        i.stock,
        i.unit,
        i.active,
        i.category_id,
        c.parent_id,
        c.name AS category_name
      FROM dbo.items i
      JOIN dbo.categories c ON c.id = i.category_id
      ${whereClause}
      ORDER BY ${orderBy}
      OFFSET @offset ROWS
      FETCH NEXT @limit ROWS ONLY;
    `);

    res.json({
      items: itemsResult.recordset,
      total
    });
  } catch (err) {
    console.error("Get items error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * GET /api/items/:id
 * Public: get one item
 */
router.get("/items/:id", async (req, res) => {
  try {
    const pool = await poolPromise;
    const { id } = req.params;

    const result = await pool
      .request()
      .input("id", sql.VarChar, id)
      .query(`
        SELECT
          i.id,
          i.name,
          i.price_usd AS price,
          i.stock,
          i.unit,
          i.active,
          i.category_id,
          c.parent_id,
          c.name AS category_name
        FROM dbo.items i
        JOIN dbo.categories c ON c.id = i.category_id
        WHERE i.id = @id
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: "Item not found" });
    }

    res.json(result.recordset[0]);
  } catch (err) {
    console.error("Get item error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * DELETE /api/items/:id
 * Admin only
 */
router.delete("/items/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const pool = await poolPromise;

    const result = await pool
      .request()
      .input("id", sql.VarChar, id)
      .query("DELETE FROM dbo.items WHERE id = @id");

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ error: "Item not found" });
    }

    res.json({ message: "Item deleted successfully" });
  } catch (err) {
    console.error("Delete item error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;

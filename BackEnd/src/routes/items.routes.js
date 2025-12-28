const express = require("express");
const { sql, poolPromise } = require("../config/db");
const { requireAuth, requireAdmin } = require("../middleware/auth.middleware");

const router = express.Router();

/**
 * =========================
 * GET /api/items
 * Public: list all items
 * =========================
 */
router.get("/items", async (req, res) => {
  try {
    const pool = await poolPromise;

    const result = await pool.request().query(`
      SELECT
        id,
        name,
        description,
        price_usd AS price,
        stock
      FROM dbo.items
      WHERE active = 1
    `);

    res.json(result.recordset);
  } catch (err) {
    console.error("Get items error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * =========================
 * GET /api/items/:id
 * Public: get one item
 * =========================
 */
router.get("/items/:id", async (req, res) => {
  try {
    const pool = await poolPromise;
    const { id } = req.params;

    const result = await pool
      .request()
      .input("id", sql.VarChar(50), id)
      .query(`
        SELECT
          id,
          name,
          description,
          price_usd AS price,
          stock
        FROM dbo.items
        WHERE id = @id
          AND active = 1
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
 * =========================
 * POST /api/items
 * Admin only: create item
 * =========================
 */
router.post("/items", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id, name, description, price, stock } = req.body;

    if (!id || !name || price == null) {
      return res.status(400).json({
        error: "ID, name, and price are required",
      });
    }

    const pool = await poolPromise;

    await pool
      .request()
      .input("id", sql.VarChar(50), id)
      .input("name", sql.NVarChar(255), name)
      .input("description", sql.NVarChar(500), description || "")
      .input("price_usd", sql.Decimal(18, 2), price)
      .input("stock", sql.Int, stock ?? 0)
      .input("active", sql.Bit, 1)
      .query(`
        INSERT INTO dbo.items (
          id,
          name,
          description,
          price_usd,
          stock,
          active
        )
        VALUES (
          @id,
          @name,
          @description,
          @price_usd,
          @stock,
          @active
        )
      `);

    res.status(201).json({ message: "Item created successfully" });
  } catch (err) {
    console.error("Create item error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * =========================
 * PUT /api/items/:id
 * Admin only: update item
 * =========================
 */
router.put("/items/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, price, stock, active } = req.body;

    if (!name || price == null) {
      return res.status(400).json({
        error: "Name and price are required",
      });
    }

    const pool = await poolPromise;

    const result = await pool
      .request()
      .input("id", sql.VarChar(50), id)
      .input("name", sql.NVarChar(255), name)
      .input("description", sql.NVarChar(500), description || "")
      .input("price_usd", sql.Decimal(18, 2), price)
      .input("stock", sql.Int, stock ?? 0)
      .input("active", sql.Bit, active ?? 1)
      .query(`
        UPDATE dbo.items
        SET
          name = @name,
          description = @description,
          price_usd = @price_usd,
          stock = @stock,
          active = @active
        WHERE id = @id
      `);

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ error: "Item not found" });
    }

    res.json({ message: "Item updated successfully" });
  } catch (err) {
    console.error("Update item error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * =========================
 * DELETE /api/items/:id
 * Admin only: delete item
 * =========================
 */
router.delete("/items/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const pool = await poolPromise;

    const result = await pool
      .request()
      .input("id", sql.VarChar(50), id)
      .query(`
        DELETE FROM dbo.items
        WHERE id = @id
      `);

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

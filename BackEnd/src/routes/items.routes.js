const express = require("express");
const { sql, poolPromise } = require("../config/db");
const { requireAuth, requireAdmin } = require("../middleware/auth.middleware");

const router = express.Router();

/**
 * GET /api/items
 * Public: list all items
 */
router.get("/items", async (req, res) => {
  try {
    const pool = await poolPromise;

    const result = await pool
      .request()
      .query(`
        SELECT id, name, description, price, stock
        FROM items
      `);

    res.json(result.recordset);
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
      .input("id", sql.Int, id)
      .query(`
        SELECT id, name, description, price, stock
        FROM items
        WHERE id = @id
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
 * POST /api/items
 * Admin only: create item
 */
router.post("/items", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { name, description, price, stock } = req.body;

    if (!name || price == null) {
      return res.status(400).json({ error: "Name and price are required" });
    }

    const pool = await poolPromise;

    await pool
      .request()
      .input("name", sql.VarChar, name)
      .input("description", sql.VarChar, description || "")
      .input("price", sql.Decimal(10, 2), price)
      .input("stock", sql.Int, stock || 0)
      .query(`
        INSERT INTO items (name, description, price, stock)
        VALUES (@name, @description, @price, @stock)
      `);

    res.status(201).json({ message: "Item created successfully" });
  } catch (err) {
    console.error("Create item error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;

/**
 * PUT /api/items/:id
 * Admin only: update item
 */
router.put("/items/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, price, stock } = req.body;

    if (!name || price == null) {
      return res.status(400).json({ error: "Name and price are required" });
    }

    const pool = await poolPromise;

    const result = await pool
      .request()
      .input("id", sql.Int, id)
      .input("name", sql.VarChar, name)
      .input("description", sql.VarChar, description || "")
      .input("price", sql.Decimal(10, 2), price)
      .input("stock", sql.Int, stock || 0)
      .query(`
        UPDATE items
        SET name = @name,
            description = @description,
            price = @price,
            stock = @stock
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
 * DELETE /api/items/:id
 * Admin only: delete item
 */
router.delete("/items/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const pool = await poolPromise;

    const result = await pool
      .request()
      .input("id", sql.Int, id)
      .query("DELETE FROM items WHERE id = @id");

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ error: "Item not found" });
    }

    res.json({ message: "Item deleted successfully" });
  } catch (err) {
    console.error("Delete item error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});
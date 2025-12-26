const express = require("express");
const { sql, poolPromise } = require("../config/db");
const { requireAuth } = require("../middleware/auth.middleware");

const router = express.Router();

/* =========================================================
   POST /api/orders
   Create order (AUTH REQUIRED)
   ========================================================= */
router.post("/orders", requireAuth, async (req, res) => {
  try {
    const pool = await poolPromise;
    const userId = req.user.id;
    const { items } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "No items provided" });
    }

    /* ---------- VALIDATE & CALCULATE TOTAL ---------- */
    let total = 0;

    for (const item of items) {
      const result = await pool
        .request()
        .input("id", sql.VarChar, item.item_id)
        .query(`
          SELECT price_usd, stock
          FROM items
          WHERE id = @id AND active = 1
        `);

      if (result.recordset.length === 0) {
        return res.status(400).json({
          error: `Item not found: ${item.item_id}`,
        });
      }

      const dbItem = result.recordset[0];

      if (item.quantity > dbItem.stock) {
        return res.status(400).json({
          error: `Insufficient stock for item ${item.item_id}`,
        });
      }

      total += dbItem.price_usd * item.quantity;
    }

    /* ---------- TRANSACTION ---------- */
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      /* ---------- INSERT ORDER ---------- */
      const orderResult = await transaction
        .request()
        .input("user_id", sql.Int, userId)
        .input("total", sql.Decimal(10, 2), total)
        .query(`
          INSERT INTO orders (user_id, total_amount, status)
          OUTPUT INSERTED.id
          VALUES (@user_id, @total, 'pending_payment')
        `);

      const orderId = orderResult.recordset[0].id;

      /* ---------- INSERT ITEMS + UPDATE STOCK ---------- */
      for (const item of items) {
        const priceResult = await transaction
          .request()
          .input("id", sql.VarChar, item.item_id)
          .query(`
            SELECT price_usd
            FROM items
            WHERE id = @id
          `);

        const price = priceResult.recordset[0].price_usd;

        await transaction
          .request()
          .input("order_id", sql.Int, orderId)
          .input("item_id", sql.VarChar, item.item_id)
          .input("quantity", sql.Int, item.quantity)
          .input("price", sql.Decimal(10, 2), price)
          .query(`
            INSERT INTO order_items
              (order_id, item_id, quantity, price)
            VALUES
              (@order_id, @item_id, @quantity, @price)
          `);

        await transaction
          .request()
          .input("id", sql.VarChar, item.item_id)
          .input("qty", sql.Int, item.quantity)
          .query(`
            UPDATE items
            SET stock = stock - @qty
            WHERE id = @id
          `);
      }

      await transaction.commit();
      res.status(201).json({ message: "Order placed successfully" });
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  } catch (err) {
    console.error("Place order error:", err);
    res.status(500).json({ error: "Failed to place order" });
  }
});

/* =========================================================
   GET /api/orders
   Order history for logged-in user
   ========================================================= */
router.get("/orders", requireAuth, async (req, res) => {
  try {
    const pool = await poolPromise;

    const result = await pool
      .request()
      .input("user_id", sql.Int, req.user.id)
      .query(`
        SELECT
          id,
          total_amount,
          created_at
        FROM orders
        WHERE user_id = @user_id
        ORDER BY created_at DESC
      `);

    res.json(result.recordset);
  } catch (err) {
    console.error("Get orders error:", err);
    res.status(500).json({ error: "Failed to fetch orders" });
  }
});

/* =========================================================
   GET /api/orders/:id
   Order details (AUTH REQUIRED)
   ========================================================= */
router.get("/orders/:id", requireAuth, async (req, res) => {
  try {
    const pool = await poolPromise;
    const orderId = Number(req.params.id);

    const orderResult = await pool
      .request()
      .input("id", sql.Int, orderId)
      .input("user_id", sql.Int, req.user.id)
      .query(`
        SELECT id, total_amount, created_at
        FROM orders
        WHERE id = @id AND user_id = @user_id
      `);

    if (orderResult.recordset.length === 0) {
      return res.status(404).json({ error: "Order not found" });
    }

    const itemsResult = await pool
      .request()
      .input("order_id", sql.Int, orderId)
      .query(`
        SELECT
          i.name,
          oi.quantity,
          oi.price
        FROM order_items oi
        JOIN items i ON i.id = oi.item_id
        WHERE oi.order_id = @order_id
      `);

    res.json({
      order: orderResult.recordset[0],
      items: itemsResult.recordset,
    });
  } catch (err) {
    console.error("Get order details error:", err);
    res.status(500).json({ error: "Failed to fetch order details" });
  }
});

module.exports = router;

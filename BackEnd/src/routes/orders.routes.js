const express = require("express");
const { sql, poolPromise } = require("../config/db");
const { requireAuth } = require("../middleware/auth.middleware");

const router = express.Router();

/**
 * GET /api/orders
 * Get all orders for logged-in user
 */
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

module.exports = router;

/**
 * GET /api/orders/:id
 * Get one order + its items
 */
router.get("/orders/:id", requireAuth, async (req, res) => {
  try {
    const pool = await poolPromise;
    const orderId = Number(req.params.id);

    // 1️⃣ Get order (ensure ownership)
    const orderResult = await pool
      .request()
      .input("order_id", sql.Int, orderId)
      .input("user_id", sql.Int, req.user.id)
      .query(`
        SELECT
          id,
          total_amount,
          created_at
        FROM orders
        WHERE id = @order_id AND user_id = @user_id
      `);

    if (orderResult.recordset.length === 0) {
      return res.status(404).json({ error: "Order not found" });
    }

    // 2️⃣ Get items in order
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
    res.status(500).json({ error: "Failed to fetch order" });
  }
});


const sql = require("mssql");
const { poolPromise } = require("../config/db");

/* ===========================
   PLACE ORDER (RACE-SAFE)
   =========================== */
async function placeOrder(req, res) {
  const userId = req.user.id;
  const { items } = req.body;

  if (!items || items.length === 0) {
    return res.status(400).json({ error: "No items in order" });
  }

  const pool = await poolPromise;
  const transaction = new sql.Transaction(pool);

  try {
    await transaction.begin();

    let totalAmount = 0;
    const priceMap = new Map(); // item_id -> price at purchase time

    /* 1️⃣ LOCK rows + validate stock */
    for (const item of items) {
      const result = await transaction
        .request()
        .input("item_id", sql.VarChar, item.item_id)
        .query(`
          SELECT price_usd, stock
          FROM dbo.items WITH (UPDLOCK, ROWLOCK)
          WHERE id = @item_id
        `);

      if (result.recordset.length === 0) {
        throw new Error("Item not found");
      }

      const { price_usd, stock } = result.recordset[0];

      if (stock < item.quantity) {
        throw new Error("Insufficient stock");
      }

      priceMap.set(item.item_id, price_usd);
      totalAmount += price_usd * item.quantity;
    }

    /* 2️⃣ Create order */
    const orderResult = await transaction
      .request()
      .input("user_id", sql.Int, userId)
      .input("total_amount", sql.Decimal(10, 2), totalAmount)
      .query(`
        INSERT INTO dbo.orders (user_id, total_amount)
        OUTPUT INSERTED.id
        VALUES (@user_id, @total_amount)
      `);

    const orderId = orderResult.recordset[0].id;

    /* 3️⃣ Insert order items + deduct stock */
    for (const item of items) {
      const priceUsd = priceMap.get(item.item_id);

      await transaction
        .request()
        .input("order_id", sql.Int, orderId)
        .input("item_id", sql.VarChar, item.item_id)
        .input("quantity", sql.Int, item.quantity)
        .input("price", sql.Decimal(10, 2), priceUsd)
        .query(`
          INSERT INTO dbo.order_items (order_id, item_id, quantity, price)
          VALUES (@order_id, @item_id, @quantity, @price)
        `);

      await transaction
        .request()
        .input("item_id", sql.VarChar, item.item_id)
        .input("quantity", sql.Int, item.quantity)
        .query(`
          UPDATE dbo.items
          SET stock = stock - @quantity
          WHERE id = @item_id
        `);
    }

    await transaction.commit();

    res.status(201).json({
      message: "Order placed successfully",
      orderId,
    });
  } catch (err) {
    await transaction.rollback();

    if (err.message === "Insufficient stock") {
      return res.status(409).json({ error: "Not enough stock available" });
    }

    console.error("Order failed:", err);
    res.status(500).json({ error: "Failed to place order" });
  }
}

/* ===========================
   GET USER ORDERS
   =========================== */
async function getOrders(req, res) {
  try {
    const userId = req.user.id;
    const pool = await poolPromise;

    const result = await pool
      .request()
      .input("user_id", sql.Int, userId)
      .query(`
        SELECT id, total_amount, created_at
        FROM dbo.orders
        WHERE user_id = @user_id
        ORDER BY created_at DESC
      `);

    res.json(result.recordset);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch orders" });
  }
}

/* ===========================
   GET ORDER DETAILS
   =========================== */
async function getOrderDetails(req, res) {
  try {
    const userId = req.user.id;
    const orderId = parseInt(req.params.id, 10);
    const pool = await poolPromise;

    const orderCheck = await pool
      .request()
      .input("order_id", sql.Int, orderId)
      .input("user_id", sql.Int, userId)
      .query(`
        SELECT id, total_amount, created_at
        FROM dbo.orders
        WHERE id = @order_id AND user_id = @user_id
      `);

    if (orderCheck.recordset.length === 0) {
      return res.status(404).json({ error: "Order not found" });
    }

    const itemsResult = await pool
      .request()
      .input("order_id", sql.Int, orderId)
      .query(`
        SELECT 
          oi.quantity,
          oi.price,
          i.name
        FROM dbo.order_items oi
        JOIN dbo.items i ON oi.item_id = i.id
        WHERE oi.order_id = @order_id
      `);

    res.json({
      order: orderCheck.recordset[0],
      items: itemsResult.recordset,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch order details" });
  }
}

module.exports = {
  placeOrder,
  getOrders,
  getOrderDetails,
};

const express = require("express");
const router = express.Router();

const { requireAuth } = require("../middleware/auth.middleware");
const {
  placeOrder,
  getOrders,
  getOrderDetails,
} = require("../controllers/orders.controller");

router.post("/", requireAuth, placeOrder);
router.get("/", requireAuth, getOrders);
router.get("/:id", requireAuth, getOrderDetails);

module.exports = router;

const express = require("express");
const { poolPromise } = require("../config/db");

const router = express.Router();

/**
 * GET /api/categories
 * Public: list all categories & subcategories
 */
router.get("/categories", async (req, res) => {
  try {
    const pool = await poolPromise;

    const result = await pool.request().query(`
      SELECT
        id,
        name,
        level,
        parent_id
      FROM dbo.categories
      ORDER BY level, name
    `);

    res.json(result.recordset);
  } catch (err) {
    console.error("Get categories error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;

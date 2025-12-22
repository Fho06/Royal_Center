const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { sql, poolPromise } = require("../config/db");

const router = express.Router();

/**
 * POST /api/register
 */
router.post("/register", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    if (password.length < 6) {
      return res
        .status(400)
        .json({ error: "Password must be at least 6 characters" });
    }

    // 🔑 normalize email (CRITICAL)
    const emailNormalized = email.trim().toLowerCase();

    const pool = await poolPromise;

    // check existing user
    const existingUser = await pool
      .request()
      .input("email", sql.VarChar, emailNormalized)
      .query("SELECT id FROM users WHERE email = @email");

    if (existingUser.recordset.length > 0) {
      return res.status(409).json({ error: "User already exists" });
    }

    // hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // insert user
    await pool
      .request()
      .input("email", sql.VarChar, emailNormalized)
      .input("password_hash", sql.VarChar, passwordHash)
      .input("role", sql.VarChar, "user")
      .query(`
        INSERT INTO users (email, password_hash, role)
        VALUES (@email, @password_hash, @role)
      `);

    res.status(201).json({ message: "User registered successfully" });
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * POST /api/login
 */
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    // 🔑 normalize email (CRITICAL)
    const emailNormalized = email.trim().toLowerCase();

    const pool = await poolPromise;

    const result = await pool
      .request()
      .input("email", sql.VarChar, emailNormalized)
      .query(`
        SELECT id, email, password_hash, role
        FROM users
        WHERE email = @email
      `);

    if (result.recordset.length === 0) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const user = result.recordset[0];

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      message: "Login successful",
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;

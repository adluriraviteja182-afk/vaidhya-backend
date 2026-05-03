// controllers/adminAuthController.js
const { validationResult } = require("express-validator");
const bcrypt = require("bcryptjs");
const pool = require("../config/db");

async function login(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty())
    return res.status(400).json({ success: false, errors: errors.array() });

  const { username, password } = req.body;

  try {
    // Try DB admins table first
    const [rows] = await pool.execute(
      "SELECT * FROM admins WHERE username = ?", [username.trim()]
    );

    if (rows.length > 0) {
      const admin = rows[0];
      const valid = await bcrypt.compare(password.trim(), admin.password);
      if (!valid)
        return res.status(401).json({ success: false, message: "Invalid credentials." });

      return res.json({
        success: true,
        user: {
          id:         admin.id,
          name:       admin.name,
          username:   admin.username,
          role:       admin.role,
          doctor_key: admin.doctor_key,
        },
      });
    }

    // Fallback: legacy env-var check (backward compat)
    const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "admin";
    const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "Admin@1234";

    if (username.trim() === ADMIN_USERNAME && password.trim() === ADMIN_PASSWORD) {
      return res.json({
        success: true,
        user: { name: "Manager", username: ADMIN_USERNAME, role: "manager", doctor_key: null },
      });
    }

    return res.status(401).json({ success: false, message: "Invalid credentials." });
  } catch (err) {
    console.error("Admin login error:", err.message);
    return res.status(500).json({ success: false, message: "Server error." });
  }
}

module.exports = { login };

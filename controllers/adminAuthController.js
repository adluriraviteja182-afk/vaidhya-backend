// controllers/adminAuthController.js
const bcrypt = require("bcryptjs");
const jwt    = require("jsonwebtoken");
const pool   = require("../config/db");

const JWT_SECRET  = process.env.JWT_SECRET  || "pragyan_jwt_secret_change_me";
const JWT_EXPIRES = process.env.JWT_EXPIRES || "12h";

// POST /api/admin-auth/login
exports.login = async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password)
    return res.status(400).json({ success: false, message: "Username and password required." });

  try {
    const [rows] = await pool.execute(
      "SELECT * FROM admins WHERE username = ? LIMIT 1",
      [username.trim().toLowerCase()]
    );

    if (rows.length === 0)
      return res.status(401).json({ success: false, message: "Invalid credentials." });

    const admin = rows[0];
    const valid = await bcrypt.compare(password, admin.password);
    if (!valid)
      return res.status(401).json({ success: false, message: "Invalid credentials." });

    const payload = {
      id:         admin.id,
      username:   admin.username,
      name:       admin.name,
      role:       admin.role,       // "manager" | "doctor"
      doctor_key: admin.doctor_key, // "pranaba" | "nibedita" | null
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES });

    // Log access
    console.log(`[Admin Login] ${admin.name} (${admin.role}) at ${new Date().toISOString()}`);

    return res.json({
      success: true,
      token,
      admin: payload,
    });
  } catch (err) {
    console.error("[adminAuth] login error:", err.message);
    return res.status(500).json({ success: false, message: "Server error." });
  }
};

// POST /api/admin-auth/verify  — validate token, return admin info
exports.verify = (req, res) => {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith("Bearer "))
    return res.status(401).json({ success: false, message: "No token." });

  try {
    const payload = jwt.verify(auth.slice(7), JWT_SECRET);
    return res.json({ success: true, admin: payload });
  } catch {
    return res.status(401).json({ success: false, message: "Invalid or expired token." });
  }
};

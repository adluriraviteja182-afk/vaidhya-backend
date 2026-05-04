// middleware/adminAuth.js
const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET || "pragyan_jwt_secret_change_me";

// Attach admin to req, reject if token missing/invalid
function requireAdmin(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith("Bearer "))
    return res.status(401).json({ success: false, message: "Unauthorized." });

  try {
    req.admin = jwt.verify(auth.slice(7), JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ success: false, message: "Invalid or expired token." });
  }
}

// Only manager role can proceed
function requireManager(req, res, next) {
  requireAdmin(req, res, () => {
    if (req.admin.role !== "manager")
      return res.status(403).json({ success: false, message: "Manager access required." });
    next();
  });
}

module.exports = { requireAdmin, requireManager };

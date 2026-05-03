const { validationResult } = require("express-validator");

async function login(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty())
    return res.status(400).json({ success: false, errors: errors.array() });

  const { username, password } = req.body;

  const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "admin";
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "Admin@1234";

  if (username !== ADMIN_USERNAME || password !== ADMIN_PASSWORD)
    return res.status(401).json({ success: false, message: "Invalid admin credentials." });

  return res.json({
    success: true,
    user: {
      name:     process.env.ADMIN_NAME || "Dr. Admin",
      username: ADMIN_USERNAME,
      role:     "admin",
    },
  });
}

module.exports = { login };

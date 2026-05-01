const { validationResult } = require("express-validator");
const crypto = require("crypto");
const db = require("../config/db");
const { sendOTPSMS } = require("../services/smsService");

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function hashOTP(otp) {
  return crypto.createHash("sha256").update(otp).digest("hex");
}

// ─── POST /api/auth/send-otp ───────────────────────────────────
async function sendOTP(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty())
    return res.status(400).json({ success: false, errors: errors.array() });

  const { name, phone } = req.body;
  const otp = generateOTP();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min

  try {
    // Upsert user
    await db.query(
      `INSERT INTO users (name, phone, verified, created_at)
       VALUES ($1, $2, false, NOW())
       ON CONFLICT (phone) DO UPDATE SET name = EXCLUDED.name`,
      [name, phone]
    );

    // Upsert OTP token
    await db.query(
      `INSERT INTO otp_tokens (phone, otp_hash, expires_at, attempts)
       VALUES ($1, $2, $3, 0)
       ON CONFLICT (phone) DO UPDATE
         SET otp_hash = EXCLUDED.otp_hash,
             expires_at = EXCLUDED.expires_at,
             attempts = 0`,
      [phone, hashOTP(otp), expiresAt]
    );

    await sendOTPSMS(phone, otp);

    return res.json({ success: true, message: "OTP sent!" });
  } catch (err) {
    console.error("sendOTP error:", err.message);
    return res.status(500).json({ success: false, message: "Server error." });
  }
}

// ─── POST /api/auth/verify-otp ────────────────────────────────
async function verifyOTP(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty())
    return res.status(400).json({ success: false, errors: errors.array() });

  const { phone, otp } = req.body;

  try {
    const result = await db.query("SELECT * FROM otp_tokens WHERE phone = $1", [phone]);

    if (result.rows.length === 0)
      return res.status(400).json({ success: false, message: "OTP not found. Please request again." });

    const record = result.rows[0];

    if (new Date() > new Date(record.expires_at))
      return res.status(400).json({ success: false, message: "OTP expired. Please request again." });

    if (record.attempts >= 5)
      return res.status(400).json({ success: false, message: "Too many attempts. Please request a new OTP." });

    // Increment attempts first (prevents brute force even on error)
    await db.query("UPDATE otp_tokens SET attempts = attempts + 1 WHERE phone = $1", [phone]);

    if (record.otp_hash !== hashOTP(otp))
      return res.status(400).json({ success: false, message: "Incorrect OTP. Please try again." });

    // Mark verified
    const userResult = await db.query(
      "UPDATE users SET verified = true WHERE phone = $1 RETURNING id, name, phone",
      [phone]
    );

    // Clean up token
    await db.query("DELETE FROM otp_tokens WHERE phone = $1", [phone]);

    return res.json({ success: true, user: userResult.rows[0] });
  } catch (err) {
    console.error("verifyOTP error:", err.message);
    return res.status(500).json({ success: false, message: "Server error." });
  }
}

module.exports = { sendOTP, verifyOTP };

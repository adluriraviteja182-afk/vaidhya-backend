const mysql = require("mysql2/promise");
require("dotenv").config();

const pool = mysql.createPool({
  host:     process.env.DB_HOST,
  port:     process.env.DB_PORT,
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : false,
});

async function initDB() {
  try {
    // ── Create tables (skipped if already exist) ──────────────────────────────
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS appointments (
        id                  INT AUTO_INCREMENT PRIMARY KEY,
        patient_name        VARCHAR(100) NOT NULL,
        patient_email       VARCHAR(100) NOT NULL,
        patient_phone       VARCHAR(20)  NOT NULL,
        patient_age         INT,
        gender              VARCHAR(20),
        doctor              VARCHAR(50)  NOT NULL,
        appointment_type    VARCHAR(50)  NOT NULL,
        appointment_date    DATE         NOT NULL,
        appointment_time    VARCHAR(20)  NOT NULL,
        reason              TEXT,
        status              ENUM('pending_payment','confirmed','cancelled') DEFAULT 'pending_payment',
        meet_link           VARCHAR(200),
        razorpay_order_id   VARCHAR(100),
        razorpay_payment_id VARCHAR(100),
        created_at          TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id         INT AUTO_INCREMENT PRIMARY KEY,
        name       VARCHAR(100) NOT NULL,
        phone      VARCHAR(20)  NOT NULL UNIQUE,
        email      VARCHAR(100) DEFAULT NULL,
        gender     VARCHAR(20)  DEFAULT NULL,
        dob        DATE         DEFAULT NULL,
        verified   BOOLEAN      NOT NULL DEFAULT false,
        created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.execute(`
      CREATE TABLE IF NOT EXISTS otp_tokens (
        phone      VARCHAR(20) PRIMARY KEY,
        otp_hash   VARCHAR(64) NOT NULL,
        expires_at DATETIME    NOT NULL,
        attempts   INT         NOT NULL DEFAULT 0
      )
    `);

    // ── Patch existing tables ─────────────────────────────────────────────────
    // Runs every startup. Safely adds columns that may be missing because
    // CREATE TABLE IF NOT EXISTS skips re-creating an already-existing table.
    const patches = [
      "ALTER TABLE appointments ADD COLUMN IF NOT EXISTS patient_age INT         DEFAULT NULL",
      "ALTER TABLE appointments ADD COLUMN IF NOT EXISTS gender      VARCHAR(20)  DEFAULT NULL",
      "ALTER TABLE users        ADD COLUMN IF NOT EXISTS email       VARCHAR(100) DEFAULT NULL",
      "ALTER TABLE users        ADD COLUMN IF NOT EXISTS gender      VARCHAR(20)  DEFAULT NULL",
      "ALTER TABLE users        ADD COLUMN IF NOT EXISTS dob         DATE         DEFAULT NULL",
    ];

    for (const sql of patches) {
      try {
        await pool.execute(sql);
      } catch (e) {
        if (!e.message.includes("Duplicate column")) {
          console.warn("[db patch]", e.message);
        }
      }
    }

    console.log("✅ All tables ready");
  } catch (err) {
    console.error("DB init error:", err.message);
  }
}

// Keep Railway MySQL alive — free tier drops idle connections after ~4 min
setInterval(async () => {
  try { await pool.execute("SELECT 1"); }
  catch (err) { console.error("DB ping error:", err.message); }
}, 4 * 60 * 1000);

initDB();

module.exports = pool;

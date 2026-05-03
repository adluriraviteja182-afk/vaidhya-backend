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

async function columnExists(table, column) {
  const [rows] = await pool.execute(
    `SELECT COUNT(*) as cnt FROM information_schema.COLUMNS 
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [table, column]
  );
  return rows[0].cnt > 0;
}

async function addColumnIfMissing(table, column, definition) {
  const exists = await columnExists(table, column);
  if (!exists) {
    await pool.execute(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`);
    console.log(`[db patch] Added column ${table}.${column}`);
  }
}

async function initDB() {
  try {
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
        prev_report_url     TEXT,
        mri_report_url      TEXT,
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

    // Safe patches — works on all MySQL versions including Aiven
    await addColumnIfMissing("appointments", "patient_age",     "INT DEFAULT NULL");
    await addColumnIfMissing("appointments", "gender",          "VARCHAR(20) DEFAULT NULL");
    await addColumnIfMissing("appointments", "prev_report_url", "TEXT DEFAULT NULL");
    await addColumnIfMissing("appointments", "mri_report_url",  "TEXT DEFAULT NULL");
    await addColumnIfMissing("users",        "email",           "VARCHAR(100) DEFAULT NULL");
    await addColumnIfMissing("users",        "gender",          "VARCHAR(20) DEFAULT NULL");
    await addColumnIfMissing("users",        "dob",             "DATE DEFAULT NULL");

    console.log("✅ All tables ready");
  } catch (err) {
    console.error("DB init error:", err.message);
  }
}

setInterval(async () => {
  try { await pool.execute("SELECT 1"); }
  catch (err) { console.error("DB ping error:", err.message); }
}, 4 * 60 * 1000);

initDB();
module.exports = pool;

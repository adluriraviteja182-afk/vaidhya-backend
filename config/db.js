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
    // ── Existing tables ──────────────────────────────────────────
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

    // ── Feature 2: Multiple Admin Logins ────────────────────────
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS admins (
        id         INT AUTO_INCREMENT PRIMARY KEY,
        username   VARCHAR(100) NOT NULL UNIQUE,
        password   VARCHAR(255) NOT NULL,
        name       VARCHAR(100) NOT NULL,
        role       ENUM('doctor','manager') NOT NULL DEFAULT 'doctor',
        doctor_key VARCHAR(50)  DEFAULT NULL,
        created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // ── Feature 1: Slot Management ───────────────────────────────
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS slots (
        id           INT AUTO_INCREMENT PRIMARY KEY,
        doctor_key   VARCHAR(50)  NOT NULL,
        slot_date    DATE         NOT NULL,
        slot_time    VARCHAR(20)  NOT NULL,
        max_patients INT          NOT NULL DEFAULT 10,
        booked_count INT          NOT NULL DEFAULT 0,
        is_enabled   BOOLEAN      NOT NULL DEFAULT true,
        created_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_slot (doctor_key, slot_date, slot_time)
      )
    `);

    // ── Feature 3: Prescriptions ────────────────────────────────
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS prescriptions (
        id              INT AUTO_INCREMENT PRIMARY KEY,
        appointment_id  INT          NOT NULL,
        patient_name    VARCHAR(100) NOT NULL,
        patient_phone   VARCHAR(20)  NOT NULL,
        doctor_key      VARCHAR(50)  NOT NULL,
        doctor_name     VARCHAR(100) NOT NULL,
        diagnosis       TEXT,
        medicines       JSON         NOT NULL,
        instructions    TEXT,
        follow_up_date  DATE         DEFAULT NULL,
        signature_url   TEXT         DEFAULT NULL,
        pdf_url         TEXT         DEFAULT NULL,
        created_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE
      )
    `);

    // ── Safe column patches ──────────────────────────────────────
    await addColumnIfMissing("appointments", "patient_age",     "INT DEFAULT NULL");
    await addColumnIfMissing("appointments", "gender",          "VARCHAR(20) DEFAULT NULL");
    await addColumnIfMissing("appointments", "prev_report_url", "TEXT DEFAULT NULL");
    await addColumnIfMissing("appointments", "mri_report_url",  "TEXT DEFAULT NULL");
    await addColumnIfMissing("users",        "email",           "VARCHAR(100) DEFAULT NULL");
    await addColumnIfMissing("users",        "gender",          "VARCHAR(20) DEFAULT NULL");
    await addColumnIfMissing("users",        "dob",             "DATE DEFAULT NULL");

    // ── Seed default admins if table is empty ────────────────────
    const [admins] = await pool.execute("SELECT COUNT(*) as cnt FROM admins");
    if (admins[0].cnt === 0) {
      const bcrypt = require("bcryptjs");
      const entries = [
        { username: process.env.ADMIN_USERNAME || "admin",
          password: process.env.ADMIN_PASSWORD || "Admin@1234",
          name: "Manager", role: "manager", doctor_key: null },
        { username: process.env.PRANABA_USERNAME || "dr.pranaba",
          password: process.env.PRANABA_PASSWORD || "Pranaba@1234",
          name: "Dr. B. Pranaba Nanda Patro", role: "doctor", doctor_key: "pranaba" },
        { username: process.env.NIBEDITA_USERNAME || "dr.nibedita",
          password: process.env.NIBEDITA_PASSWORD || "Nibedita@1234",
          name: "Dr. Nibedita Mahapatro", role: "doctor", doctor_key: "nibedita" },
      ];
      for (const e of entries) {
        const hash = await bcrypt.hash(e.password, 10);
        await pool.execute(
          "INSERT INTO admins (username, password, name, role, doctor_key) VALUES (?, ?, ?, ?, ?)",
          [e.username, hash, e.name, e.role, e.doctor_key]
        );
      }
      console.log("✅ Default admins seeded");
    }

    console.log("✅ All tables ready");
  } catch (err) {
    console.error("DB init error:", err.message);
  }
}

// Keep Aiven DB alive
setInterval(async () => {
  try { await pool.execute("SELECT 1"); }
  catch (err) { console.error("DB ping error:", err.message); }
}, 4 * 60 * 1000);

initDB();
module.exports = pool;

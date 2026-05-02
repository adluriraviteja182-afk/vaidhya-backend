const mysql = require("mysql2/promise");
require("dotenv").config();

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : false,
});

async function initDB() {
  try {
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS appointments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        patient_name VARCHAR(100) NOT NULL,
        patient_email VARCHAR(100) NOT NULL,
        patient_phone VARCHAR(20) NOT NULL,
        doctor VARCHAR(50) NOT NULL,
        appointment_type VARCHAR(50) NOT NULL,
        appointment_date DATE NOT NULL,
        appointment_time VARCHAR(20) NOT NULL,
        reason TEXT,
        status ENUM('pending_payment', 'confirmed', 'cancelled') DEFAULT 'pending_payment',
        meet_link VARCHAR(200),
        razorpay_order_id VARCHAR(100),
        razorpay_payment_id VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        phone VARCHAR(20) NOT NULL UNIQUE,
        verified BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.execute(`
      CREATE TABLE IF NOT EXISTS otp_tokens (
        phone VARCHAR(20) PRIMARY KEY,
        otp_hash VARCHAR(64) NOT NULL,
        expires_at DATETIME NOT NULL,
        attempts INT NOT NULL DEFAULT 0
      )
    `);

    console.log("All tables ready");
  } catch (err) {
    console.error("DB init error:", err.message);
  }
}

setInterval(async () => {
  try {
    await pool.execute("SELECT 1");
  } catch (err) {
    console.error("DB ping error:", err.message);
  }
}, 4 * 60 * 1000);

initDB();

module.exports = pool;

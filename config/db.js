// config/db.js
const mysql = require("mysql2/promise");

// Validate required env vars at startup so Railway logs show a clear error
const required = ["DB_HOST", "DB_USER", "DB_PASSWORD", "DB_NAME"];
const missing = required.filter((k) => !process.env[k]);
if (missing.length) {
  console.error(`[DB] ❌ Missing env vars: ${missing.join(", ")} — server will crash on first query`);
}

const pool = mysql.createPool({
  host:               process.env.DB_HOST,
  port:               parseInt(process.env.DB_PORT || "3306"),
  user:               process.env.DB_USER,
  password:           process.env.DB_PASSWORD,
  database:           process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit:    10,
  queueLimit:         0,

  // ✅ Aiven MySQL ALWAYS requires SSL — without this the connection is refused
  // and Railway crashes on startup (showing as "Cannot connect" on the frontend)
  ssl: process.env.DB_SSL === "false"
    ? false
    : { rejectUnauthorized: false },
});

// Test the connection at startup so Railway logs show DB status immediately
pool.getConnection()
  .then((conn) => {
    console.log("[DB] ✅ Connected to Aiven MySQL successfully");
    conn.release();
  })
  .catch((err) => {
    console.error("[DB] ❌ Connection failed:", err.message);
    console.error("[DB]    Host:", process.env.DB_HOST);
    console.error("[DB]    Port:", process.env.DB_PORT || "3306");
    console.error("[DB]    User:", process.env.DB_USER);
    console.error("[DB]    DB:  ", process.env.DB_NAME);
  });

module.exports = pool;

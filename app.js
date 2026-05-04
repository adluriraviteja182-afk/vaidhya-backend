// app.js
const express = require("express");
const cors    = require("cors");

const appointmentRoutes  = require("./routes/appointments");
const authRoutes         = require("./routes/auth");
const uploadRoutes       = require("./routes/upload");
const slotRoutes         = require("./routes/slots");
const prescriptionRoutes = require("./routes/prescriptions");
const analyticsRoutes    = require("./routes/analytics");

const app = express();

// ── CORS ──────────────────────────────────────────────────────────────────────
// Must be BEFORE all routes, and OPTIONS must be handled explicitly
const allowedOrigins = [
  process.env.FRONTEND_URL,       // e.g. https://pragyan-clinic.vercel.app
  "http://localhost:3000",
  "http://localhost:3001",
].filter(Boolean);                // remove undefined if FRONTEND_URL not set

app.use(cors({
  origin: function (origin, callback) {
    // Allow server-to-server calls (no origin) and Vercel preview deploys
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    if (origin.endsWith(".vercel.app")) return callback(null, true);

    console.warn(`[CORS] Blocked: ${origin}`);
    callback(new Error(`CORS: ${origin} not allowed`));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

// Handle preflight for ALL routes
app.options("*", cors());

// ── Body parsing ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// ── Health / debug ────────────────────────────────────────────────────────────
app.get("/", (req, res) => {
  res.json({ message: "Pragyan Clinic Backend is running ✅" });
});

app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Useful for verifying env vars without exposing values
app.get("/debug", (req, res) => {
  res.json({
    ADMIN_USERNAME_set:  !!process.env.ADMIN_USERNAME,
    ADMIN_PASSWORD_set:  !!process.env.ADMIN_PASSWORD,
    CLOUDINARY_set:      !!process.env.CLOUDINARY_CLOUD_NAME,
    FRONTEND_URL:        process.env.FRONTEND_URL || "not set",
    DB_HOST_set:         !!process.env.DB_HOST,
    DB_SSL:              process.env.DB_SSL || "not set (defaults to enabled)",
    NODE_ENV:            process.env.NODE_ENV || "not set",
  });
});

// ── Routes ────────────────────────────────────────────────────────────────────
app.use("/api/appointments",  appointmentRoutes);
app.use("/api/admin-auth",    adminAuthRoutes);
app.use("/api/upload",        uploadRoutes);
app.use("/api/slots",         slotRoutes);
app.use("/api/prescriptions", prescriptionRoutes);
app.use("/api/analytics",     analyticsRoutes);

// ── Global error handler ──────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error("[Error]", err.message);
  res.status(500).json({ success: false, message: err.message });
});

module.exports = app;

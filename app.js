const express = require("express");
const cors    = require("cors");

const appointmentRoutes  = require("./routes/appointments");
const authRoutes         = require("./routes/auth");
const adminRoutes        = require("./routes/admin");
const adminAuthRoutes    = require("./routes/adminAuth");
const uploadRoutes       = require("./routes/upload");
const slotRoutes         = require("./routes/slots");
const prescriptionRoutes = require("./routes/prescriptions");
const analyticsRoutes    = require("./routes/analytics");

const app = express();

app.use(cors());
app.use(express.json({ limit: "10mb" })); // increased for signature base64

app.get("/", (req, res) => {
  res.json({ message: "Pragyan Clinic Backend is running ✅" });
});

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.get("/debug", (req, res) => {
  res.json({
    ADMIN_USERNAME_set:  !!process.env.ADMIN_USERNAME,
    ADMIN_PASSWORD_set:  !!process.env.ADMIN_PASSWORD,
    CLOUDINARY_set:      !!process.env.CLOUDINARY_CLOUD_NAME,
    FRONTEND_URL:        process.env.FRONTEND_URL || "not set",
    DB_HOST_set:         !!process.env.DB_HOST,
  });
});

// ── Routes ──────────────────────────────────────────────────────
app.use("/api/appointments",  appointmentRoutes);
app.use("/api/auth",          authRoutes);
app.use("/api/admin",         adminRoutes);
app.use("/api/admin-auth",    adminAuthRoutes);
app.use("/api/upload",        uploadRoutes);
app.use("/api/slots",         slotRoutes);
app.use("/api/prescriptions", prescriptionRoutes);
app.use("/api/analytics",     analyticsRoutes);

module.exports = app;

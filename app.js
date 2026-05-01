const express = require("express");
const cors = require("cors");

const appointmentRoutes = require("./routes/appointments");
const authRoutes = require("./routes/auth");

const app = express();

// ✅ Middleware
app.use(cors({
  origin: "*", // for testing (later restrict to Vercel URL)
}));
app.use(express.json());

// ✅ Health check
app.get("/", (req, res) => {
  res.json({ message: "Pragyan Clinic Backend is running ✅" });
});

// ✅ Routes
app.use("/api/appointments", appointmentRoutes);
app.use("/api/auth", authRoutes);

module.exports = app;

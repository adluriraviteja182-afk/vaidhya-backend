// app.js
const express = require("express");
const cors = require("cors");

const appointmentRoutes = require("./routes/appointments");
const authRoutes = require("./routes/auth");
const doctorRoutes = require("./routes/doctors"); // NEW

const app = express();

app.use(cors({
  origin: [
    process.env.FRONTEND_URL,   // set this in Railway vars e.g. https://pragyan-clinic.vercel.app
    "http://localhost:3000",
  ],
  credentials: true,
}));
app.use(express.json());

// Health check
app.get("/", (req, res) => {
  res.json({ message: "Pragyan Clinic Backend is running ✅" });
});

// Routes
app.use("/api/appointments", appointmentRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/doctors", doctorRoutes); // NEW

module.exports = app;

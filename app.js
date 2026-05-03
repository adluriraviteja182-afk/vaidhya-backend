const express = require("express");
const cors = require("cors");
const appointmentRoutes = require("./routes/appointments");
const authRoutes = require("./routes/auth");

const app = express();

app.use(cors({
  origin: [
    process.env.FRONTEND_URL,
    "http://localhost:3000",
  ],
  credentials: true,
}));

app.use(express.json());

app.get("/", (req, res) => {
  res.json({ message: "Pragyan Clinic Backend is running ✅" });
});

app.use("/api/appointments", appointmentRoutes);
app.use("/api/auth", authRoutes);

module.exports = app;

const express = require("express");
const router = express.Router();

// ✅ TEST ROUTE (to check working)
router.get("/test", (req, res) => {
  res.json({ message: "Auth route working ✅" });
});

// ✅ SEND OTP ROUTE
router.post("/send-otp", (req, res) => {
  const { name, mobile } = req.body;

  if (!name || !mobile) {
    return res.status(400).json({ message: "Missing fields" });
  }

  // Dummy OTP
  const otp = Math.floor(100000 + Math.random() * 900000);

  console.log(`OTP for ${mobile}: ${otp}`);

  res.json({
    message: "OTP sent successfully",
    otp // remove later in production
  });
});

module.exports = router;

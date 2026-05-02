const express = require("express");
const router = express.Router();
const { body } = require("express-validator");
const { sendOTP, verifyOTP } = require("../controllers/authController");

router.get("/test", (req, res) => {
  res.json({ message: "Auth route working ✅" });
});

router.post(
  "/send-otp",
  [
    body("name").trim().notEmpty().withMessage("Name is required"),
    body("phone").trim().notEmpty().withMessage("Phone is required"),
  ],
  sendOTP
);

router.post(
  "/verify-otp",
  [
    body("phone").trim().notEmpty().withMessage("Phone is required"),
    body("otp").trim().notEmpty().withMessage("OTP is required"),
  ],
  verifyOTP
);

module.exports = router;

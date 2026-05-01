const express = require("express");
const router = express.Router();
const { body } = require("express-validator");
const authController = require("../controllers/authController");

// POST /api/auth/send-otp   → send OTP to phone
router.post(
  "/send-otp",
  [
    body("name").trim().notEmpty().withMessage("Name is required"),
    body("phone")
      .trim()
      .matches(/^\+?[1-9]\d{9,14}$/)
      .withMessage("Enter a valid phone number with country code"),
  ],
  authController.sendOTP
);

// POST /api/auth/verify-otp → verify OTP and return user
router.post(
  "/verify-otp",
  [
    body("phone").trim().notEmpty().withMessage("Phone is required"),
    body("otp").trim().isLength({ min: 6, max: 6 }).withMessage("OTP must be 6 digits"),
  ],
  authController.verifyOTP
);

module.exports = router;

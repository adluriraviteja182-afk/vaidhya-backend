// routes/appointments.js
const express = require("express");
const router = express.Router();
const { body } = require("express-validator");
const appointmentController = require("../controllers/appointmentController");

const bookingValidation = [
  body("patient_name").trim().notEmpty().withMessage("Name is required"),
  body("patient_email").isEmail().withMessage("Valid email is required"),
  body("patient_phone").trim().notEmpty().withMessage("Phone is required"),
  body("doctor").isIn(["pranaba", "nibedita"]).withMessage("Invalid doctor"),
  body("appointment_type").isIn(["in-clinic", "teleconsult"]).withMessage("Invalid type"),
  body("appointment_date").isDate().withMessage("Valid date is required"),
  body("appointment_time").trim().notEmpty().withMessage("Time is required"),
];

// GET  /api/appointments/stats          → dashboard stats (must come before /)
router.get("/stats", appointmentController.getDashboardStats);

// POST /api/appointments                → book + create Razorpay order
router.post("/", bookingValidation, appointmentController.bookAppointment);

// POST /api/appointments/verify-payment → verify signature + confirm
router.post("/verify-payment", appointmentController.verifyPayment);

// GET  /api/appointments                → list all (admin)
router.get("/", appointmentController.listAppointments);

module.exports = router;

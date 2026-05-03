// routes/analytics.js
const express = require("express");
const router  = express.Router();
const { getSummary, getDailyStats, getDoctorWise, getPatientHistory, getMonthlyStats } = require("../controllers/analyticsController");

router.get("/summary",        getSummary);
router.get("/daily",          getDailyStats);
router.get("/doctor-wise",    getDoctorWise);
router.get("/patient-history", getPatientHistory);
router.get("/monthly",        getMonthlyStats);

module.exports = router;

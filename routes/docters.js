// routes/doctors.js
const express = require("express");
const router = express.Router();
const { listDoctors, getDoctorByKey } = require("../controllers/doctorController");

// GET /api/doctors          → all doctors
router.get("/", listDoctors);

// GET /api/doctors/:key     → single doctor  (pranaba | nibedita)
router.get("/:key", getDoctorByKey);

module.exports = router;

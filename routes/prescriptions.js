// routes/prescriptions.js
const express = require("express");
const router  = express.Router();
const { createPrescription, getPrescriptions, getPrescriptionById } = require("../controllers/prescriptionController");

router.get("/",    getPrescriptions);
router.get("/:id", getPrescriptionById);
router.post("/",   createPrescription);

module.exports = router;

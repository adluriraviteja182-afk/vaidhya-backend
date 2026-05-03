const express = require("express");
const router  = express.Router();
const { getStats, getPatients } = require("../controllers/adminController");

router.get("/stats",    getStats);
router.get("/patients", getPatients);

module.exports = router;

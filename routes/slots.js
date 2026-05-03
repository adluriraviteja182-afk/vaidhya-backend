// routes/slots.js
const express = require("express");
const router = express.Router();
const { getSlots, upsertSlot, toggleSlot, bulkCreateSlots, getAvailability } = require("../controllers/slotController");

router.get("/",            getSlots);
router.get("/availability", getAvailability);
router.post("/",           upsertSlot);
router.post("/bulk",       bulkCreateSlots);
router.patch("/toggle",    toggleSlot);

module.exports = router;

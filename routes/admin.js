// routes/admin.js
const express = require("express");
const router  = express.Router();
const ctrl    = require("../controllers/adminController");
const { requireAdmin, requireManager } = require("../middleware/adminAuth");

// All routes below require a valid JWT
router.use(requireAdmin);

// ── Appointments ──────────────────────────────────────────────────────────────
router.get("/appointments",          ctrl.getAppointments);
router.get("/appointments/:id",      ctrl.getAppointmentById);
router.patch("/appointments/:id/status", ctrl.updateStatus);

// ── Stats ─────────────────────────────────────────────────────────────────────
router.get("/stats", ctrl.getStats);

// ── Slots (Manager only) ──────────────────────────────────────────────────────
router.get("/slots",              requireManager, ctrl.getSlots);
router.post("/slots/bulk",        requireManager, ctrl.bulkCreateSlots);
router.patch("/slots/:id/toggle", requireManager, ctrl.toggleSlot);
router.delete("/slots/:id",       requireManager, ctrl.deleteSlot);

// ── Prescriptions ─────────────────────────────────────────────────────────────
router.get("/prescriptions",  ctrl.getPrescriptions);
router.post("/prescriptions", ctrl.createPrescription);

// ── Admin user management (Manager only) ─────────────────────────────────────
router.get("/admins",      requireManager, ctrl.listAdmins);
router.post("/admins",     requireManager, ctrl.createAdmin);
router.delete("/admins/:id", requireManager, ctrl.deleteAdmin);

module.exports = router;

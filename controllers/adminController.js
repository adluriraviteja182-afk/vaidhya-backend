// controllers/adminController.js
const pool = require("../config/db");

// ── Appointments ─────────────────────────────────────────────────────────────

// GET /api/admin/appointments
// Manager → all appointments
// Doctor  → only their own (filtered by doctor_key)
exports.getAppointments = async (req, res) => {
  try {
    let query  = "SELECT * FROM appointments ORDER BY appointment_date DESC, appointment_time ASC";
    let params = [];

    if (req.admin.role === "doctor" && req.admin.doctor_key) {
      query  = "SELECT * FROM appointments WHERE doctor = ? ORDER BY appointment_date DESC, appointment_time ASC";
      params = [req.admin.doctor_key];
    }

    const [rows] = await pool.execute(query, params);
    return res.json({ success: true, data: rows });
  } catch (err) {
    console.error("[admin] getAppointments:", err.message);
    return res.status(500).json({ success: false, message: "Server error." });
  }
};

// GET /api/admin/appointments/:id
exports.getAppointmentById = async (req, res) => {
  try {
    const [rows] = await pool.execute(
      "SELECT * FROM appointments WHERE id = ?",
      [req.params.id]
    );
    if (!rows.length)
      return res.status(404).json({ success: false, message: "Not found." });

    const appt = rows[0];

    // Doctors can only view their own
    if (req.admin.role === "doctor" && appt.doctor !== req.admin.doctor_key)
      return res.status(403).json({ success: false, message: "Access denied." });

    return res.json({ success: true, data: appt });
  } catch (err) {
    console.error("[admin] getAppointmentById:", err.message);
    return res.status(500).json({ success: false, message: "Server error." });
  }
};

// PATCH /api/admin/appointments/:id/status
exports.updateStatus = async (req, res) => {
  const { status } = req.body;
  const validStatuses = ["pending_payment", "confirmed", "cancelled"];
  if (!validStatuses.includes(status))
    return res.status(400).json({ success: false, message: "Invalid status." });

  try {
    const [rows] = await pool.execute(
      "SELECT doctor FROM appointments WHERE id = ?",
      [req.params.id]
    );
    if (!rows.length)
      return res.status(404).json({ success: false, message: "Not found." });

    if (req.admin.role === "doctor" && rows[0].doctor !== req.admin.doctor_key)
      return res.status(403).json({ success: false, message: "Access denied." });

    await pool.execute(
      "UPDATE appointments SET status = ? WHERE id = ?",
      [status, req.params.id]
    );
    return res.json({ success: true, message: "Status updated." });
  } catch (err) {
    console.error("[admin] updateStatus:", err.message);
    return res.status(500).json({ success: false, message: "Server error." });
  }
};

// ── Stats ─────────────────────────────────────────────────────────────────────

// GET /api/admin/stats
exports.getStats = async (req, res) => {
  try {
    const doctorFilter = req.admin.role === "doctor" ? `WHERE doctor = '${req.admin.doctor_key}'` : "";

    const [[{ total }]]     = await pool.execute(`SELECT COUNT(*) as total FROM appointments ${doctorFilter}`);
    const [[{ confirmed }]] = await pool.execute(`SELECT COUNT(*) as confirmed FROM appointments ${doctorFilter ? doctorFilter + " AND" : "WHERE"} status = 'confirmed'`);
    const [[{ pending }]]   = await pool.execute(`SELECT COUNT(*) as pending FROM appointments ${doctorFilter ? doctorFilter + " AND" : "WHERE"} status = 'pending_payment'`);

    const today = new Date().toISOString().split("T")[0];
    const [[{ today_count }]] = await pool.execute(
      `SELECT COUNT(*) as today_count FROM appointments ${doctorFilter ? doctorFilter + " AND" : "WHERE"} appointment_date = ?`,
      [today]
    );

    return res.json({
      success: true,
      data: { total, confirmed, pending, today: today_count, revenue: confirmed * 5 },
    });
  } catch (err) {
    console.error("[admin] getStats:", err.message);
    return res.status(500).json({ success: false, message: "Server error." });
  }
};

// ── Slots (Manager only via requireManager middleware) ────────────────────────

// GET /api/admin/slots?doctor=pranaba&date=2025-01-01
exports.getSlots = async (req, res) => {
  const { doctor, week } = req.query;
  try {
    let query  = "SELECT * FROM slots ORDER BY slot_date ASC, slot_time ASC";
    let params = [];

    if (doctor && week) {
      // Get 7 days from week start
      query  = "SELECT * FROM slots WHERE doctor_key = ? AND slot_date >= ? AND slot_date < DATE_ADD(?, INTERVAL 7 DAY) ORDER BY slot_date ASC, slot_time ASC";
      params = [doctor, week, week];
    } else if (doctor) {
      query  = "SELECT * FROM slots WHERE doctor_key = ? ORDER BY slot_date ASC, slot_time ASC";
      params = [doctor];
    }

    const [rows] = await pool.execute(query, params);
    // Map to frontend-expected shape
    const mapped = rows.map(s => ({
      id:          s.id,
      doctor:      s.doctor_key,
      date:        s.slot_date,
      time:        s.slot_time,
      max_patients:s.max_patients,
      booked:      s.booked_count,
      is_active:   !!s.is_enabled,
    }));
    return res.json({ success: true, data: mapped });
  } catch (err) {
    console.error("[admin] getSlots:", err.message);
    return res.status(500).json({ success: false, message: "Server error." });
  }
};

// POST /api/admin/slots/bulk
exports.bulkCreateSlots = async (req, res) => {
  const { slots } = req.body;
  if (!Array.isArray(slots) || !slots.length)
    return res.status(400).json({ success: false, message: "slots array required." });

  try {
    let created = 0;
    for (const s of slots) {
      try {
        await pool.execute(
          "INSERT IGNORE INTO slots (doctor_key, slot_date, slot_time, max_patients) VALUES (?, ?, ?, ?)",
          [s.doctor, s.date, s.time, s.max_patients || 10]
        );
        created++;
      } catch { /* skip duplicates */ }
    }
    return res.json({ success: true, created, message: `${created} slots created.` });
  } catch (err) {
    console.error("[admin] bulkCreateSlots:", err.message);
    return res.status(500).json({ success: false, message: "Server error." });
  }
};

// PATCH /api/admin/slots/:id/toggle
exports.toggleSlot = async (req, res) => {
  const { is_active } = req.body;
  try {
    await pool.execute(
      "UPDATE slots SET is_enabled = ? WHERE id = ?",
      [is_active ? 1 : 0, req.params.id]
    );
    return res.json({ success: true });
  } catch (err) {
    console.error("[admin] toggleSlot:", err.message);
    return res.status(500).json({ success: false, message: "Server error." });
  }
};

// DELETE /api/admin/slots/:id
exports.deleteSlot = async (req, res) => {
  try {
    await pool.execute("DELETE FROM slots WHERE id = ?", [req.params.id]);
    return res.json({ success: true });
  } catch (err) {
    console.error("[admin] deleteSlot:", err.message);
    return res.status(500).json({ success: false, message: "Server error." });
  }
};

// ── Prescriptions ─────────────────────────────────────────────────────────────

// GET /api/admin/prescriptions
exports.getPrescriptions = async (req, res) => {
  try {
    let query  = "SELECT * FROM prescriptions ORDER BY created_at DESC";
    let params = [];

    if (req.admin.role === "doctor" && req.admin.doctor_key) {
      query  = "SELECT * FROM prescriptions WHERE doctor_key = ? ORDER BY created_at DESC";
      params = [req.admin.doctor_key];
    }

    const [rows] = await pool.execute(query, params);
    // Parse JSON medicines field
    const data = rows.map(r => ({
      ...r,
      medicines: typeof r.medicines === "string" ? JSON.parse(r.medicines) : r.medicines,
    }));
    return res.json({ success: true, data });
  } catch (err) {
    console.error("[admin] getPrescriptions:", err.message);
    return res.status(500).json({ success: false, message: "Server error." });
  }
};

// POST /api/admin/prescriptions
exports.createPrescription = async (req, res) => {
  const { appointment_id, patient_name, patient_phone, medicines, notes, diagnosis } = req.body;

  if (!appointment_id || !medicines?.length)
    return res.status(400).json({ success: false, message: "appointment_id and medicines required." });

  const doctor_key  = req.admin.doctor_key || "manager";
  const doctor_name = req.admin.name;

  try {
    const [result] = await pool.execute(
      `INSERT INTO prescriptions 
       (appointment_id, patient_name, patient_phone, doctor_key, doctor_name, diagnosis, medicines, instructions)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        appointment_id,
        patient_name  || "",
        patient_phone || "",
        doctor_key,
        doctor_name,
        diagnosis || notes || "",
        JSON.stringify(medicines),
        notes || "",
      ]
    );
    return res.json({ success: true, id: result.insertId });
  } catch (err) {
    console.error("[admin] createPrescription:", err.message);
    return res.status(500).json({ success: false, message: "Server error." });
  }
};

// ── Admin management (Manager only) ──────────────────────────────────────────

// GET /api/admin/admins  — list all admins (no passwords)
exports.listAdmins = async (req, res) => {
  try {
    const [rows] = await pool.execute(
      "SELECT id, username, name, role, doctor_key, created_at FROM admins ORDER BY id"
    );
    return res.json({ success: true, data: rows });
  } catch (err) {
    console.error("[admin] listAdmins:", err.message);
    return res.status(500).json({ success: false, message: "Server error." });
  }
};

// POST /api/admin/admins  — create new admin
exports.createAdmin = async (req, res) => {
  const { username, password, name, role, doctor_key } = req.body;
  if (!username || !password || !name || !role)
    return res.status(400).json({ success: false, message: "username, password, name, role required." });

  try {
    const bcrypt = require("bcryptjs");
    const hash   = await bcrypt.hash(password, 10);
    await pool.execute(
      "INSERT INTO admins (username, password, name, role, doctor_key) VALUES (?, ?, ?, ?, ?)",
      [username.trim().toLowerCase(), hash, name, role, doctor_key || null]
    );
    return res.json({ success: true, message: "Admin created." });
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY")
      return res.status(409).json({ success: false, message: "Username already exists." });
    console.error("[admin] createAdmin:", err.message);
    return res.status(500).json({ success: false, message: "Server error." });
  }
};

// DELETE /api/admin/admins/:id
exports.deleteAdmin = async (req, res) => {
  if (String(req.params.id) === String(req.admin.id))
    return res.status(400).json({ success: false, message: "Cannot delete your own account." });
  try {
    await pool.execute("DELETE FROM admins WHERE id = ?", [req.params.id]);
    return res.json({ success: true });
  } catch (err) {
    console.error("[admin] deleteAdmin:", err.message);
    return res.status(500).json({ success: false, message: "Server error." });
  }
};

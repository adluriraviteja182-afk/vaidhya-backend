// controllers/slotController.js
const pool = require("../config/db");

// GET /api/slots?doctor=pranaba&date=2026-05-10
async function getSlots(req, res) {
  const { doctor, date } = req.query;
  try {
    let query = "SELECT * FROM slots WHERE 1=1";
    const params = [];
    if (doctor) { query += " AND doctor_key = ?"; params.push(doctor); }
    if (date)   { query += " AND slot_date = ?";  params.push(date); }
    query += " ORDER BY slot_date, slot_time";
    const [rows] = await pool.execute(query, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// POST /api/slots — create or update a slot
async function upsertSlot(req, res) {
  const { doctor_key, slot_date, slot_time, max_patients, is_enabled } = req.body;
  if (!doctor_key || !slot_date || !slot_time)
    return res.status(400).json({ success: false, message: "doctor_key, slot_date, slot_time required." });
  try {
    await pool.execute(`
      INSERT INTO slots (doctor_key, slot_date, slot_time, max_patients, is_enabled)
      VALUES (?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        max_patients = VALUES(max_patients),
        is_enabled   = VALUES(is_enabled)
    `, [doctor_key, slot_date, slot_time, max_patients ?? 10, is_enabled ?? true]);
    res.json({ success: true, message: "Slot saved." });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// PATCH /api/slots/toggle — enable/disable a slot
async function toggleSlot(req, res) {
  const { doctor_key, slot_date, slot_time, is_enabled } = req.body;
  try {
    await pool.execute(`
      UPDATE slots SET is_enabled = ?
      WHERE doctor_key = ? AND slot_date = ? AND slot_time = ?
    `, [is_enabled, doctor_key, slot_date, slot_time]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// POST /api/slots/bulk — generate slots for a date range
async function bulkCreateSlots(req, res) {
  const { doctor_key, start_date, end_date, times, max_patients } = req.body;
  if (!doctor_key || !start_date || !end_date || !times?.length)
    return res.status(400).json({ success: false, message: "Missing fields." });
  try {
    const start = new Date(start_date);
    const end   = new Date(end_date);
    let created = 0;
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split("T")[0];
      for (const time of times) {
        await pool.execute(`
          INSERT INTO slots (doctor_key, slot_date, slot_time, max_patients, is_enabled)
          VALUES (?, ?, ?, ?, true)
          ON DUPLICATE KEY UPDATE max_patients = VALUES(max_patients)
        `, [doctor_key, dateStr, time, max_patients ?? 10]);
        created++;
      }
    }
    res.json({ success: true, message: `${created} slots created.` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// GET /api/slots/availability?doctor=pranaba&date=2026-05-10
async function getAvailability(req, res) {
  const { doctor, date } = req.query;
  if (!doctor || !date)
    return res.status(400).json({ success: false, message: "doctor and date required." });
  try {
    const [slots] = await pool.execute(`
      SELECT s.slot_time, s.max_patients, s.is_enabled,
             COUNT(a.id) as booked
      FROM slots s
      LEFT JOIN appointments a
        ON a.doctor = s.doctor_key
        AND a.appointment_date = s.slot_date
        AND a.appointment_time = s.slot_time
        AND a.status != 'cancelled'
      WHERE s.doctor_key = ? AND s.slot_date = ?
      GROUP BY s.slot_time, s.max_patients, s.is_enabled
      ORDER BY s.slot_time
    `, [doctor, date]);

    const result = slots.map(s => ({
      time:         s.slot_time,
      max_patients: s.max_patients,
      booked:       s.booked,
      available:    s.max_patients - s.booked,
      is_enabled:   !!s.is_enabled,
      is_full:      s.booked >= s.max_patients,
    }));
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

module.exports = { getSlots, upsertSlot, toggleSlot, bulkCreateSlots, getAvailability };

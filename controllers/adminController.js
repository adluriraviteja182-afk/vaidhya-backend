const db = require("../config/db");

function todayStr() { return new Date().toISOString().slice(0, 10); }
function weekStartStr() {
  const now = new Date();
  const diff = now.getDay() === 0 ? 6 : now.getDay() - 1;
  const mon = new Date(now);
  mon.setDate(now.getDate() - diff);
  return mon.toISOString().slice(0, 10);
}

async function getStats(req, res) {
  try {
    const [[daily]]       = await db.execute("SELECT COUNT(DISTINCT patient_phone) AS cnt FROM appointments WHERE appointment_date = ? AND status='confirmed'", [todayStr()]);
    const [[weekly]]      = await db.execute("SELECT COUNT(DISTINCT patient_phone) AS cnt FROM appointments WHERE appointment_date >= ? AND status='confirmed'", [weekStartStr()]);
    const [[teleconsult]] = await db.execute("SELECT COUNT(*) AS cnt FROM appointments WHERE appointment_type='teleconsult' AND status='confirmed'");
    const [[total]]       = await db.execute("SELECT COUNT(DISTINCT patient_phone) AS cnt FROM appointments WHERE status='confirmed'");

    return res.json({ success: true, data: {
      dailyPatients:  daily.cnt,
      weeklyPatients: weekly.cnt,
      teleconsults:   teleconsult.cnt,
      totalPatients:  total.cnt,
    }});
  } catch (err) {
    console.error("getStats error:", err.message);
    return res.status(500).json({ success: false, message: "Server error." });
  }
}

async function getPatients(req, res) {
  try {
    const [rows] = await db.execute(`
      SELECT a.patient_phone AS phone, a.patient_name AS name,
             a.patient_email AS email, a.gender, a.patient_age AS age,
             a.appointment_type AS type, a.reason AS \`condition\`,
             a.doctor, a.appointment_date AS lastVisit,
             COUNT(a2.id) AS totalVisits
      FROM appointments a
      JOIN appointments a2 ON a2.patient_phone = a.patient_phone AND a2.status = 'confirmed'
      WHERE a.status = 'confirmed'
        AND a.appointment_date = (
          SELECT MAX(a3.appointment_date) FROM appointments a3
          WHERE a3.patient_phone = a.patient_phone AND a3.status = 'confirmed'
        )
      GROUP BY a.patient_phone, a.patient_name, a.patient_email, a.gender,
               a.patient_age, a.appointment_type, a.reason, a.doctor, a.appointment_date
      ORDER BY a.appointment_date DESC
    `);

    const [upcoming] = await db.execute(`
      SELECT patient_phone, MIN(appointment_date) AS nextAppt
      FROM appointments WHERE status='confirmed' AND appointment_date > CURDATE()
      GROUP BY patient_phone
    `);

    const nextMap = {};
    for (const u of upcoming)
      nextMap[u.patient_phone] = new Date(u.nextAppt).toISOString().slice(0, 10);

    const patients = rows.map((r, idx) => ({
      id:          `P${String(idx + 1).padStart(3, "0")}`,
      name:        r.name,
      phone:       r.phone,
      email:       r.email || "—",
      gender:      r.gender || "—",
      age:         r.age || null,
      condition:   r.condition || "General Consult",
      lastVisit:   r.lastVisit ? new Date(r.lastVisit).toISOString().slice(0, 10) : "—",
      nextAppt:    nextMap[r.phone] || "—",
      type:        r.type === "teleconsult" ? "Teleconsult" : "In-Clinic",
      status:      nextMap[r.phone] ? "Active" : "Inactive",
      doctor:      r.doctor,
      totalVisits: r.totalVisits,
    }));

    return res.json({ success: true, data: patients });
  } catch (err) {
    console.error("getPatients error:", err.message);
    return res.status(500).json({ success: false, message: "Server error." });
  }
}

module.exports = { getStats, getPatients };

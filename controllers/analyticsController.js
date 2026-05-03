// controllers/analyticsController.js
const pool = require("../config/db");

// GET /api/analytics/summary?doctor=pranaba
async function getSummary(req, res) {
  const { doctor } = req.query;
  try {
    const doctorFilter = doctor ? "AND doctor = ?" : "";
    const params = doctor ? [doctor] : [];

    const [[totals]] = await pool.execute(`
      SELECT
        COUNT(*)                                          AS total,
        SUM(status = 'confirmed')                         AS confirmed,
        SUM(status = 'cancelled')                         AS cancelled,
        SUM(status = 'pending_payment')                   AS pending,
        SUM(appointment_type = 'teleconsult')             AS teleconsult,
        SUM(appointment_type = 'in-clinic')               AS in_clinic,
        SUM(DATE(appointment_date) = CURDATE())           AS today,
        SUM(appointment_date >= DATE_SUB(CURDATE(),INTERVAL 7 DAY)) AS this_week,
        SUM(appointment_date >= DATE_SUB(CURDATE(),INTERVAL 30 DAY)) AS this_month
      FROM appointments WHERE 1=1 ${doctorFilter}
    `, params);

    res.json({ success: true, data: totals });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// GET /api/analytics/daily?doctor=pranaba&days=30
async function getDailyStats(req, res) {
  const { doctor, days = 30 } = req.query;
  try {
    const doctorFilter = doctor ? "AND doctor = ?" : "";
    const params = doctor ? [parseInt(days), doctor] : [parseInt(days)];

    const [rows] = await pool.execute(`
      SELECT
        DATE(appointment_date)              AS date,
        COUNT(*)                            AS total,
        SUM(status = 'confirmed')           AS confirmed,
        SUM(appointment_type='teleconsult') AS teleconsult,
        SUM(appointment_type='in-clinic')   AS in_clinic
      FROM appointments
      WHERE appointment_date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
      ${doctorFilter}
      GROUP BY DATE(appointment_date)
      ORDER BY date ASC
    `, params);

    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// GET /api/analytics/doctor-wise
async function getDoctorWise(req, res) {
  try {
    const [rows] = await pool.execute(`
      SELECT
        doctor,
        COUNT(*)                            AS total,
        SUM(status = 'confirmed')           AS confirmed,
        SUM(appointment_type='teleconsult') AS teleconsult,
        SUM(appointment_type='in-clinic')   AS in_clinic,
        SUM(DATE(appointment_date)=CURDATE()) AS today
      FROM appointments
      GROUP BY doctor
    `);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// GET /api/analytics/patient-history?phone=9876543210
async function getPatientHistory(req, res) {
  const { phone, name } = req.query;
  if (!phone && !name)
    return res.status(400).json({ success: false, message: "phone or name required." });
  try {
    let query = `
      SELECT a.*, p.diagnosis, p.medicines, p.instructions, p.follow_up_date, p.signature_url
      FROM appointments a
      LEFT JOIN prescriptions p ON p.appointment_id = a.id
      WHERE 1=1
    `;
    const params = [];
    if (phone) { query += " AND a.patient_phone = ?"; params.push(phone); }
    if (name)  { query += " AND a.patient_name LIKE ?"; params.push(`%${name}%`); }
    query += " ORDER BY a.appointment_date DESC";

    const [rows] = await pool.execute(query, params);
    const data = rows.map(r => ({
      ...r,
      medicines: r.medicines ? JSON.parse(r.medicines) : [],
    }));
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// GET /api/analytics/monthly?year=2026
async function getMonthlyStats(req, res) {
  const { year = new Date().getFullYear(), doctor } = req.query;
  try {
    const doctorFilter = doctor ? "AND doctor = ?" : "";
    const params = doctor ? [parseInt(year), doctor] : [parseInt(year)];

    const [rows] = await pool.execute(`
      SELECT
        MONTH(appointment_date)             AS month,
        COUNT(*)                            AS total,
        SUM(status='confirmed')             AS confirmed,
        SUM(appointment_type='teleconsult') AS teleconsult,
        SUM(appointment_type='in-clinic')   AS in_clinic
      FROM appointments
      WHERE YEAR(appointment_date) = ? ${doctorFilter}
      GROUP BY MONTH(appointment_date)
      ORDER BY month ASC
    `, params);

    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

module.exports = { getSummary, getDailyStats, getDoctorWise, getPatientHistory, getMonthlyStats };

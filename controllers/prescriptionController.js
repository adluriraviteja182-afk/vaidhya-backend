// controllers/prescriptionController.js
const pool = require("../config/db");
const cloudinary = require("cloudinary").v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// POST /api/prescriptions — create prescription
async function createPrescription(req, res) {
  const {
    appointment_id, patient_name, patient_phone,
    doctor_key, doctor_name, diagnosis,
    medicines, instructions, follow_up_date,
    signature_data_url, // base64 signature image
  } = req.body;

  if (!appointment_id || !medicines?.length)
    return res.status(400).json({ success: false, message: "appointment_id and medicines required." });

  try {
    let signature_url = null;

    // Upload signature to Cloudinary if provided
    if (signature_data_url) {
      const upload = await cloudinary.uploader.upload(signature_data_url, {
        folder: "pragyan/signatures",
        public_id: `sig_${appointment_id}_${Date.now()}`,
      });
      signature_url = upload.secure_url;
    }

    const [result] = await pool.execute(`
      INSERT INTO prescriptions
        (appointment_id, patient_name, patient_phone, doctor_key, doctor_name,
         diagnosis, medicines, instructions, follow_up_date, signature_url)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      appointment_id, patient_name, patient_phone,
      doctor_key, doctor_name, diagnosis,
      JSON.stringify(medicines), instructions,
      follow_up_date || null, signature_url,
    ]);

    res.json({ success: true, id: result.insertId, signature_url });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// GET /api/prescriptions?appointment_id=123
async function getPrescriptions(req, res) {
  const { appointment_id, doctor_key, patient_phone } = req.query;
  try {
    let query = "SELECT * FROM prescriptions WHERE 1=1";
    const params = [];
    if (appointment_id) { query += " AND appointment_id = ?"; params.push(appointment_id); }
    if (doctor_key)     { query += " AND doctor_key = ?";     params.push(doctor_key); }
    if (patient_phone)  { query += " AND patient_phone = ?";  params.push(patient_phone); }
    query += " ORDER BY created_at DESC";
    const [rows] = await pool.execute(query, params);
    const data = rows.map(r => ({ ...r, medicines: JSON.parse(r.medicines || "[]") }));
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

// GET /api/prescriptions/:id
async function getPrescriptionById(req, res) {
  try {
    const [rows] = await pool.execute(
      "SELECT * FROM prescriptions WHERE id = ?", [req.params.id]
    );
    if (!rows.length)
      return res.status(404).json({ success: false, message: "Not found." });
    const p = rows[0];
    p.medicines = JSON.parse(p.medicines || "[]");
    res.json({ success: true, data: p });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}

module.exports = { createPrescription, getPrescriptions, getPrescriptionById };

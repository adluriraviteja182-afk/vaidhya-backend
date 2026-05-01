const { validationResult } = require("express-validator");
const crypto = require("crypto");
const db = require("../config/db");
const razorpay = require("../config/razorpay");
const { notifyPatient, notifyDoctor } = require("../services/notificationService");
const { generateMeetLink } = require("../services/meetService");

// ─── POST /api/appointments ────────────────────────────────────
async function bookAppointment(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty())
    return res.status(400).json({ success: false, errors: errors.array() });

  if (!razorpay)
    return res.status(500).json({ success: false, message: "Razorpay not configured." });

  const {
    patient_name, patient_email, patient_phone,
    doctor, appointment_type, appointment_date,
    appointment_time, reason,
  } = req.body;

  try {
    const amount = 100; // ₹1 in paise
    const order = await razorpay.orders.create({
      amount,
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
    });

    const result = await db.query(
      `INSERT INTO appointments
        (patient_name, patient_email, patient_phone, doctor, appointment_type,
         appointment_date, appointment_time, reason, status, razorpay_order_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending_payment', $9)
       RETURNING id`,
      [patient_name, patient_email, patient_phone, doctor, appointment_type,
       appointment_date, appointment_time, reason || null, order.id]
    );

    return res.status(201).json({
      success: true,
      appointmentId: result.rows[0].id,
      razorpayOrderId: order.id,
      amount,
      currency: "INR",
      razorpayKeyId: process.env.RAZORPAY_KEY_ID,
    });
  } catch (err) {
    console.error("bookAppointment error:", err.message);
    return res.status(500).json({ success: false, message: "Server error: " + err.message });
  }
}

// ─── POST /api/appointments/verify-payment ─────────────────────
async function verifyPayment(req, res) {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, appointmentId } = req.body;

  try {
    // Verify Razorpay signature
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (expectedSignature !== razorpay_signature)
      return res.status(400).json({ success: false, message: "Payment verification failed." });

    const meetLink = generateMeetLink();

    // Confirm appointment
    await db.query(
      `UPDATE appointments
       SET status = 'confirmed', meet_link = $1, razorpay_payment_id = $2
       WHERE id = $3`,
      [meetLink, razorpay_payment_id, appointmentId]
    );

    // Fetch full appointment for notifications
    const result = await db.query("SELECT * FROM appointments WHERE id = $1", [appointmentId]);
    const appointment = result.rows[0];

    // Send notifications (non-blocking — don't fail the response if this errors)
    Promise.all([
      notifyPatient({ ...appointment, meetLink }),
      notifyDoctor({ ...appointment, meetLink }),
    ]).catch((err) => console.error("Notification error:", err.message));

    return res.json({ success: true, message: "Payment confirmed!" });
  } catch (err) {
    console.error("verifyPayment error:", err.message);
    return res.status(500).json({ success: false, message: "Server error." });
  }
}

// ─── GET /api/appointments ─────────────────────────────────────
async function listAppointments(req, res) {
  try {
    const result = await db.query("SELECT * FROM appointments ORDER BY created_at DESC");
    return res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error("listAppointments error:", err.message);
    return res.status(500).json({ success: false, message: "Server error." });
  }
}

module.exports = { bookAppointment, verifyPayment, listAppointments };

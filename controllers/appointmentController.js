const { validationResult } = require("express-validator");
const crypto = require("crypto");
const db = require("../config/db");
const razorpay = require("../config/razorpay");
const { notifyPatient, notifyDoctor } = require("../services/notificationService");
const { generateMeetLink } = require("../services/meetService");

async function bookAppointment(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty())
    return res.status(400).json({ success: false, errors: errors.array() });

  if (!razorpay)
    return res.status(500).json({ success: false, message: "Razorpay not configured." });

  const {
    patient_name, patient_email, patient_phone,
    patient_age, gender,
    doctor, appointment_type, appointment_date,
    appointment_time, reason,
  } = req.body;

  try {
    const amount = 500;
    const order = await razorpay.orders.create({
      amount,
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
    });

    const [result] = await db.execute(
      `INSERT INTO appointments
        (patient_name, patient_email, patient_phone, patient_age, gender,
         doctor, appointment_type, appointment_date, appointment_time,
         reason, status, razorpay_order_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending_payment', ?)`,
      [patient_name, patient_email, patient_phone,
       patient_age || null, gender || null,
       doctor, appointment_type, appointment_date,
       appointment_time, reason || null, order.id]
    );

    return res.status(201).json({
      success: true,
      appointmentId: result.insertId,
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

async function verifyPayment(req, res) {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, appointmentId } = req.body;

  try {
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (expectedSignature !== razorpay_signature)
      return res.status(400).json({ success: false, message: "Payment verification failed." });

    const meetLink = generateMeetLink();

    await db.execute(
      `UPDATE appointments
       SET status = 'confirmed', meet_link = ?, razorpay_payment_id = ?
       WHERE id = ?`,
      [meetLink, razorpay_payment_id, appointmentId]
    );

    const [rows] = await db.execute("SELECT * FROM appointments WHERE id = ?", [appointmentId]);
    const appointment = rows[0];

    Promise.all([
      notifyPatient({ ...appointment, meetLink }),
      notifyDoctor({ ...appointment, meetLink }),
    ]).catch((err) => console.error("Notification error:", err.message));

    return res.json({ success: true, meetLink, message: "Payment confirmed!" });
  } catch (err) {
    console.error("verifyPayment error:", err.message);
    return res.status(500).json({ success: false, message: "Server error." });
  }
}

async function listAppointments(req, res) {
  try {
    const [rows] = await db.execute("SELECT * FROM appointments ORDER BY created_at DESC");
    return res.json({ success: true, data: rows });
  } catch (err) {
    console.error("listAppointments error:", err.message);
    return res.status(500).json({ success: false, message: "Server error." });
  }
}

module.exports = { bookAppointment, verifyPayment, listAppointments };

const nodemailer = require("nodemailer");

// ─── Email transporter ─────────────────────────────────────────
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

async function sendEmail({ to, subject, html }) {
  await transporter.sendMail({
    from: `"Pragyan Clinic" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    html,
  });
}

// ─── WhatsApp via Twilio ───────────────────────────────────────
async function sendWhatsApp({ to, body }) {
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
    console.warn("WhatsApp skipped — Twilio not configured");
    return;
  }
  const twilio = require("twilio")(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
  );
  await twilio.messages.create({
    from: "whatsapp:" + process.env.TWILIO_PHONE,
    to:   "whatsapp:" + to,
    body,
  });
}

// ─── Doctor display names ──────────────────────────────────────
function getDoctorName(doctor, short = false) {
  if (doctor === "pranaba")
    return short ? "Dr. Pranaba" : "Dr. B. Pranaba Nanda Patro";
  return short ? "Dr. Nibedita" : "Dr. Nibedita Mahapatro";
}

// ─── Notify Patient ────────────────────────────────────────────
async function notifyPatient(appointment) {
  const {
    patient_name, patient_email, patient_phone,
    doctor, appointment_type, appointment_date,
    appointment_time, meetLink,
  } = appointment;

  const doctorName = getDoctorName(doctor);
  const isTeleconsult = appointment_type === "teleconsult";
  const meetRow = isTeleconsult && meetLink
    ? `<tr><td style="padding:8px;color:#4A6080;">Google Meet</td>
       <td style="padding:8px;"><a href="${meetLink}" style="color:#00C9A7;font-weight:bold;">${meetLink}</a></td></tr>`
    : "";
  const meetBlock = isTeleconsult && meetLink
    ? `<div style="background:#F0FFF8;border:1px solid #00C9A7;border-radius:8px;padding:12px;margin:16px 0;">
         <strong>📹 Join your video consultation:</strong><br/>
         <a href="${meetLink}" style="color:#00C9A7;">${meetLink}</a><br/>
         <small>Click the link at your appointment time to join Google Meet.</small>
       </div>`
    : "";

  await sendEmail({
    to: patient_email,
    subject: "✅ Appointment Confirmed – Pragyan Clinic",
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:24px;border:1px solid #E0E7FF;border-radius:12px;">
        <h2 style="color:#0A2540;">Appointment Confirmed 🎉</h2>
        <p>Dear <strong>${patient_name}</strong>, your payment was successful and your appointment is confirmed.</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0;">
          <tr><td style="padding:8px;color:#4A6080;">Doctor</td><td style="padding:8px;font-weight:bold;">${doctorName}</td></tr>
          <tr style="background:#F8FAFF"><td style="padding:8px;color:#4A6080;">Type</td><td style="padding:8px;">${appointment_type}</td></tr>
          <tr><td style="padding:8px;color:#4A6080;">Date</td><td style="padding:8px;">${appointment_date}</td></tr>
          <tr style="background:#F8FAFF"><td style="padding:8px;color:#4A6080;">Time</td><td style="padding:8px;">${appointment_time}</td></tr>
          ${meetRow}
        </table>
        ${meetBlock}
        <p style="color:#4A6080;font-size:13px;">Need to cancel? Contact us at least 2 hours before your appointment.</p>
        <p style="color:#8CA0BC;font-size:12px;">— Pragyan Clinic Team</p>
      </div>
    `,
  });

  const meetText = isTeleconsult && meetLink
    ? `\n\n📹 Join your video call at appointment time:\n${meetLink}`
    : "";

  await sendWhatsApp({
    to: patient_phone,
    body: `Hi ${patient_name}, your appointment with ${doctorName} is confirmed!\n\n📅 Date: ${appointment_date}\n⏰ Time: ${appointment_time}\n🏥 Type: ${appointment_type}${meetText}\n\n– Pragyan Clinic`,
  });
}

// ─── Notify Doctor ─────────────────────────────────────────────
async function notifyDoctor(appointment) {
  const {
    patient_name, patient_phone, doctor,
    appointment_type, appointment_date,
    appointment_time, reason, meetLink,
  } = appointment;

  const doctorName = getDoctorName(doctor, true);
  const isTeleconsult = appointment_type === "teleconsult";
  const meetRow = isTeleconsult && meetLink
    ? `<tr><td style="padding:8px;color:#4A6080;">Meet Link</td>
       <td style="padding:8px;"><a href="${meetLink}">${meetLink}</a></td></tr>`
    : "";

  await sendEmail({
    to: process.env.DOCTOR_EMAIL,
    subject: `📅 New Appointment – ${patient_name} on ${appointment_date}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:24px;border:1px solid #E0E7FF;border-radius:12px;">
        <h2 style="color:#0A2540;">New Appointment Booked ✅</h2>
        <p>Hello <strong>${doctorName}</strong>, a new paid appointment has been confirmed.</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0;">
          <tr><td style="padding:8px;color:#4A6080;">Patient</td><td style="padding:8px;font-weight:bold;">${patient_name}</td></tr>
          <tr style="background:#F8FAFF"><td style="padding:8px;color:#4A6080;">Phone</td><td style="padding:8px;">${patient_phone}</td></tr>
          <tr><td style="padding:8px;color:#4A6080;">Type</td><td style="padding:8px;">${appointment_type}</td></tr>
          <tr style="background:#F8FAFF"><td style="padding:8px;color:#4A6080;">Date</td><td style="padding:8px;">${appointment_date}</td></tr>
          <tr><td style="padding:8px;color:#4A6080;">Time</td><td style="padding:8px;">${appointment_time}</td></tr>
          <tr style="background:#F8FAFF"><td style="padding:8px;color:#4A6080;">Reason</td><td style="padding:8px;">${reason || "Not specified"}</td></tr>
          ${meetRow}
        </table>
      </div>
    `,
  });

  const meetText = isTeleconsult && meetLink
    ? `\n\n📹 Google Meet:\n${meetLink}`
    : "";

  await sendWhatsApp({
    to: process.env.DOCTOR_PHONE,
    body: `New appointment: ${patient_name} (${patient_phone})\n📅 ${appointment_date} at ${appointment_time}\n🏥 ${appointment_type}\nReason: ${reason || "N/A"}${meetText}`,
  });
}

module.exports = { notifyPatient, notifyDoctor };

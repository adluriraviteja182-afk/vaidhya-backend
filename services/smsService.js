// services/smsService.js
// Handles OTP SMS via Twilio or MSG91. Falls back to console in dev.

async function sendOTPSMS(phone, otp) {
  const message = `Your Pragyan Clinic OTP is ${otp}. Valid for 10 minutes. Do not share this code.`;

  // ── Twilio ────────────────────────────────────────────────────
  if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
    const twilio = require("twilio")(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );
    await twilio.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phone,
    });
    return;
  }

  // ── MSG91 ─────────────────────────────────────────────────────
  if (process.env.MSG91_AUTH_KEY && process.env.MSG91_TEMPLATE_ID) {
    const axios = require("axios");
    await axios.post(
      "https://api.msg91.com/api/v5/otp",
      {
        template_id: process.env.MSG91_TEMPLATE_ID,
        mobile: phone.replace("+", ""),
        otp,
      },
      {
        headers: {
          authkey: process.env.MSG91_AUTH_KEY,
          "Content-Type": "application/json",
        },
      }
    );
    return;
  }

  // ── Dev fallback ──────────────────────────────────────────────
  console.log(`[DEV] OTP for ${phone}: ${otp}`);
}

module.exports = { sendOTPSMS };

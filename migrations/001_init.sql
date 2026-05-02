-- migrations/001_init.sql
-- MySQL version

-- ─── Appointments ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS appointments (
  id                  INT AUTO_INCREMENT PRIMARY KEY,
  patient_name        VARCHAR(100)       NOT NULL,
  patient_email       VARCHAR(100)       NOT NULL,
  patient_phone       VARCHAR(20)        NOT NULL,
  doctor              VARCHAR(50)        NOT NULL,
  appointment_type    VARCHAR(50)        NOT NULL,
  appointment_date    DATE               NOT NULL,
  appointment_time    VARCHAR(20)        NOT NULL,
  reason              TEXT,
  status              ENUM('pending_payment', 'confirmed', 'cancelled') NOT NULL DEFAULT 'pending_payment',
  meet_link           VARCHAR(200),
  razorpay_order_id   VARCHAR(100),
  razorpay_payment_id VARCHAR(100),
  user_id             INT,
  created_at          TIMESTAMP          NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ─── Users (OTP auth) ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  name       VARCHAR(100) NOT NULL,
  phone      VARCHAR(20)  NOT NULL UNIQUE,
  verified   BOOLEAN      NOT NULL DEFAULT false,
  created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ─── OTP tokens ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS otp_tokens (
  phone      VARCHAR(20) PRIMARY KEY,
  otp_hash   VARCHAR(64) NOT NULL,
  expires_at DATETIME    NOT NULL,
  attempts   INT         NOT NULL DEFAULT 0
);

-- ─── Foreign key ───────────────────────────────────────────────
ALTER TABLE appointments
  ADD CONSTRAINT fk_appointments_user
  FOREIGN KEY (user_id) REFERENCES users(id)
  ON DELETE SET NULL;

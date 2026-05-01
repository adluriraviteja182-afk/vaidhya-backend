-- migrations/001_init.sql
-- Run once against your PostgreSQL database
-- psql -U <user> -d <dbname> -f migrations/001_init.sql

-- ─── Enum for appointment status ──────────────────────────────
DO $$ BEGIN
  CREATE TYPE appointment_status AS ENUM ('pending_payment', 'confirmed', 'cancelled');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ─── Appointments ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS appointments (
  id                  SERIAL PRIMARY KEY,
  patient_name        VARCHAR(100)       NOT NULL,
  patient_email       VARCHAR(100)       NOT NULL,
  patient_phone       VARCHAR(20)        NOT NULL,
  doctor              VARCHAR(50)        NOT NULL,
  appointment_type    VARCHAR(50)        NOT NULL,
  appointment_date    DATE               NOT NULL,
  appointment_time    VARCHAR(20)        NOT NULL,
  reason              TEXT,
  status              appointment_status NOT NULL DEFAULT 'pending_payment',
  meet_link           VARCHAR(200),
  razorpay_order_id   VARCHAR(100),
  razorpay_payment_id VARCHAR(100),
  user_id             INT,
  created_at          TIMESTAMPTZ        NOT NULL DEFAULT NOW()
);

-- ─── Users (OTP auth) ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id         SERIAL      PRIMARY KEY,
  name       VARCHAR(100) NOT NULL,
  phone      VARCHAR(20)  NOT NULL UNIQUE,
  verified   BOOLEAN      NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ─── OTP tokens ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS otp_tokens (
  phone      VARCHAR(20) PRIMARY KEY,
  otp_hash   VARCHAR(64) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  attempts   INT         NOT NULL DEFAULT 0
);

-- ─── Foreign key (add after both tables exist) ─────────────────
ALTER TABLE appointments
  ADD CONSTRAINT fk_appointments_user
  FOREIGN KEY (user_id) REFERENCES users(id)
  ON DELETE SET NULL;

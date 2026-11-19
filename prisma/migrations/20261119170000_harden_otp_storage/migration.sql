-- Additive-only security hardening for OTP records.
-- No existing data is deleted, altered, renamed, or rewritten.
ALTER TABLE "otp_codes" ADD COLUMN "code_hash" TEXT;
ALTER TABLE "otp_codes" ADD COLUMN "attempts" INTEGER NOT NULL DEFAULT 0;

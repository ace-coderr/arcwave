-- Add customAmount and minAmount fields to PaymentLink
ALTER TABLE "PaymentLink" ADD COLUMN IF NOT EXISTS "customAmount" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "PaymentLink" ADD COLUMN IF NOT EXISTS "minAmount" TEXT;

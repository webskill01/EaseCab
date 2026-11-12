-- In-app UPI QR payments (Phase 26): the bot captures the govt receipt after payment.
ALTER TABLE "border_tax_requests" ADD COLUMN "receipt_no" TEXT;
ALTER TABLE "border_tax_requests" ADD COLUMN "receipt_key" TEXT;
ALTER TABLE "border_tax_requests" ADD COLUMN "paid_at" TIMESTAMPTZ(6);

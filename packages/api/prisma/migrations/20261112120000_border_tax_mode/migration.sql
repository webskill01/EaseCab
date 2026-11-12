-- Border tax: the period the driver picked (DAYS / MONTHLY / QUARTERLY / ...). Additive, constant
-- default → no table rewrite on PG 11+; existing rows are DAYS filings.
ALTER TABLE "border_tax_requests" ADD COLUMN "tax_mode" TEXT NOT NULL DEFAULT '1';

-- Buyer-only checkout: the buyer's own contact details now back every ticket
-- in the order, so per-attendee organization/accessibility fields are no
-- longer collected.
ALTER TABLE "Order" ADD COLUMN "buyerPhone" TEXT;
ALTER TABLE "Order" ADD COLUMN "buyerCountry" TEXT;

UPDATE "Order" SET "buyerPhone" = 'UNKNOWN' WHERE "buyerPhone" IS NULL;
UPDATE "Order" SET "buyerCountry" = 'UNKNOWN' WHERE "buyerCountry" IS NULL;

ALTER TABLE "Order" ALTER COLUMN "buyerPhone" SET NOT NULL;
ALTER TABLE "Order" ALTER COLUMN "buyerCountry" SET NOT NULL;

ALTER TABLE "Attendee" DROP COLUMN "organization";
ALTER TABLE "Attendee" DROP COLUMN "accessibilityNotes";

-- TOTP replaced by emailed login codes (AdminLoginCode).
ALTER TABLE "AdminUser" DROP COLUMN "mfaEnabled",
DROP COLUMN "mfaSecret";

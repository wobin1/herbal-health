-- CreateEnum
CREATE TYPE "EmailType" AS ENUM ('REGISTRATION_CONFIRMATION', 'PAYMENT_RECEIPT', 'PAYMENT_FAILURE', 'EVENT_REMINDER', 'EVENT_UPDATE', 'EVENT_CANCELLATION', 'REGISTRATION_CANCELLATION', 'REFUND_CONFIRMATION', 'REGISTRATION_TRANSFER', 'ADMIN_NEW_REGISTRATION');

-- CreateEnum
CREATE TYPE "EmailStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');

-- CreateTable
CREATE TABLE "EmailMessage" (
    "id" TEXT NOT NULL,
    "type" "EmailType" NOT NULL,
    "toEmail" TEXT NOT NULL,
    "dedupeKey" TEXT NOT NULL,
    "variables" JSONB NOT NULL,
    "status" "EmailStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EmailMessage_dedupeKey_key" ON "EmailMessage"("dedupeKey");

-- CreateIndex
CREATE INDEX "EmailMessage_status_idx" ON "EmailMessage"("status");

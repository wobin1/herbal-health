-- CreateEnum
CREATE TYPE "ContentPageSlug" AS ENUM ('ABOUT', 'CONTACT', 'TERMS', 'PRIVACY', 'REFUND_POLICY', 'DISCLAIMER');

-- CreateEnum
CREATE TYPE "EventStatus" AS ENUM ('DRAFT', 'COMING_SOON', 'PUBLISHED', 'ON_SALE', 'SOLD_OUT', 'CLOSED', 'CANCELLED', 'COMPLETED');

-- CreateTable
CREATE TABLE "ContentPage" (
    "id" TEXT NOT NULL,
    "slug" "ContentPageSlug" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "metaDescription" TEXT,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContentPage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HomepageContent" (
    "id" TEXT NOT NULL,
    "heroHeading" TEXT NOT NULL,
    "heroSubheading" TEXT NOT NULL,
    "heroCtaLabel" TEXT NOT NULL,
    "heroCtaHref" TEXT NOT NULL,
    "missionHeading" TEXT NOT NULL,
    "missionBody" TEXT NOT NULL,
    "finalCtaHeading" TEXT NOT NULL,
    "finalCtaBody" TEXT NOT NULL,
    "finalCtaLabel" TEXT NOT NULL,
    "finalCtaHref" TEXT NOT NULL,
    "footerAboutText" TEXT NOT NULL,
    "footerContactEmail" TEXT NOT NULL,
    "footerContactPhone" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HomepageContent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EducationalFocusItem" (
    "id" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EducationalFocusItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Instructor" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "credentials" TEXT,
    "shortBio" TEXT NOT NULL,
    "fullBio" TEXT NOT NULL,
    "photoUrl" TEXT,
    "websiteUrl" TEXT,
    "socialLinks" JSONB,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Instructor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FAQ" (
    "id" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "category" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FAQ_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "seriesName" TEXT,
    "volumeLabel" TEXT,
    "shortDescription" TEXT NOT NULL,
    "startAt" TIMESTAMP(3) NOT NULL,
    "timezone" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "coverImageUrl" TEXT,
    "status" "EventStatus" NOT NULL DEFAULT 'DRAFT',
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ContentPage_slug_key" ON "ContentPage"("slug");

-- CreateIndex
CREATE INDEX "EducationalFocusItem_published_sortOrder_idx" ON "EducationalFocusItem"("published", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "Instructor_slug_key" ON "Instructor"("slug");

-- CreateIndex
CREATE INDEX "Instructor_published_sortOrder_idx" ON "Instructor"("published", "sortOrder");

-- CreateIndex
CREATE INDEX "FAQ_published_sortOrder_idx" ON "FAQ"("published", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "Event_slug_key" ON "Event"("slug");

-- CreateIndex
CREATE INDEX "Event_status_isFeatured_sortOrder_idx" ON "Event"("status", "isFeatured", "sortOrder");

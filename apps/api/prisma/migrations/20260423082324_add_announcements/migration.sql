-- CreateEnum
CREATE TYPE "AnnouncementCategory" AS ENUM ('GENERAL', 'MAINTENANCE', 'MEETING', 'EMERGENCY', 'CELEBRATION');

-- CreateTable
CREATE TABLE "announcements" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "category" "AnnouncementCategory" NOT NULL DEFAULT 'GENERAL',
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "announcements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "announcement_images" (
    "id" TEXT NOT NULL,
    "announcementId" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,

    CONSTRAINT "announcement_images_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "announcements_orgId_idx" ON "announcements"("orgId");

-- CreateIndex
CREATE INDEX "announcements_orgId_isPinned_idx" ON "announcements"("orgId", "isPinned");

-- AddForeignKey
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "announcement_images" ADD CONSTRAINT "announcement_images_announcementId_fkey" FOREIGN KEY ("announcementId") REFERENCES "announcements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

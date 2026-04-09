-- CreateEnum
CREATE TYPE "ComplaintCategory" AS ENUM ('WATER_SUPPLY', 'ELECTRICITY', 'LIFT_ELEVATOR', 'GENERATOR', 'INTERNET_CABLE', 'PARKING', 'GARBAGE_WASTE', 'GARDEN_LANDSCAPING', 'GYM_CLUBHOUSE', 'SWIMMING_POOL', 'SECURITY', 'NOISE', 'PET_RELATED', 'DOMESTIC_HELP', 'NEIGHBOUR_BEHAVIOUR', 'STAFF_BEHAVIOUR', 'MAINTENANCE_REPAIR', 'RULE_VIOLATION', 'OTHER');

-- CreateEnum
CREATE TYPE "ComplaintVisibility" AS ENUM ('PUBLIC', 'PRIVATE');

-- CreateEnum
CREATE TYPE "ComplaintStatus" AS ENUM ('OPEN', 'RESOLVED', 'REJECTED');

-- CreateTable
CREATE TABLE "complaints" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "raisedBy" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" "ComplaintCategory" NOT NULL,
    "visibility" "ComplaintVisibility" NOT NULL DEFAULT 'PRIVATE',
    "status" "ComplaintStatus" NOT NULL DEFAULT 'OPEN',
    "rejectionReason" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "resolvedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "complaints_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "complaint_images" (
    "id" TEXT NOT NULL,
    "complaintId" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "complaint_images_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "complaints_orgId_idx" ON "complaints"("orgId");

-- CreateIndex
CREATE INDEX "complaints_raisedBy_idx" ON "complaints"("raisedBy");

-- CreateIndex
CREATE INDEX "complaints_orgId_status_idx" ON "complaints"("orgId", "status");

-- CreateIndex
CREATE INDEX "complaints_orgId_visibility_idx" ON "complaints"("orgId", "visibility");

-- CreateIndex
CREATE INDEX "complaints_orgId_category_idx" ON "complaints"("orgId", "category");

-- CreateIndex
CREATE INDEX "complaint_images_complaintId_idx" ON "complaint_images"("complaintId");

-- AddForeignKey
ALTER TABLE "complaints" ADD CONSTRAINT "complaints_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "complaints" ADD CONSTRAINT "complaints_raisedBy_fkey" FOREIGN KEY ("raisedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "complaints" ADD CONSTRAINT "complaints_resolvedBy_fkey" FOREIGN KEY ("resolvedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "complaint_images" ADD CONSTRAINT "complaint_images_complaintId_fkey" FOREIGN KEY ("complaintId") REFERENCES "complaints"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

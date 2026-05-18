-- CreateEnum
CREATE TYPE "VisitorType" AS ENUM ('INDIVIDUAL', 'DELIVERY', 'SERVICE', 'DOMESTIC', 'CAB', 'OTHER');

-- CreateEnum
CREATE TYPE "EntryStatus" AS ENUM ('PENDING', 'APPROVED', 'DENIED', 'ALLOWED', 'TURNED_AWAY', 'EXITED');

-- CreateTable
CREATE TABLE "visitors" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "mobile" TEXT,
    "vehicleNo" TEXT,
    "type" "VisitorType" NOT NULL DEFAULT 'INDIVIDUAL',
    "photoUrl" TEXT,
    "isFrequent" BOOLEAN NOT NULL DEFAULT false,
    "frequentForUnitId" TEXT,
    "frequentApprovedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "visitors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "visitor_entries" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "visitorId" TEXT NOT NULL,
    "unitId" TEXT,
    "flatName" TEXT,
    "purpose" TEXT,
    "status" "EntryStatus" NOT NULL DEFAULT 'PENDING',
    "loggedBy" TEXT NOT NULL,
    "approvedBy" TEXT,
    "notifiedAt" TIMESTAMP(3),
    "respondedAt" TIMESTAMP(3),
    "enteredAt" TIMESTAMP(3),
    "exitedAt" TIMESTAMP(3),
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "visitor_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "visitor_pre_approvals" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "visitorName" TEXT NOT NULL,
    "visitorMobile" TEXT,
    "unitId" TEXT NOT NULL,
    "approvedBy" TEXT NOT NULL,
    "note" TEXT,
    "isUsed" BOOLEAN NOT NULL DEFAULT false,
    "usedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "visitor_pre_approvals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "visitors_orgId_idx" ON "visitors"("orgId");

-- CreateIndex
CREATE INDEX "visitors_orgId_mobile_idx" ON "visitors"("orgId", "mobile");

-- CreateIndex
CREATE INDEX "visitor_entries_orgId_idx" ON "visitor_entries"("orgId");

-- CreateIndex
CREATE INDEX "visitor_entries_orgId_status_idx" ON "visitor_entries"("orgId", "status");

-- CreateIndex
CREATE INDEX "visitor_entries_orgId_unitId_idx" ON "visitor_entries"("orgId", "unitId");

-- CreateIndex
CREATE INDEX "visitor_pre_approvals_orgId_idx" ON "visitor_pre_approvals"("orgId");

-- CreateIndex
CREATE INDEX "visitor_pre_approvals_orgId_unitId_idx" ON "visitor_pre_approvals"("orgId", "unitId");

-- AddForeignKey
ALTER TABLE "visitors" ADD CONSTRAINT "visitors_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visitors" ADD CONSTRAINT "visitors_frequentForUnitId_fkey" FOREIGN KEY ("frequentForUnitId") REFERENCES "property_nodes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visitors" ADD CONSTRAINT "visitors_frequentApprovedBy_fkey" FOREIGN KEY ("frequentApprovedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visitor_entries" ADD CONSTRAINT "visitor_entries_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visitor_entries" ADD CONSTRAINT "visitor_entries_visitorId_fkey" FOREIGN KEY ("visitorId") REFERENCES "visitors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visitor_entries" ADD CONSTRAINT "visitor_entries_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "property_nodes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visitor_entries" ADD CONSTRAINT "visitor_entries_loggedBy_fkey" FOREIGN KEY ("loggedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visitor_entries" ADD CONSTRAINT "visitor_entries_approvedBy_fkey" FOREIGN KEY ("approvedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visitor_pre_approvals" ADD CONSTRAINT "visitor_pre_approvals_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visitor_pre_approvals" ADD CONSTRAINT "visitor_pre_approvals_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "property_nodes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visitor_pre_approvals" ADD CONSTRAINT "visitor_pre_approvals_approvedBy_fkey" FOREIGN KEY ("approvedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

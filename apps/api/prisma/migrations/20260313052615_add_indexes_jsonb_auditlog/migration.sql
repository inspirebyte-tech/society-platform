-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "tableName" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "oldData" JSONB,
    "newData" JSONB,
    "actorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "audit_logs_orgId_tableName_createdAt_idx" ON "audit_logs"("orgId", "tableName", "createdAt");

-- CreateIndex
CREATE INDEX "memberships_userId_orgId_idx" ON "memberships"("userId", "orgId");

-- CreateIndex
CREATE INDEX "property_nodes_orgId_parentId_idx" ON "property_nodes"("orgId", "parentId");

-- CreateIndex
CREATE INDEX "unit_occupancies_unitId_occupiedUntil_idx" ON "unit_occupancies"("unitId", "occupiedUntil");

-- CreateIndex
CREATE INDEX "unit_ownerships_unitId_ownedUntil_idx" ON "unit_ownerships"("unitId", "ownedUntil");

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

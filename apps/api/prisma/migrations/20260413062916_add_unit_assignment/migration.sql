-- Step 1: Update OccupancyType enum
CREATE TYPE "OccupancyType_new" AS ENUM ('OWNER_RESIDENT', 'TENANT', 'FAMILY', 'CARETAKER');
ALTER TABLE "unit_occupancies" ALTER COLUMN "occupancyType" TYPE "OccupancyType_new" USING ("occupancyType"::text::"OccupancyType_new");
ALTER TYPE "OccupancyType" RENAME TO "OccupancyType_old";
ALTER TYPE "OccupancyType_new" RENAME TO "OccupancyType";
DROP TYPE "OccupancyType_old";

-- Step 2: Update OwnershipType enum
CREATE TYPE "OwnershipType_new" AS ENUM ('PRIMARY_OWNER', 'CO_OWNER');
ALTER TABLE "unit_ownerships" ALTER COLUMN "ownershipType" TYPE "OwnershipType_new" USING ("ownershipType"::text::"OwnershipType_new");
ALTER TYPE "OwnershipType" RENAME TO "OwnershipType_old";
ALTER TYPE "OwnershipType_new" RENAME TO "OwnershipType";
DROP TYPE "OwnershipType_old";

-- Step 3: Alter unit_ownerships table
ALTER TABLE "unit_ownerships"
ADD COLUMN "isPrimary" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "orgId" TEXT NOT NULL DEFAULT '',
ALTER COLUMN "ownedFrom" SET DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "unit_ownerships" ALTER COLUMN "orgId" DROP DEFAULT;

-- Step 4: Add indexes
CREATE INDEX "unit_ownerships_orgId_unitId_idx" ON "unit_ownerships"("orgId", "unitId");
CREATE INDEX "unit_ownerships_orgId_personId_idx" ON "unit_ownerships"("orgId", "personId");
-- CreateEnum
CREATE TYPE "OrgType" AS ENUM ('APARTMENT', 'VILLA', 'MIXED', 'PLOTTED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NodeType" ADD VALUE 'PHASE';
ALTER TYPE "NodeType" ADD VALUE 'BUILDING';
ALTER TYPE "NodeType" ADD VALUE 'VILLA';
ALTER TYPE "NodeType" ADD VALUE 'PLOT';
ALTER TYPE "NodeType" ADD VALUE 'BASEMENT';

-- AlterTable
ALTER TABLE "organizations" ADD COLUMN     "type" "OrgType" NOT NULL DEFAULT 'APARTMENT';

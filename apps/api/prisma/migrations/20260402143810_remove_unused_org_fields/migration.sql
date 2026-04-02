/*
  Warnings:

  - You are about to drop the column `logoUrl` on the `organizations` table. All the data in the column will be lost.
  - You are about to drop the column `registrationNo` on the `organizations` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "organizations" DROP COLUMN "logoUrl",
DROP COLUMN "registrationNo";

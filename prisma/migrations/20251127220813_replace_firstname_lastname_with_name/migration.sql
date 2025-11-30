/*
  Warnings:

  - You are about to drop the column `firstName` on the `Participant` table. All the data in the column will be lost.
  - You are about to drop the column `lastName` on the `Participant` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[drawSessionId,name]` on the table `Group` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[drawSessionId,name]` on the table `Participant` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable: Add name column first (nullable)
ALTER TABLE "Participant" ADD COLUMN "name" TEXT;

-- Update existing rows: combine firstName and lastName
UPDATE "Participant" SET "name" = TRIM(COALESCE("firstName", '') || ' ' || COALESCE("lastName", '')) WHERE "name" IS NULL;

-- Make name NOT NULL after populating it
ALTER TABLE "Participant" ALTER COLUMN "name" SET NOT NULL;

-- Drop old columns
ALTER TABLE "Participant" DROP COLUMN "firstName";
ALTER TABLE "Participant" DROP COLUMN "lastName";

-- CreateIndex
CREATE UNIQUE INDEX "Group_drawSessionId_name_key" ON "Group"("drawSessionId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Participant_drawSessionId_name_key" ON "Participant"("drawSessionId", "name");

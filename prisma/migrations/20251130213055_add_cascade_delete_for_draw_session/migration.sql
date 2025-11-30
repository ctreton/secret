-- DropForeignKey
ALTER TABLE "Assignment" DROP CONSTRAINT "Assignment_drawSessionId_fkey";

-- DropForeignKey
ALTER TABLE "Assignment" DROP CONSTRAINT "Assignment_giverId_fkey";

-- DropForeignKey
ALTER TABLE "Assignment" DROP CONSTRAINT "Assignment_receiverId_fkey";

-- DropForeignKey
ALTER TABLE "Group" DROP CONSTRAINT "Group_drawSessionId_fkey";

-- DropForeignKey
ALTER TABLE "Participant" DROP CONSTRAINT "Participant_drawSessionId_fkey";

-- AddForeignKey
ALTER TABLE "Participant" ADD CONSTRAINT "Participant_drawSessionId_fkey" FOREIGN KEY ("drawSessionId") REFERENCES "DrawSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Group" ADD CONSTRAINT "Group_drawSessionId_fkey" FOREIGN KEY ("drawSessionId") REFERENCES "DrawSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_drawSessionId_fkey" FOREIGN KEY ("drawSessionId") REFERENCES "DrawSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_giverId_fkey" FOREIGN KEY ("giverId") REFERENCES "Participant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES "Participant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

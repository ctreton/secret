-- DropForeignKey
ALTER TABLE "ParticipantGroup" DROP CONSTRAINT "ParticipantGroup_groupId_fkey";

-- DropForeignKey
ALTER TABLE "ParticipantGroup" DROP CONSTRAINT "ParticipantGroup_participantId_fkey";

-- AddForeignKey
ALTER TABLE "ParticipantGroup" ADD CONSTRAINT "ParticipantGroup_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "Participant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParticipantGroup" ADD CONSTRAINT "ParticipantGroup_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

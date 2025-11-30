
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/getCurrentUser";
import { redirect } from "next/navigation";
import SessionDetailClient from "@/components/SessionDetailClient";

export default async function DrawSessionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) {
    redirect(`/login?callbackUrl=/draw-sessions/${id}`);
  }

  // Vérifier si l'utilisateur est propriétaire ou a un partage accepté
  const session = await prisma.drawSession.findFirst({
    where: {
      id,
      OR: [
        { ownerId: user.id },
        {
          shares: {
            some: {
              email: user.email?.toLowerCase(),
              acceptedAt: { not: null },
              acceptedById: user.id,
            },
          },
        },
      ],
    },
    include: {
      owner: {
        select: { id: true, name: true, email: true },
      },
      shares: {
        where: {
          email: user.email?.toLowerCase(),
          acceptedAt: { not: null },
          acceptedById: user.id,
        },
        include: {
          sharedBy: {
            select: { id: true, name: true, email: true },
          },
        },
        take: 1,
      },
    },
  });

  if (!session) {
    redirect("/draw-sessions");
  }

  // Déterminer si l'utilisateur est propriétaire ou partagé
  const isOwner = session.ownerId === user.id;
  const sharedBy = isOwner ? null : session.shares[0]?.sharedBy || null;

  const participants = await prisma.participant.findMany({
    where: { drawSessionId: session.id },
    include: { groups: { include: { group: true } } },
    orderBy: { name: "asc" },
  });

  const groups = await prisma.group.findMany({
    where: { drawSessionId: session.id },
    orderBy: { name: "asc" },
  });

  const assignments = await prisma.assignment.findMany({
    where: { drawSessionId: session.id },
    include: {
      giver: {
        include: {
          groups: { include: { group: true } }
        }
      },
      receiver: {
        include: {
          groups: { include: { group: true } }
        }
      },
    },
    orderBy: { giver: { name: "asc" } },
  });

  return (
    <SessionDetailClient
      session={{
        id: session.id,
        name: session.name,
        description: session.description,
        emailSubjectTemplate: session.emailSubjectTemplate,
        emailTemplate: session.emailTemplate,
      }}
      initialParticipants={participants}
      initialGroups={groups}
      initialAssignments={assignments}
      isOwner={isOwner}
      sharedBy={sharedBy ? { name: sharedBy.name, email: sharedBy.email } : null}
    />
  );
}

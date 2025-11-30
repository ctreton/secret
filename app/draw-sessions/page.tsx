
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/getCurrentUser";
import { redirect } from "next/navigation";
import DrawSessionsClient from "@/components/SessionListClient";

function formatDate(date: Date): string {
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${day}/${month}/${year} ${hours}:${minutes}`;
}

export default async function DrawSessionsPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login?callbackUrl=/draw-sessions");
  }

  // Récupérer les tirages dont l'utilisateur est propriétaire ou partagé
  const sessions = await prisma.drawSession.findMany({
    where: {
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
        take: 1,
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Récupérer les invitations en attente pour cet utilisateur
  const pendingInvitations = await prisma.drawSessionShare.findMany({
    where: {
      email: user.email?.toLowerCase(),
      acceptedAt: null,
    },
    include: {
      drawSession: {
        include: {
          owner: {
            select: { id: true, name: true, email: true },
          },
        },
      },
      sharedBy: {
        select: { id: true, name: true, email: true },
      },
    },
    orderBy: { sharedAt: "desc" },
  });

  // Formater les dates côté serveur pour éviter les erreurs d'hydratation
  const sessionsWithFormattedDates = sessions.map((s) => ({
    ...s,
    createdAt: formatDate(s.createdAt),
    isShared: s.ownerId !== user.id, // Marquer les tirages partagés
  }));

  const invitationsWithFormattedDates = pendingInvitations.map((inv) => ({
    id: inv.id,
    drawSessionId: inv.drawSessionId,
    sessionName: inv.drawSession.name,
    sessionDescription: inv.drawSession.description,
    sharedBy: inv.sharedBy,
    sharedAt: formatDate(inv.sharedAt),
  }));

  return (
    <DrawSessionsClient 
      initialSessions={sessionsWithFormattedDates}
      initialInvitations={invitationsWithFormattedDates}
    />
  );
}

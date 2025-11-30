import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/getCurrentUser";
import { redirect } from "next/navigation";
import AdminClient from "@/components/AdminClient";

export default async function AdminPage() {
  // Vérifier que l'utilisateur est connecté et admin
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login?callbackUrl=/admin");
  }

  // Vérifier si l'utilisateur est admin
  const userRecord = await prisma.user.findUnique({
    where: { id: user.id },
    select: { isAdmin: true, isSuperAdmin: true },
  });

  if (!userRecord?.isAdmin) {
    redirect("/draw-sessions");
  }

  // Récupérer tous les utilisateurs avec leurs statistiques
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: {
          draws: true,
        },
      },
    },
  });

  // Calculer les statistiques pour chaque utilisateur
  const usersWithStats = await Promise.all(
    users.map(async (u) => {
      const drawSessions = await prisma.drawSession.findMany({
        where: { ownerId: u.id },
        select: {
          id: true,
          participants: {
            select: { id: true },
          },
          assignments: {
            select: { emailSendCount: true },
          },
        },
      });

      const totalParticipants = drawSessions.reduce(
        (sum, ds) => sum + ds.participants.length,
        0
      );
      const totalEmailsSent = drawSessions.reduce(
        (sum, ds) => sum + ds.assignments.reduce((acc, a) => acc + a.emailSendCount, 0),
        0
      );

      return {
        id: u.id,
        email: u.email,
        name: u.name,
        isAdmin: u.isAdmin,
        isSuperAdmin: u.isSuperAdmin,
        blocked: u.blocked,
        createdAt: u.createdAt,
        stats: {
          drawSessions: u._count.draws,
          participants: totalParticipants,
          emailsSent: totalEmailsSent,
        },
      };
    })
  );

  const isSuperAdmin = userRecord.isSuperAdmin || false;

  return <AdminClient initialUsers={usersWithStats} isSuperAdmin={isSuperAdmin} />;
}


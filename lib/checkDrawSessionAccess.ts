import { prisma } from "./prisma";

/**
 * Vérifie si un utilisateur a accès à un tirage (propriétaire ou partagé)
 * Retourne { hasAccess: boolean, isOwner: boolean }
 */
export async function checkDrawSessionAccess(
  drawSessionId: string,
  userId: string
): Promise<{ hasAccess: boolean; isOwner: boolean }> {
  // Récupérer l'email de l'utilisateur
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true },
  });

  if (!user?.email) {
    return { hasAccess: false, isOwner: false };
  }

  const userEmail = user.email.toLowerCase();

  const session = await prisma.drawSession.findFirst({
    where: {
      id: drawSessionId,
      OR: [
        { ownerId: userId },
        {
          shares: {
            some: {
              email: userEmail,
              acceptedAt: { not: null },
              acceptedById: userId,
            },
          },
        },
      ],
    },
    select: { ownerId: true },
  });

  if (!session) {
    return { hasAccess: false, isOwner: false };
  }

  return {
    hasAccess: true,
    isOwner: session.ownerId === userId,
  };
}

/**
 * Vérifie si un utilisateur est propriétaire d'un tirage
 */
export async function checkDrawSessionOwnership(
  drawSessionId: string,
  userId: string
): Promise<boolean> {
  const session = await prisma.drawSession.findFirst({
    where: { id: drawSessionId, ownerId: userId },
    select: { id: true },
  });

  return !!session;
}


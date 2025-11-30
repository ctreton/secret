import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/getCurrentUser";

/**
 * POST: Accepte une invitation de partage
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; shareId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { id, shareId } = await params;

  // Vérifier que l'invitation existe et correspond à l'email de l'utilisateur
  const share = await prisma.drawSessionShare.findFirst({
    where: {
      id: shareId,
      drawSessionId: id,
      email: user.email?.toLowerCase(),
      acceptedAt: null, // Pas encore acceptée
    },
    include: {
      drawSession: {
        select: { id: true, name: true },
      },
    },
  });

  if (!share) {
    return NextResponse.json(
      { error: "Invitation introuvable ou déjà acceptée" },
      { status: 404 }
    );
  }

  // Accepter l'invitation
  await prisma.drawSessionShare.update({
    where: { id: shareId },
    data: {
      acceptedAt: new Date(),
      acceptedById: user.id,
    },
  });

  return NextResponse.json({ 
    success: true,
    drawSessionId: share.drawSession.id,
    sessionName: share.drawSession.name,
  });
}


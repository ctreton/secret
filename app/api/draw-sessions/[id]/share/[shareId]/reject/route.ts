import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/getCurrentUser";

/**
 * DELETE: Refuse une invitation de partage (supprime l'invitation)
 */
export async function DELETE(
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
  });

  if (!share) {
    return NextResponse.json(
      { error: "Invitation introuvable ou déjà acceptée" },
      { status: 404 }
    );
  }

  // Supprimer l'invitation (refus)
  await prisma.drawSessionShare.delete({
    where: { id: shareId },
  });

  return NextResponse.json({ success: true });
}


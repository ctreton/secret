import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/getCurrentUser";

/**
 * DELETE: Supprime un tirage
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { id } = await params;

  // Vérifier que l'utilisateur est propriétaire du tirage
  const session = await prisma.drawSession.findFirst({
    where: { id, ownerId: user.id },
  });

  if (!session) {
    return NextResponse.json({ error: "Tirage non trouvé" }, { status: 404 });
  }

  // Supprimer le tirage (les partages seront supprimés en cascade)
  await prisma.drawSession.delete({
    where: { id },
  });

  return NextResponse.json({ success: true });
}




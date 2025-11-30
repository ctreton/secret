import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/getCurrentUser";
import { checkDrawSessionAccess } from "@/lib/checkDrawSessionAccess";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string; groupId: string }> }
) {
  const { id, groupId } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { hasAccess } = await checkDrawSessionAccess(id, user.id);
  if (!hasAccess) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const session = await prisma.drawSession.findUnique({
    where: { id },
  });
  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  // Vérifier que le groupe appartient bien à cette session
  const group = await prisma.group.findFirst({
    where: {
      id: groupId,
      drawSessionId: session.id,
    },
  });

  if (!group) {
    return NextResponse.json(
      { error: "Groupe introuvable ou n'appartient pas à ce tirage" },
      { status: 404 }
    );
  }

  try {
    // Supprimer d'abord les associations participant-groupe
    await prisma.participantGroup.deleteMany({
      where: { groupId },
    });

    // Puis supprimer le groupe
    await prisma.group.delete({
      where: { id: groupId },
    });

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    if (error.code === "P2025") {
      return NextResponse.json({ error: "Groupe introuvable" }, { status: 404 });
    }
    throw error;
  }
}


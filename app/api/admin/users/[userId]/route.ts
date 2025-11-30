import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/getCurrentUser";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Vérifier si l'utilisateur est admin
  const userRecord = await prisma.user.findUnique({
    where: { id: user.id },
    select: { isAdmin: true },
  });

  if (!userRecord?.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { userId } = await params;

  // Empêcher la suppression de soi-même
  if (userId === user.id) {
    return NextResponse.json(
      { error: "Vous ne pouvez pas supprimer votre propre compte" },
      { status: 400 }
    );
  }

  // Vérifier si l'utilisateur cible est un super admin
  const targetUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { isSuperAdmin: true },
  });

  if (targetUser?.isSuperAdmin) {
    return NextResponse.json(
      { error: "Impossible de supprimer un super administrateur" },
      { status: 403 }
    );
  }

  try {
    // Supprimer l'utilisateur (cascade supprimera ses tirages, participants, etc.)
    await prisma.user.delete({
      where: { id: userId },
    });

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    if (error.code === "P2025") {
      return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
    }
    console.error("Erreur lors de la suppression:", error);
    return NextResponse.json(
      { error: error.message || "Erreur lors de la suppression" },
      { status: 500 }
    );
  }
}


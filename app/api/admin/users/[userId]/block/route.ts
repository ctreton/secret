import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/getCurrentUser";

export async function PATCH(
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
  const body = await req.json();
  const { blocked } = body as { blocked: boolean };

  // Vérifier si l'utilisateur cible est un super admin
  const targetUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { isSuperAdmin: true },
  });

  if (targetUser?.isSuperAdmin) {
    return NextResponse.json(
      { error: "Impossible de bloquer un super administrateur" },
      { status: 403 }
    );
  }

  try {
    const updated = await prisma.user.update({
      where: { id: userId },
      data: { blocked },
    });

    return NextResponse.json({ blocked: updated.blocked });
  } catch (error: any) {
    if (error.code === "P2025") {
      return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
    }
    console.error("Erreur lors du blocage/déblocage:", error);
    return NextResponse.json(
      { error: error.message || "Erreur lors de la modification" },
      { status: 500 }
    );
  }
}


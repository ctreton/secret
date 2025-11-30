import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/getCurrentUser";
import { checkDrawSessionAccess } from "@/lib/checkDrawSessionAccess";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; participantId: string }> }
) {
  const { id, participantId } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { name, email, groupIds } = body as {
    name: string;
    email: string;
    groupIds?: string[];
  };

  if (!name || !name.trim()) {
    return NextResponse.json(
      { error: "Le nom est requis" },
      { status: 400 }
    );
  }

  if (!email || !email.trim()) {
    return NextResponse.json(
      { error: "L'email est requis" },
      { status: 400 }
    );
  }

  // Valider le format de l'email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.trim())) {
    return NextResponse.json(
      { error: "Format d'email invalide" },
      { status: 400 }
    );
  }

  // Vérifier l'accès au tirage
  const { hasAccess } = await checkDrawSessionAccess(id, user.id);
  if (!hasAccess) {
    return NextResponse.json(
      { error: "Tirage introuvable ou accès refusé" },
      { status: 404 }
    );
  }

  const session = await prisma.drawSession.findUnique({
    where: { id },
  });
  if (!session) {
    return NextResponse.json(
      { error: "Tirage introuvable" },
      { status: 404 }
    );
  }

  // Vérifier que le participant appartient bien à cette session
  const participant = await prisma.participant.findFirst({
    where: {
      id: participantId,
      drawSessionId: session.id,
    },
  });

  if (!participant) {
    return NextResponse.json(
      { error: "Participant introuvable ou n'appartient pas à ce tirage" },
      { status: 404 }
    );
  }

  // Vérifier l'unicité du nom (sauf pour le participant actuel)
  const existing = await prisma.participant.findFirst({
    where: {
      drawSessionId: session.id,
      name: name.trim(),
      id: { not: participantId },
    },
  });

  if (existing) {
    return NextResponse.json(
      { error: "Un participant avec ce nom existe déjà dans cette session" },
      { status: 400 }
    );
  }

  try {
    // S'assurer que groupIds est un tableau
    const validGroupIds = Array.isArray(groupIds) ? groupIds.filter(Boolean) : [];

    // Construire l'objet de mise à jour des groupes
    const groupsUpdate: any = {
      deleteMany: {},
    };

    if (validGroupIds.length > 0) {
      groupsUpdate.create = validGroupIds.map((g: string) => ({ groupId: g }));
    }

    const updated = await prisma.participant.update({
      where: { id: participantId },
      data: {
        name: name.trim(),
        email: email.trim(),
        groups: groupsUpdate,
      },
      include: {
        groups: { include: { group: true } },
      },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "Un participant avec ce nom existe déjà dans cette session" },
        { status: 400 }
      );
    }
    if (error.code === "P2025") {
      return NextResponse.json(
        { error: "Participant introuvable" },
        { status: 404 }
      );
    }
    throw error;
  }
}


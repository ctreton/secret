import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth";

export async function PATCH(
  req: Request,
  { params }: { params: { id: string; participantId: string } }
) {
  const userId = await getCurrentUserId();
  const body = await req.json();

  const { name, email, groupIds } = body;

  if (!name || !name.trim()) {
    return NextResponse.json(
      { error: "Le nom est requis" },
      { status: 400 }
    );
  }

  // vérifie ownership du tirage
  const session = await prisma.drawSession.findUnique({
    where: { id: params.id, ownerId: userId },
  });

  if (!session) {
    return NextResponse.json(
      { error: "Tirage introuvable ou accès refusé" },
      { status: 404 }
    );
  }

  // Vérifier l'unicité du nom (sauf pour le participant actuel)
  const existing = await prisma.participant.findFirst({
    where: {
      drawSessionId: session.id,
      name: name.trim(),
      id: { not: params.participantId },
    },
  });

  if (existing) {
    return NextResponse.json(
      { error: "Un participant avec ce nom existe déjà dans cette session" },
      { status: 400 }
    );
  }

  try {
  const updated = await prisma.participant.update({
    where: { id: params.participantId },
    data: {
        name: name.trim(),
      email,
      groups: {
        deleteMany: {},
          create: groupIds?.map((g: string) => ({ groupId: g })) || [],
      },
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
    throw error;
  }
}
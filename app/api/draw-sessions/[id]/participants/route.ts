
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/getCurrentUser";
import { checkDrawSessionAccess } from "@/lib/checkDrawSessionAccess";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { name, email, groupIds } = body as {
    name: string;
    email: string;
    groupIds?: string[];
  };

  if (!name || !email) {
    return NextResponse.json(
      { error: "Nom et email requis" },
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

  // Vérifier l'unicité du nom dans cette session
  const existing = await prisma.participant.findUnique({
    where: {
      drawSessionId_name: {
        drawSessionId: session.id,
        name: name.trim(),
      },
    },
  });

  if (existing) {
    return NextResponse.json(
      { error: "Un participant avec ce nom existe déjà dans cette session" },
      { status: 400 }
    );
  }

  try {
  const participant = await prisma.participant.create({
    data: {
      drawSessionId: session.id,
        name: name.trim(),
        email: email.trim(),
    },
  });

  if (groupIds && groupIds.length > 0) {
    await prisma.participantGroup.createMany({
      data: groupIds.map((gid) => ({
        participantId: participant.id,
        groupId: gid,
      })),
    });
  }

  const withGroups = await prisma.participant.findUnique({
    where: { id: participant.id },
    include: { groups: { include: { group: true } } },
  });

  return NextResponse.json(withGroups);
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

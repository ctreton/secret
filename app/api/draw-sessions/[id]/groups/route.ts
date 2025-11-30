
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
  const { name } = body as { name: string };

  if (!name || !name.trim()) {
    return NextResponse.json(
      { error: "Le nom du groupe est requis" },
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
  const existing = await prisma.group.findUnique({
    where: {
      drawSessionId_name: {
        drawSessionId: session.id,
        name: name.trim(),
      },
    },
  });

  if (existing) {
    return NextResponse.json(
      { error: "Un groupe avec ce nom existe déjà dans cette session" },
      { status: 400 }
    );
  }

  try {
  const group = await prisma.group.create({
    data: {
      drawSessionId: session.id,
        name: name.trim(),
    },
  });

  return NextResponse.json(group);
  } catch (error: any) {
    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "Un groupe avec ce nom existe déjà dans cette session" },
        { status: 400 }
      );
    }
    throw error;
  }
}

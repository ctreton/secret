
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/getCurrentUser";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sessions = await prisma.drawSession.findMany({
    where: { ownerId: user.id },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(sessions);
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { name, description } = body;

  if (!name || !name.trim()) {
    return NextResponse.json(
      { error: "Le nom du tirage est requis" },
      { status: 400 }
    );
  }

  // Vérifier l'unicité du nom pour cet utilisateur
  const existing = await prisma.drawSession.findFirst({
    where: {
      ownerId: user.id,
      name: name.trim(),
    },
  });

  if (existing) {
    return NextResponse.json(
      { error: "Un tirage avec ce nom existe déjà" },
      { status: 400 }
    );
  }

  try {
  const session = await prisma.drawSession.create({
    data: {
      ownerId: user.id,
        name: name.trim(),
      description: description ?? null,
    },
  });

  return NextResponse.json(session);
  } catch (error: any) {
    console.error("Erreur lors de la création du tirage:", error);
    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "Un tirage avec ce nom existe déjà" },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: error.message || "Erreur lors de la création du tirage" },
      { status: 500 }
    );
  }
}

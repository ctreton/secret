import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/getCurrentUser";
import { resendForAssignment } from "@/lib/mailer";
import { checkDrawSessionAccess } from "@/lib/checkDrawSessionAccess";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Récupérer l'assignment pour vérifier l'accès au tirage
  const assignment = await prisma.assignment.findUnique({
    where: { id },
    include: {
      drawSession: {
        select: { id: true },
      },
    },
  });

  if (!assignment) {
    return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
  }

  const { hasAccess } = await checkDrawSessionAccess(assignment.drawSession.id, user.id);
  if (!hasAccess) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    await resendForAssignment(id, user.id);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Erreur lors du renvoi du mail" },
      { status: 400 }
    );
  }
}

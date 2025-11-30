import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/getCurrentUser";
import { checkDrawSessionAccess } from "@/lib/checkDrawSessionAccess";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { hasAccess } = await checkDrawSessionAccess(id, user.id);
  if (!hasAccess) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const session = await prisma.drawSession.findUnique({
    where: { id },
    select: { emailTemplate: true },
  });

  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  return NextResponse.json({ emailTemplate: session.emailTemplate });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { emailSubjectTemplate, emailTemplate, description } = body as {
      emailSubjectTemplate?: string;
      emailTemplate?: string;
      description?: string;
    };

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

    const updated = await prisma.drawSession.update({
      where: { id },
      data: {
        emailSubjectTemplate: emailSubjectTemplate !== undefined ? emailSubjectTemplate : undefined,
        emailTemplate: emailTemplate !== undefined ? emailTemplate : undefined,
        description: description !== undefined ? description : undefined,
      },
    });

    return NextResponse.json({
      emailSubjectTemplate: updated.emailSubjectTemplate,
      emailTemplate: updated.emailTemplate,
      description: updated.description,
    });
  } catch (error: any) {
    console.error("Erreur lors de la sauvegarde de la configuration:", error);
    return NextResponse.json(
      { error: error.message || "Erreur lors de la sauvegarde de la configuration" },
      { status: 500 }
    );
  }
}


import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/getCurrentUser";
import { sendShareInvitationEmail } from "@/lib/mailer";

/**
 * GET: Récupère les partages d'un tirage
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { id } = await params;

  // Vérifier que l'utilisateur est propriétaire du tirage
  const session = await prisma.drawSession.findFirst({
    where: { id, ownerId: user.id },
  });

  if (!session) {
    return NextResponse.json({ error: "Tirage non trouvé" }, { status: 404 });
  }

  // Récupérer les partages
  const shares = await prisma.drawSessionShare.findMany({
    where: { drawSessionId: id },
    include: {
      sharedBy: {
        select: { id: true, name: true, email: true },
      },
      acceptedBy: {
        select: { id: true, name: true, email: true },
      },
    },
    orderBy: { sharedAt: "desc" },
  });

  return NextResponse.json(shares);
}

/**
 * POST: Partage un tirage avec un email
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const { email } = body;

  if (!email || !email.trim()) {
    return NextResponse.json(
      { error: "L'email est requis" },
      { status: 400 }
    );
  }

  const normalizedEmail = email.trim().toLowerCase();

  // Vérifier que l'utilisateur est propriétaire du tirage
  const session = await prisma.drawSession.findFirst({
    where: { id, ownerId: user.id },
    include: { owner: true },
  });

  if (!session) {
    return NextResponse.json({ error: "Tirage non trouvé" }, { status: 404 });
  }

  // Vérifier qu'on ne partage pas avec soi-même
  if (normalizedEmail === user.email?.toLowerCase()) {
    return NextResponse.json(
      { error: "Vous ne pouvez pas partager avec vous-même" },
      { status: 400 }
    );
  }

  // Vérifier qu'il n'y a pas déjà un partage en cours ou accepté pour cet email
  const existingShare = await prisma.drawSessionShare.findFirst({
    where: {
      drawSessionId: id,
      email: normalizedEmail,
      acceptedAt: null, // Invitation en attente
    },
  });

  if (existingShare) {
    return NextResponse.json(
      { error: "Une invitation a déjà été envoyée à cet email" },
      { status: 400 }
    );
  }

  try {
    // Créer le partage (sans token)
    // Note: token et tokenExpiry sont optionnels dans le schéma mais le client Prisma local
    // peut ne pas être à jour. Le build Docker régénérera le client avec les bons types.
    const share = await prisma.drawSessionShare.create({
      data: {
        drawSessionId: id,
        email: normalizedEmail,
        sharedById: user.id,
        // token et tokenExpiry sont optionnels et omis intentionnellement
      } as any, // Type assertion temporaire jusqu'à ce que le client Prisma soit régénéré
      include: {
        sharedBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    // Envoyer l'email d'invitation (ne pas bloquer si l'envoi échoue)
    try {
      await sendShareInvitationEmail(
        share.id,
        normalizedEmail,
        session.name,
        user.name || null
      );
    } catch (error) {
      console.error("Erreur lors de l'envoi de l'email d'invitation:", error);
      // On continue même si l'email n'a pas pu être envoyé
    }

    return NextResponse.json(share);
  } catch (error: any) {
    console.error("Erreur lors du partage:", error);
    return NextResponse.json(
      { error: error.message || "Erreur lors du partage" },
      { status: 500 }
    );
  }
}

/**
 * DELETE: Supprime un partage
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const shareId = searchParams.get("shareId");

  if (!shareId) {
    return NextResponse.json(
      { error: "ID du partage requis" },
      { status: 400 }
    );
  }

  // Vérifier que l'utilisateur est propriétaire du tirage
  const session = await prisma.drawSession.findFirst({
    where: { id, ownerId: user.id },
  });

  if (!session) {
    return NextResponse.json({ error: "Tirage non trouvé" }, { status: 404 });
  }

  // Vérifier que le partage appartient à ce tirage
  const share = await prisma.drawSessionShare.findFirst({
    where: {
      id: shareId,
      drawSessionId: id,
    },
  });

  if (!share) {
    return NextResponse.json({ error: "Partage non trouvé" }, { status: 404 });
  }

  // Supprimer le partage
  await prisma.drawSessionShare.delete({
    where: { id: shareId },
  });

  return NextResponse.json({ success: true });
}




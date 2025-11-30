import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json(
        { error: "Token manquant" },
        { status: 400 }
      );
    }

    // Trouver l'utilisateur avec ce token
    const user = await prisma.user.findFirst({
      where: {
        emailVerificationToken: token,
        emailVerificationTokenExpiry: {
          gt: new Date(), // Le token n'est pas expiré
        },
      },
    });

    if (!user) {
      // Vérifier si le token existe mais est expiré
      const expiredUser = await prisma.user.findFirst({
        where: {
          emailVerificationToken: token,
        },
      });

      if (expiredUser) {
        return NextResponse.json(
          { error: "token_expired", email: expiredUser.email },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { error: "token_invalid" },
        { status: 400 }
      );
    }

    // Valider le compte
    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        emailVerificationToken: null,
        emailVerificationTokenExpiry: null,
      },
    });

    // Accepter automatiquement toutes les invitations en attente pour cet email
    await prisma.drawSessionShare.updateMany({
      where: {
        email: user.email.toLowerCase(),
        acceptedAt: null,
        tokenExpiry: { gt: new Date() },
      },
      data: {
        acceptedAt: new Date(),
        acceptedById: user.id,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erreur lors de la validation de l'email:", error);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}


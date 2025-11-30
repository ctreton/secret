import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validatePassword } from "@/lib/passwordValidation";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  try {
    const { token, password, passwordConfirm } = await req.json();

    if (!token || !password || !passwordConfirm) {
      return NextResponse.json(
        { error: "Token, mot de passe et confirmation requis" },
        { status: 400 }
      );
    }

    if (password !== passwordConfirm) {
      return NextResponse.json(
        { error: "Les mots de passe ne correspondent pas" },
        { status: 400 }
      );
    }

    // Valider le mot de passe
    const validation = validatePassword(password);
    if (!validation.valid) {
      return NextResponse.json(
        { error: "Mot de passe invalide", errors: validation.errors },
        { status: 400 }
      );
    }

    // Chercher l'utilisateur avec ce token
    const user = await prisma.user.findFirst({
      where: {
        passwordResetToken: token,
        passwordResetTokenExpiry: {
          gt: new Date(), // Token non expiré
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Token invalide ou expiré" },
        { status: 400 }
      );
    }

    // Hasher le nouveau mot de passe
    const passwordHash = await bcrypt.hash(password, 10);

    // Mettre à jour le mot de passe et invalider le token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        passwordResetToken: null,
        passwordResetTokenExpiry: null,
      },
    });

    return NextResponse.json({
      message: "Mot de passe réinitialisé avec succès",
    });
  } catch (error) {
    console.error("[reset-password] Erreur lors de la réinitialisation:", error);
    return NextResponse.json(
      { error: "Erreur lors de la réinitialisation du mot de passe" },
      { status: 500 }
    );
  }
}



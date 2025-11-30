import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendPasswordResetEmail } from "@/lib/mailer";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { error: "Email requis" },
        { status: 400 }
      );
    }

    // Normaliser l'email
    const normalizedEmail = email.toLowerCase().trim();

    // Chercher l'utilisateur
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    // Pour des raisons de sécurité, on ne révèle pas si l'email existe ou non
    if (!user) {
      return NextResponse.json({
        message: "Si cet email existe, un lien de réinitialisation a été envoyé.",
      });
    }

    // Vérifier si un token est déjà en cours
    if (user.passwordResetToken && user.passwordResetTokenExpiry) {
      const now = new Date();
      if (user.passwordResetTokenExpiry > now) {
        return NextResponse.json(
          { error: "Un lien de réinitialisation a déjà été envoyé. Veuillez vérifier votre email ou attendre qu'il expire." },
          { status: 400 }
        );
      }
    }

    // Envoyer l'email de réinitialisation
    await sendPasswordResetEmail(user.id, user.email, user.name);

    return NextResponse.json({
      message: "Si cet email existe, un lien de réinitialisation a été envoyé.",
    });
  } catch (error) {
    console.error("[reset-password] Erreur lors de la demande de réinitialisation:", error);
    return NextResponse.json(
      { error: "Erreur lors de la demande de réinitialisation" },
      { status: 500 }
    );
  }
}



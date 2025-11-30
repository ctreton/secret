import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendVerificationEmail } from "@/lib/mailer";

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json(
        { error: "Email requis" },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      // Ne pas révéler si l'email existe ou non pour des raisons de sécurité
      return NextResponse.json(
        { success: true, message: "Si cet email existe et n'est pas validé, un email de validation a été envoyé." }
      );
    }

    // Si le compte est déjà validé, ne rien faire
    if (user.emailVerified) {
      return NextResponse.json(
        { success: true, message: "Ce compte est déjà validé." }
      );
    }

    // Régénérer et envoyer l'email de validation
    try {
      await sendVerificationEmail(user.id, user.email, user.name);
      return NextResponse.json({
        success: true,
        message: "Un nouvel email de validation a été envoyé.",
      });
    } catch (error) {
      console.error("Erreur lors de l'envoi de l'email:", error);
      return NextResponse.json(
        { error: "Erreur lors de l'envoi de l'email. Veuillez réessayer plus tard." },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Erreur lors du renvoi de l'email de validation:", error);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}


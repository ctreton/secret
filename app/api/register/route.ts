import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hash } from "bcryptjs";
import { validatePassword } from "@/lib/passwordValidation";
import { sendVerificationEmail } from "@/lib/mailer";

export async function POST(req: Request) {
  try {
  const body = await req.json();
    const { email, password, firstName, lastName, name } = body;

  if (!email || !password) {
    return NextResponse.json(
      { error: "Email et mot de passe requis" },
      { status: 400 }
    );
  }

  // Validation du mot de passe
  const passwordValidation = validatePassword(password);
  if (!passwordValidation.valid) {
    return NextResponse.json(
      { error: passwordValidation.errors.join(". ") },
      { status: 400 }
    );
  }

  // Normaliser l'email
  const normalizedEmail = email.trim().toLowerCase();

  const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (existing) {
    return NextResponse.json(
      { error: "Un compte existe déjà avec cet email" },
      { status: 400 }
    );
  }

  const passwordHash = await hash(password, 10);
    
    // Combiner firstName et lastName en name, ou utiliser name directement
    const fullName = name || (firstName && lastName ? `${firstName} ${lastName}`.trim() : firstName || lastName || null);

  const user = await prisma.user.create({
    data: {
      email: normalizedEmail,
        name: fullName,
      passwordHash,
      emailVerified: false,
    },
  });

  // Envoyer l'email de validation (ne pas bloquer si l'envoi échoue)
  try {
    await sendVerificationEmail(user.id, user.email, user.name);
  } catch (error) {
    console.error("Erreur lors de l'envoi de l'email de validation:", error);
    // On continue même si l'email n'a pas pu être envoyé
  }

  return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Erreur lors de l'inscription:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur lors de la création du compte" },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hash } from "bcryptjs";
import { validatePassword } from "@/lib/passwordValidation";

export async function POST(req: Request) {
  try {
    // Vérifier qu'il n'y a pas déjà d'admin
    const adminCount = await prisma.user.count({
      where: { isAdmin: true },
    });

    if (adminCount > 0) {
      return NextResponse.json(
        { error: "Un administrateur existe déjà" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { name, email, password } = body as {
      name: string;
      email: string;
      password: string;
    };

    if (!name || !name.trim() || !email || !email.trim() || !password) {
      return NextResponse.json(
        { error: "Tous les champs sont requis" },
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

    // Normaliser l'email (trim + lowercase)
    const normalizedEmail = email.trim().toLowerCase();

    // Vérifier si l'email existe déjà
    const existing = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Un utilisateur avec cet email existe déjà" },
        { status: 400 }
      );
    }

    const passwordHash = await hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        name: name.trim(),
        passwordHash,
        isAdmin: true,
        isSuperAdmin: true, // Le premier admin est un super admin
        blocked: false,
        emailVerified: true, // Le premier admin est automatiquement validé (pas de SMTP configuré)
      },
    });

    return NextResponse.json({
      id: user.id,
      email: user.email,
      name: user.name,
    });
  } catch (error: any) {
    console.error("Erreur dans POST /api/admin/setup:", error);
    return NextResponse.json(
      { error: error.message || "Erreur serveur" },
      { status: 500 }
    );
  }
}

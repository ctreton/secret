import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { compare } from "bcryptjs";

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email et mot de passe requis" },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      return NextResponse.json(
        { error: "INVALID_CREDENTIALS" },
        { status: 401 }
      );
    }

    if (user.blocked) {
      return NextResponse.json(
        { error: "ACCOUNT_BLOCKED" },
        { status: 403 }
      );
    }

    const valid = await compare(password, user.passwordHash);
    if (!valid) {
      return NextResponse.json(
        { error: "INVALID_CREDENTIALS" },
        { status: 401 }
      );
    }

    // Si le compte n'est pas validé
    if (!user.emailVerified) {
      const tokenExpired = user.emailVerificationTokenExpiry 
        ? new Date() > user.emailVerificationTokenExpiry 
        : true;
      
      return NextResponse.json(
        { 
          error: "EMAIL_NOT_VERIFIED",
          email: user.email,
          tokenExpired,
        },
        { status: 403 }
      );
    }

    // Tout est OK
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erreur lors de la vérification:", error);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}


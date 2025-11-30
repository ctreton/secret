import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/getCurrentUser";
import { prisma } from "@/lib/prisma";
import { compare, hash } from "bcryptjs";
import { validatePassword } from "@/lib/passwordValidation";

export async function PATCH(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const body = await req.json();
    const { name, email, currentPassword, newPassword } = body;

    // Récupérer l'utilisateur actuel
    const currentUser = await prisma.user.findUnique({
      where: { id: user.id },
    });

    if (!currentUser) {
      return NextResponse.json({ error: "Utilisateur non trouvé" }, { status: 404 });
    }

    const updateData: {
      name?: string;
      email?: string;
      passwordHash?: string;
    } = {};

    // Mettre à jour le nom si fourni
    if (name !== undefined) {
      updateData.name = name.trim() || null;
    }

    // Mettre à jour l'email si fourni
    if (email !== undefined && email !== currentUser.email) {
      const normalizedEmail = email.trim().toLowerCase();

      // Vérifier si l'email est déjà utilisé par un autre utilisateur
      const existingUser = await prisma.user.findUnique({
        where: { email: normalizedEmail },
      });

      if (existingUser && existingUser.id !== user.id) {
        return NextResponse.json(
          { error: "Cet email est déjà utilisé par un autre compte" },
          { status: 400 }
        );
      }

      updateData.email = normalizedEmail;
      // Réinitialiser la vérification d'email si l'email change
      // Note: On pourrait aussi envoyer un email de vérification ici
    }

    // Mettre à jour le mot de passe si fourni
    if (newPassword) {
      if (!currentPassword) {
        return NextResponse.json(
          { error: "Le mot de passe actuel est requis pour changer le mot de passe" },
          { status: 400 }
        );
      }

      // Vérifier le mot de passe actuel
      const validPassword = await compare(currentPassword, currentUser.passwordHash);
      if (!validPassword) {
        return NextResponse.json(
          { error: "Mot de passe actuel incorrect" },
          { status: 400 }
        );
      }

      // Valider le nouveau mot de passe
      const passwordValidation = validatePassword(newPassword);
      if (!passwordValidation.valid) {
        return NextResponse.json(
          { error: passwordValidation.errors.join(". ") },
          { status: 400 }
        );
      }

      // Hasher le nouveau mot de passe
      updateData.passwordHash = await hash(newPassword, 10);
    }

    // Si aucune modification
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "Aucune modification à effectuer" }, { status: 400 });
    }

    // Mettre à jour l'utilisateur
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
      },
    });

    return NextResponse.json(updatedUser);
  } catch (error: any) {
    console.error("[profile] Erreur lors de la mise à jour:", error);
    return NextResponse.json(
      { error: error.message || "Erreur lors de la mise à jour du profil" },
      { status: 500 }
    );
  }
}


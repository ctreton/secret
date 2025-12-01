import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/getCurrentUser";

/**
 * GET: Récupère la configuration SMTP globale (du super admin)
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  // Vérifier que l'utilisateur est super admin
  const userRecord = await prisma.user.findUnique({
    where: { id: user.id },
    select: { isSuperAdmin: true },
  });

  if (!userRecord?.isSuperAdmin) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  // Récupérer la config SMTP du super admin
  const cfg = await prisma.smtpConfig.findUnique({
    where: { userId: user.id },
  });

  return NextResponse.json(cfg ?? {});
}

/**
 * POST: Sauvegarde la configuration SMTP globale (du super admin)
 */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  // Vérifier que l'utilisateur est super admin
  const userRecord = await prisma.user.findUnique({
    where: { id: user.id },
    select: { isSuperAdmin: true },
  });

  if (!userRecord?.isSuperAdmin) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { host, port, secure, userName, password, sender } = body;

    // Validation
    if (!host || !port || !sender) {
      return NextResponse.json(
        { error: "Host, port et expéditeur sont requis" },
        { status: 400 }
      );
    }

    // Récupérer la config existante pour préserver le mot de passe s'il n'est pas fourni
    const existingConfig = await prisma.smtpConfig.findUnique({
      where: { userId: user.id },
    });

    // Préparer les données de mise à jour
    const updateData: any = {
      host,
      port: Number(port),
      secure: secure ?? false,
      userName: userName || null,
      sender,
    };

    // Ne mettre à jour le mot de passe que s'il est fourni (non vide)
    if (password && password.trim() !== "") {
      updateData.password = password;
    } else if (existingConfig) {
      // Conserver le mot de passe existant si aucun nouveau n'est fourni
      updateData.password = existingConfig.password;
    } else {
      updateData.password = null;
    }

    // Sauvegarder la config SMTP du super admin
    const cfg = await prisma.smtpConfig.upsert({
      where: { userId: user.id },
      update: updateData,
      create: {
        userId: user.id,
        host,
        port: Number(port),
        secure: secure ?? false,
        userName: userName || null,
        password: password || null,
        sender,
      },
    });

    return NextResponse.json(cfg);
  } catch (error) {
    console.error("[admin/smtp] Erreur lors de la sauvegarde:", error);
    return NextResponse.json(
      { error: "Erreur lors de la sauvegarde de la configuration" },
      { status: 500 }
    );
  }
}



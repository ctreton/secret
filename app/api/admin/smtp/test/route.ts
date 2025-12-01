import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/getCurrentUser";
import nodemailer from "nodemailer";

/**
 * POST: Envoie un email de test avec la configuration SMTP actuelle
 */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  // Vérifier que l'utilisateur est super admin
  const userRecord = await prisma.user.findUnique({
    where: { id: user.id },
    select: { isSuperAdmin: true, email: true },
  });

  if (!userRecord?.isSuperAdmin) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { host, port, secure, userName, password, sender, testEmail } = body;

    // Validation
    if (!host || !port || !sender) {
      return NextResponse.json(
        { error: "Host, port et expéditeur sont requis" },
        { status: 400 }
      );
    }

    // Email de destination (celui fourni ou celui de l'utilisateur connecté)
    const toEmail = testEmail || userRecord.email;
    if (!toEmail) {
      return NextResponse.json(
        { error: "Aucune adresse email de destination disponible" },
        { status: 400 }
      );
    }

    // Configuration TLS pour Gmail et autres serveurs SMTP
    // Port 465 = SSL direct (secure: true)
    // Port 587 = STARTTLS (secure: false, requireTLS: true)
    const portNum = Number(port);
    const isPort465 = portNum === 465;
    const isPort587 = portNum === 587;
    
    // Créer le transporteur avec la config fournie
    const transporter = nodemailer.createTransport({
      host,
      port: portNum,
      secure: isPort465 ? true : (secure ?? false), // Port 465 nécessite secure: true
      auth: userName ? { user: userName, pass: password || "" } : undefined,
      tls: {
        // Pour Gmail et autres serveurs modernes
        rejectUnauthorized: false, // Accepter les certificats auto-signés si nécessaire
        minVersion: 'TLSv1.2',
      },
      // Pour le port 587 (STARTTLS), s'assurer que TLS est requis
      ...(isPort587 && !secure ? { requireTLS: true } : {}),
    });

    // Envoyer l'email de test
    await transporter.sendMail({
      from: sender,
      to: toEmail,
      subject: "Test de configuration SMTP - Secret Santa Manager",
      text: `Bonjour,

Ceci est un email de test pour vérifier votre configuration SMTP.

Si vous recevez cet email, cela signifie que votre configuration SMTP est correcte et fonctionnelle.

Configuration utilisée :
- Host: ${host}
- Port: ${port}
- Sécurisé: ${secure ? "Oui" : "Non"}
- Expéditeur: ${sender}

Cordialement,
Secret Santa Manager`,
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .success { background-color: #10b981; color: white; padding: 12px; border-radius: 6px; margin: 20px 0; }
    .config { background-color: #f3f4f6; padding: 15px; border-radius: 6px; margin: 20px 0; }
    .config-item { margin: 8px 0; }
    .label { font-weight: bold; color: #4b5563; }
  </style>
</head>
<body>
  <div class="container">
    <div class="success">
      ✅ Email de test envoyé avec succès !
    </div>
    <p>Bonjour,</p>
    <p>Ceci est un email de test pour vérifier votre configuration SMTP.</p>
    <p>Si vous recevez cet email, cela signifie que votre configuration SMTP est correcte et fonctionnelle.</p>
    <div class="config">
      <h3 style="margin-top: 0;">Configuration utilisée :</h3>
      <div class="config-item"><span class="label">Host:</span> ${host}</div>
      <div class="config-item"><span class="label">Port:</span> ${port}</div>
      <div class="config-item"><span class="label">Sécurisé:</span> ${secure ? "Oui" : "Non"}</div>
      <div class="config-item"><span class="label">Expéditeur:</span> ${sender}</div>
    </div>
    <p>Cordialement,<br>Secret Santa Manager</p>
  </div>
</body>
</html>`,
    });

    return NextResponse.json({
      success: true,
      message: `Email de test envoyé à ${toEmail}`,
    });
  } catch (error: any) {
    console.error("[admin/smtp/test] Erreur lors de l'envoi de l'email de test:", error);
    return NextResponse.json(
      {
        error: "Erreur lors de l'envoi de l'email de test",
        details: error.message || "Vérifiez votre configuration SMTP",
      },
      { status: 500 }
    );
  }
}


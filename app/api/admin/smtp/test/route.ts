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
    let { host, port, secure, userName, password, sender, testEmail } = body;

    // Si le mot de passe n'est pas fourni, récupérer la config depuis la base de données
    if (!password) {
      const savedConfig = await prisma.smtpConfig.findUnique({
        where: { userId: user.id },
      });
      if (savedConfig) {
        // Utiliser les valeurs sauvegardées si elles ne sont pas fournies
        host = host || savedConfig.host;
        port = port || savedConfig.port;
        secure = secure !== undefined ? secure : savedConfig.secure;
        userName = userName || savedConfig.userName || undefined;
        password = savedConfig.password || undefined;
        sender = sender || savedConfig.sender;
      }
    }

    // Validation
    if (!host || !port || !sender) {
      return NextResponse.json(
        { error: "Host, port et expéditeur sont requis" },
        { status: 400 }
      );
    }

    // Vérifier que le mot de passe est fourni si un nom d'utilisateur est fourni
    if (userName && !password) {
      return NextResponse.json(
        { error: "Le mot de passe est requis pour l'authentification SMTP" },
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
    // Port 465 = SSL direct (secure: true) - connexion SSL dès le début
    // Port 587 = STARTTLS (secure: false) - connexion non sécurisée puis upgrade TLS
    const portNum = Number(port);
    const isPort465 = portNum === 465;
    const isPort587 = portNum === 587;
    
    // Pour Gmail, déterminer automatiquement la configuration selon le port
    // Ignorer la valeur 'secure' de l'utilisateur si c'est un port Gmail standard
    const finalSecure = isPort465 ? true : (isPort587 ? false : (secure ?? false));
    
    console.log(`[admin/smtp/test] Configuration: host=${host}, port=${portNum}, secure=${finalSecure}, isPort465=${isPort465}, isPort587=${isPort587}`);
    
    // Configuration de base
    const transportConfig: any = {
      host,
      port: portNum,
      secure: finalSecure,
      auth: userName && password ? { user: userName, pass: password } : undefined,
    };
    
    // Configuration spécifique pour le port 587 (STARTTLS)
    if (isPort587) {
      // Port 587 : STARTTLS - connexion non sécurisée puis upgrade
      transportConfig.requireTLS = true;
      transportConfig.ignoreTLS = false;
      transportConfig.tls = {
        rejectUnauthorized: false,
      };
    } else if (isPort465) {
      // Port 465 : SSL direct - connexion SSL dès le début
      transportConfig.tls = {
        rejectUnauthorized: false,
      };
    } else {
      // Autres ports : utiliser la configuration par défaut
      transportConfig.tls = {
        rejectUnauthorized: false,
      };
    }
    
    console.log(`[admin/smtp/test] Transport config:`, JSON.stringify({ ...transportConfig, auth: transportConfig.auth ? { user: transportConfig.auth.user, pass: "***" } : undefined }, null, 2));
    
    // Créer le transporteur avec la config fournie
    const transporter = nodemailer.createTransport(transportConfig);

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
    
    // Message d'erreur plus explicite pour les erreurs d'authentification
    let errorMessage = error.message || "Vérifiez votre configuration SMTP";
    let errorDetails = errorMessage;
    
    if (error.code === 'EAUTH' || error.responseCode === 535) {
      errorMessage = "Erreur d'authentification SMTP";
      errorDetails = "Le nom d'utilisateur ou le mot de passe est incorrect. Pour Gmail, assurez-vous d'utiliser un mot de passe d'application (pas votre mot de passe Gmail).";
    }
    
    return NextResponse.json(
      {
        error: errorMessage,
        details: errorDetails,
      },
      { status: 500 }
    );
  }
}


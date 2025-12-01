
import nodemailer from "nodemailer";
import { prisma } from "./prisma";
import { randomBytes } from "crypto";

export async function getTransportForUser(userId: string) {
  // D'abord, chercher la config SMTP de l'utilisateur
  let cfg = await prisma.smtpConfig.findUnique({
    where: { userId },
  });

  // Si l'utilisateur n'a pas sa propre config, chercher celle du super admin
  if (!cfg) {
    const superAdmin = await prisma.user.findFirst({
      where: { isSuperAdmin: true },
      select: { id: true },
    });

    if (superAdmin) {
      cfg = await prisma.smtpConfig.findUnique({
        where: { userId: superAdmin.id },
      });
    }
  }

  // Fallback sur les variables d'environnement
  const host = cfg?.host ?? process.env.SMTP_HOST!;
  const port = cfg?.port ?? Number(process.env.SMTP_PORT!);
  const secure = cfg?.secure ?? process.env.SMTP_SECURE === "true";
  const user = cfg?.userName ?? process.env.SMTP_USER!;
  const pass = cfg?.password ?? process.env.SMTP_PASS!;
  const sender = cfg?.sender ?? process.env.SMTP_SENDER!;

  // Configuration TLS pour Gmail et autres serveurs SMTP
  // Port 465 = SSL direct (secure: true) - connexion SSL dès le début
  // Port 587 = STARTTLS (secure: false) - connexion non sécurisée puis upgrade TLS
  const isPort465 = port === 465;
  const isPort587 = port === 587;
  
  // Pour Gmail, déterminer automatiquement la configuration selon le port
  const finalSecure = isPort465 ? true : (isPort587 ? false : (secure ?? false));
  
  // Configuration de base
  const transportConfig: any = {
    host,
    port,
    secure: finalSecure,
    auth: user ? { user, pass } : undefined,
  };
  
  // Configuration spécifique pour le port 587 (STARTTLS)
  if (isPort587) {
    transportConfig.requireTLS = true;
    transportConfig.tls = {
      rejectUnauthorized: false,
    };
  } else if (isPort465) {
    // Port 465 : SSL direct
    transportConfig.tls = {
      rejectUnauthorized: false,
    };
  } else {
    // Autres ports : utiliser la configuration par défaut
    transportConfig.tls = {
      rejectUnauthorized: false,
    };
  }
  
  const transporter = nodemailer.createTransport(transportConfig);

  return { transporter, sender };
}

function renderTemplate(template: string, giver: { name: string; email: string }, receiver: { name: string; email: string }): string {
  return template
    .replace(/{giver\.name}/g, giver.name)
    .replace(/{giver\.email}/g, giver.email)
    .replace(/{receiver\.name}/g, receiver.name)
    .replace(/{receiver\.email}/g, receiver.email);
}

const DEFAULT_SUBJECT = "Ton Secret Santa 🎁";
const DEFAULT_TEMPLATE = `Salut {giver.name},

Ton Secret Santa est : {receiver.name}.
Email : {receiver.email}

🎄 Bon cadeau !`;

export async function sendAllForSession(sessionId: string, userId: string) {
  // Récupérer le propriétaire du tirage pour utiliser sa config SMTP
  const session = await prisma.drawSession.findUnique({
    where: { id: sessionId },
    select: { ownerId: true, emailSubjectTemplate: true, emailTemplate: true },
  });

  if (!session) {
    throw new Error("Tirage introuvable");
  }

  const { transporter, sender } = await getTransportForUser(session.ownerId);

  const subject = session?.emailSubjectTemplate || DEFAULT_SUBJECT;
  const template = session?.emailTemplate || DEFAULT_TEMPLATE;

  const assignments = await prisma.assignment.findMany({
    where: {
      drawSessionId: sessionId,
    },
    include: { giver: true, receiver: true },
  });

  for (const a of assignments) {
    const text = renderTemplate(template, a.giver, a.receiver).trim();

    const renderedSubject = renderTemplate(subject, a.giver, a.receiver);

    await transporter.sendMail({
      from: sender,
      to: a.giver.email,
      subject: renderedSubject,
      text,
    });

    await prisma.assignment.update({
      where: { id: a.id },
      data: { 
        emailSentAt: new Date(),
        emailSendCount: { increment: 1 },
      },
    });
  }
}

export async function resendForAssignment(assignmentId: string, userId: string) {
  const a = await prisma.assignment.findUnique({
    where: { id: assignmentId },
    include: { 
      giver: true, 
      receiver: true,
      drawSession: {
        select: { ownerId: true, emailSubjectTemplate: true, emailTemplate: true },
      },
    },
  });

  if (!a) {
    throw new Error("Tirage introuvable pour ce participant.");
  }

  // Utiliser la config SMTP du propriétaire du tirage
  const { transporter, sender } = await getTransportForUser(a.drawSession.ownerId);

  const subject = a.drawSession.emailSubjectTemplate || DEFAULT_SUBJECT;
  const template = a.drawSession.emailTemplate || DEFAULT_TEMPLATE;
  const renderedSubject = renderTemplate(subject, a.giver, a.receiver);
  const text = renderTemplate(template, a.giver, a.receiver).trim();

  await transporter.sendMail({
    from: sender,
    to: a.giver.email,
    subject: renderedSubject,
    text,
  });

  await prisma.assignment.update({
    where: { id: a.id },
    data: { 
      emailSentAt: new Date(),
      emailSendCount: { increment: 1 },
    },
  });
}

/**
 * Génère un token de validation d'email et l'enregistre dans la base de données
 */
export async function generateVerificationToken(userId: string): Promise<string> {
  const token = randomBytes(32).toString("hex");
  const expiry = new Date();
  expiry.setHours(expiry.getHours() + 24); // Valable 24h

  await prisma.user.update({
    where: { id: userId },
    data: {
      emailVerificationToken: token,
      emailVerificationTokenExpiry: expiry,
    },
  });

  return token;
}

/**
 * Envoie un email de validation de compte
 */
export async function sendVerificationEmail(userId: string, userEmail: string, userName: string | null) {
  try {
    // Générer le token
    const token = await generateVerificationToken(userId);

    // Obtenir le transporteur email (utilise la config SMTP de la base ou les variables d'environnement)
    const { transporter, sender } = await getTransportForUser(userId);

    // Construire l'URL de validation
    const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    const verificationUrl = `${baseUrl}/verify-email?token=${token}`;

    // Contenu de l'email
    const subject = "Validez votre compte Secret Santa Manager";
    const text = `Bonjour ${userName || "utilisateur"},

Merci de vous être inscrit sur Secret Santa Manager !

Pour activer votre compte, veuillez cliquer sur le lien suivant (valable 24 heures) :

${verificationUrl}

Si vous n'avez pas créé de compte, vous pouvez ignorer cet email.

Cordialement,
L'équipe Secret Santa Manager`;

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .button { display: inline-block; padding: 12px 24px; background-color: #ec4899; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
    .footer { margin-top: 30px; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <h2>Bonjour ${userName || "utilisateur"},</h2>
    <p>Merci de vous être inscrit sur Secret Santa Manager !</p>
    <p>Pour activer votre compte, veuillez cliquer sur le bouton ci-dessous (valable 24 heures) :</p>
    <a href="${verificationUrl}" class="button">Valider mon compte</a>
    <p>Ou copiez-collez ce lien dans votre navigateur :</p>
    <p style="word-break: break-all; color: #666;">${verificationUrl}</p>
    <p>Si vous n'avez pas créé de compte, vous pouvez ignorer cet email.</p>
    <div class="footer">
      <p>Cordialement,<br>L'équipe Secret Santa Manager</p>
    </div>
  </div>
</body>
</html>`;

    // Envoyer l'email
    await transporter.sendMail({
      from: sender,
      to: userEmail,
      subject,
      text,
      html,
    });

    console.log(`[mailer] Email de validation envoyé à ${userEmail}`);
  } catch (error) {
    console.error("[mailer] Erreur lors de l'envoi de l'email de validation:", error);
    throw error;
  }
}

/**
 * Génère un token de réinitialisation de mot de passe et l'enregistre dans la base de données
 */
export async function generatePasswordResetToken(userId: string): Promise<string> {
  const token = randomBytes(32).toString("hex");
  const expiry = new Date();
  expiry.setHours(expiry.getHours() + 1); // Valable 1h

  await prisma.user.update({
    where: { id: userId },
    data: {
      passwordResetToken: token,
      passwordResetTokenExpiry: expiry,
    },
  });

  return token;
}

/**
 * Envoie un email de réinitialisation de mot de passe
 */
export async function sendPasswordResetEmail(userId: string, userEmail: string, userName: string | null) {
  try {
    // Générer le token
    const token = await generatePasswordResetToken(userId);

    // Obtenir le transporteur email (utilise la config SMTP de la base ou les variables d'environnement)
    const { transporter, sender } = await getTransportForUser(userId);

    // Construire l'URL de réinitialisation
    const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    const resetUrl = `${baseUrl}/reset-password/${token}`;

    // Contenu de l'email
    const subject = "Réinitialisation de votre mot de passe Secret Santa Manager";
    const text = `Bonjour ${userName || "utilisateur"},

Vous avez demandé à réinitialiser votre mot de passe sur Secret Santa Manager.

Pour définir un nouveau mot de passe, veuillez cliquer sur le lien suivant (valable 1 heure) :

${resetUrl}

Si vous n'avez pas demandé cette réinitialisation, vous pouvez ignorer cet email. Votre mot de passe ne sera pas modifié.

Cordialement,
L'équipe Secret Santa Manager`;

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .button { display: inline-block; padding: 12px 24px; background-color: #ec4899; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
    .footer { margin-top: 30px; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <h2>Bonjour ${userName || "utilisateur"},</h2>
    <p>Vous avez demandé à réinitialiser votre mot de passe sur Secret Santa Manager.</p>
    <p>Pour définir un nouveau mot de passe, veuillez cliquer sur le bouton ci-dessous (valable 1 heure) :</p>
    <a href="${resetUrl}" class="button">Réinitialiser mon mot de passe</a>
    <p>Ou copiez-collez ce lien dans votre navigateur :</p>
    <p style="word-break: break-all; color: #666;">${resetUrl}</p>
    <p>Si vous n'avez pas demandé cette réinitialisation, vous pouvez ignorer cet email. Votre mot de passe ne sera pas modifié.</p>
    <div class="footer">
      <p>Cordialement,<br>L'équipe Secret Santa Manager</p>
    </div>
  </div>
</body>
</html>`;

    // Envoyer l'email
    await transporter.sendMail({
      from: sender,
      to: userEmail,
      subject,
      text,
      html,
    });

    console.log(`[mailer] Email de réinitialisation envoyé à ${userEmail}`);
  } catch (error) {
    console.error("[mailer] Erreur lors de l'envoi de l'email de réinitialisation:", error);
    throw error;
  }
}

/**
 * Envoie un email d'invitation pour partager un tirage
 */
export async function sendShareInvitationEmail(
  shareId: string,
  shareEmail: string,
  sessionName: string,
  ownerName: string | null
) {
  try {
    // Obtenir le transporteur email (utilise la config SMTP de la base ou les variables d'environnement)
    // Pour l'invitation, on utilise la config du propriétaire du tirage
    const share = await prisma.drawSessionShare.findUnique({
      where: { id: shareId },
      include: {
        drawSession: {
          include: {
            owner: true,
          },
        },
      },
    });

    if (!share) {
      throw new Error("Partage introuvable");
    }

    const { transporter, sender } = await getTransportForUser(share.drawSession.ownerId);

    // Construire l'URL vers le site (sans token)
    const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    const siteUrl = baseUrl;

    // Contenu de l'email
    const subject = `Invitation à accéder au tirage "${sessionName}"`;
    const text = `Bonjour,

${ownerName || "Un utilisateur"} vous a invité à accéder au tirage "${sessionName}" sur Secret Santa Manager.

Pour accepter cette invitation, connectez-vous ou créez un compte sur le site :

${siteUrl}

Une fois connecté avec votre email (${shareEmail}), vous verrez l'invitation dans votre liste de tirages et pourrez l'accepter ou la refuser.

Cordialement,
L'équipe Secret Santa Manager`;

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .button { display: inline-block; padding: 12px 24px; background-color: #ec4899; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
    .footer { margin-top: 30px; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <h2>Bonjour,</h2>
    <p>${ownerName || "Un utilisateur"} vous a invité à accéder au tirage <strong>"${sessionName}"</strong> sur Secret Santa Manager.</p>
    <p>Pour accepter cette invitation, connectez-vous ou créez un compte sur le site :</p>
    <a href="${siteUrl}" class="button">Accéder au site</a>
    <p>Ou copiez-collez ce lien dans votre navigateur :</p>
    <p style="word-break: break-all; color: #666;">${siteUrl}</p>
    <p>Une fois connecté avec votre email (<strong>${shareEmail}</strong>), vous verrez l'invitation dans votre liste de tirages et pourrez l'accepter ou la refuser.</p>
    <div class="footer">
      <p>Cordialement,<br>L'équipe Secret Santa Manager</p>
    </div>
  </div>
</body>
</html>`;

    // Envoyer l'email
    await transporter.sendMail({
      from: sender,
      to: shareEmail,
      subject,
      text,
      html,
    });

    console.log(`[mailer] Email d'invitation envoyé à ${shareEmail} pour le tirage ${sessionName}`);
  } catch (error) {
    console.error("[mailer] Erreur lors de l'envoi de l'email d'invitation:", error);
    throw error;
  }
}

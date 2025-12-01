// auth.ts
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import { compare } from "bcryptjs";

export const { auth, handlers, signIn, signOut } = NextAuth({
  trustHost: true, // Nécessaire pour fonctionner derrière un reverse proxy (Nginx Proxy Manager)
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email", required: true },
        password: { label: "Mot de passe", type: "password", required: true },
      },
      authorize: async (credentials) => {
        if (!credentials?.email || !credentials.password) {
          console.log("[auth] Credentials manquantes");
          return null;
        }

        const email = (credentials.email as string).trim().toLowerCase();
        const user = await prisma.user.findUnique({
          where: { email },
        });

        if (!user) {
          console.log("[auth] Utilisateur non trouvé:", email);
          return null;
        }

        if (user.blocked) {
          console.log("[auth] Utilisateur bloqué:", email);
          return null; // Empêcher la connexion si l'utilisateur est bloqué
        }

        const valid = await compare(credentials.password as string, user.passwordHash);
        if (!valid) {
          console.log("[auth] Mot de passe invalide pour:", email);
          return null;
        }

        // Vérifier si le compte est validé
        // Note: La vérification détaillée est faite dans /api/auth/check avant l'appel à signIn
        // Ici on bloque simplement la connexion si le compte n'est pas validé
        if (!user.emailVerified) {
          console.log("[auth] Compte non validé pour:", email);
          return null;
        }

        console.log("[auth] Connexion réussie pour:", email);
        return {
          id: user.id,
          email: user.email,
          name: user.name ?? "",
          isAdmin: user.isAdmin,
        };
      },
    }),
  ],

  session: {
    strategy: "jwt",
  },

  pages: {
    signIn: "/login",
  },

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.userId = user.id;
        token.isAdmin = (user as any).isAdmin || false;
      }
      return token;
    },
    async session({ session, token }) {
      if (token?.userId && session.user) {
        (session.user as any).id = token.userId as string;
        (session.user as any).isAdmin = token.isAdmin as boolean;
      }
      return session;
    },
  },
});
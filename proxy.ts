import { auth } from "@/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const isOnLoginPage = req.nextUrl.pathname.startsWith("/login");
  const isOnRegisterPage = req.nextUrl.pathname.startsWith("/register");
  const isOnAdminPage = req.nextUrl.pathname.startsWith("/admin");
  const isOnResetPasswordPage = req.nextUrl.pathname.startsWith("/reset-password");
  const isOnVerifyEmailPage = req.nextUrl.pathname.startsWith("/verify-email");
  const isApiAuthRoute = req.nextUrl.pathname.startsWith("/api/auth");

  // Laisser passer les routes API d'authentification
  if (isApiAuthRoute) {
    return NextResponse.next();
  }

  // Permettre l'accès à /admin sans authentification (la page gère la logique)
  if (isOnAdminPage) {
    return NextResponse.next();
  }

  // Si l'utilisateur est connecté et essaie d'accéder à login/register, rediriger
  if (isLoggedIn && (isOnLoginPage || isOnRegisterPage)) {
    return NextResponse.redirect(new URL("/", req.nextUrl));
  }

  // Permettre l'accès aux pages publiques sans authentification
  const isPublicPage = isOnLoginPage || isOnRegisterPage || isOnResetPasswordPage || isOnVerifyEmailPage;

  // Si l'utilisateur n'est pas connecté et n'est pas sur une page publique, rediriger vers login
  if (!isLoggedIn && !isPublicPage) {
    return NextResponse.redirect(new URL("/login", req.nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};


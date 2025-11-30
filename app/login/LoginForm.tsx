// app/login/LoginForm.tsx
"use client";

import { FormEvent, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [showResend, setShowResend] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);

  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/draw-sessions";

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setShowResend(false);
    setResendMessage(null);

    // Vérifier d'abord le statut de validation
    try {
      const checkRes = await fetch("/api/auth/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!checkRes.ok) {
        const checkData = await checkRes.json();
        
        if (checkData.error === "EMAIL_NOT_VERIFIED") {
          setError("Votre compte n'a pas encore été validé. Veuillez vérifier votre email.");
          setShowResend(true);
          return;
        } else if (checkData.error === "INVALID_CREDENTIALS") {
          setError("Email ou mot de passe invalide");
          return;
        } else if (checkData.error === "ACCOUNT_BLOCKED") {
          setError("Votre compte a été bloqué. Veuillez contacter un administrateur.");
          return;
        }
      }
    } catch (error) {
      console.error("Erreur lors de la vérification:", error);
      // Continuer avec signIn même en cas d'erreur
    }

    // Si la vérification est OK, procéder avec la connexion
    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
      callbackUrl,
    });

    if (res?.error) {
      setError("Email ou mot de passe invalide");
    } else {
      router.push(callbackUrl);
    }
  }

  async function handleResendVerification() {
    setResendLoading(true);
    setResendMessage(null);

    try {
      const res = await fetch("/api/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      if (res.ok) {
        setResendMessage(data.message || "Email de validation renvoyé avec succès !");
      } else {
        setResendMessage(data.error || "Erreur lors du renvoi de l'email");
      }
    } catch (error) {
      setResendMessage("Erreur de connexion. Veuillez réessayer.");
    } finally {
      setResendLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md rounded-xl border border-slate-800 bg-slate-900/70 p-6 shadow-xl shadow-slate-900/60">
      <h1 className="mb-4 text-xl font-semibold">Connexion</h1>

      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="space-y-1 text-sm">
          <label className="block text-slate-200">Email</label>
          <input
            className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm outline-none focus:border-pink-400"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="space-y-1 text-sm">
          <label className="block text-slate-200">Mot de passe</label>
          <input
            className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm outline-none focus:border-pink-400"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        {error && (
          <div className="space-y-2">
            <p className="text-sm text-pink-400">
              {error}
            </p>
            {showResend && (
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={handleResendVerification}
                  disabled={resendLoading}
                  className="w-full rounded-md bg-slate-700 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {resendLoading ? "Envoi en cours..." : "Renvoyer l'email de validation"}
                </button>
                {resendMessage && (
                  <p className={`text-xs ${resendMessage.includes("succès") || resendMessage.includes("envoyé") ? "text-green-400" : "text-pink-400"}`}>
                    {resendMessage}
                  </p>
                )}
              </div>
            )}
            {!showResend && error.includes("invalide") && (
              <Link
                href={`/reset-password${email ? `?email=${encodeURIComponent(email)}` : ""}`}
                className="block text-center text-xs text-pink-400 hover:text-pink-300 underline"
              >
                Réinitialiser mon mot de passe
              </Link>
            )}
          </div>
        )}

        <button
          type="submit"
          className="w-full rounded-md bg-pink-500 px-4 py-2 text-sm font-semibold text-white hover:bg-pink-400"
        >
          Se connecter
        </button>
      </form>
    </div>
  );
}
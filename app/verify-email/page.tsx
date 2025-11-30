"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";

export default function VerifyEmailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const callbackUrl = searchParams.get("callbackUrl");
  const [status, setStatus] = useState<"loading" | "success" | "error" | "expired">("loading");
  const [message, setMessage] = useState("");
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    const token = searchParams.get("token");
    let interval: NodeJS.Timeout | null = null;

    if (!token) {
      setStatus("error");
      setMessage("Token manquant dans l'URL");
      return;
    }

    // Appeler l'API de validation
    fetch(`/api/verify-email?token=${token}`)
      .then(async (res) => {
        const data = await res.json();
        if (res.ok) {
          setStatus("success");
          setMessage("Votre compte a été validé avec succès !");
          // Rediriger vers le callbackUrl ou login après 5 secondes
          interval = setInterval(() => {
            setCountdown((prev) => {
              if (prev <= 1) {
                if (interval) clearInterval(interval);
                if (callbackUrl) {
                  router.push(callbackUrl);
                } else if (session) {
                  router.push("/draw-sessions");
                } else {
                  router.push("/login");
                }
                return 0;
              }
              return prev - 1;
            });
          }, 1000);
        } else {
          if (data.error === "token_expired") {
            setStatus("expired");
            setMessage("Le lien de validation a expiré. Un nouvel email peut être envoyé.");
          } else {
            setStatus("error");
            setMessage(data.error === "token_invalid" ? "Lien de validation invalide" : data.error || "Erreur lors de la validation");
          }
        }
      })
      .catch((error) => {
        console.error("Erreur lors de la validation:", error);
        setStatus("error");
        setMessage("Une erreur s'est produite lors de la validation");
      });

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [searchParams, router]);

  return (
    <div className="mx-auto max-w-md rounded-xl border border-slate-800 bg-slate-900/70 p-6 shadow-xl shadow-slate-900/60">
      <h1 className="mb-4 text-xl font-semibold">Validation du compte</h1>

      {status === "loading" && (
        <div className="space-y-4">
          <p className="text-slate-300">Validation en cours...</p>
        </div>
      )}

      {status === "success" && (
        <div className="space-y-4">
          <div className="rounded-md bg-green-500/20 border border-green-500/50 p-4">
            <p className="text-green-400 font-semibold">✓ {message}</p>
          </div>
          <p className="text-sm text-slate-400">
            Redirection vers la page de connexion dans {countdown} seconde{countdown > 1 ? "s" : ""}...
          </p>
          <button
            onClick={() => router.push("/login")}
            className="w-full rounded-md bg-pink-500 px-4 py-2 text-sm font-semibold text-white hover:bg-pink-400"
          >
            Aller à la connexion maintenant
          </button>
        </div>
      )}

      {status === "expired" && (
        <div className="space-y-4">
          <div className="rounded-md bg-yellow-500/20 border border-yellow-500/50 p-4">
            <p className="text-yellow-400 font-semibold">⚠ {message}</p>
          </div>
          <button
            onClick={() => router.push("/login")}
            className="w-full rounded-md bg-pink-500 px-4 py-2 text-sm font-semibold text-white hover:bg-pink-400"
          >
            Aller à la connexion
          </button>
        </div>
      )}

      {status === "error" && (
        <div className="space-y-4">
          <div className="rounded-md bg-red-500/20 border border-red-500/50 p-4">
            <p className="text-red-400 font-semibold">✗ {message}</p>
          </div>
          <button
            onClick={() => router.push("/login")}
            className="w-full rounded-md bg-pink-500 px-4 py-2 text-sm font-semibold text-white hover:bg-pink-400"
          >
            Aller à la connexion
          </button>
        </div>
      )}
    </div>
  );
}


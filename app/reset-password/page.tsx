"use client";

import { FormEvent, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "@/components/Toast";

export default function ResetPasswordRequestPage() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  // Pré-remplir l'email depuis l'URL si présent
  useEffect(() => {
    const emailParam = searchParams.get("email");
    if (emailParam) {
      setEmail(decodeURIComponent(emailParam));
    }
  }, [searchParams]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setSuccess(false);

    try {
      const res = await fetch("/api/reset-password/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (res.ok) {
        setSuccess(true);
        toast.success(data.message || "Si cet email existe, un lien de réinitialisation a été envoyé.");
      } else {
        toast.error(data.error || "Erreur lors de la demande de réinitialisation");
      }
    } catch (error) {
      toast.error("Erreur de connexion. Veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md rounded-xl border border-slate-800 bg-slate-900/70 p-6 shadow-xl shadow-slate-900/60">
      <h1 className="mb-4 text-xl font-semibold">Réinitialisation du mot de passe</h1>

      {success ? (
        <div className="space-y-4">
          <p className="text-sm text-slate-200">
            Si cet email existe dans notre système, un lien de réinitialisation a été envoyé.
            Veuillez vérifier votre boîte de réception (et vos spams).
          </p>
          <button
            onClick={() => router.push("/login")}
            className="w-full rounded-md bg-pink-500 px-4 py-2 text-sm font-semibold text-white hover:bg-pink-400"
          >
            Retour à la connexion
          </button>
        </div>
      ) : (
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-1 text-sm">
            <label className="block text-slate-200">Email</label>
            <input
              className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm outline-none focus:border-pink-400"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="votre@email.com"
            />
          </div>

          <p className="text-xs text-slate-400">
            Saisissez votre adresse email et nous vous enverrons un lien pour réinitialiser votre mot de passe.
          </p>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-pink-500 px-4 py-2 text-sm font-semibold text-white hover:bg-pink-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Envoi en cours..." : "Envoyer le lien de réinitialisation"}
          </button>

          <button
            type="button"
            onClick={() => router.push("/login")}
            className="w-full rounded-md bg-slate-700 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-600"
          >
            Retour à la connexion
          </button>
        </form>
      )}
    </div>
  );
}



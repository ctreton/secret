"use client";

import { FormEvent, useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { toast } from "@/components/Toast";
import { validatePassword, getAllowedSpecialChars } from "@/lib/passwordValidation";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [tokenValid, setTokenValid] = useState<boolean | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const router = useRouter();
  const params = useParams();
  const token = params?.token as string;

  useEffect(() => {
    // Vérifier que le token est présent
    if (!token) {
      setTokenValid(false);
    }
  }, [token]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErrors([]);

    // Validation côté client
    const validation = validatePassword(password);
    if (!validation.valid) {
      setErrors(validation.errors);
      setLoading(false);
      return;
    }

    if (password !== passwordConfirm) {
      setErrors(["Les mots de passe ne correspondent pas"]);
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/reset-password/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password, passwordConfirm }),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success(data.message || "Mot de passe réinitialisé avec succès");
        // Rediriger vers la page de login après 2 secondes
        setTimeout(() => {
          router.push("/login");
        }, 2000);
      } else {
        if (data.errors) {
          setErrors(data.errors);
        } else {
          toast.error(data.error || "Erreur lors de la réinitialisation");
        }
      }
    } catch (error) {
      toast.error("Erreur de connexion. Veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  }

  if (tokenValid === false) {
    return (
      <div className="mx-auto max-w-md rounded-xl border border-slate-800 bg-slate-900/70 p-6 shadow-xl shadow-slate-900/60">
        <h1 className="mb-4 text-xl font-semibold text-pink-400">Token invalide</h1>
        <p className="mb-4 text-sm text-slate-200">
          Le lien de réinitialisation est invalide ou expiré.
        </p>
        <button
          onClick={() => router.push("/reset-password")}
          className="w-full rounded-md bg-pink-500 px-4 py-2 text-sm font-semibold text-white hover:bg-pink-400"
        >
          Demander un nouveau lien
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md rounded-xl border border-slate-800 bg-slate-900/70 p-6 shadow-xl shadow-slate-900/60">
      <h1 className="mb-4 text-xl font-semibold">Nouveau mot de passe</h1>

      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="space-y-1 text-sm">
          <label className="block text-slate-200">Nouveau mot de passe</label>
          <input
            className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm outline-none focus:border-pink-400"
            type="password"
            required
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setErrors([]);
            }}
          />
        </div>

        <div className="space-y-1 text-sm">
          <label className="block text-slate-200">Confirmer le mot de passe</label>
          <input
            className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm outline-none focus:border-pink-400"
            type="password"
            required
            value={passwordConfirm}
            onChange={(e) => {
              setPasswordConfirm(e.target.value);
              setErrors([]);
            }}
          />
        </div>

        {errors.length > 0 && (
          <div className="space-y-1 rounded-md bg-pink-900/20 border border-pink-800 p-3">
            <p className="text-xs font-semibold text-pink-400">Règles de mot de passe :</p>
            <ul className="text-xs text-pink-300 list-disc list-inside space-y-1">
              {errors.map((error, idx) => (
                <li key={idx}>{error}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="rounded-md bg-slate-800/50 p-3 text-xs text-slate-400">
          <p className="mb-2 font-semibold">Le mot de passe doit contenir :</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Au moins 8 caractères</li>
            <li>Au moins une minuscule</li>
            <li>Au moins une majuscule</li>
            <li>Au moins un chiffre</li>
            <li>Au moins un caractère spécial parmi : {getAllowedSpecialChars().split("").join(" ")}</li>
          </ul>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-pink-500 px-4 py-2 text-sm font-semibold text-white hover:bg-pink-400 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Réinitialisation en cours..." : "Réinitialiser le mot de passe"}
        </button>
      </form>
    </div>
  );
}



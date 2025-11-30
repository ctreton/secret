"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "./Toast";
import { validatePassword } from "@/lib/passwordValidation";
import AdminSmtpConfig from "./AdminSmtpConfig";

type SetupStep = "admin" | "smtp";

export default function AdminSetupClient() {
  const [step, setStep] = useState<SetupStep>("admin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  async function createAdmin() {
    if (isLoading) return;

    if (!name.trim() || !email.trim() || !password.trim()) {
      toast.error("Tous les champs sont requis");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Les mots de passe ne correspondent pas");
      return;
    }

    // Validation du mot de passe
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      passwordValidation.errors.forEach((error) => toast.error(error));
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch("/api/admin/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      if (!res.ok) {
        let errorMessage = "Erreur lors de la création de l'administrateur";
        try {
          const error = await res.json();
          errorMessage = error.error || errorMessage;
        } catch (e) {
          errorMessage = `Erreur ${res.status}: ${res.statusText}`;
        }
        toast.error(errorMessage);
        setIsLoading(false);
        return;
      }

      toast.success("Administrateur créé avec succès ! Un email de validation a été envoyé à votre adresse. Veuillez vérifier votre boîte de réception.");
      // Passer à l'étape de configuration SMTP
      setStep("smtp");
    } catch (error) {
      console.error("Erreur lors de la création de l'admin:", error);
      toast.error("Une erreur inattendue s'est produite");
      setIsLoading(false);
    }
  }

  async function handleSmtpConfigComplete() {
    // Une fois la config SMTP sauvegardée, rediriger vers le login
    toast.success("Configuration terminée ! Vous pouvez maintenant vous connecter.");
    setTimeout(() => {
      window.location.href = "/login";
    }, 1500);
  }

  if (step === "smtp") {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-6">
          <div className="mb-6 space-y-2 text-center">
            <h1 className="text-2xl font-semibold text-slate-100">
              Configuration SMTP 📧
            </h1>
            <p className="text-sm text-slate-300">
              Configurez votre serveur SMTP pour envoyer des emails.
            </p>
            <p className="text-sm text-slate-400">
              Cette configuration sera utilisée par défaut pour tous les utilisateurs.
            </p>
          </div>
          <AdminSmtpConfig onComplete={handleSmtpConfigComplete} />
          <div className="mt-6 flex justify-center">
            <button
              onClick={handleSmtpConfigComplete}
              className="rounded-md bg-slate-700 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-600"
            >
              Passer cette étape (pour plus tard)
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md space-y-6">
      <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-6">
        <div className="mb-6 space-y-2 text-center">
          <h1 className="text-2xl font-semibold text-slate-100">
            Bienvenue ! 👋
          </h1>
          <p className="text-sm text-slate-300">
            C&apos;est la première fois que vous utilisez Secret Santa Manager.
          </p>
          <p className="text-sm text-slate-400">
            Créez votre compte administrateur pour commencer. Ce compte aura tous les droits de gestion de l&apos;application.
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-300">
              Nom complet *
            </label>
            <input
              className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-pink-400"
              placeholder="Votre nom"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-300">
              Email *
            </label>
            <input
              className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-pink-400"
              type="email"
              placeholder="votre@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-300">
              Mot de passe *
            </label>
            <input
              className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-pink-400"
              type="password"
              placeholder="8+ caractères, maj, min, chiffre, spécial"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <p className="mt-1 text-xs text-slate-500">
              Caractères spéciaux autorisés : ! @ # $ % ^ & * ( ) _ + - = [ ] { } | ; : , . &lt; &gt; ?
            </p>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-300">
              Confirmer le mot de passe *
            </label>
            <input
              className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-pink-400"
              type="password"
              placeholder="Répétez le mot de passe"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  createAdmin();
                }
              }}
            />
          </div>

          <button
            onClick={createAdmin}
            disabled={isLoading}
            className="w-full rounded-md bg-pink-500 px-4 py-2 text-sm font-semibold text-white hover:bg-pink-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? "Création en cours..." : "Créer le compte administrateur"}
          </button>
        </div>
      </div>
    </div>
  );
}


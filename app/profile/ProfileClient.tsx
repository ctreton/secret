"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/components/Toast";
import { validatePassword } from "@/lib/passwordValidation";

type User = {
  id: string;
  email: string;
  name: string | null;
};

export default function ProfileClient({ initialUser }: { initialUser: User }) {
  const router = useRouter();
  const [name, setName] = useState(initialUser.name || "");
  const [email, setEmail] = useState(initialUser.email);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Préparer les données à envoyer
      const updateData: {
        name?: string;
        email?: string;
        currentPassword?: string;
        newPassword?: string;
      } = {};

      // Si le nom a changé
      if (name !== initialUser.name) {
        updateData.name = name.trim();
      }

      // Si l'email a changé
      if (email !== initialUser.email) {
        updateData.email = email.trim().toLowerCase();
      }

      // Si un nouveau mot de passe est fourni
      if (newPassword) {
        if (!currentPassword) {
          toast.error("Veuillez entrer votre mot de passe actuel pour changer le mot de passe");
          setIsLoading(false);
          return;
        }

        if (newPassword !== confirmPassword) {
          toast.error("Les nouveaux mots de passe ne correspondent pas");
          setIsLoading(false);
          return;
        }

        // Validation du nouveau mot de passe
        const passwordValidation = validatePassword(newPassword);
        if (!passwordValidation.valid) {
          passwordValidation.errors.forEach((error) => toast.error(error));
          setIsLoading(false);
          return;
        }

        updateData.currentPassword = currentPassword;
        updateData.newPassword = newPassword;
      }

      // Si rien n'a changé
      if (Object.keys(updateData).length === 0) {
        toast.error("Aucune modification à enregistrer");
        setIsLoading(false);
        return;
      }

      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      });

      if (!res.ok) {
        const error = await res.json();
        toast.error(error.error || "Erreur lors de la mise à jour");
        setIsLoading(false);
        return;
      }

      toast.success("Profil mis à jour avec succès");
      
      // Réinitialiser les champs de mot de passe
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");

      // Si l'email a changé, rediriger vers la page de login
      if (updateData.email && updateData.email !== initialUser.email) {
        toast.success("Email modifié. Veuillez vous reconnecter.");
        setTimeout(() => {
          router.push("/login");
        }, 2000);
      } else {
        // Recharger la page pour mettre à jour les données
        router.refresh();
      }
    } catch (error) {
      console.error("Erreur lors de la mise à jour du profil:", error);
      toast.error("Une erreur inattendue s'est produite");
      setIsLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Mon profil</h1>
        <p className="text-sm text-slate-400">
          Gérez vos informations personnelles et votre mot de passe
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-6">
          <h2 className="mb-4 text-sm font-semibold text-slate-200">
            Informations personnelles
          </h2>

          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-300">
                Nom complet
              </label>
              <input
                className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-pink-400"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Votre nom"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-300">
                Email *
              </label>
              <input
                className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-pink-400"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-6">
          <h2 className="mb-4 text-sm font-semibold text-slate-200">
            Changer le mot de passe
          </h2>
          <p className="mb-4 text-xs text-slate-400">
            Laissez ces champs vides si vous ne souhaitez pas changer votre mot de passe
          </p>

          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-300">
                Mot de passe actuel
              </label>
              <input
                className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-pink-400"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Entrez votre mot de passe actuel"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-300">
                Nouveau mot de passe
              </label>
              <input
                className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-pink-400"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="8+ caractères, maj, min, chiffre, spécial"
              />
              <p className="mt-1 text-xs text-slate-500">
                Caractères spéciaux autorisés : ! @ # $ % ^ & * ( ) _ + - = [ ] { } | ; : , . &lt; &gt; ?
              </p>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-300">
                Confirmer le nouveau mot de passe
              </label>
              <input
                className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-pink-400"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Répétez le nouveau mot de passe"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-md border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-700"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="rounded-md bg-pink-500 px-4 py-2 text-sm font-semibold text-white hover:bg-pink-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? "Enregistrement..." : "Enregistrer les modifications"}
          </button>
        </div>
      </form>
    </div>
  );
}


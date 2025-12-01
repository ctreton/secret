"use client";

import { useState, FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "@/components/Toast";
import { validatePassword } from "@/lib/passwordValidation";

export default function RegisterPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl");
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    // Validation du mot de passe
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      passwordValidation.errors.forEach((error) => toast.error(error));
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Les mots de passe ne correspondent pas");
      return;
    }

    // Validation de l'email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      toast.error("Format d'email invalide");
      return;
    }

    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, firstName, lastName }),
      });

      if (!res.ok) {
        const body = await res.json();
        toast.error(body.error || "Erreur lors de l'inscription");
        return;
      }

      toast.success("Inscription réussie ! Un email de validation a été envoyé à votre adresse. Veuillez vérifier votre boîte de réception.");
      // Rediriger vers login avec le callbackUrl si présent
      if (callbackUrl && callbackUrl !== "/login") {
        router.push(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);
      } else {
        router.push("/login");
      }
    } catch (error) {
      toast.error("Erreur de connexion. Veuillez réessayer.");
    }
  }

  return (
    <div className="mx-auto max-w-md rounded-xl border border-slate-800 bg-slate-900/70 p-6 shadow-xl shadow-slate-900/60">
      <h1 className="mb-4 text-xl font-semibold">Créer un compte</h1>

      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="flex gap-2">
          <input
            className="w-1/2 rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
            placeholder="Prénom"
            required
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
          />
          <input
            className="w-1/2 rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
            placeholder="Nom"
            required
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
          />
        </div>

        <input
          className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
          type="email"
          required
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
          type="password"
          required
          placeholder="Mot de passe (8+ caractères, maj, min, chiffre, spécial)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <p className="text-xs text-slate-500">
          Caractères spéciaux autorisés : ! @ # $ % ^ & * ( ) _ + - = [ ] { } | ; : , . &lt; &gt; ?
        </p>

        <input
          className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm"
          type="password"
          required
          placeholder="Confirmer le mot de passe"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />

        <button
          type="submit"
          className="w-full rounded-md bg-pink-500 px-4 py-2 text-sm font-semibold text-white hover:bg-pink-400"
        >
          S'inscrire
        </button>
      </form>
    </div>
  );
}
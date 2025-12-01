"use client";

import { useEffect, useState } from "react";
import { toast } from "./Toast";

type AdminSmtpConfigProps = {
  onComplete?: () => void;
};

type SmtpConfig = {
  host: string;
  port: number;
  secure: boolean;
  userName?: string;
  password?: string;
  sender: string;
};

export default function AdminSmtpConfig({ onComplete }: AdminSmtpConfigProps = {}) {
  const [cfg, setCfg] = useState<SmtpConfig>({
    host: "",
    port: 587,
    secure: false,
    userName: "",
    password: "",
    sender: "",
  });
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testEmail, setTestEmail] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/admin/smtp");
        if (!res.ok) {
          setLoaded(true);
          return;
        }
        const data = await res.json();
        if (data && Object.keys(data).length > 0) {
          setCfg({
            host: data.host || "",
            port: data.port || 587,
            secure: data.secure || false,
            userName: data.userName ?? "",
            password: "", // Ne pas charger le mot de passe
            sender: data.sender || "",
          });
        }
      } catch (error) {
        console.error("Erreur lors du chargement de la config SMTP:", error);
      } finally {
        setLoaded(true);
      }
    }
    load();
  }, []);

  async function save() {
    if (!cfg.host || !cfg.port || !cfg.sender) {
      toast.error("Host, port et expéditeur sont requis");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/admin/smtp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cfg),
      });

      if (!res.ok) {
        const error = await res.json();
        toast.error(error.error || "Erreur lors de l'enregistrement");
        return;
      }

      toast.success("Configuration SMTP enregistrée avec succès");
      // Appeler onComplete si fourni (pour le setup)
      if (onComplete) {
        onComplete();
      }
    } catch (error) {
      console.error("Erreur lors de la sauvegarde:", error);
      toast.error("Erreur de connexion. Veuillez réessayer.");
    } finally {
      setSaving(false);
    }
  }

  async function sendTestEmail() {
    if (!cfg.host || !cfg.port || !cfg.sender) {
      toast.error("Veuillez remplir au minimum Host, Port et Expéditeur avant d'envoyer un test");
      return;
    }

    setTesting(true);
    try {
      const res = await fetch("/api/admin/smtp/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...cfg,
          testEmail: testEmail || undefined, // Utiliser l'email de test si fourni, sinon celui de l'utilisateur
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        toast.error(error.details || error.error || "Erreur lors de l'envoi de l'email de test");
        return;
      }

      const data = await res.json();
      toast.success(data.message || "Email de test envoyé avec succès !");
    } catch (error) {
      console.error("Erreur lors de l'envoi de l'email de test:", error);
      toast.error("Erreur de connexion. Veuillez réessayer.");
    } finally {
      setTesting(false);
    }
  }

  if (!loaded) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
        <p className="text-sm text-slate-400">Chargement...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-xl border border-slate-800 bg-slate-900/70 p-4">
      <div>
        <h2 className="text-sm font-semibold text-slate-200">
          Configuration SMTP globale
        </h2>
        <p className="mt-1 text-xs text-slate-400">
          Cette configuration sera utilisée par défaut pour tous les utilisateurs qui n&apos;ont pas leur propre configuration SMTP.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-1">
          <label className="block text-xs font-medium text-slate-300">
            Host SMTP *
          </label>
          <input
            className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-pink-400"
            value={cfg.host}
            onChange={(e) => setCfg({ ...cfg, host: e.target.value })}
            placeholder="smtp.example.com"
          />
        </div>

        <div className="space-y-1">
          <label className="block text-xs font-medium text-slate-300">
            Port *
          </label>
          <input
            className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-pink-400"
            type="number"
            value={cfg.port}
            onChange={(e) => {
              const newPort = Number(e.target.value) || 587;
              // Pour Gmail : port 587 = secure false, port 465 = secure true
              const newSecure = newPort === 465 ? true : (newPort === 587 ? false : cfg.secure);
              setCfg({ ...cfg, port: newPort, secure: newSecure });
            }}
            placeholder="587"
          />
        </div>

        <div className="space-y-1">
          <label className="block text-xs font-medium text-slate-300">
            Utilisateur
          </label>
          <input
            className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-pink-400"
            value={cfg.userName}
            onChange={(e) => setCfg({ ...cfg, userName: e.target.value })}
            placeholder="user@example.com"
          />
        </div>

        <div className="space-y-1">
          <label className="block text-xs font-medium text-slate-300">
            Mot de passe
          </label>
          <input
            className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-pink-400"
            type="password"
            value={cfg.password}
            onChange={(e) => setCfg({ ...cfg, password: e.target.value })}
            placeholder="Laissez vide pour ne pas modifier"
          />
        </div>

        <div className="space-y-1 md:col-span-2">
          <label className="block text-xs font-medium text-slate-300">
            Expéditeur (email) *
          </label>
          <input
            className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-pink-400"
            type="email"
            value={cfg.sender}
            onChange={(e) => setCfg({ ...cfg, sender: e.target.value })}
            placeholder="noreply@example.com"
          />
        </div>

        <div className="space-y-1 md:col-span-2">
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="secure"
              checked={cfg.secure}
              onChange={(e) => setCfg({ ...cfg, secure: e.target.checked })}
              className="h-4 w-4 rounded border-slate-700 bg-slate-950 text-pink-500 focus:ring-pink-400"
              disabled={cfg.port === 587 || cfg.port === 465}
            />
          <label htmlFor="secure" className="text-xs text-slate-300">
            Connexion sécurisée (TLS/SSL)
            {cfg.port === 587 && (
              <span className="ml-2 text-slate-500">(désactivé pour port 587 - STARTTLS)</span>
            )}
            {cfg.port === 465 && (
              <span className="ml-2 text-slate-500">(activé pour port 465 - SSL direct)</span>
            )}
          </label>
          </div>
        </div>
      </div>

      <div className="space-y-3">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <button
          onClick={save}
          disabled={saving}
          className="flex-1 sm:flex-none rounded-md bg-pink-500 px-4 py-2 text-sm font-semibold text-white hover:bg-pink-400 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? "Enregistrement..." : "Enregistrer la configuration"}
        </button>
          <button
            onClick={sendTestEmail}
            disabled={testing || saving}
            className="flex-1 sm:flex-none rounded-md border border-slate-600 bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {testing ? "Envoi en cours..." : "Envoyer un email de test"}
          </button>
        </div>
        <div className="space-y-1">
          <label className="block text-xs font-medium text-slate-400">
            Email de test (optionnel - par défaut votre email)
          </label>
          <input
            className="w-full max-w-md rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-pink-400"
            type="email"
            value={testEmail}
            onChange={(e) => setTestEmail(e.target.value)}
            placeholder="test@example.com"
          />
        </div>
      </div>
    </div>
  );
}


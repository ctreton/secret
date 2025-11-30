
"use client";

import { useEffect, useState } from "react";

type SmtpConfig = {
  host: string;
  port: number;
  secure: boolean;
  userName?: string;
  password?: string;
  sender: string;
};

export default function SmtpConfigClient() {
  const [cfg, setCfg] = useState<SmtpConfig>({
    host: "",
    port: 587,
    secure: false,
    userName: "",
    password: "",
    sender: "",
  });
  const [loaded, setLoaded] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const res = await fetch("/api/smtp");
      if (!res.ok) {
        setLoaded(true);
        return;
      }
      const data = await res.json();
      if (data && Object.keys(data).length > 0) {
        setCfg({
          host: data.host,
          port: data.port,
          secure: data.secure,
          userName: data.userName ?? "",
          password: "",
          sender: data.sender,
        });
      }
      setLoaded(true);
    }
    load();
  }, []);

  async function save() {
    setStatus(null);
    const res = await fetch("/api/smtp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(cfg),
    });
    if (!res.ok) {
      setStatus("Erreur lors de l'enregistrement");
    } else {
      setStatus("Configuration enregistrée");
    }
  }

  if (!loaded) return null;

  return (
    <div className="space-y-3 rounded-xl border border-slate-800 bg-slate-900/70 p-4 text-sm">
      <h2 className="text-sm font-semibold text-slate-200">
        Configuration SMTP
      </h2>
      <p className="text-xs text-slate-400">
        Optionnel : surcharge le SMTP global (Mailhog en dev).
      </p>
      <div className="grid gap-2 md:grid-cols-2">
        <div className="space-y-1">
          <label className="text-xs text-slate-300">Host</label>
          <input
            className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs outline-none focus:border-pink-400"
            value={cfg.host}
            onChange={(e) => setCfg({ ...cfg, host: e.target.value })}
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-slate-300">Port</label>
          <input
            className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs outline-none focus:border-pink-400"
            type="number"
            value={cfg.port}
            onChange={(e) =>
              setCfg({ ...cfg, port: Number(e.target.value) || 0 })
            }
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-slate-300">Utilisateur</label>
          <input
            className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs outline-none focus:border-pink-400"
            value={cfg.userName}
            onChange={(e) => setCfg({ ...cfg, userName: e.target.value })}
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-slate-300">Mot de passe</label>
          <input
            className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs outline-none focus:border-pink-400"
            type="password"
            value={cfg.password}
            onChange={(e) => setCfg({ ...cfg, password: e.target.value })}
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-slate-300">Expéditeur</label>
          <input
            className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs outline-none focus:border-pink-400"
            value={cfg.sender}
            onChange={(e) => setCfg({ ...cfg, sender: e.target.value })}
          />
        </div>
        <div className="flex items-end space-x-2">
          <label className="flex items-center gap-2 text-xs text-slate-300">
            <input
              type="checkbox"
              checked={cfg.secure}
              onChange={(e) => setCfg({ ...cfg, secure: e.target.checked })}
            />
            Connexion sécurisée (TLS)
          </label>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={save}
          className="rounded-md bg-slate-800 px-4 py-1.5 text-xs font-semibold text-slate-100 hover:bg-slate-700"
        >
          Enregistrer
        </button>
        {status && (
          <span className="text-xs text-slate-400">
            {status}
          </span>
        )}
      </div>
    </div>
  );
}

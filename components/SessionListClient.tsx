
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "./Toast";

type DrawSession = {
  id: string;
  name: string;
  description?: string | null;
  createdAt: string | Date;
  isShared?: boolean; // Nouveau champ pour différencier les tirages partagés
  owner?: {
    id: string;
    name: string | null;
    email: string;
  };
  shares?: Array<{
    id: string;
    sharedBy: {
      id: string;
      name: string | null;
      email: string;
    };
  }>;
};

type PendingInvitation = {
  id: string;
  drawSessionId: string;
  sessionName: string;
  sessionDescription?: string | null;
  sharedBy: {
    id: string;
    name: string | null;
    email: string;
  };
  sharedAt: string;
};

export default function DrawSessionsClient({
  initialSessions,
  initialInvitations = [],
}: {
  initialSessions: DrawSession[];
  initialInvitations?: PendingInvitation[];
}) {
  const [sessions, setSessions] = useState(initialSessions);
  const [invitations, setInvitations] = useState(initialInvitations);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const router = useRouter();

  async function createSession() {
    if (!name.trim()) {
      toast.error("Le nom du tirage est requis");
      return;
    }
    const res = await fetch("/api/draw-sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, description: description.trim() || null }),
    });
    if (!res.ok) {
      let errorMessage = "Erreur lors de la création du tirage";
      try {
        const error = await res.json();
        errorMessage = error.error || errorMessage;
      } catch (e) {
        errorMessage = `Erreur ${res.status}: ${res.statusText}`;
      }
      toast.error(errorMessage);
      return;
    }
    const session = await res.json();
    setSessions([session, ...sessions]);
    setName("");
    setDescription("");
    setIsModalOpen(false);
    toast.success("Tirage créé avec succès");
  }

  function closeModal() {
    setIsModalOpen(false);
    setName("");
    setDescription("");
  }

  async function acceptInvitation(invitationId: string, drawSessionId: string) {
    try {
      const res = await fetch(`/api/draw-sessions/${drawSessionId}/share/${invitationId}/accept`, {
        method: "POST",
      });

      if (!res.ok) {
        const error = await res.json();
        toast.error(error.error || "Erreur lors de l'acceptation");
        return;
      }

      toast.success("Invitation acceptée !");
      // Retirer l'invitation de la liste
      setInvitations((prev) => prev.filter((inv) => inv.id !== invitationId));
      // Recharger la page pour voir le nouveau tirage
      setTimeout(() => {
        window.location.reload();
      }, 500);
    } catch (error) {
      console.error("Erreur:", error);
      toast.error("Erreur de connexion. Veuillez réessayer.");
    }
  }

  async function rejectInvitation(invitationId: string, drawSessionId: string) {
    try {
      const res = await fetch(`/api/draw-sessions/${drawSessionId}/share/${invitationId}/reject`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const error = await res.json();
        toast.error(error.error || "Erreur lors du refus");
        return;
      }

      toast.success("Invitation refusée");
      // Retirer l'invitation de la liste
      setInvitations((prev) => prev.filter((inv) => inv.id !== invitationId));
    } catch (error) {
      console.error("Erreur:", error);
      toast.error("Erreur de connexion. Veuillez réessayer.");
    }
  }

  return (
    <>
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={closeModal}
        >
        <div
          className="w-full max-w-md mx-4 rounded-xl border border-slate-800 bg-slate-900 p-4 sm:p-6 shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-200">
          Nouveau tirage
        </h2>
              <button
                onClick={closeModal}
                className="rounded-md text-slate-400 hover:text-slate-200"
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-300">
                  Nom du tirage *
                </label>
          <input
                  className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-pink-400"
            placeholder="Secret Santa famille, équipe, asso..."
            value={name}
            onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && name.trim()) {
                      createSession();
                    }
                  }}
                  autoFocus
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-300">
                  Description (optionnelle)
                </label>
                <textarea
                  className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-pink-400 resize-none"
                  placeholder="Description du tirage..."
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  onClick={createSession}
                  className="flex-1 rounded-md bg-pink-500 px-4 py-2 text-sm font-semibold text-white hover:bg-pink-400"
                >
                  Créer
                </button>
                <button
                  onClick={closeModal}
                  className="rounded-md border border-slate-700 px-4 py-2 text-sm text-slate-100 hover:border-slate-600"
                >
                  Annuler
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <h1 className="text-2xl font-semibold">Mes tirages</h1>
          <button
            onClick={() => setIsModalOpen(true)}
            className="w-full sm:w-auto rounded-md bg-pink-500 px-4 py-2 text-sm font-semibold text-white hover:bg-pink-400"
          >
            Créer un tirage
          </button>
      </div>

      {/* Invitations en attente */}
      {invitations.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-200">Invitations en attente</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {invitations.map((inv) => (
              <div
                key={inv.id}
                className="rounded-xl border border-orange-800 bg-slate-900/70 p-4 shadow"
              >
                <div className="space-y-3">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-100">
                      {inv.sessionName}
                    </h3>
                    <p className="mt-1 text-xs text-orange-400">
                      Invité par {inv.sharedBy.name || inv.sharedBy.email}
                    </p>
                    {inv.sessionDescription && (
                      <p className="mt-1 text-xs text-slate-400 line-clamp-2">
                        {inv.sessionDescription}
                      </p>
                    )}
                    <p className="mt-1 text-xs text-slate-500">
                      Invitation reçue le {inv.sharedAt}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => acceptInvitation(inv.id, inv.drawSessionId)}
                      className="flex-1 rounded-md bg-emerald-500 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-400"
                    >
                      Accepter
                    </button>
                    <button
                      onClick={() => rejectInvitation(inv.id, inv.drawSessionId)}
                      className="flex-1 rounded-md border border-red-700/50 px-3 py-2 text-xs font-semibold text-red-300 hover:border-red-500 hover:bg-red-500/10"
                    >
                      Refuser
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {sessions.map((s) => {
          const isShared = s.isShared || (s.shares && s.shares.length > 0);
          const sharedBy = isShared && s.shares ? s.shares[0].sharedBy : null;
          return (
            <button
              key={s.id}
              onClick={() => router.push(`/draw-sessions/${s.id}`)}
              className={`group rounded-xl border p-4 text-left shadow ${
                isShared
                  ? "border-orange-600/50 bg-slate-900/70 hover:border-orange-500/80 hover:shadow-orange-500/20"
                  : "border-slate-800 bg-slate-900/70 hover:border-pink-400/80 hover:shadow-pink-500/20"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-slate-100">
                      {s.name}
                    </h3>
                    {isShared && (
                      <span className="rounded-full bg-orange-500/20 px-2 py-0.5 text-[10px] font-medium text-orange-300">
                        Partagé
                      </span>
                    )}
                  </div>
                  {isShared && (
                    <div className="mt-1 space-y-0.5">
                      {sharedBy && (
                        <p className="text-xs text-orange-400">
                          Partagé par {sharedBy.name || sharedBy.email}
                        </p>
                      )}
                      {s.owner && (
                        <p className="text-xs text-slate-500">
                          Propriétaire : {s.owner.name || s.owner.email}
                        </p>
                      )}
                    </div>
                  )}
                  {s.description && (
                    <p className="mt-1 text-xs text-slate-400 line-clamp-2">
                      {s.description}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-slate-500">
                    Créé le {typeof s.createdAt === "string" ? s.createdAt : new Date(s.createdAt).toLocaleString("fr-FR")}
                  </p>
                </div>
                <span className={`rounded-full px-2 py-1 text-xs ${
                  isShared
                    ? "bg-orange-500/20 text-orange-300 group-hover:bg-orange-500/30"
                    : "bg-slate-800 text-slate-300 group-hover:bg-pink-500/20 group-hover:text-pink-200"
                }`}>
                  Ouvrir
                </span>
              </div>
            </button>
          );
        })}
        {sessions.length === 0 && (
          <p className="text-sm text-slate-400">
              Aucun tirage pour le moment. Cliquez sur &quot;+ Nouveau tirage&quot; pour commencer.
          </p>
        )}
      </div>
    </div>
    </>
  );
}

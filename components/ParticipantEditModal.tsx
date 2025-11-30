"use client";

import { useState } from "react";
import { toast } from "./Toast";

export default function ParticipantEditModal({ participant, sessionId, groups, onClose, onSave }) {
  const [name, setName] = useState(participant.name);
  const [email, setEmail] = useState(participant.email);
  const [selectedGroups, setSelectedGroups] = useState(
    participant.groups.map((g: any) => g.group.id)
  );

  function toggleGroup(groupId: string) {
    setSelectedGroups((prev) => {
      const exists = prev.includes(groupId);
      return exists
        ? prev.filter((id) => id !== groupId)
        : [...prev, groupId];
    });
  }

  async function handleSubmit() {
    if (!name || !name.trim() || !email || !email.trim()) {
      toast.error("Le nom et l'email sont requis");
      return;
    }

    // Valider le format de l'email côté client
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      toast.error("Format d'email invalide");
      return;
    }

    const res = await fetch(
      `/api/draw-sessions/${sessionId}/participants/${participant.id}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          groupIds: selectedGroups,
        }),
      }
    );

    if (res.ok) {
      const updated = await res.json();
      toast.success("Participant modifié avec succès");
      onSave(updated);
    } else {
      const error = await res.json();
      toast.error(error.error || "Erreur lors de la modification");
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-slate-800 p-6 rounded-xl w-96 max-w-[90vw]">
        <h2 className="text-lg mb-4 text-slate-100">Modifier le participant</h2>

        <div className="space-y-3">
          <input
            type="text"
            className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-pink-400 text-slate-100"
            placeholder="Nom"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            type="email"
            className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-pink-400 text-slate-100"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-300">Groupes</p>
            <div className="flex flex-wrap gap-2 text-[10px]">
            {groups.map((g: any) => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => toggleGroup(g.id)}
                  className={`rounded-full border px-2 py-0.5 transition-colors ${
                    selectedGroups.includes(g.id)
                      ? "border-pink-400 bg-pink-500/20 text-pink-200"
                      : "border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-600"
                  }`}
                >
                {g.name}
                </button>
            ))}
              {groups.length === 0 && (
                <span className="text-xs text-slate-400">
                  Aucun groupe disponible
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <button
            className="px-3 py-1.5 rounded-md bg-slate-700 text-slate-100 text-sm hover:bg-slate-600"
            onClick={onClose}
          >
            Annuler
          </button>
          <button
            className="px-3 py-1.5 rounded-md bg-pink-500 text-white text-sm font-semibold hover:bg-pink-400"
            onClick={handleSubmit}
          >
            Enregistrer
          </button>
        </div>
      </div>
    </div>
  );
}
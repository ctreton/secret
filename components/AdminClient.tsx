"use client";

import { useState } from "react";
import { toast } from "./Toast";
import AdminSmtpConfig from "./AdminSmtpConfig";

type UserWithStats = {
  id: string;
  email: string;
  name: string | null;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  blocked: boolean;
  createdAt: Date | string;
  stats: {
    drawSessions: number;
    participants: number;
    emailsSent: number;
  };
};

type Tab = "users" | "smtp";

export default function AdminClient({
  initialUsers,
  isSuperAdmin,
}: {
  initialUsers: UserWithStats[];
  isSuperAdmin: boolean;
}) {
  const [users, setUsers] = useState(initialUsers);
  const [activeTab, setActiveTab] = useState<Tab>("users");

  async function toggleBlock(userId: string, currentlyBlocked: boolean) {
    const res = await fetch(`/api/admin/users/${userId}/block`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ blocked: !currentlyBlocked }),
    });

    if (!res.ok) {
      let errorMessage = "Erreur lors de la modification";
      try {
        const error = await res.json();
        errorMessage = error.error || errorMessage;
      } catch (e) {
        errorMessage = `Erreur ${res.status}: ${res.statusText}`;
      }
      toast.error(errorMessage);
      return;
    }

    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, blocked: !currentlyBlocked } : u))
    );
    toast.success(
      currentlyBlocked ? "Utilisateur débloqué" : "Utilisateur bloqué"
    );
  }

  async function deleteUser(userId: string, email: string) {
    if (
      !confirm(
        `Êtes-vous sûr de vouloir supprimer définitivement l'utilisateur ${email} ? Cette action est irréversible.`
      )
    ) {
      return;
    }

    const res = await fetch(`/api/admin/users/${userId}`, {
      method: "DELETE",
    });

    if (!res.ok) {
      let errorMessage = "Erreur lors de la suppression";
      try {
        const error = await res.json();
        errorMessage = error.error || errorMessage;
      } catch (e) {
        errorMessage = `Erreur ${res.status}: ${res.statusText}`;
      }
      toast.error(errorMessage);
      return;
    }

    setUsers((prev) => prev.filter((u) => u.id !== userId));
    toast.success("Utilisateur supprimé");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Administration</h1>
        <p className="text-sm text-slate-400">
          Gestion des utilisateurs et configuration
        </p>
      </div>

      {/* Onglets */}
      <div className="border-b border-slate-800">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab("users")}
            className={`whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium transition-colors ${
              activeTab === "users"
                ? "border-pink-500 text-pink-400"
                : "border-transparent text-slate-400 hover:border-slate-300 hover:text-slate-300"
            }`}
          >
            Utilisateurs
          </button>
          {isSuperAdmin && (
            <button
              onClick={() => setActiveTab("smtp")}
              className={`whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium transition-colors ${
                activeTab === "smtp"
                  ? "border-pink-500 text-pink-400"
                  : "border-transparent text-slate-400 hover:border-slate-300 hover:text-slate-300"
              }`}
            >
              Configuration SMTP
            </button>
          )}
        </nav>
      </div>

      {/* Contenu des onglets */}
      {activeTab === "users" && (
        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
        <h2 className="mb-4 text-sm font-semibold text-slate-200">
          Utilisateurs ({users.length})
        </h2>
        <div className="space-y-2 overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
          <table className="w-full text-xs min-w-[600px]">
            <thead>
              <tr className="border-b border-slate-800 text-left">
                <th className="pb-2 pr-4 text-slate-300">Email</th>
                <th className="pb-2 pr-4 text-slate-300">Nom</th>
                <th className="pb-2 pr-4 text-slate-300">Statut</th>
                <th className="pb-2 pr-4 text-slate-300">Tirages</th>
                <th className="pb-2 pr-4 text-slate-300">Participants</th>
                <th className="pb-2 pr-4 text-slate-300">Mails envoyés</th>
                <th className="pb-2 pr-4 text-slate-300">Créé le</th>
                <th className="pb-2 text-right text-slate-300">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr
                  key={user.id}
                  className="border-b border-slate-800/50 last:border-0"
                >
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-100">{user.email}</span>
                      {user.isSuperAdmin && (
                        <span className="rounded-full bg-purple-500/20 px-2 py-0.5 text-[10px] text-purple-300">
                          Super Admin
                        </span>
                      )}
                      {user.isAdmin && !user.isSuperAdmin && (
                        <span className="rounded-full bg-pink-500/20 px-2 py-0.5 text-[10px] text-pink-300">
                          Admin
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 pr-4 text-slate-300">
                    {user.name || "-"}
                  </td>
                  <td className="py-3 pr-4">
                    {user.blocked ? (
                      <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-[10px] text-red-300">
                        Bloqué
                      </span>
                    ) : (
                      <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] text-emerald-300">
                        Actif
                      </span>
                    )}
                  </td>
                  <td className="py-3 pr-4 text-slate-300">
                    {user.stats.drawSessions}
                  </td>
                  <td className="py-3 pr-4 text-slate-300">
                    {user.stats.participants}
                  </td>
                  <td className="py-3 pr-4 text-slate-300">
                    {user.stats.emailsSent}
                  </td>
                  <td className="py-3 pr-4 text-slate-400">
                    {typeof user.createdAt === "string"
                      ? user.createdAt
                      : new Date(user.createdAt).toLocaleDateString("fr-FR")}
                  </td>
                  <td className="py-3 text-right">
                    <div className="flex justify-end gap-2">
                      {user.isSuperAdmin ? (
                        <span className="text-[10px] text-slate-500 italic">
                          Protégé
                        </span>
                      ) : (
                        <>
                          <button
                            onClick={() => toggleBlock(user.id, user.blocked)}
                            className={`rounded-md border px-2 py-1 text-[11px] ${
                              user.blocked
                                ? "border-emerald-700/50 text-emerald-300 hover:border-emerald-500 hover:bg-emerald-500/10"
                                : "border-orange-700/50 text-orange-300 hover:border-orange-500 hover:bg-orange-500/10"
                            }`}
                          >
                            {user.blocked ? "Débloquer" : "Bloquer"}
                          </button>
                          <button
                            onClick={() => deleteUser(user.id, user.email)}
                            className="rounded-md border border-red-700/50 px-2 py-1 text-[11px] text-red-300 hover:border-red-500 hover:bg-red-500/10"
                          >
                            Supprimer
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {users.length === 0 && (
            <p className="py-8 text-center text-sm text-slate-400">
              Aucun utilisateur
            </p>
          )}
        </div>
      </div>
      )}

      {activeTab === "smtp" && isSuperAdmin && (
        <div>
          <AdminSmtpConfig />
        </div>
      )}
    </div>
  );
}


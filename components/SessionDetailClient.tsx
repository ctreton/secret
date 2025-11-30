"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import ParticipantEditModal from "./ParticipantEditModal";
import { toast } from "./Toast";

type Participant = {
  id: string;
  name: string;
  email: string;
  groups: { group: { id: string; name: string } }[];
};

type Group = { id: string; name: string };
type Assignment = {
  id: string;
  emailSentAt: Date | string | null;
  giver: Participant;
  receiver: Participant;
};

const DEFAULT_EMAIL_SUBJECT = "Ton Secret Santa 🎁";
const DEFAULT_EMAIL_TEMPLATE = `Salut {giver.name},

Ton Secret Santa est : {receiver.name}.
Email : {receiver.email}

🎄 Bon cadeau !`;

export default function SessionDetailClient({
  session,
  initialParticipants,
  initialGroups,
  initialAssignments,
  isOwner = true,
  sharedBy = null,
}: {
  session: {
    id: string;
    name: string;
    description?: string | null;
    emailSubjectTemplate?: string | null;
    emailTemplate?: string | null;
  };
  initialParticipants: Participant[];
  initialGroups: Group[];
  initialAssignments: Assignment[];
  isOwner?: boolean;
  sharedBy?: { name: string | null; email: string } | null;
}) {
  const [participants, setParticipants] = useState(initialParticipants);
  const [groups, setGroups] = useState(initialGroups);
  const [assignments, setAssignments] = useState(initialAssignments);
  const [editingParticipant, setEditingParticipant] = useState<Participant | null>(null);
  const [revealedAssignments, setRevealedAssignments] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<"participants" | "config" | "results">("participants");
  const [isAddParticipantModalOpen, setIsAddParticipantModalOpen] = useState(false);
  const [keepModalOpen, setKeepModalOpen] = useState(true);
  const router = useRouter();
  
  // Configuration state
  const [emailSubjectTemplate, setEmailSubjectTemplate] = useState(
    session.emailSubjectTemplate || DEFAULT_EMAIL_SUBJECT
  );
  const [emailTemplate, setEmailTemplate] = useState(
    session.emailTemplate || DEFAULT_EMAIL_TEMPLATE
  );
  const [isEditingTemplates, setIsEditingTemplates] = useState(false);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [description, setDescription] = useState(session.description || "");
  const [shares, setShares] = useState<any[]>([]);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareEmail, setShareEmail] = useState("");
  const [isDeletingSession, setIsDeletingSession] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const [newP, setNewP] = useState({
    name: "",
    email: "",
    groupIds: [] as string[],
  });
  const [newGroupName, setNewGroupName] = useState("");
  const [quickNewGroupName, setQuickNewGroupName] = useState("");

  async function addParticipant() {
    if (!newP.name || !newP.email) return;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newP.email.trim())) {
      toast.error("Format d'email invalide");
      return;
    }

    const res = await fetch(`/api/draw-sessions/${session.id}/participants`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newP),
    });
    if (!res.ok) {
      let errorMessage = "Erreur lors de l'ajout du participant";
      try {
        const error = await res.json();
        errorMessage = error.error || errorMessage;
      } catch (e) {
        errorMessage = `Erreur ${res.status}: ${res.statusText}`;
      }
      toast.error(errorMessage);
      return;
    }
    const p = await res.json();
    setParticipants([...participants, p]);
    setNewP({ name: "", email: "", groupIds: [] });
    setQuickNewGroupName("");
    
    if (!keepModalOpen) {
      setIsAddParticipantModalOpen(false);
    }
    
    toast.success("Participant ajouté");
  }

  function closeAddParticipantModal() {
    setIsAddParticipantModalOpen(false);
    setNewP({ name: "", email: "", groupIds: [] });
    setQuickNewGroupName("");
    setKeepModalOpen(true); // Réinitialiser à true pour la prochaine fois
  }

  async function addGroup(groupName?: string) {
    const nameToAdd = groupName || newGroupName;
    if (!nameToAdd.trim()) return;
    const res = await fetch(`/api/draw-sessions/${session.id}/groups`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: nameToAdd.trim() }),
    });
    if (!res.ok) {
      let errorMessage = "Erreur lors de l'ajout du groupe";
      try {
        const error = await res.json();
        errorMessage = error.error || errorMessage;
      } catch (e) {
        errorMessage = `Erreur ${res.status}: ${res.statusText}`;
      }
      toast.error(errorMessage);
      return;
    }
    const g = await res.json();
    setGroups([...groups, g]);
    if (groupName) {
      // Si c'est un groupe créé rapidement, l'ajouter aux groupes du participant
      setNewP((prev) => ({
        ...prev,
        groupIds: [...prev.groupIds, g.id],
      }));
      setQuickNewGroupName("");
    } else {
    setNewGroupName("");
    }
    toast.success("Groupe ajouté");
    return g;
  }

  async function deleteGroup(groupId: string) {
    if (!confirm("Êtes-vous sûr de vouloir supprimer ce groupe ? Les participants ne seront plus associés à ce groupe.")) {
      return;
    }

    const res = await fetch(`/api/draw-sessions/${session.id}/groups/${groupId}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      let errorMessage = "Erreur lors de la suppression du groupe";
      try {
        const error = await res.json();
        errorMessage = error.error || errorMessage;
      } catch (e) {
        errorMessage = `Erreur ${res.status}: ${res.statusText}`;
      }
      toast.error(errorMessage);
      return;
    }
    setGroups(groups.filter((g) => g.id !== groupId));
    
    // Mettre à jour les participants pour retirer les groupes supprimés
    setParticipants((prev) =>
      prev.map((p) => ({
        ...p,
        groups: p.groups.filter((g) => g.group.id !== groupId),
      }))
    );
    
    toast.success("Groupe supprimé");
  }

  function toggleNewPGroup(id: string) {
    setNewP((prev) => {
      const exists = prev.groupIds.includes(id);
      return {
        ...prev,
        groupIds: exists
          ? prev.groupIds.filter((g) => g !== id)
          : [...prev.groupIds, id],
      };
    });
  }

  async function runDraw() {
    const res = await fetch(`/api/draw-sessions/${session.id}/run`, {
      method: "POST",
    });
    if (!res.ok) {
      toast.error("Erreur lors du tirage");
      return;
    }
    toast.success("Tirage effectué avec succès");
    const r = await fetch(`/api/draw-sessions/${session.id}/assignments`);
    const data = await r.json();
    setAssignments(data);
    setActiveTab("results");
  }

  async function sendAll() {
    const res = await fetch(`/api/draw-sessions/${session.id}/send-all`, {
      method: "POST",
    });
    if (!res.ok) {
      toast.error("Erreur lors de l'envoi des mails");
      return;
    }
    toast.success("Tous les mails ont été envoyés");
    const r = await fetch(`/api/draw-sessions/${session.id}/assignments`);
    const data = await r.json();
    setAssignments(data);
  }

  async function resendMail(id: string) {
    const res = await fetch(`/api/assignments/${id}/resend`, {
      method: "POST",
    });
    if (!res.ok) {
      toast.error("Erreur lors du renvoi du mail");
      return;
    }
    toast.success("Mail renvoyé");
    const r = await fetch(`/api/draw-sessions/${session.id}/assignments`);
    const data = await r.json();
    setAssignments(data);
  }

  function openEditModal(p: Participant) {
    setEditingParticipant(p);
  }

  function closeEditModal() {
    setEditingParticipant(null);
  }

  async function saveParticipant(updated: Participant) {
    setParticipants((prev) =>
      prev.map((p) => (p.id === updated.id ? updated : p))
    );
    closeEditModal();
  }

  async function saveConfiguration() {
    const res = await fetch(`/api/draw-sessions/${session.id}/email-template`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        emailSubjectTemplate,
        emailTemplate,
        description,
      }),
    });
    if (res.ok) {
      toast.success("Configuration sauvegardée");
      setIsEditingTemplates(false);
    } else {
      let errorMessage = "Erreur lors de la sauvegarde";
      try {
        const error = await res.json();
        errorMessage = error.error || errorMessage;
      } catch (e) {
        errorMessage = `Erreur ${res.status}: ${res.statusText}`;
      }
      toast.error(errorMessage);
    }
  }

  // Charger les partages
  async function loadShares() {
    if (!isOwner) return;
    try {
      const res = await fetch(`/api/draw-sessions/${session.id}/share`);
      if (res.ok) {
        const data = await res.json();
        setShares(data);
      }
    } catch (error) {
      console.error("Erreur lors du chargement des partages:", error);
    }
  }

  // Charger les partages au montage
  useEffect(() => {
    if (isOwner && activeTab === "config") {
      loadShares();
    }
  }, [isOwner, activeTab, session.id]);

  async function addShare() {
    if (!shareEmail.trim()) {
      toast.error("L'email est requis");
      return;
    }

    try {
      const res = await fetch(`/api/draw-sessions/${session.id}/share`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: shareEmail.trim() }),
      });

      if (!res.ok) {
        const error = await res.json();
        toast.error(error.error || "Erreur lors du partage");
        return;
      }

      toast.success("Invitation envoyée");
      setShareEmail("");
      setIsShareModalOpen(false);
      loadShares();
    } catch (error) {
      console.error("Erreur:", error);
      toast.error("Erreur de connexion. Veuillez réessayer.");
    }
  }

  async function deleteShare(shareId: string) {
    try {
      const res = await fetch(`/api/draw-sessions/${session.id}/share?shareId=${shareId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const error = await res.json();
        toast.error(error.error || "Erreur lors de la suppression");
        return;
      }

      toast.success("Partage supprimé");
      loadShares();
    } catch (error) {
      console.error("Erreur:", error);
      toast.error("Erreur de connexion. Veuillez réessayer.");
    }
  }

  async function deleteSession() {
    setIsDeletingSession(true);
    try {
      const res = await fetch(`/api/draw-sessions/${session.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        let errorMessage = "Erreur lors de la suppression";
        try {
          const error = await res.json();
          errorMessage = error.error || errorMessage;
        } catch (e) {
          // Si la réponse n'est pas du JSON valide, utiliser le message par défaut
          errorMessage = `Erreur ${res.status}: ${res.statusText}`;
        }
        toast.error(errorMessage);
        setIsDeletingSession(false);
        setIsDeleteModalOpen(false);
        return;
      }

      // Vérifier que la réponse est bien du JSON avant de parser
      const contentType = res.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        try {
          await res.json();
        } catch (e) {
          // Ignorer si le JSON est vide ou invalide, on continue quand même
        }
      }

      toast.success("Tirage supprimé");
      router.push("/draw-sessions");
    } catch (error) {
      console.error("Erreur:", error);
      toast.error("Erreur de connexion. Veuillez réessayer.");
      setIsDeletingSession(false);
      setIsDeleteModalOpen(false);
    }
  }

  return (
    <>
      {editingParticipant && (
        <ParticipantEditModal
          participant={editingParticipant}
          sessionId={session.id}
          groups={groups}
          onClose={closeEditModal}
          onSave={saveParticipant}
        />
      )}

      {/* Modal de partage */}
      {isShareModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setIsShareModalOpen(false)}
        >
          <div
            className="w-full max-w-md mx-4 rounded-xl border border-slate-800 bg-slate-900 p-4 sm:p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-200">
                Partager le tirage
              </h2>
              <button
                onClick={() => setIsShareModalOpen(false)}
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
                  Email *
                </label>
                <input
                  className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-pink-400"
                  type="email"
                  placeholder="email@example.com"
                  value={shareEmail}
                  onChange={(e) => setShareEmail(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && shareEmail.trim()) {
                      addShare();
                    }
                  }}
                  autoFocus
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={addShare}
                  className="flex-1 rounded-md bg-pink-500 px-4 py-2 text-sm font-semibold text-white hover:bg-pink-400"
                >
                  Envoyer l'invitation
                </button>
                <button
                  onClick={() => setIsShareModalOpen(false)}
                  className="rounded-md border border-slate-700 px-4 py-2 text-sm text-slate-100 hover:border-slate-600"
                >
                  Annuler
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de suppression */}
      {isDeleteModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setIsDeleteModalOpen(false)}
        >
          <div
            className="w-full max-w-md mx-4 rounded-xl border border-red-800 bg-slate-900 p-4 sm:p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-red-300">
                Supprimer le tirage
              </h2>
              <p className="mt-2 text-sm text-slate-300">
                Êtes-vous sûr de vouloir supprimer définitivement le tirage <strong>"{session.name}"</strong> ?
              </p>
              <p className="mt-2 text-xs text-slate-400">
                Cette action est irréversible. Tous les participants, groupes, résultats et partages seront supprimés.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={deleteSession}
                disabled={isDeletingSession}
                className="flex-1 rounded-md bg-red-500 px-4 py-2 text-sm font-semibold text-white hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isDeletingSession ? "Suppression..." : "Supprimer définitivement"}
              </button>
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                disabled={isDeletingSession}
                className="rounded-md border border-slate-700 px-4 py-2 text-sm text-slate-100 hover:border-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {isAddParticipantModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={closeAddParticipantModal}
        >
          <div
            className="w-full max-w-md mx-4 rounded-xl border border-slate-800 bg-slate-900 p-4 sm:p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-200">
                Ajouter un participant
              </h2>
              <button
                onClick={closeAddParticipantModal}
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
                  Nom *
                </label>
                <input
                  className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-pink-400"
                  placeholder="Nom du participant"
                  value={newP.name}
                  onChange={(e) => setNewP((p) => ({ ...p, name: e.target.value }))}
                  autoFocus
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-300">
                  Email *
                </label>
                <input
                  className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-pink-400"
                  placeholder="email@example.com"
                  type="email"
                  value={newP.email}
                  onChange={(e) => setNewP((p) => ({ ...p, email: e.target.value }))}
                />
              </div>
              <div>
                <label className="mb-2 block text-xs font-medium text-slate-300">
                  Groupes
                </label>
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-2">
                    {groups.map((g) => (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => toggleNewPGroup(g.id)}
                        className={`rounded-full border px-2 py-1 text-xs ${
                          newP.groupIds.includes(g.id)
                            ? "border-pink-400 bg-pink-500/20 text-pink-200"
                            : "border-slate-700 bg-slate-900 text-slate-300"
                        }`}
                      >
                        {g.name}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-1">
                    <input
                      className="flex-1 rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-xs outline-none focus:border-pink-400"
                      placeholder="Créer un nouveau groupe..."
                      value={quickNewGroupName}
                      onChange={(e) => setQuickNewGroupName(e.target.value)}
                      onKeyDown={async (e) => {
                        if (e.key === "Enter" && quickNewGroupName.trim()) {
                          e.preventDefault();
                          await addGroup(quickNewGroupName);
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={async () => {
                        if (quickNewGroupName.trim()) {
                          await addGroup(quickNewGroupName);
                        }
                      }}
                      className="rounded-md border border-pink-500/50 bg-pink-500/20 px-2 py-1 text-xs text-pink-200 hover:border-pink-400 hover:bg-pink-500/30"
                      title="Créer et ajouter ce groupe"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
              <div className="space-y-3 pt-2">
                <label className="flex items-center gap-2 text-xs text-slate-300">
                  <input
                    type="checkbox"
                    checked={keepModalOpen}
                    onChange={(e) => setKeepModalOpen(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-700 bg-slate-950 text-pink-500 focus:ring-pink-500"
                  />
                  <span>Ajouter un autre participant</span>
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={addParticipant}
                    className="flex-1 rounded-md bg-pink-500 px-4 py-2 text-sm font-semibold text-white hover:bg-pink-400"
                  >
                    Ajouter
                  </button>
                  <button
                    onClick={closeAddParticipantModal}
                    className="rounded-md border border-slate-700 px-4 py-2 text-sm text-slate-100 hover:border-slate-600"
                  >
                    Annuler
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <button
                onClick={() => router.push("/draw-sessions")}
                className="rounded-md text-slate-400 hover:text-slate-200 transition-colors"
                title="Retour à l'accueil"
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
                    d="M10 19l-7-7m0 0l7-7m-7 7h18"
                  />
                </svg>
              </button>
              <h1 className="text-xl sm:text-2xl font-semibold">{session.name}</h1>
            </div>
            {sharedBy && (
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                Partagée par <span className="text-pink-400">{sharedBy.name || sharedBy.email}</span>
              </p>
            )}
            <p className="text-xs sm:text-sm text-slate-400">
              Gère les participants, groupes, tirage et mails pour ce Secret Santa.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              onClick={runDraw}
              className="w-full sm:w-auto rounded-md bg-pink-500 px-4 py-2 text-sm font-semibold text-white hover:bg-pink-400"
            >
              Lancer / refaire le tirage
            </button>
            <button
              onClick={sendAll}
              className="w-full sm:w-auto rounded-md border border-emerald-500/70 px-4 py-2 text-sm font-semibold text-emerald-300 hover:border-emerald-400"
            >
              Envoyer tous les mails
            </button>
          </div>
        </div>

        {/* Navigation par onglets */}
        <div className="border-b border-slate-800 overflow-x-auto">
          <nav className="flex gap-2 sm:gap-4 min-w-max">
            <button
              onClick={() => setActiveTab("participants")}
              className={`whitespace-nowrap border-b-2 px-2 sm:px-3 py-2 text-xs sm:text-sm font-medium transition-colors ${
                activeTab === "participants"
                  ? "border-pink-400 text-pink-300"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              Participants
            </button>
            <button
              onClick={() => setActiveTab("config")}
              className={`whitespace-nowrap border-b-2 px-2 sm:px-3 py-2 text-xs sm:text-sm font-medium transition-colors ${
                activeTab === "config"
                  ? "border-pink-400 text-pink-300"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              Configuration
            </button>
            <button
              onClick={() => setActiveTab("results")}
              className={`whitespace-nowrap border-b-2 px-2 sm:px-3 py-2 text-xs sm:text-sm font-medium transition-colors ${
                activeTab === "results"
                  ? "border-pink-400 text-pink-300"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              Résultat du tirage
            </button>
          </nav>
        </div>

        {/* Contenu des onglets */}
        {activeTab === "participants" && (
          <div className="space-y-4 rounded-xl border border-slate-800 bg-slate-900/70 p-4">
            <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-200">
              Participants ({participants.length})
            </h2>
              <button
                onClick={() => setIsAddParticipantModalOpen(true)}
                className="rounded-md bg-pink-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-pink-400"
              >
                + Ajouter un participant
              </button>
            </div>
              <div className="space-y-2 text-xs max-h-[600px] overflow-y-auto pr-2">
              {participants.map((p) => (
                <div
                  key={p.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-slate-800 bg-slate-950/60 px-3 py-2"
                >
                  <div>
                      <div className="font-medium">{p.name}</div>
                    <div className="text-slate-400">{p.email}</div>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {p.groups.map((g) => (
                        <span
                          key={g.group.id}
                          className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] text-slate-200"
                        >
                          {g.group.name}
                        </span>
                      ))}
                      {p.groups.length === 0 && (
                          <span className="text-[10px] text-slate-500">Aucun groupe</span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => openEditModal(p)}
                    className="rounded-md border border-slate-700 px-2 py-1 text-[11px] text-slate-100 hover:border-pink-400"
                  >
                    Modifier
                  </button>
                </div>
              ))}
              {participants.length === 0 && (
                <p className="text-xs text-slate-400">
                  Aucun participant pour l&apos;instant.
                </p>
              )}
            </div>
          </div>
        )}

        {activeTab === "config" && (
          <div className="space-y-6">
            {/* Description du tirage */}
            <div className="space-y-3 rounded-xl border border-slate-800 bg-slate-900/70 p-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-200">Description</h2>
                {!isEditingDescription && (
                  <button
                    onClick={() => setIsEditingDescription(true)}
                    className="rounded-md border border-slate-700 px-2 py-1 text-xs text-slate-100 hover:border-pink-400"
                  >
                    Modifier
                  </button>
                )}
              </div>
              {isEditingDescription ? (
                <div className="space-y-2">
                  <textarea
                    className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-xs outline-none focus:border-pink-400 resize-none"
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Description optionnelle du tirage..."
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={async () => {
                        const res = await fetch(`/api/draw-sessions/${session.id}/email-template`, {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ description }),
                        });
                        if (res.ok) {
                          toast.success("Description sauvegardée");
                          setIsEditingDescription(false);
                        } else {
                          let errorMessage = "Erreur lors de la sauvegarde";
                          try {
                            const error = await res.json();
                            errorMessage = error.error || errorMessage;
                          } catch (e) {
                            errorMessage = `Erreur ${res.status}: ${res.statusText}`;
                          }
                          toast.error(errorMessage);
                        }
                      }}
                      className="rounded-md bg-pink-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-pink-400"
                    >
                      Sauvegarder
                    </button>
                    <button
                      onClick={() => {
                        setDescription(session.description || "");
                        setIsEditingDescription(false);
                      }}
                      className="rounded-md border border-slate-700 px-3 py-1.5 text-xs text-slate-100 hover:border-slate-600"
                    >
                      Annuler
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-300">
                  {description || "Aucune description"}
                </p>
              )}
          </div>

            {/* Gestion des groupes */}
            <div className="space-y-3 rounded-xl border border-slate-800 bg-slate-900/70 p-4">
              <h2 className="text-sm font-semibold text-slate-200">
                Groupes ({groups.length})
              </h2>
              <p className="text-xs text-slate-400">
                Les groupes empêchent les personnes du même groupe de se tirer entre elles.
              </p>
              <div className="space-y-2">
                {groups.map((g) => (
                  <div
                    key={g.id}
                    className="flex items-center justify-between rounded-md border border-slate-800 bg-slate-950/60 px-3 py-2"
                  >
                    <span className="text-xs text-slate-200">{g.name}</span>
                    <button
                      onClick={() => deleteGroup(g.id)}
                      className="rounded-md border border-red-700/50 px-2 py-1 text-[11px] text-red-300 hover:border-red-500 hover:bg-red-500/10"
                    >
                      Supprimer
                    </button>
                  </div>
                ))}
                {groups.length === 0 && (
                  <p className="text-xs text-slate-400">Aucun groupe.</p>
                )}
              </div>
              <div className="mt-2 flex gap-2">
                <input
                  className="flex-1 rounded-md border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs outline-none focus:border-pink-400"
                  placeholder="Nom du groupe (famille X, équipe Y...)"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      addGroup();
                    }
                  }}
                />
                <button
                  onClick={() => addGroup()}
                  className="rounded-md bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-100 hover:bg-slate-700"
                >
                  Ajouter
                </button>
              </div>
            </div>

            {/* Templates d'email */}
            <div className="space-y-3 rounded-xl border border-slate-800 bg-slate-900/70 p-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-200">
                  Templates d'email
                </h2>
                {!isEditingTemplates && (
                  <button
                    onClick={() => setIsEditingTemplates(true)}
                    className="rounded-md border border-slate-700 px-2 py-1 text-xs text-slate-100 hover:border-pink-400"
                  >
                    Modifier
                  </button>
                )}
              </div>
              {isEditingTemplates ? (
                <div className="space-y-4">
                  <div className="rounded-md border border-slate-700 bg-slate-950 p-2 text-xs">
                    <p className="mb-2 text-slate-300">Variables disponibles :</p>
                    <div className="grid grid-cols-2 gap-1 text-[10px] text-slate-400">
                      <code className="rounded bg-slate-900 px-1 py-0.5">{"{giver.name}"}</code>
                      <span>Nom du donneur</span>
                      <code className="rounded bg-slate-900 px-1 py-0.5">{"{giver.email}"}</code>
                      <span>Email du donneur</span>
                      <code className="rounded bg-slate-900 px-1 py-0.5">{"{receiver.name}"}</code>
                      <span>Nom du receveur</span>
                      <code className="rounded bg-slate-900 px-1 py-0.5">{"{receiver.email}"}</code>
                      <span>Email du receveur</span>
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-300">
                      Sujet de l'email
                    </label>
                    <input
                      className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-mono outline-none focus:border-pink-400"
                      value={emailSubjectTemplate}
                      onChange={(e) => setEmailSubjectTemplate(e.target.value)}
                      placeholder="Sujet de l'email..."
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-300">
                      Corps de l'email
                    </label>
                    <textarea
                      className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-mono outline-none focus:border-pink-400"
                      rows={10}
                      value={emailTemplate}
                      onChange={(e) => setEmailTemplate(e.target.value)}
                      placeholder="Template d'email..."
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={saveConfiguration}
                      className="flex-1 sm:flex-none rounded-md bg-pink-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-pink-400"
                    >
                      Sauvegarder
                    </button>
                    <button
                      onClick={() => {
                        setEmailSubjectTemplate(session.emailSubjectTemplate || DEFAULT_EMAIL_SUBJECT);
                        setEmailTemplate(session.emailTemplate || DEFAULT_EMAIL_TEMPLATE);
                        setDescription(session.description || "");
                        setIsEditingTemplates(false);
                      }}
                      className="flex-1 sm:flex-none rounded-md border border-slate-700 px-3 py-1.5 text-xs text-slate-100 hover:border-slate-600"
                    >
                      Annuler
                    </button>
                    <button
                      onClick={() => {
                        setEmailSubjectTemplate(DEFAULT_EMAIL_SUBJECT);
                        setEmailTemplate(DEFAULT_EMAIL_TEMPLATE);
                      }}
                      className="flex-1 sm:flex-none rounded-md border border-slate-700 px-3 py-1.5 text-xs text-slate-100 hover:border-slate-600"
                    >
                      Réinitialiser
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <p className="mb-1 text-xs font-medium text-slate-300">Sujet :</p>
                    <div className="rounded-md border border-slate-800 bg-slate-950/60 px-3 py-2 text-xs text-slate-300">
                      {emailSubjectTemplate || DEFAULT_EMAIL_SUBJECT}
                    </div>
                  </div>
                  <div>
                    <p className="mb-1 text-xs font-medium text-slate-300">Corps :</p>
                    <div className="rounded-md border border-slate-800 bg-slate-950/60 p-3">
                      <pre className="whitespace-pre-wrap text-xs text-slate-300 font-mono">
                        {emailTemplate || DEFAULT_EMAIL_TEMPLATE}
                      </pre>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Section Partage (uniquement pour le propriétaire) */}
            {isOwner && (
              <div className="space-y-3 rounded-xl border border-slate-800 bg-slate-900/70 p-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-slate-200">
                    Partage ({shares.length})
                  </h2>
                  <button
                    onClick={() => setIsShareModalOpen(true)}
                    className="rounded-md bg-pink-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-pink-400"
                  >
                    + Ajouter un partage
                  </button>
                </div>
                <p className="text-xs text-slate-400">
                  Partagez ce tirage avec d'autres personnes en leur envoyant une invitation par email.
                </p>
                <div className="space-y-2">
                  {shares.map((share) => (
                    <div
                      key={share.id}
                      className="flex items-center justify-between rounded-md border border-slate-800 bg-slate-950/60 px-3 py-2"
                    >
                      <div className="flex-1">
                        <div className="text-xs text-slate-200">{share.email}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          {share.acceptedAt
                            ? `Accepté le ${new Date(share.acceptedAt).toLocaleDateString("fr-FR")}`
                            : "Invitation envoyée"}
                        </div>
                      </div>
                      <button
                        onClick={() => deleteShare(share.id)}
                        className="rounded-md border border-red-700/50 px-2 py-1 text-[11px] text-red-300 hover:border-red-500 hover:bg-red-500/10"
                      >
                        Supprimer
                      </button>
                    </div>
                  ))}
                  {shares.length === 0 && (
                    <p className="text-xs text-slate-400">Aucun partage pour l'instant.</p>
                  )}
                </div>
              </div>
            )}

            {/* Suppression du tirage (uniquement pour le propriétaire) */}
            {isOwner && (
              <div className="space-y-3 rounded-xl border border-red-800/50 bg-red-950/20 p-4">
                <h2 className="text-sm font-semibold text-red-300">Zone de danger</h2>
                <p className="text-xs text-slate-400">
                  La suppression du tirage est définitive et irréversible. Tous les participants, groupes et résultats seront supprimés.
                </p>
                <button
                  onClick={() => setIsDeleteModalOpen(true)}
                  className="rounded-md border border-red-700/50 px-3 py-1.5 text-xs font-semibold text-red-300 hover:border-red-500 hover:bg-red-500/10"
                >
                  Supprimer le tirage
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === "results" && (
            <div className="space-y-3 rounded-xl border border-slate-800 bg-slate-900/70 p-4">
              <h2 className="text-sm font-semibold text-slate-200">
                Résultat du tirage
              </h2>
              <div className="space-y-2 text-xs">
              {assignments.map((a) => {
                const isRevealed = revealedAssignments.has(a.id);
                return (
                  <div
                    key={a.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-slate-800 bg-slate-950/60 px-3 py-2"
                  >
                    <div className="flex-1">
                      <div className="font-medium">
                        {a.giver.name}
                        <span className="mx-1 text-slate-500">→</span>
                        <span className={isRevealed ? "" : "blur-sm select-none"}>
                          {a.receiver.name}
                        </span>
                      </div>
                      <div className="text-slate-400">{a.giver.email}</div>
                      <div className="mt-1 text-[10px] text-slate-500">
                        {a.emailSentAt
                          ? `Mail envoyé le ${new Date(a.emailSentAt).toLocaleString()}`
                          : "Mail pas encore envoyé"}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setRevealedAssignments((prev) => {
                            const next = new Set(prev);
                            if (isRevealed) {
                              next.delete(a.id);
                            } else {
                              next.add(a.id);
                            }
                            return next;
                          });
                        }}
                        className="rounded-md border border-slate-700 px-2 py-1 text-[11px] text-slate-100 hover:border-pink-400"
                      >
                        {isRevealed ? "Masquer" : "Révéler"}
                      </button>
                    <button
                      onClick={() => resendMail(a.id)}
                      className="rounded-md border border-slate-700 px-2 py-1 text-[11px] text-slate-100 hover:border-pink-400"
                    >
                      Renvoyer le mail
                    </button>
                  </div>
                  </div>
                );
              })}
                {assignments.length === 0 && (
                  <p className="text-xs text-slate-400">
                    Aucun tirage pour l&apos;instant. Lance le tirage pour générer les paires.
                  </p>
                )}
              </div>
            </div>
        )}
      </div>
    </>
  );
}


import { prisma } from "./prisma";
import { checkDrawSessionAccess } from "./checkDrawSessionAccess";

export async function runDraw(drawSessionId: string, userId: string) {
  // Vérifier que l'utilisateur a accès au tirage (propriétaire ou partagé)
  const { hasAccess } = await checkDrawSessionAccess(drawSessionId, userId);

  if (!hasAccess) {
    throw new Error("Tirage introuvable ou accès refusé.");
  }

  const participants = await prisma.participant.findMany({
    where: { drawSessionId },
    include: { groups: { include: { group: true } } },
  });

  if (participants.length < 2) {
    throw new Error("Au moins 2 participants sont requis pour le tirage.");
  }

  const pairs = generateAssignments(participants);

  await prisma.assignment.deleteMany({ where: { drawSessionId } });

  await prisma.assignment.createMany({
    data: pairs.map((p) => ({
      drawSessionId,
      giverId: p.giverId,
      receiverId: p.receiverId,
    })),
  });
}

type PWithGroups = {
  id: string;
  groups: { group: { id: string; name: string } }[];
};

function generateAssignments(participants: PWithGroups[]) {
  const givers = [...participants];
  const receivers = [...participants];

  shuffle(receivers);
  let attempts = 0;

  while (!isValid(givers, receivers)) {
    shuffle(receivers);
    attempts++;
    if (attempts > 5000) {
      throw new Error("Impossible de générer un tirage sans collisions de groupes.");
    }
  }

  return givers.map((g, i) => ({
    giverId: g.id,
    receiverId: receivers[i].id,
  }));
}

function isValid(givers: PWithGroups[], receivers: PWithGroups[]) {
  return givers.every((g, i) => {
    const r = receivers[i];
    if (g.id === r.id) return false;
    const gGroups = g.groups.map((gg) => gg.group.id);
    const rGroups = r.groups.map((rg) => rg.group.id);
    const overlap = gGroups.some((id) => rGroups.includes(id));
    return !overlap;
  });
}

function shuffle<T>(arr: T[]) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

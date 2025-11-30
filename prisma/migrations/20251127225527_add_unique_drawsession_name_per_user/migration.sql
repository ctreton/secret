-- Renommer les doublons au lieu de les supprimer pour préserver les données
-- Pour chaque combinaison ownerId/name, garder le plus récent tel quel
-- et renommer les autres en ajoutant un suffixe numérique

WITH ranked_sessions AS (
  SELECT 
    id,
    "ownerId",
    name,
    "createdAt",
    ROW_NUMBER() OVER (PARTITION BY "ownerId", name ORDER BY "createdAt" DESC) as rn
  FROM "DrawSession"
),
duplicates AS (
  SELECT id, name, rn
  FROM ranked_sessions
  WHERE rn > 1
  ORDER BY "ownerId", name, "createdAt"
)
UPDATE "DrawSession" ds
SET name = ds.name || ' (' || (d.rn - 1)::text || ')'
FROM duplicates d
WHERE ds.id = d.id;

-- Créer l'index unique après renommage
CREATE UNIQUE INDEX "DrawSession_ownerId_name_key" ON "DrawSession"("ownerId", "name");

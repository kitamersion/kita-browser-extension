import { SyncRow } from "@/types/integrations/sync";

// Merge two arrays via last-write-wins (LWW) by id.
// Invariant: the `local` array must not contain duplicate ids (or if it does, they must already be
// deduplicated by updated_at). This is because the first loop unconditionally sets entries by id
// from the local array before applying LWW comparisons with remote. If `local` contains duplicate
// ids, whichever appears last in the array will win by position, not timestamp.
export const mergeById = (local: SyncRow[], remote: SyncRow[]): SyncRow[] => {
  const byId = new Map<string, SyncRow>();
  for (const row of local) byId.set(row.id, row);
  for (const row of remote) {
    const existing = byId.get(row.id);
    if (!existing || row.updated_at >= existing.updated_at) byId.set(row.id, row);
  }
  return Array.from(byId.values());
};

export const reconcileByNaturalKey = (
  local: SyncRow[],
  remote: SyncRow[],
  naturalKeyField: string
): { rows: SyncRow[]; idRemap: Map<string, string> } => {
  const idRemap = new Map<string, string>();
  const remoteByNaturalKey = new Map<string, SyncRow>();
  for (const row of remote) {
    // Tombstoned remote rows are never canonical for a natural key. Natural-key matching exists to
    // unify a row's *first* contact between two devices; a deleted row has a stable shared id
    // already and propagates its deletion by id (it still flows through mergeById below). Letting it
    // claim the key would bind a freshly re-created local row to a remote tombstone, whose
    // deleted_at then wins on the next pull and silently removes the row the user just created.
    if (row.deleted_at) continue;
    const key = row[naturalKeyField];
    if (typeof key === "string" && key.length > 0) remoteByNaturalKey.set(key, row);
  }

  const remappedLocal = local.map((row) => {
    const key = row[naturalKeyField];
    if (typeof key !== "string" || key.length === 0) return row;

    const canonical = remoteByNaturalKey.get(key);
    if (!canonical || canonical.id === row.id) return row;

    idRemap.set(row.id, canonical.id);
    return { ...row, id: canonical.id };
  });

  // Deduplicate remappedLocal by id in case multiple local rows remapped to the same canonical id.
  // This ensures the mergeById invariant: no duplicate ids within the local array.
  // When duplicates exist, keep the one with the newest updated_at.
  const deduplicatedLocal = dedupeByCompositeKey(remappedLocal, (row) => row.id);

  return { rows: mergeById(deduplicatedLocal, remote), idRemap };
};

export const remapForeignKey = <T extends Record<string, unknown>>(rows: T[], field: string, idRemap: Map<string, string>): T[] =>
  rows.map((row) => {
    const current = row[field];
    if (typeof current !== "string" || !idRemap.has(current)) return row;
    return { ...row, [field]: idRemap.get(current) };
  });

export const dedupeByCompositeKey = <T extends SyncRow>(rows: T[], keyFn: (row: T) => string): T[] => {
  const byKey = new Map<string, T>();
  for (const row of rows) {
    const key = keyFn(row);
    const existing = byKey.get(key);
    if (!existing || row.updated_at >= existing.updated_at) byKey.set(key, row);
  }
  return Array.from(byKey.values());
};

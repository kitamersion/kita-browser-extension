import { SyncRow } from "@/types/integrations/sync";

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

  return { rows: mergeById(remappedLocal, remote), idRemap };
};

export const remapForeignKey = <T extends Record<string, unknown>>(
  rows: T[],
  field: string,
  idRemap: Map<string, string>
): T[] =>
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

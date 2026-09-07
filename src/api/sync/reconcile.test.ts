import { mergeById, reconcileByNaturalKey, remapForeignKey, dedupeByCompositeKey } from "./reconcile";
import { SyncRow } from "@/types/integrations/sync";

describe("mergeById", () => {
  test("keeps the row with the newer updated_at when both sides have the same id", () => {
    const local: SyncRow[] = [{ id: "1", updated_at: 100, name: "old" }];
    const remote: SyncRow[] = [{ id: "1", updated_at: 200, name: "new" }];
    expect(mergeById(local, remote)).toEqual([{ id: "1", updated_at: 200, name: "new" }]);
  });

  test("keeps local when it is newer than remote", () => {
    const local: SyncRow[] = [{ id: "1", updated_at: 200, name: "new" }];
    const remote: SyncRow[] = [{ id: "1", updated_at: 100, name: "old" }];
    expect(mergeById(local, remote)).toEqual([{ id: "1", updated_at: 200, name: "new" }]);
  });

  test("includes rows that only exist on one side", () => {
    const local: SyncRow[] = [{ id: "1", updated_at: 100 }];
    const remote: SyncRow[] = [{ id: "2", updated_at: 100 }];
    const result = mergeById(local, remote);
    expect(result.map((r) => r.id).sort()).toEqual(["1", "2"]);
  });
});

describe("reconcileByNaturalKey", () => {
  test("remaps a local id to the remote canonical id when the natural key already exists remotely", () => {
    const local: SyncRow[] = [{ id: "local-uuid", updated_at: 100, code: "ANIME" }];
    const remote: SyncRow[] = [{ id: "remote-uuid", updated_at: 50, code: "ANIME" }];

    const { rows, idRemap } = reconcileByNaturalKey(local, remote, "code");

    expect(idRemap.get("local-uuid")).toBe("remote-uuid");
    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe("remote-uuid");
    // local is newer (100 > 50), so its content wins under the canonical id
    expect(rows[0].updated_at).toBe(100);
  });

  test("does not remap when the natural key differs", () => {
    const local: SyncRow[] = [{ id: "local-uuid", updated_at: 100, code: "ANIME" }];
    const remote: SyncRow[] = [{ id: "remote-uuid", updated_at: 50, code: "MANGA" }];

    const { rows, idRemap } = reconcileByNaturalKey(local, remote, "code");

    expect(idRemap.size).toBe(0);
    expect(rows.map((r) => r.id).sort()).toEqual(["local-uuid", "remote-uuid"]);
  });

  test("no-ops when ids already match", () => {
    const local: SyncRow[] = [{ id: "same-id", updated_at: 100, code: "ANIME" }];
    const remote: SyncRow[] = [{ id: "same-id", updated_at: 50, code: "ANIME" }];

    const { rows, idRemap } = reconcileByNaturalKey(local, remote, "code");

    expect(idRemap.size).toBe(0);
    expect(rows).toEqual([{ id: "same-id", updated_at: 100, code: "ANIME" }]);
  });
});

describe("remapForeignKey", () => {
  test("rewrites the given field using the id remap, leaving unmapped rows untouched", () => {
    const idRemap = new Map([["old-tag-id", "canonical-tag-id"]]);
    const rows = [
      { id: "vt1", tag_id: "old-tag-id", updated_at: 1 },
      { id: "vt2", tag_id: "untouched-id", updated_at: 1 },
    ];
    expect(remapForeignKey(rows, "tag_id", idRemap)).toEqual([
      { id: "vt1", tag_id: "canonical-tag-id", updated_at: 1 },
      { id: "vt2", tag_id: "untouched-id", updated_at: 1 },
    ]);
  });
});

describe("dedupeByCompositeKey", () => {
  test("keeps only the newest row per composite key", () => {
    const rows: SyncRow[] = [
      { id: "a", video_id: "v1", tag_id: "t1", updated_at: 100 },
      { id: "b", video_id: "v1", tag_id: "t1", updated_at: 200 },
      { id: "c", video_id: "v2", tag_id: "t1", updated_at: 50 },
    ];
    const result = dedupeByCompositeKey(rows, (r) => `${r.video_id}:${r.tag_id}`);
    expect(result.map((r) => r.id).sort()).toEqual(["b", "c"]);
  });
});

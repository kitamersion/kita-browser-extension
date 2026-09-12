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

  test("does not treat a tombstoned remote row as canonical for its natural key", () => {
    // The user deleted "ANIME" (tombstone already synced) and then created a new tag by the same
    // name. Binding the new local row to the tombstone's id would let the remote deleted_at win on
    // the next pull and silently delete the tag the user just re-created.
    const local: SyncRow[] = [{ id: "local-uuid", updated_at: 100, code: "ANIME" }];
    const remote: SyncRow[] = [{ id: "remote-tombstone", updated_at: 50, code: "ANIME", deleted_at: 50 }];

    const { rows, idRemap } = reconcileByNaturalKey(local, remote, "code");

    expect(idRemap.size).toBe(0);
    // The tombstone still flows through the merge so id-based deletion propagation is unaffected.
    expect(rows.map((r) => r.id).sort()).toEqual(["local-uuid", "remote-tombstone"]);
  });

  test("reconciles using a composite key function instead of a single field", () => {
    // video_tags has no single natural-key field of its own; its identity is the (video_id, tag_id)
    // pair. A rekey (or any local id churn) can hand a link a fresh id even though the same link
    // already exists remotely under a different id — this must still be recognised as the same row.
    const local: SyncRow[] = [{ id: "fresh-vt-id", updated_at: 100, video_id: "v1", tag_id: "t1" }];
    const remote: SyncRow[] = [{ id: "remote-vt-id", updated_at: 50, video_id: "v1", tag_id: "t1" }];

    const { rows, idRemap } = reconcileByNaturalKey(local, remote, (row) => `${row.video_id}:${row.tag_id}`);

    expect(idRemap.get("fresh-vt-id")).toBe("remote-vt-id");
    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe("remote-vt-id");
  });

  test("deduplicates when two local rows collide on the same remote natural-key match, keeping the newer updated_at", () => {
    // Two local rows both coded "ANIME" (e.g., independently seeded defaults on two devices)
    // Both remap to the same canonical remote id
    // The newer local edit (300) should win over the stale one (100)
    const local: SyncRow[] = [
      { id: "L1", updated_at: 300, code: "ANIME" }, // newest edit
      { id: "L2", updated_at: 100, code: "ANIME" }, // stale duplicate
    ];
    const remote: SyncRow[] = [{ id: "R1", updated_at: 50, code: "ANIME" }];

    const { rows, idRemap } = reconcileByNaturalKey(local, remote, "code");

    // Both local ids should map to the canonical remote id
    expect(idRemap.get("L1")).toBe("R1");
    expect(idRemap.get("L2")).toBe("R1");
    // Result should have exactly one row with the canonical id
    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe("R1");
    // The newer updated_at (300) should win, not the stale one (100)
    expect(rows[0].updated_at).toBe(300);
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

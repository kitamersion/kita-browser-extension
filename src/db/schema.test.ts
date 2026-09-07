import IndexedDB from "./index";
import { DB_VERSION, OBJECT_STORE_SYNC_META } from "./schema";

describe("schema v10", () => {
  test("opens at the expected version and creates the sync_meta store", async () => {
    const db = await IndexedDB.openDatabase();
    expect(db.version).toBe(DB_VERSION);
    expect(db.objectStoreNames.contains(OBJECT_STORE_SYNC_META)).toBe(true);
  });
});

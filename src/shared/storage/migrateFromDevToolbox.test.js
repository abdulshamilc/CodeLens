// src/shared/storage/migrateFromDevToolbox.test.js
import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  migrateFromDevToolbox,
  migrateLocalStorage,
  migrateIndexedDB,
  cleanupOldDevToolboxData,
} from "./migrateFromDevToolbox";
import { STORAGE_KEYS, LEGACY_STORAGE_KEYS } from "./keys";

// Mock idb-keyval in-memory store
const mockIdbStore = new Map();

vi.mock("idb-keyval", () => ({
  get: vi.fn(async (key) => mockIdbStore.get(key)),
  set: vi.fn(async (key, val) => {
    mockIdbStore.set(key, val);
  }),
  del: vi.fn(async (key) => {
    mockIdbStore.delete(key);
  }),
}));

describe("migrateFromDevToolbox", () => {
  beforeEach(() => {
    localStorage.clear();
    mockIdbStore.clear();
    vi.clearAllMocks();
  });

  it("handles a fresh profile with no old data gracefully", async () => {
    const result = await migrateFromDevToolbox();

    expect(result.success).toBe(true);
    expect(result.alreadyMigrated).toBe(false);
    expect(result.migratedLocalStorageKeys).toHaveLength(0);
    expect(result.migratedIdbKeys).toHaveLength(0);
    expect(localStorage.getItem(STORAGE_KEYS.MIGRATED_V1)).toBe("true");
    expect(localStorage.getItem(STORAGE_KEYS.MIGRATION_TIMESTAMP)).toBeTruthy();
  });

  it("migrates existing DevToolbox localStorage keys without deleting old ones", () => {
    localStorage.setItem(LEGACY_STORAGE_KEYS.THEME, "dark");
    localStorage.setItem(LEGACY_STORAGE_KEYS.DBV_LAYOUT_V3, JSON.stringify({ left: 30, right: 70 }));
    localStorage.setItem("devtoolbox-custom-key", "custom-value");

    const migratedKeys = migrateLocalStorage();

    // Verify new keys were written
    expect(localStorage.getItem(STORAGE_KEYS.THEME)).toBe("dark");
    expect(localStorage.getItem(STORAGE_KEYS.DBV_LAYOUT)).toBe(JSON.stringify({ left: 30, right: 70 }));
    expect(localStorage.getItem("codelens-custom-key")).toBe("custom-value");

    // Critical: Old keys MUST NOT be deleted during migration
    expect(localStorage.getItem(LEGACY_STORAGE_KEYS.THEME)).toBe("dark");
    expect(localStorage.getItem(LEGACY_STORAGE_KEYS.DBV_LAYOUT_V3)).toBe(JSON.stringify({ left: 30, right: 70 }));
    expect(localStorage.getItem("devtoolbox-custom-key")).toBe("custom-value");

    expect(migratedKeys).toContain(LEGACY_STORAGE_KEYS.THEME);
    expect(migratedKeys).toContain(LEGACY_STORAGE_KEYS.DBV_LAYOUT_V3);
  });

  it("migrates existing IndexedDB records correctly", async () => {
    const mockBoardState = { elements: [{ id: "1", type: "card" }], viewport: { x: 0, y: 0, zoom: 1 } };
    const mockSession = { code: "console.log('hello');" };

    mockIdbStore.set(LEGACY_STORAGE_KEYS.WHITEBOARD_STATE, mockBoardState);
    mockIdbStore.set(LEGACY_STORAGE_KEYS.DBV_LAST_SESSION, mockSession);

    const migrated = await migrateIndexedDB();

    expect(migrated).toContain(LEGACY_STORAGE_KEYS.WHITEBOARD_STATE);
    expect(migrated).toContain(LEGACY_STORAGE_KEYS.DBV_LAST_SESSION);

    // Verify new records exist and match
    expect(mockIdbStore.get(STORAGE_KEYS.WHITEBOARD_STATE)).toEqual(mockBoardState);
    expect(mockIdbStore.get(STORAGE_KEYS.DBV_LAST_SESSION)).toEqual(mockSession);

    // Old records are preserved
    expect(mockIdbStore.get(LEGACY_STORAGE_KEYS.WHITEBOARD_STATE)).toEqual(mockBoardState);
    expect(mockIdbStore.get(LEGACY_STORAGE_KEYS.DBV_LAST_SESSION)).toEqual(mockSession);
  });

  it("is idempotent: does not re-run or overwrite when already migrated", async () => {
    localStorage.setItem(STORAGE_KEYS.MIGRATED_V1, "true");
    localStorage.setItem(STORAGE_KEYS.THEME, "light");
    localStorage.setItem(LEGACY_STORAGE_KEYS.THEME, "dark");

    const result = await migrateFromDevToolbox();

    expect(result.success).toBe(true);
    expect(result.alreadyMigrated).toBe(true);
    // Should NOT overwrite new light theme with legacy dark theme
    expect(localStorage.getItem(STORAGE_KEYS.THEME)).toBe("light");
  });

  it("handles IndexedDB failure safely without setting migrated flag and leaves data safe", async () => {
    const { get } = await import("idb-keyval");
    vi.mocked(get).mockRejectedValueOnce(new Error("IDB connection failed"));

    localStorage.setItem(LEGACY_STORAGE_KEYS.THEME, "dark");

    const result = await migrateFromDevToolbox();

    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
    // Migrated flag must NOT be true so migration can be retried on next launch
    expect(localStorage.getItem(STORAGE_KEYS.MIGRATED_V1)).toBeNull();
    // Old data is preserved
    expect(localStorage.getItem(LEGACY_STORAGE_KEYS.THEME)).toBe("dark");
  });

  it("cleanupOldDevToolboxData properly removes old keys after safety period", async () => {
    localStorage.setItem(STORAGE_KEYS.THEME, "dark");
    localStorage.setItem(LEGACY_STORAGE_KEYS.THEME, "dark");
    localStorage.setItem("devtoolbox-old", "old");
    mockIdbStore.set(STORAGE_KEYS.WHITEBOARD_STATE, { test: 1 });
    mockIdbStore.set(LEGACY_STORAGE_KEYS.WHITEBOARD_STATE, { test: 1 });

    await cleanupOldDevToolboxData();

    // New keys remain
    expect(localStorage.getItem(STORAGE_KEYS.THEME)).toBe("dark");
    expect(mockIdbStore.get(STORAGE_KEYS.WHITEBOARD_STATE)).toBeDefined();

    // Legacy keys removed
    expect(localStorage.getItem(LEGACY_STORAGE_KEYS.THEME)).toBeNull();
    expect(localStorage.getItem("devtoolbox-old")).toBeNull();
    expect(mockIdbStore.get(LEGACY_STORAGE_KEYS.WHITEBOARD_STATE)).toBeUndefined();
  });
});

// src/shared/storage/migrateFromDevToolbox.js
// One-time safe data migration from DevToolbox to CodeLens

import { get as idbGet, set as idbSet, del as idbDel } from "idb-keyval";
import { STORAGE_KEYS, LEGACY_STORAGE_KEYS, RETENTION_30_DAYS_MS } from "./keys";

/**
 * @typedef {Object} MigrationResult
 * @property {boolean} success
 * @property {boolean} alreadyMigrated
 * @property {string[]} migratedLocalStorageKeys
 * @property {string[]} migratedIdbKeys
 * @property {unknown} [error]
 */

/**
 * Triggers a non-blocking toast/notification if migration fails
 * @param {string} message
 */
function notifyMigrationError(message) {
  if (typeof window !== "undefined") {
    console.warn(`[CodeLens Migration] ${message}`);
    window.dispatchEvent(
      new CustomEvent("codelens-toast", {
        detail: {
          message: "Could not migrate old data, your old data is safe",
          type: "warning",
        },
      })
    );
  }
}

/**
 * Migrates localStorage entries from legacy keys to new CodeLens keys.
 * Does NOT delete old keys during migration (kept as a 30-day safety net).
 * @returns {string[]}
 */
export function migrateLocalStorage() {
  const migrated = [];
  if (typeof window === "undefined" || !window.localStorage) {
    return migrated;
  }

  // 1. Explicit mapped keys
  const explicitMap = {
    [LEGACY_STORAGE_KEYS.THEME]: STORAGE_KEYS.THEME,
    [LEGACY_STORAGE_KEYS.DBV_LAYOUT_V3]: STORAGE_KEYS.DBV_LAYOUT,
    [LEGACY_STORAGE_KEYS.DBV_LAYOUT_V2]: STORAGE_KEYS.DBV_LAYOUT_V2,
    [LEGACY_STORAGE_KEYS.LAST_TOOL]: STORAGE_KEYS.LAST_TOOL,
    [LEGACY_STORAGE_KEYS.RECENT_COLORS]: STORAGE_KEYS.RECENT_COLORS,
    [LEGACY_STORAGE_KEYS.BREAKPOINTS]: STORAGE_KEYS.BREAKPOINTS,
    [LEGACY_STORAGE_KEYS.CLIPBOARD]: STORAGE_KEYS.CLIPBOARD,
  };

  for (const [oldKey, newKey] of Object.entries(explicitMap)) {
    const oldValue = window.localStorage.getItem(oldKey);
    if (oldValue !== null && window.localStorage.getItem(newKey) === null) {
      window.localStorage.setItem(newKey, oldValue);
      migrated.push(oldKey);
    }
  }

  // 2. Dynamic discovery for any other "devtoolbox-" or "devtoolbox_" keys
  for (let i = 0; i < window.localStorage.length; i++) {
    const key = window.localStorage.key(i);
    if (key && (key.startsWith("devtoolbox-") || key.startsWith("devtoolbox_"))) {
      const newKey = key.replace(/^devtoolbox[-_]/, "codelens-");
      if (window.localStorage.getItem(newKey) === null) {
        const val = window.localStorage.getItem(key);
        if (val !== null) {
          window.localStorage.setItem(newKey, val);
          if (!migrated.includes(key)) {
            migrated.push(key);
          }
        }
      }
    }
  }

  return migrated;
}

/**
 * Migrates IndexedDB records (Whiteboard state, DBV session) to new keys.
 * Verifies data integrity by reading back written records.
 * @returns {Promise<string[]>}
 */
export async function migrateIndexedDB() {
  const migrated = [];

  // Mappings for idb-keyval store
  const idbMap = [
    {
      oldKey: LEGACY_STORAGE_KEYS.WHITEBOARD_STATE,
      newKey: STORAGE_KEYS.WHITEBOARD_STATE,
    },
    {
      oldKey: LEGACY_STORAGE_KEYS.DBV_LAST_SESSION,
      newKey: STORAGE_KEYS.DBV_LAST_SESSION,
    },
  ];

  for (const { oldKey, newKey } of idbMap) {
    try {
      const oldVal = await idbGet(oldKey);
      if (oldVal !== undefined && oldVal !== null) {
        const newVal = await idbGet(newKey);
        // Only write if new key doesn't already exist
        if (newVal === undefined || newVal === null) {
          await idbSet(newKey, oldVal);
          // Verify read back
          const written = await idbGet(newKey);
          if (written === undefined || written === null) {
            throw new Error(`Verification failed for IndexedDB key: ${newKey}`);
          }
        }
        migrated.push(oldKey);
      }
    } catch (err) {
      throw new Error(`IndexedDB migration error for key "${oldKey}": ${String(err)}`);
    }
  }

  return migrated;
}

/**
 * Automatically cleans up old DevToolbox data if 30-day retention has expired
 * or when called explicitly by the user from Settings.
 * @returns {Promise<void>}
 */
export async function cleanupOldDevToolboxData() {
  if (typeof window === "undefined" || !window.localStorage) return;

  const legacyLocalKeys = [
    LEGACY_STORAGE_KEYS.THEME,
    LEGACY_STORAGE_KEYS.DBV_LAYOUT_V3,
    LEGACY_STORAGE_KEYS.DBV_LAYOUT_V2,
    LEGACY_STORAGE_KEYS.LAST_TOOL,
    LEGACY_STORAGE_KEYS.RECENT_COLORS,
    LEGACY_STORAGE_KEYS.BREAKPOINTS,
    LEGACY_STORAGE_KEYS.CLIPBOARD,
  ];

  // Remove known legacy localStorage keys
  for (const key of legacyLocalKeys) {
    window.localStorage.removeItem(key);
  }

  // Remove any dynamic devtoolbox keys
  const toRemove = [];
  for (let i = 0; i < window.localStorage.length; i++) {
    const key = window.localStorage.key(i);
    if (key && (key.startsWith("devtoolbox-") || key.startsWith("devtoolbox_"))) {
      toRemove.push(key);
    }
  }
  toRemove.forEach((k) => window.localStorage.removeItem(k));

  // Remove legacy IndexedDB entries
  try {
    await idbDel(LEGACY_STORAGE_KEYS.WHITEBOARD_STATE);
    await idbDel(LEGACY_STORAGE_KEYS.DBV_LAST_SESSION);
  } catch {
    // Ignore cleanup errors
  }
}

/**
 * Main migration entry point.
 * Runs once at app startup before any store initializes.
 * Idempotent, safe, and fails gracefully with zero data loss.
 * @returns {Promise<MigrationResult>}
 */
export async function migrateFromDevToolbox() {
  if (typeof window === "undefined") {
    return {
      success: true,
      alreadyMigrated: false,
      migratedLocalStorageKeys: [],
      migratedIdbKeys: [],
    };
  }

  try {
    // Check if migration already succeeded
    const isMigrated = window.localStorage.getItem(STORAGE_KEYS.MIGRATED_V1) === "true";
    if (isMigrated) {
      // Check 30-day safety net for automatic cleanup
      const timestampStr = window.localStorage.getItem(STORAGE_KEYS.MIGRATION_TIMESTAMP);
      if (timestampStr) {
        const timestamp = parseInt(timestampStr, 10);
        if (!isNaN(timestamp) && Date.now() - timestamp > RETENTION_30_DAYS_MS) {
          // 30 days passed, safely clean up old records in the background
          cleanupOldDevToolboxData().catch(() => {});
        }
      }

      return {
        success: true,
        alreadyMigrated: true,
        migratedLocalStorageKeys: [],
        migratedIdbKeys: [],
      };
    }

    // Step 1: Migrate localStorage
    const migratedLocalStorageKeys = migrateLocalStorage();

    // Step 2: Migrate IndexedDB
    const migratedIdbKeys = await migrateIndexedDB();

    // Step 3: Mark migration as successfully complete
    window.localStorage.setItem(STORAGE_KEYS.MIGRATED_V1, "true");
    window.localStorage.setItem(STORAGE_KEYS.MIGRATION_TIMESTAMP, Date.now().toString());

    return {
      success: true,
      alreadyMigrated: false,
      migratedLocalStorageKeys,
      migratedIdbKeys,
    };
  } catch (error) {
    notifyMigrationError(String(error));
    // Old data is preserved untouched
    return {
      success: false,
      alreadyMigrated: false,
      migratedLocalStorageKeys: [],
      migratedIdbKeys: [],
      error,
    };
  }
}

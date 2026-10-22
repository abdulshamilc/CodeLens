// src/shared/storage/keys.js
// Central storage keys registry for CodeLens (localStorage & IndexedDB)

export const STORAGE_KEYS = Object.freeze({
  // localStorage keys
  THEME: "codelens-theme",
  DBV_LAYOUT: "codelens-dbv-layout",
  DBV_LAYOUT_V2: "codelens-dbv-layout-v2",
  LAST_TOOL: "codelens-last-tool",
  RECENT_COLORS: "codelens-recent-colors",
  BREAKPOINTS: "codelens-breakpoints",
  CLIPBOARD: "codelens-clipboard",

  // IndexedDB keys (stored in idb-keyval)
  WHITEBOARD_STATE: "codelens_whiteboard_state",
  DBV_LAST_SESSION: "codelens-dbv-last-session",

  // Migration control keys
  MIGRATED_V1: "codelens-migrated-v1",
  MIGRATION_TIMESTAMP: "codelens-migration-timestamp",
});

export const LEGACY_STORAGE_KEYS = Object.freeze({
  // Legacy localStorage keys from DevToolbox
  THEME: "devtoolbox-theme",
  DBV_LAYOUT_V3: "dbv-layout-v3",
  DBV_LAYOUT_V2: "dbv-layout-v2",
  LAST_TOOL: "devtoolbox-last-tool",
  RECENT_COLORS: "devtoolbox-recent-colors",
  BREAKPOINTS: "devtoolbox-breakpoints",
  CLIPBOARD: "devtoolbox-clipboard",

  // Legacy IndexedDB keys
  WHITEBOARD_STATE: "devtoolbox_whiteboard_state",
  DBV_LAST_SESSION: "dbv-last-session",
});

// 30 days retention period in milliseconds (safety net)
export const RETENTION_30_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

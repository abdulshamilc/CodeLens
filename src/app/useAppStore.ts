// src/app/useAppStore.ts
// Global app-level Zustand store: theme + keyboard shortcut modal

import { create } from "zustand";
import type { Theme } from "./theme";
import { getInitialTheme, applyTheme } from "./theme";

interface AppState {
  theme: Theme;
  shortcutModalOpen: boolean;
  toggleTheme: () => void;
  setShortcutModalOpen: (open: boolean) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  theme: getInitialTheme(),
  shortcutModalOpen: false,

  toggleTheme: () => {
    const next: Theme = get().theme === "dark" ? "light" : "dark";
    applyTheme(next);
    set({ theme: next });
  },

  setShortcutModalOpen: (open) => set({ shortcutModalOpen: open }),
}));

// Apply the initial theme immediately on module load
applyTheme(getInitialTheme());

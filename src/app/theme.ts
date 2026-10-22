// src/app/theme.ts
// Theme management: system preference + localStorage persistence

import { STORAGE_KEYS, LEGACY_STORAGE_KEYS } from "@/shared/storage/keys";

export type Theme = "dark" | "light";

const STORAGE_KEY = STORAGE_KEYS.THEME;

/** Read saved theme or fall back to system preference (with legacy fallback) */
export function getInitialTheme(): Theme {
  try {
    const saved = (localStorage.getItem(STORAGE_KEY) ||
      localStorage.getItem(LEGACY_STORAGE_KEYS.THEME)) as Theme | null;
    if (saved === "dark" || saved === "light") return saved;
  } catch {
    // localStorage unavailable
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

/** Apply theme class to <html> and persist */
export function applyTheme(theme: Theme): void {
  const root = document.documentElement;
  root.classList.toggle("light", theme === "light");
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // ignore
  }
}

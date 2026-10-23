// src/tools/dbv/editor/editorSettings.js
// Persistent editor preferences for VS Code-like CodeMirror 6 editor

import { useState, useEffect, useCallback } from "react";

export const STORAGE_KEY_EDITOR_SETTINGS = "codelens-editor-settings";

export const DEFAULT_EDITOR_SETTINGS = Object.freeze({
  fontSize: 13,
  tabSize: 2,
  wordWrap: true,
  minimap: false,
  lineNumbers: true,
  bracketMatching: true,
  rainbowBrackets: false,
  autoFormatOnRun: false,
  autocomplete: true,
  autoRunExamples: true,
});

export function loadEditorSettings() {
  if (typeof window === "undefined" || !window.localStorage) {
    return { ...DEFAULT_EDITOR_SETTINGS };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY_EDITOR_SETTINGS);
    if (!raw) return { ...DEFAULT_EDITOR_SETTINGS };
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_EDITOR_SETTINGS,
      ...parsed,
      fontSize: typeof parsed.fontSize === "number" && parsed.fontSize >= 9 && parsed.fontSize <= 28
        ? parsed.fontSize
        : DEFAULT_EDITOR_SETTINGS.fontSize,
      tabSize: parsed.tabSize === 4 ? 4 : 2,
    };
  } catch {
    return { ...DEFAULT_EDITOR_SETTINGS };
  }
}

export function saveEditorSettings(settings) {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    localStorage.setItem(STORAGE_KEY_EDITOR_SETTINGS, JSON.stringify(settings));
    window.dispatchEvent(new CustomEvent("codelens-editor-settings-change", { detail: settings }));
  } catch {
    // ignore
  }
}

export function useEditorSettings() {
  const [settings, setSettings] = useState(loadEditorSettings);

  useEffect(() => {
    const handleStorage = (e) => {
      if (e.key === STORAGE_KEY_EDITOR_SETTINGS && e.newValue) {
        try {
          setSettings({ ...DEFAULT_EDITOR_SETTINGS, ...JSON.parse(e.newValue) });
        } catch {}
      }
    };
    const handleCustom = (e) => {
      if (e.detail) {
        setSettings({ ...DEFAULT_EDITOR_SETTINGS, ...e.detail });
      }
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener("codelens-editor-settings-change", handleCustom);
    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("codelens-editor-settings-change", handleCustom);
    };
  }, []);

  const updateSettings = useCallback((partial) => {
    setSettings((prev) => {
      const next = { ...prev, ...partial };
      saveEditorSettings(next);
      return next;
    });
  }, []);

  return [settings, updateSettings];
}

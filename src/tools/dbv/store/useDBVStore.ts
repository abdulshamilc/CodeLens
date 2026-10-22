// src/tools/dbv/store/useDBVStore.ts
// Zustand store for DBV: code, trace, playback state, and UI flags

import { create } from "zustand";
import type { TraceStep } from "../types";
import { DEFAULT_CODE } from "../examples/examples";
import { get as idbGet, set as idbSet } from "idb-keyval";
import { STORAGE_KEYS, LEGACY_STORAGE_KEYS } from "@/shared/storage/keys";

const IDB_KEY = STORAGE_KEYS.DBV_LAST_SESSION;

interface DBVState {
  // Code
  code: string;
  setCode: (code: string) => void;

  // Trace
  trace: TraceStep[];
  setTrace: (steps: TraceStep[]) => void;

  // Playback
  currentStep: number;
  isPlaying: boolean;
  playbackSpeed: number; // ms between steps
  setCurrentStep: (step: number) => void;
  setIsPlaying: (playing: boolean) => void;
  setPlaybackSpeed: (ms: number) => void;
  stepForward: () => void;
  stepBack: () => void;

  // Worker state
  isRunning: boolean;
  runError: string | null;
  setIsRunning: (v: boolean) => void;
  setRunError: (e: string | null) => void;

  // Breakpoints (line numbers, 1-indexed)
  breakpoints: Set<number>;
  toggleBreakpoint: (line: number) => void;

  // Panel visibility
  panelsVisible: Record<string, boolean>;
  togglePanel: (id: string) => void;

  // Save/restore session
  saveSession: () => Promise<void>;
  loadSession: () => Promise<void>;
}

export const useDBVStore = create<DBVState>((set, get) => ({
  code: DEFAULT_CODE,
  trace: [],
  currentStep: 0,
  isPlaying: false,
  playbackSpeed: 600,
  isRunning: false,
  runError: null,
  breakpoints: new Set(),
  panelsVisible: {
    callstack: true,
    memory: true,
    scopechain: true,
    console: true,
    explanation: true,
  },

  setCode: (code) => set({ code }),
  setTrace: (trace) => set({ trace, currentStep: 0, isPlaying: false }),
  setCurrentStep: (step) =>
    set((s) => ({
      currentStep: Math.max(0, Math.min(step, s.trace.length - 1)),
    })),
  setIsPlaying: (isPlaying) => set({ isPlaying }),
  setPlaybackSpeed: (playbackSpeed) => set({ playbackSpeed }),
  stepForward: () =>
    set((s) => ({
      currentStep: Math.min(s.currentStep + 1, s.trace.length - 1),
      isPlaying: s.currentStep + 1 >= s.trace.length - 1 ? false : s.isPlaying,
    })),
  stepBack: () =>
    set((s) => ({
      currentStep: Math.max(s.currentStep - 1, 0),
      isPlaying: false,
    })),
  setIsRunning: (isRunning) => set({ isRunning }),
  setRunError: (runError) => set({ runError }),

  toggleBreakpoint: (line) =>
    set((s) => {
      const next = new Set(s.breakpoints);
      if (next.has(line)) next.delete(line);
      else next.add(line);
      return { breakpoints: next };
    }),

  togglePanel: (id) =>
    set((s) => ({
      panelsVisible: { ...s.panelsVisible, [id]: !s.panelsVisible[id] },
    })),

  saveSession: async () => {
    try {
      await idbSet(IDB_KEY, { code: get().code });
    } catch {
      // ignore IndexedDB errors
    }
  },

  loadSession: async () => {
    try {
      let data = await idbGet<{ code: string }>(IDB_KEY);
      if (!data?.code) {
        // Fallback to legacy DevToolbox session key
        data = await idbGet<{ code: string }>(LEGACY_STORAGE_KEYS.DBV_LAST_SESSION);
      }
      if (data?.code) set({ code: data.code });
    } catch {
      // ignore
    }
  },
}));

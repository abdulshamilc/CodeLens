// src/store/slices/dbvLayoutSlice.js
import { createSlice } from "@reduxjs/toolkit";
import { STORAGE_KEYS, LEGACY_STORAGE_KEYS } from "@/shared/storage/keys";

export const DEFAULT_SIZES = Object.freeze({
  balanced: {
    left: 38,
    stage: 62,
    code: 65,
    console: 35,
  },
  "code-focus": {
    left: 48,
    stage: 52,
    code: 72,
    console: 28,
  },
  "visual-focus": {
    left: 28,
    stage: 72,
    code: 65,
    console: 35,
  },
  "console-focus": {
    left: 42,
    stage: 58,
    code: 45,
    console: 55,
  },
});

const STORAGE_KEY = STORAGE_KEYS.DBV_LAYOUT;

function loadInitialState() {
  if (typeof window !== "undefined" && window.localStorage) {
    try {
      const raw =
        localStorage.getItem(STORAGE_KEY) ||
        localStorage.getItem(LEGACY_STORAGE_KEYS.DBV_LAYOUT_V3) ||
        localStorage.getItem(LEGACY_STORAGE_KEYS.DBV_LAYOUT_V2);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (
          parsed &&
          typeof parsed.sizes?.left === "number" &&
          typeof parsed.sizes?.code === "number" &&
          typeof parsed.sizes?.console === "number"
        ) {
          const validLeft =
            parsed.sizes.left >= 15 && parsed.sizes.left <= 85
              ? parsed.sizes.left
              : 38;
          const validStage = 100 - validLeft;
          const validCode =
            parsed.sizes.code >= 20 && parsed.sizes.code <= 85
              ? parsed.sizes.code
              : 65;
          const validConsole = 100 - validCode;

          return {
            preset: parsed.preset ?? "balanced",
            sizes: {
              left: validLeft,
              stage: validStage,
              code: validCode,
              console: validConsole,
            },
            maximizedZone: null,
            visibleZones: {
              code: parsed.visibleZones?.code ?? true,
              visualization: parsed.visibleZones?.visualization ?? true,
              console: parsed.visibleZones?.console ?? true,
            },
          };
        }
      }
    } catch {
      // ignore
    }
  }

  return {
    preset: "balanced",
    sizes: DEFAULT_SIZES.balanced,
    maximizedZone: null,
    visibleZones: {
      code: true,
      visualization: true,
      console: true,
    },
  };
}

const initialState = loadInitialState();

export const dbvLayoutSlice = createSlice({
  name: "dbvLayout",
  initialState,
  reducers: {
    setPreset: (state, action) => {
      const preset = action.payload;
      const newSizes = DEFAULT_SIZES[preset] || DEFAULT_SIZES.balanced;
      state.preset = preset;
      state.sizes = newSizes;
      state.maximizedZone = null;
      try {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({ preset, sizes: newSizes, visibleZones: state.visibleZones })
        );
      } catch {
        // ignore
      }
    },
    setSizes: (state, action) => {
      state.sizes = { ...state.sizes, ...action.payload };
      try {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({ preset: state.preset, sizes: state.sizes, visibleZones: state.visibleZones })
        );
      } catch {
        // ignore
      }
    },
    toggleMaximize: (state, action) => {
      const zone = action.payload;
      state.maximizedZone = state.maximizedZone === zone ? null : zone;
    },
    restoreMaximized: (state) => {
      state.maximizedZone = null;
    },
    toggleZoneVisibility: (state, action) => {
      const zone = action.payload;
      state.visibleZones[zone] = !state.visibleZones[zone];
      if (!state.visibleZones.code && !state.visibleZones.visualization && !state.visibleZones.console) {
        state.visibleZones[zone] = true;
      }
      try {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({ preset: state.preset, sizes: state.sizes, visibleZones: state.visibleZones })
        );
      } catch {
        // ignore
      }
    },
    resetLayout: (state) => {
      state.preset = "balanced";
      state.sizes = DEFAULT_SIZES.balanced;
      state.maximizedZone = null;
      state.visibleZones = { code: true, visualization: true, console: true };
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {
        // ignore
      }
    },
  },
});

export const {
  setPreset,
  setSizes,
  toggleMaximize,
  restoreMaximized,
  toggleZoneVisibility,
  resetLayout,
} = dbvLayoutSlice.actions;

export default dbvLayoutSlice.reducer;

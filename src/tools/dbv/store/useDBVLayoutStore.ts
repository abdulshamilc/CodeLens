// src/tools/dbv/store/useDBVLayoutStore.ts
// Persistent layout state for the exactly 3-zone DBV layout:
// CODE (left) | (VISUALIZATION (top-right) / CONSOLE (bottom-right))

import { create } from "zustand";

export type LayoutPreset = "balanced" | "code-focus" | "visual-focus" | "console-focus";
export type ZoneId = "code" | "visualization" | "console";

export interface ZoneSizes {
  left: number;    // % width of left column (Code & Console) (default: 38)
  stage: number;   // % width of right column (Visualization Zone) (default: 62)
  code: number;    // % height of code editor in left column (default: 65)
  console: number; // % height of console in left column (default: 35)
}

const DEFAULT_SIZES: Record<LayoutPreset, ZoneSizes> = {
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
};

import { STORAGE_KEYS, LEGACY_STORAGE_KEYS } from "@/shared/storage/keys";

const STORAGE_KEY = STORAGE_KEYS.DBV_LAYOUT;

interface DBVLayoutState {
  preset: LayoutPreset;
  sizes: ZoneSizes;
  maximizedZone: ZoneId | null;
  visibleZones: {
    code: boolean;
    visualization: boolean;
    console: boolean;
  };

  // Actions
  setPreset: (preset: LayoutPreset) => void;
  setSizes: (sizes: Partial<ZoneSizes>) => void;
  toggleMaximize: (zone: ZoneId) => void;
  restoreMaximized: () => void;
  toggleZoneVisibility: (zone: ZoneId) => void;
  resetLayout: () => void;
}

function loadInitialState(): {
  preset: LayoutPreset;
  sizes: ZoneSizes;
  visibleZones: DBVLayoutState["visibleZones"];
} {
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
        // Sanitize any corrupt / squished sizes (percentage must be between 15% and 85%)
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
          visibleZones: {
            code: parsed.visibleZones?.code ?? true,
            visualization: parsed.visibleZones?.visualization ?? true,
            console: parsed.visibleZones?.console ?? true,
          },
        };
      }
    }
  } catch {
    // fallback to defaults on corrupt storage
  }

  return {
    preset: "balanced",
    sizes: DEFAULT_SIZES.balanced,
    visibleZones: {
      code: true,
      visualization: true,
      console: true,
    },
  };
}

const initial = loadInitialState();

export const useDBVLayoutStore = create<DBVLayoutState>((set, get) => ({
  preset: initial.preset,
  sizes: initial.sizes,
  maximizedZone: null,
  visibleZones: initial.visibleZones,

  setPreset: (preset) => {
    const newSizes = DEFAULT_SIZES[preset];
    set({ preset, sizes: newSizes, maximizedZone: null });
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ preset, sizes: newSizes, visibleZones: get().visibleZones })
      );
    } catch {
      // ignore
    }
  },

  setSizes: (newSizes) => {
    set((s) => {
      const updated = { ...s.sizes, ...newSizes };
      try {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({ preset: s.preset, sizes: updated, visibleZones: s.visibleZones })
        );
      } catch {
        // ignore
      }
      return { sizes: updated };
    });
  },

  toggleMaximize: (zone) => {
    set((s) => ({
      maximizedZone: s.maximizedZone === zone ? null : zone,
    }));
  },

  restoreMaximized: () => {
    set({ maximizedZone: null });
  },

  toggleZoneVisibility: (zone) => {
    set((s) => {
      const updated = {
        ...s.visibleZones,
        [zone]: !s.visibleZones[zone],
      };
      // Keep at least one zone visible
      if (!updated.code && !updated.visualization && !updated.console) {
        updated[zone] = true;
      }
      try {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({ preset: s.preset, sizes: s.sizes, visibleZones: updated })
        );
      } catch {
        // ignore
      }
      return { visibleZones: updated };
    });
  },

  resetLayout: () => {
    const resetSizes = DEFAULT_SIZES.balanced;
    const resetZones = { code: true, visualization: true, console: true };
    set({
      preset: "balanced",
      sizes: resetSizes,
      maximizedZone: null,
      visibleZones: resetZones,
    });
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  },
}));

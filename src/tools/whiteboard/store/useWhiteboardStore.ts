// src/tools/whiteboard/store/useWhiteboardStore.ts
// Zustand store for Whiteboard with undo/redo and IndexedDB persistence

import { create } from "zustand";
import { get as idbGet, set as idbSet } from "idb-keyval";
import type { ToolType, WhiteboardElement, Viewport } from "../types";
import { STORAGE_KEYS, LEGACY_STORAGE_KEYS } from "@/shared/storage/keys";

const STORAGE_KEY = STORAGE_KEYS.WHITEBOARD_STATE;
const MAX_HISTORY = 40;

interface WhiteboardState {
  elements: WhiteboardElement[];
  selectedIds: string[];
  tool: ToolType;
  strokeColor: string;
  fillColor: string;
  strokeWidth: number;
  strokeStyle: "solid" | "dashed";
  fontSize: number;
  viewport: Viewport;
  undoStack: WhiteboardElement[][];
  redoStack: WhiteboardElement[][];

  // Actions
  setTool: (tool: ToolType) => void;
  setStrokeColor: (color: string) => void;
  setFillColor: (color: string) => void;
  setStrokeWidth: (width: number) => void;
  setStrokeStyle: (style: "solid" | "dashed") => void;
  setFontSize: (size: number) => void;
  setViewport: (viewport: Viewport | ((prev: Viewport) => Viewport)) => void;
  resetViewport: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
  setSelectedIds: (ids: string[]) => void;

  // Element actions with undo/redo history
  addElement: (element: WhiteboardElement) => void;
  updateElement: (id: string, partial: Partial<WhiteboardElement>) => void;
  moveSelected: (dx: number, dy: number) => void;
  deleteSelected: () => void;
  clearCanvas: () => void;
  setElements: (elements: WhiteboardElement[]) => void;

  // History
  undo: () => void;
  redo: () => void;

  // Persistence
  saveToStorage: () => Promise<void>;
  loadFromStorage: () => Promise<void>;
}

export const useWhiteboardStore = create<WhiteboardState>((set, get) => ({
  elements: [],
  selectedIds: [],
  tool: "pen",
  strokeColor: "#6366f1", // indigo
  fillColor: "transparent",
  strokeWidth: 3,
  strokeStyle: "solid",
  fontSize: 18,
  viewport: { x: 0, y: 0, zoom: 1 },
  undoStack: [],
  redoStack: [],

  setTool: (tool) => set({ tool, selectedIds: tool === "select" ? get().selectedIds : [] }),
  setStrokeColor: (strokeColor) => set({ strokeColor }),
  setFillColor: (fillColor) => set({ fillColor }),
  setStrokeWidth: (strokeWidth) => set({ strokeWidth }),
  setStrokeStyle: (strokeStyle) => set({ strokeStyle }),
  setFontSize: (fontSize) => set({ fontSize }),
  setSelectedIds: (selectedIds) => set({ selectedIds }),

  setViewport: (viewport) =>
    set((state) => ({
      viewport: typeof viewport === "function" ? viewport(state.viewport) : viewport,
    })),

  resetViewport: () => set({ viewport: { x: 0, y: 0, zoom: 1 } }),

  zoomIn: () =>
    set((state) => ({
      viewport: {
        ...state.viewport,
        zoom: Math.min(5, Number((state.viewport.zoom * 1.2).toFixed(2))),
      },
    })),

  zoomOut: () =>
    set((state) => ({
      viewport: {
        ...state.viewport,
        zoom: Math.max(0.1, Number((state.viewport.zoom / 1.2).toFixed(2))),
      },
    })),

  addElement: (element) => {
    const current = get().elements;
    set({
      elements: [...current, element],
      undoStack: [...get().undoStack.slice(-MAX_HISTORY), current],
      redoStack: [],
    });
    get().saveToStorage();
  },

  updateElement: (id, partial) => {
    const current = get().elements;
    set({
      elements: current.map((el) => (el.id === id ? { ...el, ...partial } : el)),
    });
    get().saveToStorage();
  },

  moveSelected: (dx, dy) => {
    const { selectedIds, elements } = get();
    if (selectedIds.length === 0) return;
    set({
      elements: elements.map((el) => {
        if (!selectedIds.includes(el.id)) return el;
        if (el.points && el.points.length > 0) {
          return {
            ...el,
            x: el.x + dx,
            y: el.y + dy,
            points: el.points.map((p) => ({ x: p.x + dx, y: p.y + dy })),
          };
        }
        return { ...el, x: el.x + dx, y: el.y + dy };
      }),
    });
  },

  deleteSelected: () => {
    const { selectedIds, elements, undoStack } = get();
    if (selectedIds.length === 0) return;
    set({
      undoStack: [...undoStack.slice(-MAX_HISTORY), elements],
      redoStack: [],
      elements: elements.filter((el) => !selectedIds.includes(el.id)),
      selectedIds: [],
    });
    get().saveToStorage();
  },

  clearCanvas: () => {
    const { elements, undoStack } = get();
    if (elements.length === 0) return;
    set({
      undoStack: [...undoStack.slice(-MAX_HISTORY), elements],
      redoStack: [],
      elements: [],
      selectedIds: [],
    });
    get().saveToStorage();
  },

  setElements: (elements) => {
    const current = get().elements;
    set({
      elements,
      undoStack: [...get().undoStack.slice(-MAX_HISTORY), current],
      redoStack: [],
    });
    get().saveToStorage();
  },

  undo: () => {
    const { undoStack, elements, redoStack } = get();
    if (undoStack.length === 0) return;
    const previous = undoStack[undoStack.length - 1];
    set({
      elements: previous,
      undoStack: undoStack.slice(0, -1),
      redoStack: [elements, ...redoStack],
      selectedIds: [],
    });
    get().saveToStorage();
  },

  redo: () => {
    const { undoStack, elements, redoStack } = get();
    if (redoStack.length === 0) return;
    const next = redoStack[0];
    set({
      elements: next,
      undoStack: [...undoStack, elements],
      redoStack: redoStack.slice(1),
      selectedIds: [],
    });
    get().saveToStorage();
  },

  saveToStorage: async () => {
    try {
      const state = {
        elements: get().elements,
        viewport: get().viewport,
      };
      await idbSet(STORAGE_KEY, state);
    } catch {
      // Storage unavailable or quota exceeded
    }
  },

  loadFromStorage: async () => {
    try {
      let saved = await idbGet<{ elements: WhiteboardElement[]; viewport: Viewport }>(STORAGE_KEY);
      if (!saved) {
        // Fallback to legacy DevToolbox store key
        saved = await idbGet<{ elements: WhiteboardElement[]; viewport: Viewport }>(
          LEGACY_STORAGE_KEYS.WHITEBOARD_STATE
        );
      }
      if (saved && Array.isArray(saved.elements)) {
        set({
          elements: saved.elements,
          viewport: saved.viewport ?? { x: 0, y: 0, zoom: 1 },
        });
      }
    } catch {
      // Ignored
    }
  },
}));

// src/store/slices/whiteboardSlice.js
// Redux Toolkit slice for Whiteboard state, tools, elements, and undo/redo history

import { createSlice } from "@reduxjs/toolkit";

const MAX_HISTORY = 40;

const initialState = {
  elements: [],
  selectedIds: [],
  tool: "pen",
  strokeColor: "#6366f1",
  fillColor: "transparent",
  strokeWidth: 3,
  strokeStyle: "solid",
  fontSize: 18,
  viewport: { x: 0, y: 0, zoom: 1 },
  undoStack: [],
  redoStack: [],
};

export const whiteboardSlice = createSlice({
  name: "whiteboard",
  initialState,
  reducers: {
    setTool: (state, action) => {
      state.tool = action.payload;
      if (action.payload !== "select") {
        state.selectedIds = [];
      }
    },
    setStrokeColor: (state, action) => {
      state.strokeColor = action.payload;
    },
    setFillColor: (state, action) => {
      state.fillColor = action.payload;
    },
    setStrokeWidth: (state, action) => {
      state.strokeWidth = action.payload;
    },
    setStrokeStyle: (state, action) => {
      state.strokeStyle = action.payload;
    },
    setFontSize: (state, action) => {
      state.fontSize = action.payload;
    },
    setSelectedIds: (state, action) => {
      state.selectedIds = action.payload;
    },
    setViewport: (state, action) => {
      if (typeof action.payload === "function") {
        state.viewport = action.payload(state.viewport);
      } else {
        state.viewport = action.payload;
      }
    },
    resetViewport: (state) => {
      state.viewport = { x: 0, y: 0, zoom: 1 };
    },
    zoomIn: (state) => {
      state.viewport.zoom = Math.min(5, Number((state.viewport.zoom * 1.2).toFixed(2)));
    },
    zoomOut: (state) => {
      state.viewport.zoom = Math.max(0.1, Number((state.viewport.zoom / 1.2).toFixed(2)));
    },
    addElement: (state, action) => {
      state.undoStack = [...state.undoStack.slice(-MAX_HISTORY), state.elements];
      state.redoStack = [];
      state.elements.push(action.payload);
    },
    updateElement: (state, action) => {
      const { id, partial } = action.payload;
      const idx = state.elements.findIndex((el) => el.id === id);
      if (idx !== -1) {
        state.elements[idx] = { ...state.elements[idx], ...partial };
      }
    },
    moveSelected: (state, action) => {
      const { dx, dy } = action.payload;
      if (state.selectedIds.length === 0) return;
      state.elements = state.elements.map((el) => {
        if (!state.selectedIds.includes(el.id)) return el;
        if (el.points && el.points.length > 0) {
          return {
            ...el,
            x: el.x + dx,
            y: el.y + dy,
            points: el.points.map((p) => ({ x: p.x + dx, y: p.y + dy })),
          };
        }
        return { ...el, x: el.x + dx, y: el.y + dy };
      });
    },
    deleteSelected: (state) => {
      if (state.selectedIds.length === 0) return;
      state.undoStack = [...state.undoStack.slice(-MAX_HISTORY), state.elements];
      state.redoStack = [];
      state.elements = state.elements.filter((el) => !state.selectedIds.includes(el.id));
      state.selectedIds = [];
    },
    clearCanvas: (state) => {
      if (state.elements.length === 0) return;
      state.undoStack = [...state.undoStack.slice(-MAX_HISTORY), state.elements];
      state.redoStack = [];
      state.elements = [];
      state.selectedIds = [];
    },
    setElements: (state, action) => {
      state.undoStack = [...state.undoStack.slice(-MAX_HISTORY), state.elements];
      state.redoStack = [];
      state.elements = action.payload;
    },
    undo: (state) => {
      if (state.undoStack.length === 0) return;
      const previous = state.undoStack[state.undoStack.length - 1];
      state.redoStack = [state.elements, ...state.redoStack];
      state.elements = previous;
      state.undoStack = state.undoStack.slice(0, -1);
      state.selectedIds = [];
    },
    redo: (state) => {
      if (state.redoStack.length === 0) return;
      const next = state.redoStack[0];
      state.undoStack = [...state.undoStack, state.elements];
      state.elements = next;
      state.redoStack = state.redoStack.slice(1);
      state.selectedIds = [];
    },
    loadWhiteboardState: (state, action) => {
      if (Array.isArray(action.payload.elements)) {
        state.elements = action.payload.elements;
      }
      if (action.payload.viewport) {
        state.viewport = action.payload.viewport;
      }
    },
  },
});

export const {
  setTool,
  setStrokeColor,
  setFillColor,
  setStrokeWidth,
  setStrokeStyle,
  setFontSize,
  setSelectedIds,
  setViewport,
  resetViewport,
  zoomIn,
  zoomOut,
  addElement,
  updateElement,
  moveSelected,
  deleteSelected,
  clearCanvas,
  setElements,
  undo,
  redo,
  loadWhiteboardState,
} = whiteboardSlice.actions;

export default whiteboardSlice.reducer;

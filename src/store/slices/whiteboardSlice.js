// src/store/slices/whiteboardSlice.js
// Redux Toolkit slice for Whiteboard state, developer diagramming elements, layers, and history

import { createSlice } from "@reduxjs/toolkit";

const MAX_HISTORY = 50;

const initialState = {
  elements: [],
  selectedIds: [],
  tool: "select",
  strokeColor: "#6366f1",
  fillColor: "transparent",
  strokeWidth: 2,
  strokeStyle: "solid", // "solid" | "dashed" | "dotted"
  opacity: 1,
  fontSize: 16,
  fontFamily: "Inter, sans-serif",
  fontWeight: "normal",
  fontStyle: "normal",
  textDecoration: "none",
  textAlign: "left",
  textBgColor: "transparent",
  codeLanguage: "javascript",
  codeLineNumbers: true,
  codeTheme: "dark",
  connectorRouting: "straight",
  canvasBackground: "dark", // "dark" | "black" | "light" | "grid"
  gridVisible: true,
  snapToGrid: false,
  showLayersPanel: false,
  showPropertiesPanel: true,
  viewport: { x: 0, y: 0, zoom: 1 },
  undoStack: [],
  redoStack: [],
};

function pushHistory(state) {
  state.undoStack = [...state.undoStack.slice(-MAX_HISTORY), JSON.parse(JSON.stringify(state.elements))];
  state.redoStack = [];
}

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
      if (state.selectedIds.length > 0) {
        pushHistory(state);
        state.elements = state.elements.map((el) =>
          state.selectedIds.includes(el.id) && !el.locked ? { ...el, strokeColor: action.payload } : el
        );
      }
    },
    setFillColor: (state, action) => {
      state.fillColor = action.payload;
      if (state.selectedIds.length > 0) {
        pushHistory(state);
        state.elements = state.elements.map((el) =>
          state.selectedIds.includes(el.id) && !el.locked ? { ...el, fillColor: action.payload } : el
        );
      }
    },
    setStrokeWidth: (state, action) => {
      state.strokeWidth = action.payload;
      if (state.selectedIds.length > 0) {
        pushHistory(state);
        state.elements = state.elements.map((el) =>
          state.selectedIds.includes(el.id) && !el.locked ? { ...el, strokeWidth: action.payload } : el
        );
      }
    },
    setStrokeStyle: (state, action) => {
      state.strokeStyle = action.payload;
      if (state.selectedIds.length > 0) {
        pushHistory(state);
        state.elements = state.elements.map((el) =>
          state.selectedIds.includes(el.id) && !el.locked ? { ...el, strokeStyle: action.payload } : el
        );
      }
    },
    setOpacity: (state, action) => {
      state.opacity = action.payload;
      if (state.selectedIds.length > 0) {
        pushHistory(state);
        state.elements = state.elements.map((el) =>
          state.selectedIds.includes(el.id) && !el.locked ? { ...el, opacity: action.payload } : el
        );
      }
    },
    setFontSize: (state, action) => {
      state.fontSize = action.payload;
      if (state.selectedIds.length > 0) {
        pushHistory(state);
        state.elements = state.elements.map((el) =>
          state.selectedIds.includes(el.id) && !el.locked ? { ...el, fontSize: action.payload } : el
        );
      }
    },
    setFontFamily: (state, action) => {
      state.fontFamily = action.payload;
      if (state.selectedIds.length > 0) {
        pushHistory(state);
        state.elements = state.elements.map((el) =>
          state.selectedIds.includes(el.id) && !el.locked ? { ...el, fontFamily: action.payload } : el
        );
      }
    },
    setFontWeight: (state, action) => {
      state.fontWeight = action.payload;
      if (state.selectedIds.length > 0) {
        pushHistory(state);
        state.elements = state.elements.map((el) =>
          state.selectedIds.includes(el.id) && !el.locked ? { ...el, fontWeight: action.payload } : el
        );
      }
    },
    setFontStyle: (state, action) => {
      state.fontStyle = action.payload;
      if (state.selectedIds.length > 0) {
        pushHistory(state);
        state.elements = state.elements.map((el) =>
          state.selectedIds.includes(el.id) && !el.locked ? { ...el, fontStyle: action.payload } : el
        );
      }
    },
    setTextDecoration: (state, action) => {
      state.textDecoration = action.payload;
      if (state.selectedIds.length > 0) {
        pushHistory(state);
        state.elements = state.elements.map((el) =>
          state.selectedIds.includes(el.id) && !el.locked ? { ...el, textDecoration: action.payload } : el
        );
      }
    },
    setTextAlign: (state, action) => {
      state.textAlign = action.payload;
      if (state.selectedIds.length > 0) {
        pushHistory(state);
        state.elements = state.elements.map((el) =>
          state.selectedIds.includes(el.id) && !el.locked ? { ...el, textAlign: action.payload } : el
        );
      }
    },
    setTextBgColor: (state, action) => {
      state.textBgColor = action.payload;
      if (state.selectedIds.length > 0) {
        pushHistory(state);
        state.elements = state.elements.map((el) =>
          state.selectedIds.includes(el.id) && !el.locked ? { ...el, textBgColor: action.payload } : el
        );
      }
    },
    setCodeLanguage: (state, action) => {
      state.codeLanguage = action.payload;
      if (state.selectedIds.length > 0) {
        pushHistory(state);
        state.elements = state.elements.map((el) =>
          state.selectedIds.includes(el.id) && el.type === "code-block" && !el.locked
            ? { ...el, language: action.payload }
            : el
        );
      }
    },
    setCodeLineNumbers: (state, action) => {
      state.codeLineNumbers = action.payload;
      if (state.selectedIds.length > 0) {
        pushHistory(state);
        state.elements = state.elements.map((el) =>
          state.selectedIds.includes(el.id) && el.type === "code-block" && !el.locked
            ? { ...el, lineNumbers: action.payload }
            : el
        );
      }
    },
    setCodeTheme: (state, action) => {
      state.codeTheme = action.payload;
      if (state.selectedIds.length > 0) {
        pushHistory(state);
        state.elements = state.elements.map((el) =>
          state.selectedIds.includes(el.id) && el.type === "code-block" && !el.locked
            ? { ...el, codeTheme: action.payload }
            : el
        );
      }
    },
    setConnectorRouting: (state, action) => {
      state.connectorRouting = action.payload;
      if (state.selectedIds.length > 0) {
        pushHistory(state);
        state.elements = state.elements.map((el) =>
          state.selectedIds.includes(el.id) && el.type.startsWith("connector") && !el.locked
            ? { ...el, routing: action.payload }
            : el
        );
      }
    },
    setCanvasBackground: (state, action) => {
      state.canvasBackground = action.payload;
    },
    toggleGrid: (state) => {
      state.gridVisible = !state.gridVisible;
    },
    toggleSnapToGrid: (state) => {
      state.snapToGrid = !state.snapToGrid;
    },
    setShowLayersPanel: (state, action) => {
      state.showLayersPanel = typeof action.payload === "boolean" ? action.payload : !state.showLayersPanel;
    },
    setShowPropertiesPanel: (state, action) => {
      state.showPropertiesPanel = typeof action.payload === "boolean" ? action.payload : !state.showPropertiesPanel;
    },
    setSelectedIds: (state, action) => {
      state.selectedIds = Array.isArray(action.payload) ? action.payload : [];
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
      pushHistory(state);
      state.elements.push(action.payload);
      if (state.tool === "select") {
        state.selectedIds = [action.payload.id];
      }
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
      if (state.selectedIds.length === 0 || (dx === 0 && dy === 0)) return;

      const movedIds = new Set();
      state.elements = state.elements.map((el) => {
        if (!state.selectedIds.includes(el.id) || el.locked) return el;
        movedIds.add(el.id);

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

      // Update connected connectors attached to moved shapes
      state.elements = state.elements.map((el) => {
        if (!el.type?.startsWith("connector")) return el;
        let updated = { ...el };
        let modified = false;

        if (el.fromId && movedIds.has(el.fromId) && !state.selectedIds.includes(el.id)) {
          updated.x = updated.x + dx;
          modified = true;
        }
        if (el.toId && movedIds.has(el.toId) && !state.selectedIds.includes(el.id)) {
          updated.width = updated.width + 0; // touch connector to trigger reactivity
          modified = true;
        }
        return modified ? updated : el;
      });
    },
    resizeElement: (state, action) => {
      const { id, x, y, width, height, points } = action.payload;
      const idx = state.elements.findIndex((el) => el.id === id);
      if (idx !== -1 && !state.elements[idx].locked) {
        state.elements[idx] = {
          ...state.elements[idx],
          x,
          y,
          width,
          height,
          ...(points ? { points } : {}),
        };
      }
    },
    rotateElement: (state, action) => {
      const { id, rotation } = action.payload;
      const idx = state.elements.findIndex((el) => el.id === id);
      if (idx !== -1 && !state.elements[idx].locked) {
        state.elements[idx].rotation = rotation;
      }
    },
    deleteSelected: (state) => {
      if (state.selectedIds.length === 0) return;
      const toDelete = state.elements.filter(
        (el) => state.selectedIds.includes(el.id) && !el.locked
      );
      if (toDelete.length === 0) return;
      pushHistory(state);
      const deletedIds = new Set(toDelete.map((e) => e.id));
      state.elements = state.elements.filter((el) => !deletedIds.has(el.id));
      state.selectedIds = state.selectedIds.filter((id) => !deletedIds.has(id));
    },
    duplicateSelected: (state) => {
      if (state.selectedIds.length === 0) return;
      pushHistory(state);
      const newElements = [];
      const newIds = [];
      const offset = 24;

      for (const el of state.elements) {
        if (state.selectedIds.includes(el.id)) {
          const newId = `el-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
          newIds.push(newId);
          const cloned = {
            ...JSON.parse(JSON.stringify(el)),
            id: newId,
            x: el.x + offset,
            y: el.y + offset,
            name: el.name ? `${el.name} (Copy)` : undefined,
          };
          if (cloned.points) {
            cloned.points = cloned.points.map((p) => ({ x: p.x + offset, y: p.y + offset }));
          }
          newElements.push(cloned);
        }
      }

      state.elements.push(...newElements);
      state.selectedIds = newIds;
    },
    bringForward: (state) => {
      if (state.selectedIds.length === 0) return;
      pushHistory(state);
      const arr = [...state.elements];
      for (let i = arr.length - 2; i >= 0; i--) {
        if (state.selectedIds.includes(arr[i].id) && !state.selectedIds.includes(arr[i + 1].id)) {
          const temp = arr[i];
          arr[i] = arr[i + 1];
          arr[i + 1] = temp;
        }
      }
      state.elements = arr;
    },
    sendBackward: (state) => {
      if (state.selectedIds.length === 0) return;
      pushHistory(state);
      const arr = [...state.elements];
      for (let i = 1; i < arr.length; i++) {
        if (state.selectedIds.includes(arr[i].id) && !state.selectedIds.includes(arr[i - 1].id)) {
          const temp = arr[i];
          arr[i] = arr[i - 1];
          arr[i - 1] = temp;
        }
      }
      state.elements = arr;
    },
    bringToFront: (state) => {
      if (state.selectedIds.length === 0) return;
      pushHistory(state);
      const selected = state.elements.filter((el) => state.selectedIds.includes(el.id));
      const unselected = state.elements.filter((el) => !state.selectedIds.includes(el.id));
      state.elements = [...unselected, ...selected];
    },
    sendToBack: (state) => {
      if (state.selectedIds.length === 0) return;
      pushHistory(state);
      const selected = state.elements.filter((el) => state.selectedIds.includes(el.id));
      const unselected = state.elements.filter((el) => !state.selectedIds.includes(el.id));
      state.elements = [...selected, ...unselected];
    },
    toggleLockElement: (state, action) => {
      const id = action.payload;
      const el = state.elements.find((e) => e.id === id);
      if (el) {
        pushHistory(state);
        el.locked = !el.locked;
      }
    },
    toggleHideElement: (state, action) => {
      const id = action.payload;
      const el = state.elements.find((e) => e.id === id);
      if (el) {
        pushHistory(state);
        el.hidden = !el.hidden;
      }
    },
    groupSelected: (state) => {
      if (state.selectedIds.length < 2) return;
      pushHistory(state);
      const groupId = `group-${Date.now()}`;
      state.elements = state.elements.map((el) =>
        state.selectedIds.includes(el.id) ? { ...el, groupId } : el
      );
    },
    ungroupSelected: (state) => {
      if (state.selectedIds.length === 0) return;
      pushHistory(state);
      state.elements = state.elements.map((el) =>
        state.selectedIds.includes(el.id) ? { ...el, groupId: null } : el
      );
    },
    renameElement: (state, action) => {
      const { id, name } = action.payload;
      const el = state.elements.find((e) => e.id === id);
      if (el) {
        el.name = name;
      }
    },
    clearCanvas: (state) => {
      if (state.elements.length === 0) return;
      pushHistory(state);
      state.elements = [];
      state.selectedIds = [];
    },
    setElements: (state, action) => {
      pushHistory(state);
      state.elements = action.payload;
    },
    undo: (state) => {
      if (state.undoStack.length === 0) return;
      const previous = state.undoStack[state.undoStack.length - 1];
      state.redoStack = [JSON.parse(JSON.stringify(state.elements)), ...state.redoStack];
      state.elements = previous;
      state.undoStack = state.undoStack.slice(0, -1);
      state.selectedIds = [];
    },
    redo: (state) => {
      if (state.redoStack.length === 0) return;
      const next = state.redoStack[0];
      state.undoStack = [...state.undoStack, JSON.parse(JSON.stringify(state.elements))];
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
  setOpacity,
  setFontSize,
  setFontFamily,
  setFontWeight,
  setFontStyle,
  setTextDecoration,
  setTextAlign,
  setTextBgColor,
  setCodeLanguage,
  setCodeLineNumbers,
  setCodeTheme,
  setConnectorRouting,
  setCanvasBackground,
  toggleGrid,
  toggleSnapToGrid,
  setShowLayersPanel,
  setShowPropertiesPanel,
  setSelectedIds,
  setViewport,
  resetViewport,
  zoomIn,
  zoomOut,
  addElement,
  updateElement,
  moveSelected,
  resizeElement,
  rotateElement,
  deleteSelected,
  duplicateSelected,
  bringForward,
  sendBackward,
  bringToFront,
  sendToBack,
  toggleLockElement,
  toggleHideElement,
  groupSelected,
  ungroupSelected,
  renameElement,
  clearCanvas,
  setElements,
  undo,
  redo,
  loadWhiteboardState,
} = whiteboardSlice.actions;

export default whiteboardSlice.reducer;

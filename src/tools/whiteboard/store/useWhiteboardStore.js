// src/tools/whiteboard/store/useWhiteboardStore.js
// Redux Toolkit facade hook for Whiteboard with undo/redo and IndexedDB persistence

import { useMemo } from "react";
import { useSelector, useDispatch } from "react-redux";
import { get as idbGet, set as idbSet } from "idb-keyval";
import { store } from "@/store";
import {
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
} from "@/store/slices/whiteboardSlice";
import { STORAGE_KEYS, LEGACY_STORAGE_KEYS } from "@/shared/storage/keys";

const STORAGE_KEY = STORAGE_KEYS.WHITEBOARD_STATE;

async function saveToStorage() {
  try {
    const { elements, viewport } = store.getState().whiteboard;
    await idbSet(STORAGE_KEY, { elements, viewport });
  } catch {
    // ignore
  }
}

async function loadFromStorage(dispatch) {
  try {
    let saved = await idbGet(STORAGE_KEY);
    if (!saved) {
      saved = await idbGet(LEGACY_STORAGE_KEYS.WHITEBOARD_STATE);
    }
    if (saved && Array.isArray(saved.elements)) {
      dispatch(loadWhiteboardState({
        elements: saved.elements,
        viewport: saved.viewport ?? { x: 0, y: 0, zoom: 1 },
      }));
    }
  } catch {
    // ignore
  }
}

function buildActions(dispatch) {
  return {
    setTool: (tool) => dispatch(setTool(tool)),
    setStrokeColor: (color) => dispatch(setStrokeColor(color)),
    setFillColor: (color) => dispatch(setFillColor(color)),
    setStrokeWidth: (width) => dispatch(setStrokeWidth(width)),
    setStrokeStyle: (style) => dispatch(setStrokeStyle(style)),
    setFontSize: (size) => dispatch(setFontSize(size)),
    setSelectedIds: (ids) => dispatch(setSelectedIds(ids)),
    setViewport: (vp) => dispatch(setViewport(vp)),
    resetViewport: () => dispatch(resetViewport()),
    zoomIn: () => dispatch(zoomIn()),
    zoomOut: () => dispatch(zoomOut()),
    addElement: (el) => {
      dispatch(addElement(el));
      saveToStorage();
    },
    updateElement: (id, partial) => {
      dispatch(updateElement({ id, partial }));
      saveToStorage();
    },
    moveSelected: (dx, dy) => {
      dispatch(moveSelected({ dx, dy }));
    },
    deleteSelected: () => {
      dispatch(deleteSelected());
      saveToStorage();
    },
    clearCanvas: () => {
      dispatch(clearCanvas());
      saveToStorage();
    },
    setElements: (elements) => {
      dispatch(setElements(elements));
      saveToStorage();
    },
    undo: () => {
      dispatch(undo());
      saveToStorage();
    },
    redo: () => {
      dispatch(redo());
      saveToStorage();
    },
    saveToStorage,
    loadFromStorage: () => loadFromStorage(dispatch),
  };
}

export function useWhiteboardStore(selector) {
  const dispatch = useDispatch();
  const wb = useSelector((root) => root.whiteboard);

  const actions = useMemo(() => buildActions(dispatch), [dispatch]);

  const combined = useMemo(() => ({
    ...wb,
    ...actions,
  }), [wb, actions]);

  if (typeof selector === "function") {
    return selector(combined);
  }

  return combined;
}

useWhiteboardStore.getState = () => {
  const wb = store.getState().whiteboard;
  return {
    ...wb,
    ...buildActions(store.dispatch),
  };
};

export default useWhiteboardStore;

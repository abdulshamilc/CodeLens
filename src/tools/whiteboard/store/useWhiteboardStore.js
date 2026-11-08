// src/tools/whiteboard/store/useWhiteboardStore.js
// Redux Toolkit facade hook for Whiteboard with undo/redo, developer diagramming actions, and IndexedDB persistence

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
} from "@/store/slices/whiteboardSlice";
import { STORAGE_KEYS, LEGACY_STORAGE_KEYS } from "@/shared/storage/keys";

const STORAGE_KEY = STORAGE_KEYS.WHITEBOARD_STATE;

let saveTimeout = null;
function debouncedSaveToStorage() {
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(async () => {
    try {
      const { elements, viewport } = store.getState().whiteboard;
      await idbSet(STORAGE_KEY, { elements, viewport });
    } catch {
      // ignore
    }
  }, 200);
}

async function saveToStorageNow() {
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
      dispatch(
        loadWhiteboardState({
          elements: saved.elements,
          viewport: saved.viewport ?? { x: 0, y: 0, zoom: 1 },
        })
      );
    }
  } catch {
    // ignore
  }
}

function buildActions(dispatch) {
  return {
    setTool: (tool) => dispatch(setTool(tool)),
    setStrokeColor: (color) => {
      dispatch(setStrokeColor(color));
      debouncedSaveToStorage();
    },
    setFillColor: (color) => {
      dispatch(setFillColor(color));
      debouncedSaveToStorage();
    },
    setStrokeWidth: (width) => {
      dispatch(setStrokeWidth(width));
      debouncedSaveToStorage();
    },
    setStrokeStyle: (style) => {
      dispatch(setStrokeStyle(style));
      debouncedSaveToStorage();
    },
    setOpacity: (opacity) => {
      dispatch(setOpacity(opacity));
      debouncedSaveToStorage();
    },
    setFontSize: (size) => {
      dispatch(setFontSize(size));
      debouncedSaveToStorage();
    },
    setFontFamily: (family) => {
      dispatch(setFontFamily(family));
      debouncedSaveToStorage();
    },
    setFontWeight: (weight) => {
      dispatch(setFontWeight(weight));
      debouncedSaveToStorage();
    },
    setFontStyle: (style) => {
      dispatch(setFontStyle(style));
      debouncedSaveToStorage();
    },
    setTextDecoration: (dec) => {
      dispatch(setTextDecoration(dec));
      debouncedSaveToStorage();
    },
    setTextAlign: (align) => {
      dispatch(setTextAlign(align));
      debouncedSaveToStorage();
    },
    setTextBgColor: (color) => {
      dispatch(setTextBgColor(color));
      debouncedSaveToStorage();
    },
    setCodeLanguage: (lang) => {
      dispatch(setCodeLanguage(lang));
      debouncedSaveToStorage();
    },
    setCodeLineNumbers: (show) => {
      dispatch(setCodeLineNumbers(show));
      debouncedSaveToStorage();
    },
    setCodeTheme: (theme) => {
      dispatch(setCodeTheme(theme));
      debouncedSaveToStorage();
    },
    setConnectorRouting: (routing) => {
      dispatch(setConnectorRouting(routing));
      debouncedSaveToStorage();
    },
    setCanvasBackground: (bg) => dispatch(setCanvasBackground(bg)),
    toggleGrid: () => dispatch(toggleGrid()),
    toggleSnapToGrid: () => dispatch(toggleSnapToGrid()),
    setShowLayersPanel: (val) => dispatch(setShowLayersPanel(val)),
    setShowPropertiesPanel: (val) => dispatch(setShowPropertiesPanel(val)),
    setSelectedIds: (ids) => dispatch(setSelectedIds(ids)),
    setViewport: (vp) => dispatch(setViewport(vp)),
    resetViewport: () => dispatch(resetViewport()),
    zoomIn: () => dispatch(zoomIn()),
    zoomOut: () => dispatch(zoomOut()),
    addElement: (el) => {
      dispatch(addElement(el));
      debouncedSaveToStorage();
    },
    updateElement: (id, partial) => {
      dispatch(updateElement({ id, partial }));
      debouncedSaveToStorage();
    },
    moveSelected: (dx, dy) => {
      dispatch(moveSelected({ dx, dy }));
      debouncedSaveToStorage();
    },
    resizeElement: (params) => {
      dispatch(resizeElement(params));
      debouncedSaveToStorage();
    },
    rotateElement: (params) => {
      dispatch(rotateElement(params));
      debouncedSaveToStorage();
    },
    deleteSelected: () => {
      dispatch(deleteSelected());
      debouncedSaveToStorage();
    },
    duplicateSelected: () => {
      dispatch(duplicateSelected());
      debouncedSaveToStorage();
    },
    bringForward: () => {
      dispatch(bringForward());
      debouncedSaveToStorage();
    },
    sendBackward: () => {
      dispatch(sendBackward());
      debouncedSaveToStorage();
    },
    bringToFront: () => {
      dispatch(bringToFront());
      debouncedSaveToStorage();
    },
    sendToBack: () => {
      dispatch(sendToBack());
      debouncedSaveToStorage();
    },
    toggleLockElement: (id) => {
      dispatch(toggleLockElement(id));
      debouncedSaveToStorage();
    },
    toggleHideElement: (id) => {
      dispatch(toggleHideElement(id));
      debouncedSaveToStorage();
    },
    groupSelected: () => {
      dispatch(groupSelected());
      debouncedSaveToStorage();
    },
    ungroupSelected: () => {
      dispatch(ungroupSelected());
      debouncedSaveToStorage();
    },
    renameElement: (id, name) => {
      dispatch(renameElement({ id, name }));
      debouncedSaveToStorage();
    },
    clearCanvas: () => {
      dispatch(clearCanvas());
      saveToStorageNow();
    },
    setElements: (elements) => {
      dispatch(setElements(elements));
      debouncedSaveToStorage();
    },
    undo: () => {
      dispatch(undo());
      debouncedSaveToStorage();
    },
    redo: () => {
      dispatch(redo());
      debouncedSaveToStorage();
    },
    saveToStorage: saveToStorageNow,
    loadFromStorage: () => loadFromStorage(dispatch),
  };
}

export function useWhiteboardStore(selector) {
  const dispatch = useDispatch();
  const wb = useSelector((root) => root.whiteboard);

  const actions = useMemo(() => buildActions(dispatch), [dispatch]);

  const combined = useMemo(
    () => ({
      ...wb,
      ...actions,
    }),
    [wb, actions]
  );

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

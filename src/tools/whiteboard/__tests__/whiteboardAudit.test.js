// src/tools/whiteboard/__tests__/whiteboardAudit.test.js
// Comprehensive test suite auditing the upgraded Whiteboard & Developer Diagramming Suite

import { describe, it, expect, beforeEach } from "vitest";
import whiteboardReducer, {
  addElement,
  updateElement,
  deleteSelected,
  duplicateSelected,
  bringForward,
  sendBackward,
  bringToFront,
  sendToBack,
  toggleLockElement,
  groupSelected,
  ungroupSelected,
  undo,
  redo,
} from "@/store/slices/whiteboardSlice";
import {
  getElementBounds,
  getElementAnchors,
  hitTestElement,
  hitTestResizeHandle,
  hitTestAnchors,
} from "../utils/render";
import { importFromJSON, getBoundingBox } from "../utils/export";
import { DIAGRAM_TEMPLATES } from "../utils/templates";

describe("Whiteboard Audit & Developer Diagramming Suite", () => {
  let initialState;

  beforeEach(() => {
    initialState = {
      elements: [],
      selectedIds: [],
      tool: "select",
      strokeColor: "#6366f1",
      fillColor: "transparent",
      strokeWidth: 2,
      strokeStyle: "solid",
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
      canvasBackground: "dark",
      gridVisible: true,
      snapToGrid: false,
      showLayersPanel: false,
      showPropertiesPanel: true,
      viewport: { x: 0, y: 0, zoom: 1 },
      undoStack: [],
      redoStack: [],
    };
  });

  describe("1. Element Creation & Basic Reducers", () => {
    it("adds standard shapes and preserves all developer attributes", () => {
      const rectEl = {
        id: "rect-1",
        type: "rectangle",
        x: 100,
        y: 100,
        width: 150,
        height: 80,
        strokeColor: "#6366f1",
        fillColor: "transparent",
        strokeWidth: 2,
        strokeStyle: "solid",
        opacity: 0.9,
      };

      const state1 = whiteboardReducer(initialState, addElement(rectEl));
      expect(state1.elements).toHaveLength(1);
      expect(state1.elements[0].id).toBe("rect-1");
      expect(state1.elements[0].opacity).toBe(0.9);
      expect(state1.undoStack).toHaveLength(1);
    });

    it("adds developer blocks: database, server, api-endpoint, code-block", () => {
      const dbEl = {
        id: "db-1",
        type: "database",
        x: 200,
        y: 200,
        width: 100,
        height: 120,
        strokeColor: "#10b981",
        fillColor: "rgba(16, 185, 129, 0.1)",
        strokeWidth: 2,
        strokeStyle: "solid",
      };

      const codeEl = {
        id: "code-1",
        type: "code-block",
        x: 400,
        y: 200,
        width: 260,
        height: 160,
        code: 'const a = 10;\nconsole.log("hello");',
        language: "typescript",
        lineNumbers: true,
        codeTheme: "dark",
        strokeColor: "#6366f1",
        fillColor: "transparent",
        strokeWidth: 2,
        strokeStyle: "solid",
      };

      let state = whiteboardReducer(initialState, addElement(dbEl));
      state = whiteboardReducer(state, addElement(codeEl));

      expect(state.elements).toHaveLength(2);
      expect(state.elements[0].type).toBe("database");
      expect(state.elements[1].type).toBe("code-block");
      expect(state.elements[1].language).toBe("typescript");
      expect(state.elements[1].lineNumbers).toBe(true);
    });

    it("updates element properties cleanly", () => {
      const el = {
        id: "txt-1",
        type: "text",
        x: 50,
        y: 50,
        width: 120,
        height: 24,
        text: "Hello World",
        fontSize: 16,
        strokeColor: "#ffffff",
      };

      let state = whiteboardReducer(initialState, addElement(el));
      state = whiteboardReducer(
        state,
        updateElement({ id: "txt-1", partial: { text: "Updated Label", fontSize: 20 } })
      );

      expect(state.elements[0].text).toBe("Updated Label");
      expect(state.elements[0].fontSize).toBe(20);
    });
  });

  describe("2. Geometry & Bounds Calculations", () => {
    it("computes accurate bounding box for rectangular shapes", () => {
      const el = { x: 50, y: 80, width: 200, height: 100 };
      const bounds = getElementBounds(el);
      expect(bounds).toEqual({ x: 50, y: 80, width: 200, height: 100 });
    });

    it("normalizes negative width and height correctly", () => {
      const el = { x: 250, y: 180, width: -200, height: -100 };
      const bounds = getElementBounds(el);
      expect(bounds).toEqual({ x: 50, y: 80, width: 200, height: 100 });
    });

    it("computes accurate bounding box for freehand pen points", () => {
      const penEl = {
        type: "pen",
        points: [
          { x: 10, y: 20 },
          { x: 100, y: 50 },
          { x: 30, y: 150 },
        ],
      };
      const bounds = getElementBounds(penEl);
      expect(bounds.x).toBe(10);
      expect(bounds.y).toBe(20);
      expect(bounds.width).toBe(90);
      expect(bounds.height).toBe(130);
    });

    it("computes connection anchor points on four cardinal midpoints", () => {
      const el = { x: 100, y: 100, width: 200, height: 100 };
      const anchors = getElementAnchors(el);

      expect(anchors.top).toEqual({ x: 200, y: 100 });
      expect(anchors.bottom).toEqual({ x: 200, y: 200 });
      expect(anchors.left).toEqual({ x: 100, y: 150 });
      expect(anchors.right).toEqual({ x: 300, y: 150 });
    });

    it("detects anchor snapping accurately with hitTestAnchors", () => {
      const el = { id: "box-1", x: 100, y: 100, width: 200, height: 100, hidden: false, type: "process" };
      const snapTarget = { x: 202, y: 101 }; // near top anchor (200, 100)
      const hit = hitTestAnchors([el], snapTarget, 1);

      expect(hit).not.toBeNull();
      expect(hit?.elementId).toBe("box-1");
      expect(hit?.anchor).toBe("top");
    });
  });

  describe("3. Hit Testing & Resize Handles", () => {
    it("hit tests elements inside their bounding bounds", () => {
      const el = { type: "rectangle", x: 50, y: 50, width: 100, height: 100, strokeWidth: 2 };
      expect(hitTestElement(el, { x: 80, y: 80 }, 8)).toBe(true);
      expect(hitTestElement(el, { x: 20, y: 20 }, 8)).toBe(false);
    });

    it("hit tests 8 resize handles and rotation handle", () => {
      const el = { id: "shape-1", x: 100, y: 100, width: 100, height: 100 };
      const padding = 8;
      // NW handle at (100 - 8, 100 - 8) = (92, 92)
      expect(hitTestResizeHandle(el, { x: 92, y: 92 }, 1)).toBe("nw");
      // SE handle at (200 + 8, 200 + 8) = (208, 208)
      expect(hitTestResizeHandle(el, { x: 208, y: 208 }, 1)).toBe("se");
      // Rotation handle at top-center (150, 100 - 8 - 20) = (150, 72)
      expect(hitTestResizeHandle(el, { x: 150, y: 72 }, 1)).toBe("rot");
    });
  });

  describe("4. Layer Ordering & Selection Operations", () => {
    it("reorders elements with bringForward, sendBackward, bringToFront, sendToBack", () => {
      const el1 = { id: "el-1", type: "rectangle", x: 0, y: 0, width: 50, height: 50 };
      const el2 = { id: "el-2", type: "circle", x: 10, y: 10, width: 50, height: 50 };
      const el3 = { id: "el-3", type: "triangle", x: 20, y: 20, width: 50, height: 50 };

      let state = {
        ...initialState,
        elements: [el1, el2, el3],
        selectedIds: ["el-1"],
      };

      // Bring el-1 forward (from index 0 to 1)
      state = whiteboardReducer(state, bringForward());
      expect(state.elements.map((e) => e.id)).toEqual(["el-2", "el-1", "el-3"]);

      // Bring el-1 to front (from index 1 to 2)
      state = whiteboardReducer(state, bringToFront());
      expect(state.elements.map((e) => e.id)).toEqual(["el-2", "el-3", "el-1"]);

      // Send el-1 to back (from index 2 to 0)
      state = whiteboardReducer(state, sendToBack());
      expect(state.elements.map((e) => e.id)).toEqual(["el-1", "el-2", "el-3"]);

      // Send el-2 backward (from index 1 to 0)
      state = { ...state, selectedIds: ["el-2"] };
      state = whiteboardReducer(state, sendBackward());
      expect(state.elements.map((e) => e.id)).toEqual(["el-2", "el-1", "el-3"]);
    });

    it("duplicates selected elements with offset and preserves data", () => {
      const el = { id: "orig-1", type: "database", x: 100, y: 100, width: 80, height: 80, strokeColor: "#f59e0b" };
      let state = {
        ...initialState,
        elements: [el],
        selectedIds: ["orig-1"],
      };

      state = whiteboardReducer(state, duplicateSelected());
      expect(state.elements).toHaveLength(2);
      expect(state.elements[1].x).toBe(124);
      expect(state.elements[1].y).toBe(124);
      expect(state.elements[1].strokeColor).toBe("#f59e0b");
      expect(state.selectedIds[0]).toBe(state.elements[1].id);
    });

    it("locks and unlocks elements correctly", () => {
      const el = { id: "lock-el", type: "server", x: 50, y: 50, width: 100, height: 60, locked: false };
      let state = {
        ...initialState,
        elements: [el],
        selectedIds: ["lock-el"],
      };

      state = whiteboardReducer(state, toggleLockElement("lock-el"));
      expect(state.elements[0].locked).toBe(true);

      // Attempting to delete locked element should not delete it
      state = whiteboardReducer(state, deleteSelected());
      expect(state.elements).toHaveLength(1);

      // Unlock and delete
      state = whiteboardReducer(state, toggleLockElement("lock-el"));
      expect(state.elements[0].locked).toBe(false);
      state = whiteboardReducer(state, deleteSelected());
      expect(state.elements).toHaveLength(0);
    });

    it("groups and ungroups elements cleanly", () => {
      const el1 = { id: "g1", type: "rectangle", x: 10, y: 10, width: 50, height: 50 };
      const el2 = { id: "g2", type: "circle", x: 70, y: 10, width: 50, height: 50 };

      let state = {
        ...initialState,
        elements: [el1, el2],
        selectedIds: ["g1", "g2"],
      };

      state = whiteboardReducer(state, groupSelected());
      expect(state.elements[0].groupId).toBeTruthy();
      expect(state.elements[0].groupId).toBe(state.elements[1].groupId);

      state = whiteboardReducer(state, ungroupSelected());
      expect(state.elements[0].groupId).toBeNull();
      expect(state.elements[1].groupId).toBeNull();
    });
  });

  describe("5. Undo / Redo Stack Immutability", () => {
    it("accurately restores prior states through undo and redo", () => {
      let state = initialState;
      const el1 = { id: "1", type: "rectangle", x: 10, y: 10, width: 20, height: 20 };
      const el2 = { id: "2", type: "circle", x: 30, y: 30, width: 20, height: 20 };

      state = whiteboardReducer(state, addElement(el1));
      state = whiteboardReducer(state, addElement(el2));
      expect(state.elements).toHaveLength(2);

      // Undo once
      state = whiteboardReducer(state, undo());
      expect(state.elements).toHaveLength(1);
      expect(state.elements[0].id).toBe("1");

      // Undo twice
      state = whiteboardReducer(state, undo());
      expect(state.elements).toHaveLength(0);

      // Redo once
      state = whiteboardReducer(state, redo());
      expect(state.elements).toHaveLength(1);
      expect(state.elements[0].id).toBe("1");

      // Redo twice
      state = whiteboardReducer(state, redo());
      expect(state.elements).toHaveLength(2);
      expect(state.elements[1].id).toBe("2");
    });
  });

  describe("6. Export & Import Integrity", () => {
    it("computes overall canvas bounding box encompassing all elements", () => {
      const elements = [
        { type: "rectangle", x: 100, y: 100, width: 100, height: 50 },
        { type: "circle", x: 300, y: 200, width: 60, height: 60 },
      ];
      const box = getBoundingBox(elements);
      // Min X: 100 - 40 = 60, Max X: 360 + 40 = 400
      expect(box.minX).toBe(60);
      expect(box.maxX).toBe(400);
      expect(box.width).toBe(340);
    });

    it("exports to JSON and imports without loss of data", () => {
      const original = [
        {
          id: "test-code-1",
          type: "code-block",
          x: 100,
          y: 100,
          width: 300,
          height: 200,
          code: "console.log(42);",
          language: "javascript",
          lineNumbers: true,
          codeTheme: "dark",
        },
        {
          id: "test-conn-1",
          type: "connector-elbow",
          x: 400,
          y: 200,
          width: 100,
          height: 100,
          routing: "elbow",
          fromId: "test-code-1",
          fromAnchor: "right",
          toId: null,
          toAnchor: null,
        },
      ];

      const serialized = JSON.stringify({ app: "CodeLens", version: 2, elements: original });
      const imported = importFromJSON(serialized);

      expect(imported).toHaveLength(2);
      expect(imported[0].id).toBe("test-code-1");
      expect(imported[0].code).toBe("console.log(42);");
      expect(imported[1].routing).toBe("elbow");
      expect(imported[1].fromAnchor).toBe("right");
    });
  });

  describe("Developer Diagram Templates & Shape Labeling", () => {
    it("exports all required developer templates with generator functions", () => {
      expect(DIAGRAM_TEMPLATES.length).toBeGreaterThanOrEqual(4);
      for (const tpl of DIAGRAM_TEMPLATES) {
        expect(tpl.id).toBeDefined();
        expect(tpl.title).toBeDefined();
        expect(typeof tpl.generate).toBe("function");

        const elements = tpl.generate(200, 150);
        expect(Array.isArray(elements)).toBe(true);
        expect(elements.length).toBeGreaterThan(0);

        for (const el of elements) {
          expect(el.id).toBeDefined();
          expect(el.type).toBeDefined();
          expect(typeof el.x).toBe("number");
          expect(typeof el.y).toBe("number");
          expect(typeof el.width).toBe("number");
          expect(typeof el.height).toBe("number");
        }
      }
    });

    it("allows updating inner text label on shape elements via updateElement", () => {
      const serverEl = {
        id: "server-test-1",
        type: "server",
        x: 100,
        y: 100,
        width: 140,
        height: 100,
        text: "",
      };

      const s1 = whiteboardReducer(initialState, addElement(serverEl));
      expect(s1.elements[0].text).toBe("");

      const s2 = whiteboardReducer(
        s1,
        updateElement({ id: "server-test-1", updates: { text: "Auth Microservice" } })
      );
      expect(s2.elements[0].text).toBe("Auth Microservice");
    });
  });
});

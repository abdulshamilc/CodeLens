// src/tools/whiteboard/__tests__/dataStructureTemplates.test.js
// Unit tests for the 8 Data Structure Whiteboard Templates & Shortcut integration

import { describe, it, expect } from "vitest";
import {
  DATA_STRUCTURE_OPTIONS,
  generateDataStructureTemplate,
} from "../utils/dataStructureTemplates";

describe("Data Structure Whiteboard Templates", () => {
  it("provides all 8 required data structure templates", () => {
    const ids = DATA_STRUCTURE_OPTIONS.map((ds) => ds.id);
    expect(ids).toContain("linked-list");
    expect(ids).toContain("array");
    expect(ids).toContain("stack");
    expect(ids).toContain("queue");
    expect(ids).toContain("bst");
    expect(ids).toContain("trie");
    expect(ids).toContain("heap");
    expect(ids).toContain("graph");
    expect(DATA_STRUCTURE_OPTIONS.length).toBe(8);
  });

  const allTypes = [
    "linked-list",
    "array",
    "stack",
    "queue",
    "bst",
    "trie",
    "heap",
    "graph",
  ];

  allTypes.forEach((type) => {
    it(`generates valid whiteboard elements for "${type}"`, () => {
      const elements = generateDataStructureTemplate(type, 150, 150);
      expect(Array.isArray(elements)).toBe(true);
      expect(elements.length).toBeGreaterThan(0);

      // Verify every element has unique id, valid coordinates, and valid dimensions
      const idSet = new Set();
      elements.forEach((el) => {
        expect(typeof el.id).toBe("string");
        expect(el.id.length).toBeGreaterThan(0);
        expect(idSet.has(el.id)).toBe(false);
        idSet.add(el.id);

        expect(typeof el.x).toBe("number");
        expect(typeof el.y).toBe("number");
        expect(typeof el.width).toBe("number");
        expect(typeof el.height).toBe("number");
        expect(typeof el.type).toBe("string");
      });
    });
  });

  it("generates Linked List with HEAD, nodes, and NULL box", () => {
    const elements = generateDataStructureTemplate("linked-list", 100, 100);
    const hasHead = elements.some((el) => el.text && el.text.includes("HEAD"));
    const hasNull = elements.some((el) => el.text && el.text.includes("NULL"));
    const connectors = elements.filter((el) => el.type === "connector-straight");
    const dividers = elements.filter((el) => el.type === "line");

    expect(hasHead).toBe(true);
    expect(hasNull).toBe(true);
    expect(connectors.length).toBeGreaterThanOrEqual(3);
    expect(dividers.length).toBe(4);
  });

  it("generates Array with contiguous indexed cells", () => {
    const elements = generateDataStructureTemplate("array", 100, 100);
    const rectCells = elements.filter((el) => el.type === "rectangle");
    const indices = elements.filter((el) => el.text && el.text.startsWith("["));

    expect(rectCells.length).toBe(6);
    expect(indices.length).toBe(6);
  });

  it("generates Stack with TOP pointer", () => {
    const elements = generateDataStructureTemplate("stack", 100, 100);
    const hasTop = elements.some((el) => el.text && el.text.includes("TOP"));
    const slots = elements.filter((el) => el.type === "rounded-rect");

    expect(hasTop).toBe(true);
    expect(slots.length).toBe(4);
  });

  it("generates Queue with DEQUEUE front and ENQUEUE rear pointers", () => {
    const elements = generateDataStructureTemplate("queue", 100, 100);
    const hasDeq = elements.some((el) => el.text && el.text.includes("DEQUEUE"));
    const hasEnq = elements.some((el) => el.text && el.text.includes("ENQUEUE"));

    expect(hasDeq).toBe(true);
    expect(hasEnq).toBe(true);
  });

  it("generates Binary Search Tree with parent-child lines", () => {
    const elements = generateDataStructureTemplate("bst", 100, 100);
    const nodes = elements.filter((el) => el.type === "circle");
    const lines = elements.filter((el) => el.type === "line");

    expect(nodes.length).toBe(7);
    expect(lines.length).toBe(6);
  });

  it("generates Graph with vertices and weighted edges", () => {
    const elements = generateDataStructureTemplate("graph", 100, 100);
    const vertices = elements.filter((el) => el.type === "circle");
    const edges = elements.filter((el) => el.type === "line");

    expect(vertices.length).toBe(5);
    expect(edges.length).toBe(6);
  });
});

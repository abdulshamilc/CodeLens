// src/tools/dbv/__tests__/examplesLibrary.test.js
// Verification suite for the CodeLens DBV Examples Library:
// 1. Validates metadata schema, required fields, and unique IDs
// 2. Executes every example through the AST Interpreter and verifies steps <= limit
// 3. Verifies expected console outputs match interpreter execution

import { describe, it, expect } from "vitest";
import { EXAMPLES, CATEGORIES } from "../examples/index";
import { Interpreter } from "../engine/interpreter";

describe("Examples Library Metadata Schema", () => {
  it("contains at least 45 curated learning examples", () => {
    expect(EXAMPLES.length).toBeGreaterThanOrEqual(45);
  });

  it("ensures every example ID is unique and kebab-case", () => {
    const seenIds = new Set();
    const kebabRegex = /^[a-z0-9]+(-[a-z0-9]+)*$/;

    for (const ex of EXAMPLES) {
      expect(seenIds.has(ex.id), `Duplicate example id found: ${ex.id}`).toBe(false);
      seenIds.add(ex.id);
      expect(kebabRegex.test(ex.id), `Example ID is not kebab-case: ${ex.id}`).toBe(true);
    }
  });

  it("ensures all examples possess required learning metadata fields", () => {
    const validLevels = new Set(["beginner", "intermediate", "advanced"]);
    const validFocus = new Set(["memory", "callStack", "scopeChain", "eventLoop", "heap"]);

    for (const ex of EXAMPLES) {
      expect(typeof ex.id).toBe("string");
      expect(typeof ex.title).toBe("string");
      expect(typeof ex.category).toBe("string");
      expect(validLevels.has(ex.level), `Invalid level '${ex.level}' in ${ex.id}`).toBe(true);
      expect(typeof ex.description).toBe("string");
      expect(Array.isArray(ex.whatToWatch), `whatToWatch must be array in ${ex.id}`).toBe(true);
      expect(ex.whatToWatch.length).toBeGreaterThan(0);
      expect(typeof ex.code).toBe("string");
      expect(Array.isArray(ex.expectedOutput), `expectedOutput must be array in ${ex.id}`).toBe(true);
      expect(validFocus.has(ex.focus), `Invalid focus '${ex.focus}' in ${ex.id}`).toBe(true);
      expect(Array.isArray(ex.tags), `tags must be array in ${ex.id}`).toBe(true);
    }
  });
});

describe("Examples Interpreter Execution & Differential Accuracy", () => {
  for (const ex of EXAMPLES) {
    it(`runs example "${ex.id}" within step limits and matches expectedOutput`, () => {
      const maxSteps = ex.category === "Event Loop" ? 500 : 350;
      const interpreter = new Interpreter(maxSteps);
      
      const steps = interpreter.run(ex.code);
      expect(steps.length, `Step count exceeded limit in ${ex.id}`).toBeLessThanOrEqual(maxSteps);

      // Verify console outputs match
      const lastStep = steps[steps.length - 1];
      const actualOutput = (lastStep?.consoleOutput || []).map((c) => c.args.join(" "));

      expect(actualOutput).toEqual(ex.expectedOutput);
    });
  }
});

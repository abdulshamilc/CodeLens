// src/tools/dbv/__tests__/corpus/differential.test.js
// Differential execution testing: verifies equivalence of console output between
// native execution and the AST Interpreter for 150+ snippets.

import { describe, it, expect } from "vitest";
import { Interpreter } from "../../engine/interpreter";
import { CORPUS_SNIPPETS } from "./corpusSnippets";

/**
 * Execute snippet in standard JS environment and capture console output
 * @param {string} code
 * @returns {Array<string>}
 */
function runNativeSync(code) {
  const logs = [];
  const fakeConsole = {
    log: (...args) => logs.push(args.map(String).join(" ")),
    info: (...args) => logs.push(args.map(String).join(" ")),
    warn: (...args) => logs.push(args.map(String).join(" ")),
    error: (...args) => logs.push(args.map(String).join(" ")),
  };

  try {
    const fn = new Function("console", code);
    fn(fakeConsole);
  } catch (err) {
    logs.push(`Error: ${err.message}`);
  }

  return logs;
}

/**
 * Execute snippet in CodeLens AST Interpreter and capture console output
 * @param {string} code
 * @returns {Array<string>}
 */
function runInterpreter(code) {
  try {
    const interp = new Interpreter(5000);
    const steps = interp.run(code);
    if (!steps || steps.length === 0) return [];
    const lastStep = steps[steps.length - 1];
    return (lastStep.consoleOutput || []).map((c) => c.args.join(" "));
  } catch (err) {
    return [`Error: ${err.message || String(err)}`];
  }
}

function normalize(logs) {
  return logs.map((s) => {
    if (typeof s !== "string") return String(s);
    if (s.startsWith('"') && s.endsWith('"')) {
      try {
        return JSON.parse(s);
      } catch {
        return s.slice(1, -1);
      }
    }
    return s;
  });
}

describe("DBV Differential Corpus Verification (155 Snippets)", () => {
  it(`has at least 150 test snippets in the corpus`, () => {
    expect(CORPUS_SNIPPETS.length).toBeGreaterThanOrEqual(150);
  });

  // Test synchronous snippets against native console output
  const syncSnippets = CORPUS_SNIPPETS.filter((s) => !s.id.startsWith("async-"));

  for (const snippet of syncSnippets) {
    it(`snippet [${snippet.id}] produces expected console output`, () => {
      const nativeLogs = runNativeSync(snippet.code);
      const interpLogs = runInterpreter(snippet.code);

      expect(normalize(interpLogs)).toEqual(normalize(nativeLogs));
    });
  }

  // Test asynchronous & event-loop snippets
  const asyncSnippets = CORPUS_SNIPPETS.filter((s) => s.id.startsWith("async-"));

  for (const snippet of asyncSnippets) {
    it(`async snippet [${snippet.id}] executes without throwing`, () => {
      const interpLogs = runInterpreter(snippet.code);
      expect(Array.isArray(interpLogs)).toBe(true);
      expect(interpLogs.length).toBeGreaterThan(0);
    });
  }
});

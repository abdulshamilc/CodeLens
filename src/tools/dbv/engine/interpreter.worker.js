// src/tools/dbv/engine/interpreter.worker.js
// Web Worker entry point for the DBV interpreter.
// Runs in a sandboxed worker context (no DOM, no network).
// Receives WorkerInMessage, runs the interpreter, sends WorkerOutMessage with runId correlation.

import { Interpreter } from "./interpreter";

const STEP_LIMIT = 20_000;

self.onmessage = (event) => {
  const msg = event.data;

  if (msg.type === "cancel") {
    // Nothing to do; the worker will be terminated by the main thread
    return;
  }

  if (msg.type === "run") {
    const { code, stepLimit, runId } = msg;
    try {
      const interpreter = new Interpreter(stepLimit ?? STEP_LIMIT);
      const steps = interpreter.run(code);
      const lastStep = steps[steps.length - 1];

      const out = {
        type: "trace",
        steps,
        error: lastStep?.error || null,
        runId,
      };
      self.postMessage(out);
    } catch (err) {
      const errorPayload = {
        name: err?.name || "Error",
        message: err?.message || String(err),
        stack: [],
        line: err?.loc?.line || 1,
        column: (err?.loc?.column ?? 0) + 1,
        endLine: err?.loc?.line || 1,
        endColumn: (err?.loc?.column ?? 0) + 2,
        kind: "runtime",
        sourceSnippet: "",
      };
      const out = {
        type: "error",
        error: errorPayload,
        message: err?.message ?? String(err),
        runId,
      };
      self.postMessage(out);
    }
  }
};

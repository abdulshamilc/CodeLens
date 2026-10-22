// src/tools/dbv/engine/interpreter.worker.js
// Web Worker entry point for the DBV interpreter.
// Runs in a sandboxed worker context (no DOM, no network).
// Receives WorkerInMessage, runs the interpreter, sends WorkerOutMessage.

import { Interpreter } from "./interpreter";

const STEP_LIMIT = 20_000;

self.onmessage = (event) => {
  const msg = event.data;

  if (msg.type === "cancel") {
    // Nothing to do; the worker will be terminated by the main thread
    return;
  }

  if (msg.type === "run") {
    const { code, stepLimit } = msg;
    try {
      const interpreter = new Interpreter(stepLimit ?? STEP_LIMIT);
      const steps = interpreter.run(code);

      const out = { type: "trace", steps };
      self.postMessage(out);
    } catch (err) {
      const out = {
        type: "error",
        message: err?.message ?? String(err),
      };
      self.postMessage(out);
    }
  }
};

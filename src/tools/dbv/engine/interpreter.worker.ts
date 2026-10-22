// src/tools/dbv/engine/interpreter.worker.ts
// Web Worker entry point for the DBV interpreter.
// Runs in a sandboxed worker context (no DOM, no network).
// Receives WorkerInMessage, runs the interpreter, sends WorkerOutMessage.

import { Interpreter } from "./interpreter";
import type { WorkerInMessage, WorkerOutMessage } from "../types";

const STEP_LIMIT = 20_000;

self.onmessage = (event: MessageEvent<WorkerInMessage>) => {
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

      const out: WorkerOutMessage = { type: "trace", steps };
      // Post with transferable if steps is large (optimization hint)
      self.postMessage(out);
    } catch (err: any) {
      const out: WorkerOutMessage = {
        type: "error",
        message: err?.message ?? String(err),
      };
      self.postMessage(out);
    }
  }
};

// src/tools/dbv/engine/exampleLoader.js
// Atomic, race-free example loader for CodeLens DBV:
// 1. Cancel everything running (terminate active visualizer/native workers, bump monotonic runId, stop player & timers).
// 2. Put the example's code into the editor with ONE CodeMirror transaction:
//    view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: code }, selection: { anchor: 0 }, scrollIntoView: true })
//    (No editor re-creation. Code is fully editable by the user).
// 3. Run Visualize immediately on that editor text and land on Step 1 (creation phase).
//
// NOTE: Clicking an example does NOT mutate the URL (?example= or ?code=), does NOT save to
// IndexedDB/localStorage, does NOT require overwrite confirmation, and does NOT show undo toasts.

import { store } from "@/store";
import {
  bumpRunId,
  loadExampleReset,
  exampleLoadSuccess,
  exampleLoadError,
  setIsPlaying,
} from "@/store/slices/dbvSlice";
import { getEditorView } from "../editor/editorRegistry";
import { loadEditorSettings } from "../editor/editorSettings";
import { Interpreter } from "./interpreter";

let activeVisualizerWorker = null;
let activeNativeRunner = null;

/**
 * Register external runner instances for cancellation if launched from elsewhere.
 */
export function registerActiveRunner({ visualizerWorker = null, nativeRunner = null } = {}) {
  if (visualizerWorker) activeVisualizerWorker = visualizerWorker;
  if (nativeRunner) activeNativeRunner = nativeRunner;
}

/**
 * Cancel all running workers, tasks, and playback timers.
 */
export function cancelAllRunning() {
  if (activeVisualizerWorker) {
    try {
      activeVisualizerWorker.terminate();
    } catch {}
    activeVisualizerWorker = null;
  }
  if (activeNativeRunner) {
    try {
      activeNativeRunner.terminate();
    } catch {}
    activeNativeRunner = null;
  }
  store.dispatch(setIsPlaying(false));
}

/**
 * Atomically loads an example in 3 strictly sequenced steps:
 * 1. Cancel running + bump monotonic runId
 * 2. Put code into editor via single CodeMirror transaction
 * 3. Auto-visualize immediately to Step 1
 *
 * @param {Object} example
 * @param {Object} [options]
 * @param {boolean} [options.autoRun] - Override autoRun setting
 * @param {Function} [options.workerFactory] - Optional worker factory for testing
 * @returns {Promise<void>}
 */
export async function loadExample(example, options = {}) {
  if (!example || typeof example.code !== "string") return;

  // 1. CANCEL EVERYTHING RUNNING & BUMP MONOTONIC runId
  cancelAllRunning();
  store.dispatch(bumpRunId());
  const thisRunId = store.getState().dbv.runId;

  // Determine auto-run preference (defaults to true)
  const settings = loadEditorSettings();
  const shouldAutoRun =
    options.autoRun !== undefined
      ? Boolean(options.autoRun)
      : Boolean(settings.autoRunExamples ?? true);

  // 2. PUT EXAMPLE CODE INTO EDITOR WITH ONE CODEMIRROR TRANSACTION
  // First, dispatch single-transaction document replacement to active EditorView
  const view = getEditorView();
  if (view) {
    try {
      const docLength = view.state.doc.length;
      view.dispatch({
        changes: { from: 0, to: docLength, insert: example.code },
        selection: { anchor: 0 },
        scrollIntoView: true,
      });
    } catch (err) {
      console.warn("[loadExample] Failed to dispatch CodeMirror transaction:", err);
    }
  }

  // Next, reset all derived state in the store in one atomic update
  const exampleBreakpoints = Array.isArray(example.breakpoints) ? example.breakpoints : [];
  store.dispatch(
    loadExampleReset({
      id: example.id || null,
      code: example.code,
      breakpoints: exampleBreakpoints,
      autoRun: shouldAutoRun,
    })
  );

  // If autoRun is disabled, stop here
  if (!shouldAutoRun) {
    return;
  }

  // 3. RUN VISUALIZE IMMEDIATELY ON THAT TEXT & LAND ON STEP 1
  return new Promise((resolve) => {
    // If worker environment is not available or a custom workerFactory is supplied
    if (typeof Worker === "undefined" && !options.workerFactory) {
      try {
        const interpreter = new Interpreter(20000);
        const steps = interpreter.run(example.code);
        if (store.getState().dbv.runId === thisRunId) {
          const startStep = steps.length > 1 ? 1 : 0;
          store.dispatch(
            exampleLoadSuccess({
              runId: thisRunId,
              trace: steps,
              startStep,
              exampleId: example.id,
            })
          );
        }
      } catch (err) {
        if (store.getState().dbv.runId === thisRunId) {
          store.dispatch(
            exampleLoadError({
              runId: thisRunId,
              error: err?.message || String(err),
            })
          );
        }
      }
      resolve();
      return;
    }

    try {
      const worker = options.workerFactory
        ? options.workerFactory()
        : new Worker(new URL("./interpreter.worker.js", import.meta.url), { type: "module" });

      activeVisualizerWorker = worker;

      worker.onmessage = (event) => {
        const msg = event.data;
        // Verify this is still the active run
        if (store.getState().dbv.runId !== thisRunId || (msg.runId !== undefined && msg.runId !== thisRunId)) {
          // Stale response discarded!
          try {
            worker.terminate();
          } catch {}
          if (activeVisualizerWorker === worker) activeVisualizerWorker = null;
          resolve();
          return;
        }

        if (msg.type === "trace") {
          const steps = msg.steps || [];
          const startStep = steps.length > 1 ? 1 : 0;
          store.dispatch(
            exampleLoadSuccess({
              runId: thisRunId,
              trace: steps,
              startStep,
              exampleId: example.id,
            })
          );
        } else if (msg.type === "error" || msg.type === "parse-error") {
          store.dispatch(
            exampleLoadError({
              runId: thisRunId,
              error: msg.message || "Failed to analyze example",
            })
          );
        }

        try {
          worker.terminate();
        } catch {}
        if (activeVisualizerWorker === worker) activeVisualizerWorker = null;
        resolve();
      };

      worker.onerror = (err) => {
        if (store.getState().dbv.runId === thisRunId) {
          store.dispatch(
            exampleLoadError({
              runId: thisRunId,
              error: err?.message || "Visualizer Worker encountered an error",
            })
          );
        }
        try {
          worker.terminate();
        } catch {}
        if (activeVisualizerWorker === worker) activeVisualizerWorker = null;
        resolve();
      };

      worker.postMessage({
        type: "run",
        code: example.code,
        stepLimit: 20000,
        runId: thisRunId,
      });
    } catch (err) {
      if (store.getState().dbv.runId === thisRunId) {
        store.dispatch(
          exampleLoadError({
            runId: thisRunId,
            error: err?.message || "Failed to launch visualizer worker",
          })
        );
      }
      resolve();
    }
  });
}

export function getCurrentRunId() {
  return store.getState().dbv.runId;
}

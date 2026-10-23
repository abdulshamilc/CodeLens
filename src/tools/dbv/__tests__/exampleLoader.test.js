// src/tools/dbv/__tests__/exampleLoader.test.js
// Tests for atomic example loader, runId cancellation, and race condition suppression

import { describe, it, expect, beforeEach, vi } from "vitest";
import { store } from "@/store";
import { loadExample, getCurrentRunId, cancelAllRunning } from "../engine/exampleLoader";
import { setEditorView } from "../editor/editorRegistry";
import { saveEditorSettings, DEFAULT_EDITOR_SETTINGS } from "../editor/editorSettings";
import { setBreakpoints } from "@/store/slices/dbvSlice";

describe("Atomic loadExample Lifecycle & Race Guards", () => {
  beforeEach(() => {
    // Reset editor settings to defaults (autoRunExamples: true)
    saveEditorSettings({ ...DEFAULT_EDITOR_SETTINGS, autoRunExamples: true });
    // Reset breakpoints in store
    store.dispatch(setBreakpoints([]));
  });

  it("bumps monotonic runId with each loadExample invocation", async () => {
    const idBefore = getCurrentRunId();
    await loadExample({ id: "ex-1", code: "const a = 1;", breakpoints: [] });
    const idAfter = getCurrentRunId();
    expect(idAfter).toBeGreaterThan(idBefore);
  });

  it("resets all derived state and applies example breakpoints atomically", async () => {
    // Set dirty state first
    store.dispatch(setBreakpoints([99, 100]));

    const example = {
      id: "hoisting-var-test",
      title: "Var Hoisting Test",
      code: "var x = 10;\nconsole.log(x);",
      breakpoints: [2],
    };

    await loadExample(example);

    const state = store.getState().dbv;
    expect(state.code).toBe(example.code);
    expect(state.currentExampleId).toBe("hoisting-var-test");
    expect(state.breakpoints).toEqual([2]);
    expect(state.runError).toBeNull();
    expect(state.isPlaying).toBe(false);
    expect(state.trace.length).toBeGreaterThan(0);
    // Auto-run lands on step 1 (creation phase) if trace has more than 1 step
    expect(state.currentStep).toBe(1);
  });

  it("handles 20 rapid switches without race condition, ending strictly on the 20th example", async () => {
    const examples = Array.from({ length: 20 }, (_, i) => ({
      id: `ex-${i}`,
      title: `Example ${i}`,
      code: `var val_${i} = ${i * 10};\nconsole.log(val_${i});`,
      breakpoints: [i + 1],
    }));

    // Trigger all 20 loads simultaneously without awaiting in between
    const promises = examples.map((ex) => loadExample(ex));
    await Promise.all(promises);

    const finalState = store.getState().dbv;
    const lastExample = examples[19];

    // Editor code, currentExampleId, and breakpoints MUST belong exclusively to the 20th example
    expect(finalState.code).toBe(lastExample.code);
    expect(finalState.currentExampleId).toBe(lastExample.id);
    expect(finalState.breakpoints).toEqual(lastExample.breakpoints);
    expect(finalState.runError).toBeNull();
  });

  it("discards stale worker responses when runId does not match current runId", async () => {
    let staleWorkerPostMessage;
    let staleWorkerOnMessage;

    // Custom worker factory simulating delayed asynchronous worker
    const customWorkerFactory = () => {
      return {
        postMessage: vi.fn((msg) => {
          staleWorkerPostMessage = msg;
        }),
        terminate: vi.fn(),
        set onmessage(fn) {
          staleWorkerOnMessage = fn;
        },
      };
    };

    // 1. Start load of ex-slow
    const loadPromise1 = loadExample(
      { id: "ex-slow", code: "const slow = true;", breakpoints: [] },
      { workerFactory: customWorkerFactory }
    );

    // 2. Immediately start load of ex-fast which finishes immediately
    await loadExample(
      { id: "ex-fast", code: "const fast = true;", breakpoints: [] }
    );

    const fastState = store.getState().dbv;
    expect(fastState.currentExampleId).toBe("ex-fast");

    // 3. Stale worker from ex-slow now attempts to reply with old runId
    if (staleWorkerOnMessage) {
      staleWorkerOnMessage({
        data: {
          type: "trace",
          steps: [{ index: 0, explanation: "Stale step from slow example" }],
          runId: staleWorkerPostMessage?.runId, // Old runId!
        },
      });
    }

    // State MUST NOT have been overwritten by stale worker
    const stateAfterStaleReply = store.getState().dbv;
    expect(stateAfterStaleReply.currentExampleId).toBe("ex-fast");
    expect(stateAfterStaleReply.code).toBe("const fast = true;");
  });

  it("respects autoRunExamples = false setting: loads code and resets state without executing trace", async () => {
    // Disable auto-run
    saveEditorSettings({ ...DEFAULT_EDITOR_SETTINGS, autoRunExamples: false });

    const example = {
      id: "manual-run-only",
      title: "Manual Run Only",
      code: "let notRunYet = 42;",
      breakpoints: [],
    };

    await loadExample(example);

    const state = store.getState().dbv;
    expect(state.code).toBe(example.code);
    expect(state.currentExampleId).toBe("manual-run-only");
    // With auto-run false, trace remains empty and isRunning is false
    expect(state.trace).toEqual([]);
    expect(state.isRunning).toBe(false);
    expect(state.isExampleLoading).toBe(false);
  });

  it("dispatches atomic CodeMirror transaction to active EditorView without recreating editor", async () => {
    let dispatchedChanges = null;
    let dispatchedSelection = null;

    // Mock CodeMirror EditorView
    const mockView = {
      state: { doc: { length: 25 } },
      dispatch: vi.fn((tx) => {
        dispatchedChanges = tx.changes;
        dispatchedSelection = tx.selection;
      }),
    };

    setEditorView(mockView);

    const example = {
      id: "cm-transaction-test",
      title: "CM Transaction Test",
      code: "const transaction = 'atomic';",
      breakpoints: [],
    };

    await loadExample(example);

    expect(mockView.dispatch).toHaveBeenCalled();
    expect(dispatchedChanges).toEqual({
      from: 0,
      to: 25,
      insert: example.code,
    });
    expect(dispatchedSelection).toEqual({ anchor: 0 });

    // Clean up registry
    setEditorView(null);
  });
});

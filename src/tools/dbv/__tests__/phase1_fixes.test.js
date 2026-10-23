// src/tools/dbv/__tests__/phase1_fixes.test.js
// Verification suite for Phase 1 root cause fixes: S1, S2, S3, S5, S7, S8, S9, H1

import { describe, it, expect, beforeEach, vi } from "vitest";
import { store } from "@/store";
import {
  startRun,
  bumpRunId,
  setIsRunning,
  setTrace,
  setRunError,
  loadExampleReset,
} from "@/store/slices/dbvSlice";
import {
  loadExample,
  getCurrentRunId,
  cancelAllRunning,
  registerActiveRunner,
} from "../engine/exampleLoader";

describe("Phase 1 Root Cause Fixes Verification", () => {
  beforeEach(() => {
    cancelAllRunning();
  });

  it("S1 & S2: startRun atomically increments runId, sets isRunning: true, clears trace and error, and resets isExampleLoading", () => {
    // Dirty the state first
    store.dispatch(setTrace([{ stepNumber: 1, explanation: "test" }]));
    store.dispatch(setRunError("Old error"));
    store.dispatch(setIsRunning(false));

    const initialRunId = store.getState().dbv.runId;

    // Dispatch atomic startRun
    store.dispatch(startRun());

    const state = store.getState().dbv;
    expect(state.runId).toBe(initialRunId + 1);
    expect(state.isRunning).toBe(true);
    expect(state.isExampleLoading).toBe(false);
    expect(state.trace).toEqual([]);
    expect(state.currentStep).toBe(0);
    expect(state.isPlaying).toBe(false);
    expect(state.runError).toBeNull();
    expect(state.codeChangedSinceRun).toBe(false);
  });

  it("S5 & S8: cancelAllRunning cleanly terminates visualizerWorker, nativeRunner, and resets isPlaying", () => {
    const mockVisualizerWorker = {
      terminate: vi.fn(),
    };
    const mockNativeRunner = {
      terminate: vi.fn(),
    };

    registerActiveRunner({
      visualizerWorker: mockVisualizerWorker,
      nativeRunner: mockNativeRunner,
    });

    cancelAllRunning();

    expect(mockVisualizerWorker.terminate).toHaveBeenCalledTimes(1);
    expect(mockNativeRunner.terminate).toHaveBeenCalledTimes(1);
    expect(store.getState().dbv.isPlaying).toBe(false);

    // Second call should not throw or re-terminate cleaned-up references
    cancelAllRunning();
    expect(mockVisualizerWorker.terminate).toHaveBeenCalledTimes(1);
    expect(mockNativeRunner.terminate).toHaveBeenCalledTimes(1);
  });

  it("S7: exampleLoader uses Redux runId exclusively and never diverges from direct visualize/startRun invocations", async () => {
    // 1. Initial runId in store
    const startStoreRunId = store.getState().dbv.runId;
    expect(getCurrentRunId()).toBe(startStoreRunId);

    // 2. Direct startRun bumps Redux runId
    store.dispatch(startRun());
    expect(getCurrentRunId()).toBe(store.getState().dbv.runId);
    expect(getCurrentRunId()).toBe(startStoreRunId + 1);

    // 3. loadExample uses Redux runId
    await loadExample({
      id: "test-ex",
      code: "const x = 42;",
      breakpoints: [],
    });

    expect(getCurrentRunId()).toBe(store.getState().dbv.runId);
    expect(store.getState().dbv.runId).toBe(startStoreRunId + 2);

    // 4. Another manual bump directly in store
    store.dispatch(bumpRunId());
    expect(getCurrentRunId()).toBe(store.getState().dbv.runId);
    expect(getCurrentRunId()).toBe(startStoreRunId + 3);
  });

  it("S9: exampleLoadError resets isExampleLoading and isRunning when an error occurs", async () => {
    const mockFailingWorkerFactory = () => {
      return {
        postMessage: vi.fn(() => {
          throw new Error("Worker launch failed");
        }),
        terminate: vi.fn(),
        set onmessage(_fn) {},
        set onerror(_fn) {},
      };
    };

    await loadExample(
      { id: "fail-ex", code: "const invalid = 1;", breakpoints: [] },
      { workerFactory: mockFailingWorkerFactory }
    );

    const state = store.getState().dbv;
    expect(state.isExampleLoading).toBe(false);
    expect(state.isRunning).toBe(false);
    expect(state.runError).toBeTruthy();
  });
});

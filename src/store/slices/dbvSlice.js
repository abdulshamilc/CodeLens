// src/store/slices/dbvSlice.js
import { createSlice } from "@reduxjs/toolkit";
import { DEFAULT_CODE } from "@/tools/dbv/examples/examples.js";

export const dbvSlice = createSlice({
  name: "dbv",
  initialState: {
    code: DEFAULT_CODE,
    trace: [],
    currentStep: 0,
    isPlaying: false,
    playbackSpeed: 600,
    isRunning: false,
    runError: null,
    runId: 0, // Monotonic run identifier for race-free worker dispatch
    currentExampleId: null, // ID of currently loaded example
    isExampleLoading: false, // True while example worker is analyzing
    userEditedSinceLoad: false, // Tracked for UI state
    codeChangedSinceRun: false, // True if user edited code after run/visualize
    breakpoints: [], // Array of line numbers for serializable state
    diagnostics: [], // Array of lint/syntax problems
    jumpTarget: null, // { line: number, col: number, ts: number }
    panelsVisible: {
      callstack: true,
      memory: true,
      scopechain: true,
      console: true,
      explanation: true,
    },
  },
  reducers: {
    setCode: (state, action) => {
      const newCode = action.payload ?? "";
      if (state.code !== newCode) {
        state.code = newCode;
        state.codeChangedSinceRun = true;
        state.userEditedSinceLoad = true;
        // Clear stale runtime error markers when code is edited
        state.runError = null;
      }
    },
    setTrace: (state, action) => {
      state.trace = action.payload || [];
      state.currentStep = 0;
      state.isPlaying = false;
      state.codeChangedSinceRun = false;
    },
    setCurrentStep: (state, action) => {
      const step = action.payload;
      state.currentStep = Math.max(0, Math.min(step, state.trace.length - 1));
    },
    setIsPlaying: (state, action) => {
      state.isPlaying = Boolean(action.payload);
    },
    setPlaybackSpeed: (state, action) => {
      state.playbackSpeed = action.payload;
    },
    stepForward: (state) => {
      if (state.currentStep + 1 < state.trace.length) {
        state.currentStep += 1;
      } else {
        state.isPlaying = false;
      }
    },
    stepBack: (state) => {
      state.currentStep = Math.max(state.currentStep - 1, 0);
      state.isPlaying = false;
    },
    setIsRunning: (state, action) => {
      state.isRunning = Boolean(action.payload);
    },
    setRunError: (state, action) => {
      state.runError = action.payload;
    },
    bumpRunId: (state) => {
      state.runId += 1;
    },
    startRun: (state) => {
      state.runId += 1;
      state.trace = [];
      state.currentStep = 0;
      state.isPlaying = false;
      state.isRunning = true;
      state.isExampleLoading = false;
      state.runError = null;
      state.codeChangedSinceRun = false;
      state.diagnostics = [];
    },
    resetRunDerivedState: (state) => {
      state.runId += 1;
      state.trace = [];
      state.currentStep = 0;
      state.isPlaying = false;
      state.isRunning = true;
      state.isExampleLoading = false;
      state.runError = null;
      state.codeChangedSinceRun = false;
    },
    loadExampleReset: (state, action) => {
      const { id = null, code = "", breakpoints = [], autoRun = true } = action.payload || {};
      state.code = code;
      state.trace = [];
      state.currentStep = 0;
      state.isPlaying = false;
      state.isRunning = Boolean(autoRun);
      state.isExampleLoading = Boolean(autoRun);
      state.runError = null;
      state.diagnostics = [];
      state.breakpoints = breakpoints;
      state.currentExampleId = id;
      state.userEditedSinceLoad = false;
      state.codeChangedSinceRun = false;
    },
    exampleLoadSuccess: (state, action) => {
      const { runId, trace, startStep = 0, exampleId } = action.payload;
      if (runId !== state.runId) return; // Stale response discarded
      state.trace = trace || [];
      state.currentStep = Math.max(0, Math.min(startStep, (trace?.length || 1) - 1));
      state.isPlaying = false;
      state.isRunning = false;
      state.isExampleLoading = false;
      state.runError = null;
      state.codeChangedSinceRun = false;
      if (exampleId !== undefined) {
        state.currentExampleId = exampleId;
      }
    },
    exampleLoadError: (state, action) => {
      const { runId, error } = action.payload;
      if (runId !== state.runId) return; // Stale error discarded
      state.isExampleLoading = false;
      state.isRunning = false;
      state.runError = error;
    },
    setUserEditedSinceLoad: (state, action) => {
      state.userEditedSinceLoad = Boolean(action.payload);
    },
    setCodeChangedSinceRun: (state, action) => {
      state.codeChangedSinceRun = Boolean(action.payload);
    },
    toggleBreakpoint: (state, action) => {
      const line = action.payload;
      const idx = state.breakpoints.indexOf(line);
      if (idx !== -1) {
        state.breakpoints.splice(idx, 1);
      } else {
        state.breakpoints.push(line);
      }
    },
    setBreakpoints: (state, action) => {
      state.breakpoints = action.payload || [];
    },
    setDiagnostics: (state, action) => {
      state.diagnostics = action.payload || [];
    },
    jumpToPosition: (state, action) => {
      state.jumpTarget = action.payload;
    },
    togglePanel: (state, action) => {
      const id = action.payload;
      state.panelsVisible[id] = !state.panelsVisible[id];
    },
  },
});

export const {
  setCode,
  setTrace,
  setCurrentStep,
  setIsPlaying,
  setPlaybackSpeed,
  stepForward,
  stepBack,
  setIsRunning,
  setRunError,
  bumpRunId,
  startRun,
  resetRunDerivedState,
  loadExampleReset,
  exampleLoadSuccess,
  exampleLoadError,
  setUserEditedSinceLoad,
  setCodeChangedSinceRun,
  toggleBreakpoint,
  setBreakpoints,
  setDiagnostics,
  jumpToPosition,
  togglePanel,
} = dbvSlice.actions;

export default dbvSlice.reducer;

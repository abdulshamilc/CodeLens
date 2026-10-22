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
    breakpoints: [], // Array of line numbers for serializable state
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
      state.code = action.payload;
    },
    setTrace: (state, action) => {
      state.trace = action.payload || [];
      state.currentStep = 0;
      state.isPlaying = false;
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
  toggleBreakpoint,
  setBreakpoints,
  togglePanel,
} = dbvSlice.actions;

export default dbvSlice.reducer;

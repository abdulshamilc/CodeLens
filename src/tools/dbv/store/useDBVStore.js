// src/tools/dbv/store/useDBVStore.js
// Redux Toolkit facade hook for DBV state (code, trace, playback, breakpoints, panels, storage)

import { useMemo } from "react";
import { useSelector, useDispatch } from "react-redux";
import { get as idbGet, set as idbSet } from "idb-keyval";
import { store } from "@/store";
import {
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
} from "@/store/slices/dbvSlice";
import { STORAGE_KEYS, LEGACY_STORAGE_KEYS } from "@/shared/storage/keys";

const IDB_KEY = STORAGE_KEYS.DBV_LAST_SESSION;

async function saveSessionToIdb(code) {
  try {
    await idbSet(IDB_KEY, { code });
  } catch {
    // ignore
  }
}

async function loadSessionFromIdb(dispatch) {
  try {
    let data = await idbGet(IDB_KEY);
    if (!data?.code) {
      data = await idbGet(LEGACY_STORAGE_KEYS.DBV_LAST_SESSION);
    }
    if (data?.code) {
      dispatch(setCode(data.code));
    }
  } catch {
    // ignore
  }
}

function buildActions(dispatch) {
  return {
    setCode: (code) => dispatch(setCode(code)),
    setTrace: (trace) => dispatch(setTrace(trace)),
    setCurrentStep: (step) => dispatch(setCurrentStep(step)),
    setIsPlaying: (playing) => dispatch(setIsPlaying(playing)),
    setPlaybackSpeed: (speed) => dispatch(setPlaybackSpeed(speed)),
    stepForward: () => dispatch(stepForward()),
    stepBack: () => dispatch(stepBack()),
    setIsRunning: (running) => dispatch(setIsRunning(running)),
    setRunError: (error) => dispatch(setRunError(error)),
    toggleBreakpoint: (line) => dispatch(toggleBreakpoint(line)),
    setBreakpoints: (bps) => dispatch(setBreakpoints(bps)),
    togglePanel: (id) => dispatch(togglePanel(id)),
    saveSession: async () => {
      const code = store.getState().dbv.code;
      await saveSessionToIdb(code);
    },
    loadSession: async () => {
      await loadSessionFromIdb(dispatch);
    },
  };
}

export function useDBVStore(selector) {
  const dispatch = useDispatch();
  const dbv = useSelector((root) => root.dbv);

  const breakpointsSet = useMemo(() => new Set(dbv.breakpoints), [dbv.breakpoints]);

  const actions = useMemo(() => buildActions(dispatch), [dispatch]);

  const combined = useMemo(() => ({
    ...dbv,
    breakpoints: breakpointsSet,
    ...actions,
  }), [dbv, breakpointsSet, actions]);

  if (typeof selector === "function") {
    return selector(combined);
  }

  return combined;
}

useDBVStore.getState = () => {
  const dbv = store.getState().dbv;
  return {
    ...dbv,
    breakpoints: new Set(dbv.breakpoints),
    ...buildActions(store.dispatch),
  };
};

export default useDBVStore;

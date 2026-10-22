// src/tools/dbv/store/useDBVLayoutStore.js
// Redux Toolkit facade hook for DBV layout (presets, sizes, maximize, visibility)

import { useMemo } from "react";
import { useSelector, useDispatch } from "react-redux";
import { store } from "@/store";
import {
  DEFAULT_SIZES,
  setPreset,
  setSizes,
  toggleMaximize,
  restoreMaximized,
  toggleZoneVisibility,
  resetLayout,
} from "@/store/slices/dbvLayoutSlice";

export { DEFAULT_SIZES };

function buildActions(dispatch) {
  return {
    setPreset: (preset) => dispatch(setPreset(preset)),
    setSizes: (sizes) => dispatch(setSizes(sizes)),
    toggleMaximize: (zone) => dispatch(toggleMaximize(zone)),
    restoreMaximized: () => dispatch(restoreMaximized()),
    toggleZoneVisibility: (zone) => dispatch(toggleZoneVisibility(zone)),
    resetLayout: () => dispatch(resetLayout()),
  };
}

export function useDBVLayoutStore(selector) {
  const dispatch = useDispatch();
  const layout = useSelector((root) => root.dbvLayout);

  const actions = useMemo(() => buildActions(dispatch), [dispatch]);

  const combined = useMemo(() => ({
    ...layout,
    ...actions,
  }), [layout, actions]);

  if (typeof selector === "function") {
    return selector(combined);
  }

  return combined;
}

useDBVLayoutStore.getState = () => {
  const layout = store.getState().dbvLayout;
  return {
    ...layout,
    ...buildActions(store.dispatch),
  };
};

export default useDBVLayoutStore;

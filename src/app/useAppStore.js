// src/app/useAppStore.js
// Redux Toolkit facade hook for global app state (theme, shortcut modal)

import { useSelector, useDispatch } from "react-redux";
import { useCallback } from "react";
import { store } from "@/store";
import { toggleTheme as toggleThemeAction, setShortcutModalOpen as setShortcutModalOpenAction } from "@/store/slices/appSlice";

function buildAppActions(dispatch) {
  return {
    toggleTheme: () => dispatch(toggleThemeAction()),
    setShortcutModalOpen: (open) => dispatch(setShortcutModalOpenAction(open)),
  };
}

export function useAppStore(selector) {
  const dispatch = useDispatch();
  const appState = useSelector((root) => root.app);

  const actions = {
    toggleTheme: useCallback(() => dispatch(toggleThemeAction()), [dispatch]),
    setShortcutModalOpen: useCallback((open) => dispatch(setShortcutModalOpenAction(open)), [dispatch]),
  };

  const combined = {
    ...appState,
    ...actions,
  };

  if (typeof selector === "function") {
    return selector(combined);
  }

  return combined;
}

useAppStore.getState = () => {
  const appState = store.getState().app;
  return {
    ...appState,
    ...buildAppActions(store.dispatch),
  };
};

export default useAppStore;

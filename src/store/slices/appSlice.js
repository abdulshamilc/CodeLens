// src/store/slices/appSlice.js
import { createSlice } from "@reduxjs/toolkit";
import { getInitialTheme, applyTheme } from "@/app/theme";

const initialTheme = getInitialTheme();
applyTheme(initialTheme);

export const appSlice = createSlice({
  name: "app",
  initialState: {
    theme: initialTheme,
    shortcutModalOpen: false,
  },
  reducers: {
    setTheme: (state, action) => {
      state.theme = action.payload;
      applyTheme(action.payload);
    },
    toggleTheme: (state) => {
      const next = state.theme === "dark" ? "light" : "dark";
      state.theme = next;
      applyTheme(next);
    },
    setShortcutModalOpen: (state, action) => {
      state.shortcutModalOpen = Boolean(action.payload);
    },
  },
});

export const { setTheme, toggleTheme, setShortcutModalOpen } = appSlice.actions;
export default appSlice.reducer;

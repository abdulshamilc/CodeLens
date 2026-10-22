// src/app/AppShell.jsx
// Root application provider rendering Redux Provider and RouterProvider

import React from "react";
import { Provider } from "react-redux";
import { RouterProvider } from "react-router-dom";
import { store } from "@/store";
import { router } from "./router";

export function AppShell() {
  return (
    <Provider store={store}>
      <RouterProvider router={router} />
    </Provider>
  );
}

export default AppShell;

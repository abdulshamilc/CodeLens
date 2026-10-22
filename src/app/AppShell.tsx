// src/app/AppShell.tsx
// Root application provider rendering createBrowserRouter RouterProvider

import React from "react";
import { RouterProvider } from "react-router-dom";
import { router } from "./router";

export function AppShell() {
  return <RouterProvider router={router} />;
}

// src/main.tsx
import React from "react";
import ReactDOM from "react-dom/client";
import { AppShell } from "./app/AppShell";
import { migrateFromDevToolbox } from "./shared/storage/migrateFromDevToolbox";
import "./index.css";

// Execute safe, idempotent migration from DevToolbox before store hydration
migrateFromDevToolbox().catch((err) => {
  console.warn("CodeLens: migration check encountered an issue", err);
});

// Register PWA service worker
import { registerSW } from "virtual:pwa-register";
registerSW({
  onNeedRefresh() {
    console.info("CodeLens: new version available – refresh to update.");
  },
  onOfflineReady() {
    console.info("CodeLens: ready to work offline.");
  },
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AppShell />
  </React.StrictMode>
);

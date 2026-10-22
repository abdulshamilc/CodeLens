// src/app/router.tsx
// Modern createBrowserRouter configuration with lazy-loading, 404 handling,
// hash-redirect fallback, and root layout structure.
import React from "react";
import { createBrowserRouter, Outlet } from "react-router-dom";
import { TopBar } from "./TopBar";
import { ShortcutModal } from "./ShortcutModal";
import { HomePage } from "./HomePage";
import { NotFoundPage } from "./NotFoundPage";
import { useAppStore } from "./useAppStore";
// Redirect legacy hash URLs (/#/dbv -> /dbv, /#/whiteboard -> /whiteboard)
if (typeof window !== "undefined" && window.location.hash.startsWith("#/")) {
    const targetPath = window.location.hash.slice(1);
    window.history.replaceState(null, "", targetPath);
}
// Lazy-load DBV and Whiteboard tools
const DBVPage = React.lazy(() => import("../tools/dbv/DBVPage.jsx").then((m) => ({ default: m.DBVPage })));
const WhiteboardPage = React.lazy(() => import("../tools/whiteboard/WhiteboardPage.jsx").then((m) => ({
    default: m.WhiteboardPage,
})));
function LoadingFallback({ name }) {
    return (<div className="flex-1 flex items-center justify-center select-none" style={{ background: "rgb(var(--color-bg))" }}>
      <div className="text-center space-y-3">
        <div className="w-10 h-10 border-4 rounded-full animate-spin mx-auto" style={{
            borderColor: "rgba(var(--color-accent), 0.3)",
            borderTopColor: "rgb(var(--color-accent))",
        }}/>
        <p className="text-sm font-medium" style={{ color: "rgb(var(--color-text-muted))" }}>
          Loading {name}…
        </p>
      </div>
    </div>);
}
function GlobalKeyHandler() {
    const { toggleTheme, setShortcutModalOpen, shortcutModalOpen } = useAppStore();
    React.useEffect(() => {
        const handler = (e) => {
            const target = e.target;
            if (target.tagName === "INPUT" ||
                target.tagName === "TEXTAREA" ||
                target.isContentEditable)
                return;
            switch (e.key) {
                case "?":
                    setShortcutModalOpen(!shortcutModalOpen);
                    break;
                case "d":
                case "D":
                    if (!e.ctrlKey && !e.metaKey)
                        toggleTheme();
                    break;
            }
        };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [toggleTheme, setShortcutModalOpen, shortcutModalOpen]);
    return null;
}
function RootLayout() {
    return (<div className="flex flex-col h-full select-none" style={{ background: "rgb(var(--color-bg))", color: "rgb(var(--color-text))" }}>
      <GlobalKeyHandler />
      <TopBar />
      <main className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <Outlet />
      </main>
      <ShortcutModal />
    </div>);
}
export const router = createBrowserRouter([
    {
        path: "/",
        element: <RootLayout />,
        children: [
            {
                index: true,
                element: <HomePage />,
            },
            {
                path: "dbv",
                element: (<React.Suspense fallback={<LoadingFallback name="DBV"/>}>
            <DBVPage />
          </React.Suspense>),
            },
            {
                path: "whiteboard",
                element: (<React.Suspense fallback={<LoadingFallback name="Whiteboard"/>}>
            <WhiteboardPage />
          </React.Suspense>),
            },
            {
                path: "404",
                element: <NotFoundPage />,
            },
            {
                path: "*",
                element: <NotFoundPage />,
            },
        ],
    },
]);

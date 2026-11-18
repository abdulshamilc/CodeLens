// src/app/router.tsx
// Modern createBrowserRouter configuration with lazy-loading, 404 handling,
// hash-redirect fallback, and root layout structure.
import React from "react";
import { createBrowserRouter, Outlet, useNavigate, useRouteError } from "react-router-dom";
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
// Lazy-load DBV, Whiteboard, and DSV tools
const DBVPage = React.lazy(() => import("../tools/dbv/DBVPage.jsx").then((m) => ({ default: m.DBVPage })));
const WhiteboardPage = React.lazy(() => import("../tools/whiteboard/WhiteboardPage.jsx").then((m) => ({
    default: m.WhiteboardPage,
})));
const DSVPage = React.lazy(() => import("../tools/dsv/DSVPage.jsx"));
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
    const navigate = useNavigate();
    React.useEffect(() => {
        const handler = (e) => {
            const target = e.target;
            const activeEl = document.activeElement;
            if (
                target?.tagName === "INPUT" ||
                target?.tagName === "TEXTAREA" ||
                target?.isContentEditable ||
                target?.closest?.("input, textarea, [contenteditable='true']") ||
                activeEl?.tagName === "INPUT" ||
                activeEl?.tagName === "TEXTAREA" ||
                activeEl?.isContentEditable ||
                activeEl?.closest?.("input, textarea, [contenteditable='true']")
            ) {
                return;
            }
            // Main Tools Switcher Shortcuts (Ctrl+1/2/3, Alt+1/2/3, or Alt+D/B/S/H)
            if (e.ctrlKey || e.metaKey || e.altKey) {
                if (e.key === "1" || e.code === "Digit1") {
                    e.preventDefault();
                    navigate("/dbv");
                    return;
                }
                if (e.key === "2" || e.code === "Digit2") {
                    e.preventDefault();
                    navigate("/whiteboard");
                    return;
                }
                if (e.key === "3" || e.code === "Digit3") {
                    e.preventDefault();
                    navigate("/dsv");
                    return;
                }
                if (e.altKey && (e.key === "d" || e.key === "D")) {
                    e.preventDefault();
                    navigate("/dbv");
                    return;
                }
                if (e.altKey && (e.key === "b" || e.key === "B")) {
                    e.preventDefault();
                    navigate("/whiteboard");
                    return;
                }
                if (e.altKey && (e.key === "s" || e.key === "S")) {
                    e.preventDefault();
                    navigate("/dsv");
                    return;
                }
                if (e.altKey && (e.key === "h" || e.key === "H")) {
                    e.preventDefault();
                    navigate("/");
                    return;
                }
            }
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
    }, [toggleTheme, setShortcutModalOpen, shortcutModalOpen, navigate]);
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
function RouteErrorBoundary() {
    const error = useRouteError();
    console.error("CodeLens Application Error:", error);
    return (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center select-none" style={{ background: "rgb(var(--color-bg))", color: "rgb(var(--color-text))" }}>
            <div className="max-w-md w-full space-y-4 p-6 rounded-2xl border" style={{ background: "rgb(var(--color-surface))", borderColor: "rgb(var(--color-border))" }}>
                <div className="text-4xl">⚡</div>
                <h2 className="text-xl font-bold font-display" style={{ color: "rgb(var(--color-text))" }}>
                    Application Recovery
                </h2>
                <p className="text-xs font-mono p-3 rounded-lg bg-red-950/40 border border-red-800/50 text-red-300 break-words text-left">
                    {error?.message || String(error) || "An unexpected error occurred."}
                </p>
                <div className="flex items-center justify-center gap-3 pt-2">
                    <button
                        onClick={() => window.location.reload()}
                        className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition cursor-pointer"
                    >
                        Reload Application
                    </button>
                    <button
                        onClick={() => { window.location.href = "/"; }}
                        className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 transition cursor-pointer"
                    >
                        Return Home
                    </button>
                </div>
            </div>
        </div>
    );
}
export const router = createBrowserRouter([
    {
        path: "/",
        element: <RootLayout />,
        errorElement: <RouteErrorBoundary />,
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
                path: "dsv",
                element: (<React.Suspense fallback={<LoadingFallback name="DSV"/>}>
            <DSVPage />
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

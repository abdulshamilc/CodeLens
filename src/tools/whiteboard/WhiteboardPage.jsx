// src/tools/whiteboard/WhiteboardPage.tsx
// Complete full-screen infinite-canvas whiteboard application
import React, { useEffect, useState } from "react";
import { useWhiteboardStore } from "./store/useWhiteboardStore";
import { WhiteboardToolbar } from "./components/WhiteboardToolbar";
import { WhiteboardCanvas } from "./components/WhiteboardCanvas";
import { ExportModal } from "./components/ExportModal";
export function WhiteboardPage() {
    const { loadFromStorage, elements, viewport, resetViewport } = useWhiteboardStore();
    const [isExportOpen, setIsExportOpen] = useState(false);
    // Load saved canvas on initial mount & set title
    useEffect(() => {
        document.title = "Board – Whiteboard | CodeLens";
        loadFromStorage();
    }, [loadFromStorage]);
    return (<div className="relative w-full h-full flex flex-col overflow-hidden bg-slate-900">
      {/* Floating top toolbar */}
      <WhiteboardToolbar onOpenExport={() => setIsExportOpen(true)}/>

      {/* Main infinite canvas */}
      <main className="flex-1 w-full h-full relative" aria-label="Whiteboard drawing surface">
        <WhiteboardCanvas />
      </main>

      {/* Export modal */}
      <ExportModal isOpen={isExportOpen} onClose={() => setIsExportOpen(false)}/>

      {/* Bottom status bar */}
      <footer aria-label="Whiteboard Status" className="absolute bottom-3 left-3 z-10 flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs backdrop-blur-md select-none pointer-events-auto" style={{
            background: "rgba(15, 23, 42, 0.75)",
            border: "1px solid rgba(148, 163, 184, 0.2)",
            color: "rgb(148, 163, 184)",
        }}>
        <span>
          {elements.length} element{elements.length !== 1 ? "s" : ""}
        </span>
        <span className="text-slate-600">•</span>
        <button onClick={resetViewport} title="Click to reset zoom and pan" className="hover:text-indigo-400 transition-colors cursor-pointer">
          {Math.round(viewport.zoom * 100)}%
        </button>
        <span className="text-slate-600">•</span>
        <span className="hidden sm:inline">Space+drag or middle-click to pan • Wheel to zoom</span>
      </footer>
    </div>);
}

// src/tools/whiteboard/WhiteboardPage.jsx
// Complete full-screen infinite-canvas whiteboard & developer diagramming application

import React, { useEffect, useState } from "react";
import { useWhiteboardStore } from "./store/useWhiteboardStore";
import { WhiteboardToolbar } from "./components/WhiteboardToolbar";
import { WhiteboardCanvas } from "./components/WhiteboardCanvas";
import { PropertiesPanel } from "./components/PropertiesPanel";
import { LayersPanel } from "./components/LayersPanel";
import { ExportModal } from "./components/ExportModal";
import { DataStructureModal } from "./components/DataStructureModal";
import { generateDataStructureTemplate } from "./utils/dataStructureTemplates";

export function WhiteboardPage() {
  const {
    loadFromStorage,
    elements,
    viewport,
    resetViewport,
    tool,
    setTool,
    addElement,
    setSelectedIds,
  } = useWhiteboardStore();
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isDataStructureOpen, setIsDataStructureOpen] = useState(false);

  // Load saved canvas on initial mount & set title
  useEffect(() => {
    document.title = "Board – Whiteboard & Diagramming | CodeLens";
    loadFromStorage();
  }, [loadFromStorage]);

  // Keyboard shortcuts for quick tool selection: Select (S/V), Hand (H), Pencil/Pen (P), Eraser (E), Text (T)
  useEffect(() => {
    const handleKeyDown = (e) => {
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

      if (isExportOpen || isDataStructureOpen) {
        return;
      }

      if (!e.ctrlKey && !e.metaKey && !e.altKey) {
        const key = e.key.toLowerCase();
        switch (key) {
          case "s":
          case "v":
            e.preventDefault();
            setTool("select");
            break;
          case "h":
            e.preventDefault();
            setTool("hand");
            break;
          case "p":
            e.preventDefault();
            setTool("pen");
            break;
          case "e":
            e.preventDefault();
            setTool("eraser");
            break;
          case "t":
            e.preventDefault();
            setTool("text");
            break;
          default:
            break;
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [setTool, isExportOpen, isDataStructureOpen]);

  // Insert chosen Data Structure template at center of current canvas viewport
  const handleInsertDataStructure = (structureId) => {
    const originX = Math.round((-viewport.x + window.innerWidth / 2 - 180) / viewport.zoom);
    const originY = Math.round((-viewport.y + window.innerHeight / 2 - 130) / viewport.zoom);
    const elementsToInsert = generateDataStructureTemplate(structureId, originX, originY);
    elementsToInsert.forEach((el) => {
      addElement(el);
    });
    setSelectedIds(elementsToInsert.map((e) => e.id));
    setIsDataStructureOpen(false);
  };

  return (
    <div className="relative w-full h-full flex flex-col overflow-hidden bg-slate-900">
      {/* Floating top toolbar */}
      <WhiteboardToolbar
        onOpenExport={() => setIsExportOpen(true)}
        onOpenDataStructure={() => setIsDataStructureOpen(true)}
      />

      {/* Floating Layers Panel */}
      <LayersPanel />

      {/* Floating Properties Panel */}
      <PropertiesPanel />

      {/* Main infinite canvas */}
      <main className="flex-1 w-full h-full relative" aria-label="Whiteboard drawing surface">
        <WhiteboardCanvas />
      </main>

      {/* Export modal */}
      <ExportModal isOpen={isExportOpen} onClose={() => setIsExportOpen(false)} />

      {/* Data Structure templates modal */}
      <DataStructureModal
        isOpen={isDataStructureOpen}
        onClose={() => setIsDataStructureOpen(false)}
        onSelectStructure={handleInsertDataStructure}
      />

      {/* Bottom status bar */}
      <footer
        aria-label="Whiteboard Status"
        className="absolute bottom-3 left-3 z-10 flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs backdrop-blur-md select-none pointer-events-auto"
        style={{
          background: "rgba(15, 23, 42, 0.75)",
          border: "1px solid rgba(148, 163, 184, 0.2)",
          color: "rgb(148, 163, 184)",
        }}
      >
        <span>
          {elements.length} element{elements.length !== 1 ? "s" : ""}
        </span>
        <span className="text-slate-600">•</span>
        <button
          onClick={resetViewport}
          title="Click to reset zoom and pan"
          className="hover:text-indigo-400 transition-colors cursor-pointer"
        >
          {Math.round(viewport.zoom * 100)}%
        </button>
        <span className="text-slate-600">•</span>
        <span className="hidden sm:inline">
          Shortcuts: S (Select), H (Hand), P (Pencil), E (Eraser), T (Text)
        </span>
      </footer>
    </div>
  );
}

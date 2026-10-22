// src/tools/whiteboard/components/WhiteboardCanvas.tsx
// High-performance HTML5 Canvas with infinite pan, zoom, element creation, and selection

import React, { useEffect, useRef, useState, useCallback } from "react";
import { useWhiteboardStore } from "../store/useWhiteboardStore";
import { useAppStore } from "../../../app/useAppStore";
import type { WhiteboardElement, Point } from "../types";
import {
  screenToCanvas,
  drawGrid,
  renderElement,
  drawSelectionBox,
  hitTestElement,
} from "../utils/render";

let _elId = 0;
const nextElId = () => `el-${Date.now()}-${++_elId}`;

export function WhiteboardCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const { theme } = useAppStore();
  const isDark = theme === "dark";

  const {
    elements,
    selectedIds,
    tool,
    strokeColor,
    fillColor,
    strokeWidth,
    strokeStyle,
    fontSize,
    viewport,
    setViewport,
    setSelectedIds,
    addElement,
    deleteSelected,
    moveSelected,
  } = useWhiteboardStore();

  // Active interaction states
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [activeDraft, setActiveDraft] = useState<WhiteboardElement | null>(null);
  const [textInput, setTextInput] = useState<{
    visible: boolean;
    x: number;
    y: number;
    screenX: number;
    screenY: number;
    text: string;
  } | null>(null);

  const isPanningRef = useRef(false);
  const isDraggingRef = useRef(false);
  const panStartRef = useRef<Point>({ x: 0, y: 0 });
  const dragStartRef = useRef<Point>({ x: 0, y: 0 });
  const lastMousePosRef = useRef<Point>({ x: 0, y: 0 });

  // ── Render Loop ────────────────────────────────────────────────────────────
  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const dpr = window.devicePixelRatio || 1;

    ctx.save();
    ctx.clearRect(0, 0, width, height);

    // Fill background
    ctx.fillStyle = isDark ? "#0f172a" : "#f8fafc";
    ctx.fillRect(0, 0, width, height);

    // Draw background grid
    drawGrid(ctx, width / dpr, height / dpr, viewport, isDark);

    // Apply viewport transform
    ctx.scale(dpr, dpr);
    ctx.translate(viewport.x, viewport.y);
    ctx.scale(viewport.zoom, viewport.zoom);

    // Draw all committed elements
    for (const el of elements) {
      renderElement(ctx, el);
    }

    // Draw current active draft element
    if (activeDraft) {
      renderElement(ctx, activeDraft);
    }

    // Draw selection boxes
    if (tool === "select" && selectedIds.length > 0) {
      for (const id of selectedIds) {
        const el = elements.find((e) => e.id === id);
        if (el) drawSelectionBox(ctx, el, viewport);
      }
    }

    ctx.restore();
  }, [elements, activeDraft, selectedIds, tool, viewport, isDark]);

  useEffect(() => {
    let animationId: number;
    const render = () => {
      redraw();
      animationId = requestAnimationFrame(render);
    };
    animationId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animationId);
  }, [redraw]);

  // ── Resize canvas to fill container ───────────────────────────────────────
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const handleResize = () => {
      const rect = container.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      redraw();
    };

    handleResize();
    const ro = new ResizeObserver(handleResize);
    ro.observe(container);
    return () => ro.disconnect();
  }, [redraw]);

  // ── Global Keyboard Shortcuts ─────────────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (textInput?.visible) return;
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;

      if (e.code === "Space") {
        setIsSpacePressed(true);
      }

      if (e.key === "Delete" || e.key === "Backspace") {
        deleteSelected();
      }

      if ((e.ctrlKey || e.metaKey) && (e.key === "z" || e.key === "Z")) {
        e.preventDefault();
        if (e.shiftKey) {
          useWhiteboardStore.getState().redo();
        } else {
          useWhiteboardStore.getState().undo();
        }
      }

      // Tool shortcuts
      switch (e.key.toLowerCase()) {
        case "v": useWhiteboardStore.getState().setTool("select"); break;
        case "h": useWhiteboardStore.getState().setTool("hand"); break;
        case "p": useWhiteboardStore.getState().setTool("pen"); break;
        case "r": useWhiteboardStore.getState().setTool("rectangle"); break;
        case "o": useWhiteboardStore.getState().setTool("ellipse"); break;
        case "a": useWhiteboardStore.getState().setTool("arrow"); break;
        case "l": useWhiteboardStore.getState().setTool("line"); break;
        case "t": useWhiteboardStore.getState().setTool("text"); break;
        case "e": useWhiteboardStore.getState().setTool("eraser"); break;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") setIsSpacePressed(false);
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [deleteSelected, textInput]);

  // ── Wheel Zoom and Pan ────────────────────────────────────────────────────
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;

    if (e.ctrlKey || e.metaKey) {
      // Zoom centered at cursor
      const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
      const newZoom = Math.max(0.1, Math.min(5, Number((viewport.zoom * zoomFactor).toFixed(3))));

      const worldX = (screenX - viewport.x) / viewport.zoom;
      const worldY = (screenY - viewport.y) / viewport.zoom;

      setViewport({
        zoom: newZoom,
        x: screenX - worldX * newZoom,
        y: screenY - worldY * newZoom,
      });
    } else {
      // Pan
      setViewport((prev) => ({
        ...prev,
        x: prev.x - e.deltaX,
        y: prev.y - e.deltaY,
      }));
    }
  };

  // ── Pointer Down ──────────────────────────────────────────────────────────
  const handlePointerDown = (e: React.PointerEvent) => {
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    const world = screenToCanvas(screenX, screenY, viewport);

    lastMousePosRef.current = { x: screenX, y: screenY };

    // Space or middle-click or Hand tool initiates panning
    if (isSpacePressed || e.button === 1 || tool === "hand") {
      isPanningRef.current = true;
      panStartRef.current = { x: screenX - viewport.x, y: screenY - viewport.y };
      return;
    }

    if (e.button !== 0) return; // Only primary button for drawing/selecting

    // Text tool
    if (tool === "text") {
      setTextInput({
        visible: true,
        x: world.x,
        y: world.y,
        screenX,
        screenY,
        text: "",
      });
      return;
    }

    // Eraser tool
    if (tool === "eraser") {
      const hit = elements.slice().reverse().find((el) => hitTestElement(el, world, 12 / viewport.zoom));
      if (hit) {
        useWhiteboardStore.getState().setElements(elements.filter((el) => el.id !== hit.id));
      }
      return;
    }

    // Select tool
    if (tool === "select") {
      const hit = elements.slice().reverse().find((el) => hitTestElement(el, world, 8 / viewport.zoom));
      if (hit) {
        setSelectedIds([hit.id]);
        isDraggingRef.current = true;
        dragStartRef.current = world;
      } else {
        setSelectedIds([]);
      }
      return;
    }

    // Start drawing a shape or freehand pen
    const baseElement: WhiteboardElement = {
      id: nextElId(),
      type: tool as any,
      x: world.x,
      y: world.y,
      width: 0,
      height: 0,
      strokeColor,
      fillColor,
      strokeWidth,
      strokeStyle,
      fontSize,
      points: tool === "pen" ? [world] : undefined,
    };

    setActiveDraft(baseElement);
  };

  // ── Pointer Move ──────────────────────────────────────────────────────────
  const handlePointerMove = (e: React.PointerEvent) => {
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    const world = screenToCanvas(screenX, screenY, viewport);

    // Pan handling
    if (isPanningRef.current) {
      setViewport((prev) => ({
        ...prev,
        x: screenX - panStartRef.current.x,
        y: screenY - panStartRef.current.y,
      }));
      return;
    }

    // Move selected elements
    if (isDraggingRef.current && tool === "select") {
      const dx = world.x - dragStartRef.current.x;
      const dy = world.y - dragStartRef.current.y;
      moveSelected(dx, dy);
      dragStartRef.current = world;
      return;
    }

    // Eraser while dragging
    if (tool === "eraser" && e.buttons === 1) {
      const hit = elements.slice().reverse().find((el) => hitTestElement(el, world, 12 / viewport.zoom));
      if (hit) {
        useWhiteboardStore.getState().setElements(elements.filter((el) => el.id !== hit.id));
      }
      return;
    }

    // Update active drawing draft
    if (!activeDraft) return;

    if (activeDraft.type === "pen") {
      setActiveDraft({
        ...activeDraft,
        points: [...(activeDraft.points || []), world],
      });
    } else {
      setActiveDraft({
        ...activeDraft,
        width: world.x - activeDraft.x,
        height: world.y - activeDraft.y,
      });
    }
  };

  // ── Pointer Up ────────────────────────────────────────────────────────────
  const handlePointerUp = () => {
    isPanningRef.current = false;
    isDraggingRef.current = false;

    if (activeDraft) {
      const isTiny =
        activeDraft.type !== "pen" &&
        Math.abs(activeDraft.width) < 3 &&
        Math.abs(activeDraft.height) < 3;

      if (!isTiny) {
        // Normalize negative width/height for rectangles and ellipses
        let finalEl = activeDraft;
        if (finalEl.type === "rectangle" || finalEl.type === "ellipse") {
          const x = finalEl.width < 0 ? finalEl.x + finalEl.width : finalEl.x;
          const y = finalEl.height < 0 ? finalEl.y + finalEl.height : finalEl.y;
          const width = Math.abs(finalEl.width);
          const height = Math.abs(finalEl.height);
          finalEl = { ...finalEl, x, y, width, height };
        }
        addElement(finalEl);
      }
      setActiveDraft(null);
    }
  };

  // ── Commit Text Input ─────────────────────────────────────────────────────
  const commitText = () => {
    if (!textInput || !textInput.text.trim()) {
      setTextInput(null);
      return;
    }
    const textElement: WhiteboardElement = {
      id: nextElId(),
      type: "text",
      x: textInput.x,
      y: textInput.y,
      width: Math.max(60, textInput.text.length * 10),
      height: (fontSize ?? 18) * 1.4,
      strokeColor,
      fillColor: "transparent",
      strokeWidth,
      strokeStyle: "solid",
      text: textInput.text,
      fontSize,
    };
    addElement(textElement);
    setTextInput(null);
  };

  // Cursor style
  let cursorClass = "cursor-crosshair";
  if (isSpacePressed || tool === "hand") cursorClass = "cursor-grab active:cursor-grabbing";
  else if (tool === "select") cursorClass = "cursor-default";
  else if (tool === "eraser") cursorClass = "cursor-pointer";

  return (
    <div
      ref={containerRef}
      onWheel={handleWheel}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      className={`relative w-full h-full overflow-hidden select-none ${cursorClass}`}
      style={{ touchAction: "none" }}
    >
      <canvas ref={canvasRef} className="absolute inset-0 block w-full h-full" />

      {/* Floating inline text editor */}
      {textInput?.visible && (
        <textarea
          autoFocus
          value={textInput.text}
          onChange={(e) => setTextInput({ ...textInput, text: e.target.value })}
          onBlur={commitText}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              commitText();
            } else if (e.key === "Escape") {
              setTextInput(null);
            }
          }}
          placeholder="Type something..."
          className="absolute z-30 p-2 rounded border border-indigo-500 bg-slate-900/90 text-white font-sans text-sm resize-none outline-none shadow-2xl"
          style={{
            left: `${textInput.screenX}px`,
            top: `${textInput.screenY}px`,
            minWidth: "160px",
            minHeight: "44px",
            color: strokeColor,
            fontSize: `${fontSize}px`,
          }}
        />
      )}
    </div>
  );
}

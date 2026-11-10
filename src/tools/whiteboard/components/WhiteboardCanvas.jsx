// src/tools/whiteboard/components/WhiteboardCanvas.jsx
// High-performance HTML5 Canvas with infinite pan, zoom, element creation, 8-handle transform,
// in-place multiline text editor, code block editor, and ZERO keyboard shortcut interference.

import React, { useEffect, useRef, useState, useCallback } from "react";
import { useWhiteboardStore } from "../store/useWhiteboardStore";
import {
  screenToCanvas,
  canvasToScreen,
  drawGrid,
  renderElement,
  drawSelectionBox,
  drawAnchorPoints,
  hitTestElement,
  hitTestResizeHandle,
  hitTestAnchors,
  getElementBounds,
} from "../utils/render";

let _elId = 0;
const nextElId = (prefix = "el") => `${prefix}-${Date.now()}-${++_elId}`;

const SNAP_STEP = 24;
function snapVal(val, enabled) {
  if (!enabled) return val;
  return Math.round(val / SNAP_STEP) * SNAP_STEP;
}

export function WhiteboardCanvas() {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  const {
    elements,
    selectedIds,
    tool,
    strokeColor,
    fillColor,
    strokeWidth,
    strokeStyle,
    opacity,
    fontSize,
    fontFamily,
    fontWeight,
    fontStyle,
    textDecoration,
    textAlign,
    textBgColor,
    codeLanguage,
    codeLineNumbers,
    codeTheme,
    canvasBackground,
    gridVisible,
    snapToGrid,
    viewport,
    setViewport,
    setSelectedIds,
    addElement,
    updateElement,
    moveSelected,
    resizeElement,
    rotateElement,
    setElements,
  } = useWhiteboardStore();

  // Active interaction states
  const [activeDraft, setActiveDraft] = useState(null);
  const [textEditor, setTextEditor] = useState(null); // { visible, elId, isNew, x, y, screenX, screenY, width, height, text, ... }
  const [codeEditor, setCodeEditor] = useState(null); // { visible, elId, code, language, ... }
  const [marqueeBox, setMarqueeBox] = useState(null); // { startX, startY, currentX, currentY }
  const [hoverCursor, setHoverCursor] = useState(null);

  const isPanningRef = useRef(false);
  const isDraggingRef = useRef(false);
  const isResizingRef = useRef(false);
  const isRotatingRef = useRef(false);
  const activeHandleRef = useRef(null);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const panStartRef = useRef({ x: 0, y: 0 });
  const resizeInitRef = useRef({ x: 0, y: 0, width: 0, height: 0, points: null });

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

    // Canvas background
    let bgFill = "#0f172a"; // dark slate
    if (canvasBackground === "black") bgFill = "#020617";
    else if (canvasBackground === "light") bgFill = "#f8fafc";
    ctx.fillStyle = bgFill;
    ctx.fillRect(0, 0, width, height);

    // Dotted / Lined Grid
    if (gridVisible) {
      drawGrid(ctx, width / dpr, height / dpr, viewport, canvasBackground);
    }

    // Apply viewport transform
    ctx.scale(dpr, dpr);
    ctx.translate(viewport.x, viewport.y);
    ctx.scale(viewport.zoom, viewport.zoom);

    // Render committed elements
    for (const el of elements) {
      renderElement(ctx, el, elements);
    }

    // Render active draft element
    if (activeDraft) {
      renderElement(ctx, activeDraft, elements);
    }

    // Render anchor points if connector tool is active
    if (tool.startsWith("connector") || activeDraft?.type?.startsWith("connector")) {
      for (const el of elements) {
        if (!el.hidden && !el.type.startsWith("connector")) {
          drawAnchorPoints(ctx, el, viewport);
        }
      }
    }

    // Render selection boxes & transform handles
    if (tool === "select" && selectedIds.length > 0) {
      for (const id of selectedIds) {
        const el = elements.find((e) => e.id === id);
        if (el && !el.hidden) {
          drawSelectionBox(ctx, el, viewport);
        }
      }
    }

    // Render marquee selection box
    if (marqueeBox) {
      ctx.save();
      ctx.strokeStyle = "#38bdf8";
      ctx.lineWidth = 1 / viewport.zoom;
      ctx.setLineDash([4 / viewport.zoom, 4 / viewport.zoom]);
      ctx.fillStyle = "rgba(56, 189, 248, 0.12)";
      const mx = Math.min(marqueeBox.startX, marqueeBox.currentX);
      const my = Math.min(marqueeBox.startY, marqueeBox.currentY);
      const mw = Math.abs(marqueeBox.currentX - marqueeBox.startX);
      const mh = Math.abs(marqueeBox.currentY - marqueeBox.startY);
      ctx.fillRect(mx, my, mw, mh);
      ctx.strokeRect(mx, my, mw, mh);
      ctx.restore();
    }

    ctx.restore();
  }, [elements, activeDraft, selectedIds, tool, viewport, canvasBackground, gridVisible, marqueeBox]);

  useEffect(() => {
    let animationId;
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

  // ── Wheel Zoom and Pan ────────────────────────────────────────────────────
  const handleWheel = (e) => {
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
  const handlePointerDown = (e) => {
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    const world = screenToCanvas(screenX, screenY, viewport);

    // Pan with Middle Mouse Button or Hand tool
    if (e.button === 1 || tool === "hand") {
      isPanningRef.current = true;
      panStartRef.current = { x: screenX - viewport.x, y: screenY - viewport.y };
      return;
    }

    if (e.button !== 0) return; // Only left button for drawing/selecting

    // ── Text Tool Click: Open In-Place Text Editor ──────────────────────────
    if (tool === "text") {
      setTextEditor({
        visible: true,
        isNew: true,
        x: snapVal(world.x, snapToGrid),
        y: snapVal(world.y, snapToGrid),
        screenX,
        screenY,
        text: "",
        fontSize,
        fontFamily,
        color: strokeColor,
      });
      return;
    }

    // ── Eraser Tool: Click or drag to erase elements ────────────────────────
    if (tool === "eraser") {
      const hit = elements.slice().reverse().find((el) => hitTestElement(el, world, 12 / viewport.zoom));
      if (hit && !hit.locked) {
        setElements(elements.filter((el) => el.id !== hit.id));
      }
      return;
    }

    // ── Select Tool ─────────────────────────────────────────────────────────
    if (tool === "select") {
      // 1. Check if clicked on a resize or rotation handle of currently selected element
      if (selectedIds.length === 1) {
        const selectedEl = elements.find((e) => e.id === selectedIds[0]);
        if (selectedEl && !selectedEl.locked) {
          const handle = hitTestResizeHandle(selectedEl, world, viewport.zoom);
          if (handle) {
            if (handle === "rot") {
              isRotatingRef.current = true;
            } else {
              isResizingRef.current = true;
              activeHandleRef.current = handle;
            }
            dragStartRef.current = world;
            resizeInitRef.current = {
              x: selectedEl.x,
              y: selectedEl.y,
              width: selectedEl.width,
              height: selectedEl.height,
              points: selectedEl.points ? [...selectedEl.points] : null,
            };
            return;
          }
        }
      }

      // 2. Hit test existing elements
      const hit = elements.slice().reverse().find((el) => hitTestElement(el, world, 8 / viewport.zoom));
      if (hit) {
        if (e.shiftKey) {
          // Multi-selection toggle
          const next = selectedIds.includes(hit.id)
            ? selectedIds.filter((id) => id !== hit.id)
            : [...selectedIds, hit.id];
          setSelectedIds(next);
        } else if (!selectedIds.includes(hit.id)) {
          setSelectedIds([hit.id]);
        }
        isDraggingRef.current = true;
        dragStartRef.current = world;
      } else {
        // Clicked empty canvas -> Start marquee selection box
        setSelectedIds([]);
        setMarqueeBox({
          startX: world.x,
          startY: world.y,
          currentX: world.x,
          currentY: world.y,
        });
      }
      return;
    }

    // ── Connector Tools ─────────────────────────────────────────────────────
    if (tool.startsWith("connector")) {
      const anchorHit = hitTestAnchors(elements, world, viewport.zoom);
      const startX = anchorHit ? anchorHit.point.x : snapVal(world.x, snapToGrid);
      const startY = anchorHit ? anchorHit.point.y : snapVal(world.y, snapToGrid);

      setActiveDraft({
        id: nextElId("conn"),
        type: tool,
        x: startX,
        y: startY,
        width: 0,
        height: 0,
        strokeColor,
        fillColor: "transparent",
        strokeWidth: Math.max(2, strokeWidth),
        strokeStyle,
        opacity,
        routing: tool.replace("connector-", ""),
        fromId: anchorHit ? anchorHit.elementId : null,
        fromAnchor: anchorHit ? anchorHit.anchor : null,
        startArrow: false,
        endArrow: true,
      });
      return;
    }

    // ── Shapes and Developer Blocks Creation ────────────────────────────────
    let defaultW = 120;
    let defaultH = 80;
    let initialText = undefined;
    let codeStr = undefined;

    if (tool === "database") {
      defaultW = 100;
      defaultH = 120;
    } else if (tool === "server") {
      defaultW = 140;
      defaultH = 90;
    } else if (tool === "client") {
      defaultW = 110;
      defaultH = 90;
    } else if (tool === "api-endpoint") {
      defaultW = 140;
      defaultH = 44;
      initialText = "GET /api/v1";
    } else if (tool === "component") {
      defaultW = 120;
      defaultH = 80;
    } else if (tool === "backend-service") {
      defaultW = 130;
      defaultH = 80;
    } else if (tool === "auth") {
      defaultW = 90;
      defaultH = 100;
    } else if (tool === "cloud") {
      defaultW = 140;
      defaultH = 90;
    } else if (tool === "terminal") {
      defaultW = 240;
      defaultH = 140;
    } else if (tool === "browser") {
      defaultW = 260;
      defaultH = 160;
    } else if (tool === "network") {
      defaultW = 90;
      defaultH = 90;
    } else if (tool === "flowchart-start") {
      defaultW = 120;
      defaultH = 50;
      initialText = "Start / End";
    } else if (tool === "process") {
      defaultW = 130;
      defaultH = 60;
      initialText = "Process Step";
    } else if (tool === "decision") {
      defaultW = 110;
      defaultH = 70;
      initialText = "Condition?";
    } else if (tool === "input-output") {
      defaultW = 130;
      defaultH = 60;
      initialText = "Input / Output";
    } else if (tool === "code-block") {
      defaultW = 260;
      defaultH = 160;
      codeStr = `function executeTask() {\n  const status = "ok";\n  return status;\n}`;
    }

    const startX = snapVal(world.x, snapToGrid);
    const startY = snapVal(world.y, snapToGrid);

    const baseElement = {
      id: nextElId(),
      type: tool,
      x: startX,
      y: startY,
      width: defaultW,
      height: defaultH,
      strokeColor,
      fillColor: fillColor || "transparent",
      strokeWidth,
      strokeStyle,
      opacity,
      fontSize,
      fontFamily,
      fontWeight,
      fontStyle,
      textDecoration,
      textAlign,
      textBgColor,
      text: initialText,
      code: codeStr,
      language: codeLanguage,
      lineNumbers: codeLineNumbers,
      codeTheme,
      points: (tool === "pen" || tool === "brush") ? [world] : undefined,
    };

    setActiveDraft(baseElement);
  };

  // ── Pointer Move ──────────────────────────────────────────────────────────
  const handlePointerMove = (e) => {
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

    // Marquee selection handling
    if (marqueeBox) {
      setMarqueeBox((prev) => ({ ...prev, currentX: world.x, currentY: world.y }));
      const minX = Math.min(marqueeBox.startX, world.x);
      const maxX = Math.max(marqueeBox.startX, world.x);
      const minY = Math.min(marqueeBox.startY, world.y);
      const maxY = Math.max(marqueeBox.startY, world.y);

      const enclosed = elements.filter((el) => {
        const b = getElementBounds(el);
        return (
          b.x + b.width >= minX &&
          b.x <= maxX &&
          b.y + b.height >= minY &&
          b.y <= maxY
        );
      });
      setSelectedIds(enclosed.map((e) => e.id));
      return;
    }

    // Resize handling
    if (isResizingRef.current && selectedIds.length === 1) {
      const selectedEl = elements.find((el) => el.id === selectedIds[0]);
      if (selectedEl && !selectedEl.locked) {
        const handle = activeHandleRef.current;
        const init = resizeInitRef.current;
        let newX = init.x;
        let newY = init.y;
        let newW = init.width;
        let newH = init.height;

        const dx = world.x - dragStartRef.current.x;
        const dy = world.y - dragStartRef.current.y;

        if (handle.includes("e")) newW = init.width + dx;
        if (handle.includes("s")) newH = init.height + dy;
        if (handle.includes("w")) {
          newX = init.x + dx;
          newW = init.width - dx;
        }
        if (handle.includes("n")) {
          newY = init.y + dy;
          newH = init.height - dy;
        }

        if (snapToGrid) {
          newX = snapVal(newX, true);
          newY = snapVal(newY, true);
          newW = snapVal(newW, true);
          newH = snapVal(newH, true);
        }

        resizeElement({
          id: selectedEl.id,
          x: newX,
          y: newY,
          width: Math.max(16, newW),
          height: Math.max(16, newH),
        });
      }
      return;
    }

    // Rotation handling
    if (isRotatingRef.current && selectedIds.length === 1) {
      const selectedEl = elements.find((el) => el.id === selectedIds[0]);
      if (selectedEl && !selectedEl.locked) {
        const b = getElementBounds(selectedEl);
        const cx = b.x + b.width / 2;
        const cy = b.y + b.height / 2;
        const angle = Math.atan2(world.y - cy, world.x - cx) * (180 / Math.PI) + 90;
        rotateElement({ id: selectedEl.id, rotation: Math.round(angle) });
      }
      return;
    }

    // Drag move selected elements
    if (isDraggingRef.current && tool === "select") {
      let dx = world.x - dragStartRef.current.x;
      let dy = world.y - dragStartRef.current.y;
      if (snapToGrid) {
        dx = snapVal(dx, true);
        dy = snapVal(dy, true);
      }
      if (dx !== 0 || dy !== 0) {
        moveSelected(dx, dy);
        dragStartRef.current = world;
      }
      return;
    }

    // Eraser while dragging
    if (tool === "eraser" && e.buttons === 1) {
      const hit = elements.slice().reverse().find((el) => hitTestElement(el, world, 12 / viewport.zoom));
      if (hit && !hit.locked) {
        setElements(elements.filter((el) => el.id !== hit.id));
      }
      return;
    }

    // Update active drawing draft
    if (!activeDraft) {
      if (tool === "select") {
        if (selectedIds.length === 1) {
          const selectedEl = elements.find((el) => el.id === selectedIds[0]);
          if (selectedEl && !selectedEl.locked) {
            const handleHit = hitTestResizeHandle(selectedEl, world, viewport.zoom);
            if (handleHit) {
              if (handleHit === "nw" || handleHit === "se") {
                setHoverCursor("nwse-resize");
                return;
              }
              if (handleHit === "ne" || handleHit === "sw") {
                setHoverCursor("nesw-resize");
                return;
              }
              if (handleHit === "n" || handleHit === "s") {
                setHoverCursor("ns-resize");
                return;
              }
              if (handleHit === "e" || handleHit === "w") {
                setHoverCursor("ew-resize");
                return;
              }
              if (handleHit === "rot") {
                setHoverCursor("crosshair");
                return;
              }
            }
          }
        }

        const hoveredEl = elements.slice().reverse().find((el) => hitTestElement(el, world, 6 / viewport.zoom));
        if (hoveredEl) {
          setHoverCursor("move");
        } else if (hoverCursor) {
          setHoverCursor(null);
        }
      } else if (hoverCursor) {
        setHoverCursor(null);
      }
      return;
    }

    if (activeDraft.type === "pen" || activeDraft.type === "brush") {
      setActiveDraft({
        ...activeDraft,
        points: [...(activeDraft.points || []), world],
      });
    } else if (activeDraft.type.startsWith("connector")) {
      const anchorHit = hitTestAnchors(elements, world, viewport.zoom);
      const targetX = anchorHit ? anchorHit.point.x : snapVal(world.x, snapToGrid);
      const targetY = anchorHit ? anchorHit.point.y : snapVal(world.y, snapToGrid);
      setActiveDraft({
        ...activeDraft,
        width: targetX - activeDraft.x,
        height: targetY - activeDraft.y,
        toId: anchorHit ? anchorHit.elementId : null,
        toAnchor: anchorHit ? anchorHit.anchor : null,
      });
    } else {
      setActiveDraft({
        ...activeDraft,
        width: snapVal(world.x - activeDraft.x, snapToGrid),
        height: snapVal(world.y - activeDraft.y, snapToGrid),
      });
    }
  };

  // ── Pointer Up ────────────────────────────────────────────────────────────
  const handlePointerUp = () => {
    isPanningRef.current = false;
    isDraggingRef.current = false;
    isResizingRef.current = false;
    isRotatingRef.current = false;
    activeHandleRef.current = null;
    setMarqueeBox(null);
    setHoverCursor(null);

    if (activeDraft) {
      const isFreehand = activeDraft.type === "pen" || activeDraft.type === "brush";
      const isTiny = !isFreehand && Math.abs(activeDraft.width) < 4 && Math.abs(activeDraft.height) < 4;

      if (!isTiny) {
        let finalEl = activeDraft;
        // Normalize shapes with negative width / height (except connectors/lines)
        if (
          finalEl.type !== "line" &&
          finalEl.type !== "arrow" &&
          finalEl.type !== "double-arrow" &&
          !finalEl.type.startsWith("connector") &&
          !isFreehand
        ) {
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

  // ── Double-Click to Edit Text or Code Block ────────────────────────────────
  const handleDoubleClick = (e) => {
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    const world = screenToCanvas(screenX, screenY, viewport);

    const hit = elements.slice().reverse().find((el) => hitTestElement(el, world, 8 / viewport.zoom));
    if (!hit) return;

    if (hit.type === "text") {
      const screenPos = canvasToScreen(hit.x, hit.y, viewport);
      setTextEditor({
        visible: true,
        isNew: false,
        elId: hit.id,
        x: hit.x,
        y: hit.y,
        screenX: screenPos.x,
        screenY: screenPos.y,
        text: hit.text || "",
        fontSize: hit.fontSize ?? 16,
        fontFamily: hit.fontFamily ?? '"Inter", sans-serif',
        color: hit.strokeColor ?? "#ffffff",
      });
    } else if (hit.type === "code-block") {
      setCodeEditor({
        visible: true,
        elId: hit.id,
        code: hit.code || "",
        language: hit.language || "javascript",
      });
    } else if (hit.text !== undefined) {
      // Shape with text label
      const newLabel = window.prompt("Edit label text:", hit.text || "");
      if (newLabel !== null) {
        updateElement(hit.id, { text: newLabel });
      }
    }
  };

  // ── Commit Text Input ─────────────────────────────────────────────────────
  const commitText = () => {
    if (!textEditor) return;
    const trimmed = textEditor.text.trim();

    if (trimmed.length > 0) {
      if (textEditor.isNew) {
        const newEl = {
          id: nextElId("txt"),
          type: "text",
          x: textEditor.x,
          y: textEditor.y,
          width: Math.max(80, trimmed.length * 10),
          height: (textEditor.fontSize ?? 16) * 1.5,
          strokeColor: textEditor.color || strokeColor,
          fillColor: "transparent",
          strokeWidth: 0,
          strokeStyle: "solid",
          opacity,
          text: textEditor.text,
          fontSize: textEditor.fontSize ?? fontSize,
          fontFamily: textEditor.fontFamily ?? fontFamily,
          fontWeight,
          fontStyle,
          textDecoration,
          textAlign,
          textBgColor,
        };
        addElement(newEl);
      } else if (textEditor.elId) {
        updateElement(textEditor.elId, { text: textEditor.text });
      }
    } else if (!textEditor.isNew && textEditor.elId) {
      // If user erased text completely, remove orphan
      setElements(elements.filter((el) => el.id !== textEditor.elId));
    }

    setTextEditor(null);
  };

  // ── Commit Code Block Edit ────────────────────────────────────────────────
  const commitCode = () => {
    if (!codeEditor || !codeEditor.elId) {
      setCodeEditor(null);
      return;
    }
    updateElement(codeEditor.elId, {
      code: codeEditor.code,
      language: codeEditor.language,
    });
    setCodeEditor(null);
  };

  // Dynamic Cursor
  let cursorClass = "cursor-crosshair";
  if (tool === "hand") cursorClass = "cursor-grab active:cursor-grabbing";
  else if (tool === "select") cursorClass = "cursor-default";
  else if (tool === "eraser") cursorClass = "cursor-pointer";

  return (
    <div
      ref={containerRef}
      onWheel={handleWheel}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={() => setHoverCursor(null)}
      onDoubleClick={handleDoubleClick}
      className={`relative w-full h-full overflow-hidden select-none ${cursorClass}`}
      style={{ touchAction: "none", cursor: hoverCursor || undefined }}
    >
      <canvas ref={canvasRef} className="absolute inset-0 block w-full h-full" />

      {/* ── Floating Inline Multiline Text Editor ── */}
      {textEditor?.visible && (
        <textarea
          autoFocus
          value={textEditor.text}
          onChange={(e) => setTextEditor({ ...textEditor, text: e.target.value })}
          onBlur={commitText}
          onKeyDown={(e) => {
            // Enter creates newline; Shift+Enter creates newline; Escape cancels
            if (e.key === "Escape") {
              setTextEditor(null);
            }
          }}
          placeholder="Type explanation or label..."
          className="absolute z-40 p-2.5 rounded-lg border border-indigo-500 bg-slate-900/95 text-white font-sans text-sm resize shadow-2xl outline-none"
          style={{
            left: `${textEditor.screenX}px`,
            top: `${textEditor.screenY}px`,
            minWidth: "180px",
            minHeight: "56px",
            color: textEditor.color || strokeColor,
            fontSize: `${textEditor.fontSize || 16}px`,
            fontFamily: textEditor.fontFamily || '"Inter", sans-serif',
          }}
        />
      )}

      {/* ── Modal Code Editor for Dedicated Code Blocks ── */}
      {codeEditor?.visible && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
          style={{ background: "rgba(0, 0, 0, 0.7)" }}
        >
          <div
            className="w-full max-w-lg rounded-2xl p-5 shadow-2xl border border-slate-700 bg-slate-900 flex flex-col gap-4 text-white"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm flex items-center gap-2 text-indigo-300">
                <span>💻</span> Edit Code Block
              </h3>
              <button
                onClick={() => setCodeEditor(null)}
                className="text-slate-400 hover:text-white cursor-pointer font-bold"
              >
                ✕
              </button>
            </div>

            <textarea
              autoFocus
              value={codeEditor.code}
              onChange={(e) => setCodeEditor({ ...codeEditor, code: e.target.value })}
              className="w-full h-64 p-3 rounded-xl bg-slate-950 font-mono text-xs text-indigo-200 border border-slate-800 outline-none focus:border-indigo-500 leading-relaxed resize-none"
            />

            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setCodeEditor(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={commitCode}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold cursor-pointer"
              >
                Save Code
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

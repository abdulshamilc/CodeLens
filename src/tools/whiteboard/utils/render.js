// src/tools/whiteboard/utils/render.js
// Canvas 2D rendering engine and hit-detection utilities

/**
 * @typedef {import('./types').WhiteboardElement} WhiteboardElement
 * @typedef {import('./types').Viewport} Viewport
 * @typedef {import('./types').Point} Point
 */

/**
 * Convert screen coordinate to canvas coordinate
 * @param {number} screenX
 * @param {number} screenY
 * @param {Viewport} viewport
 * @returns {Point}
 */
export function screenToCanvas(screenX, screenY, viewport) {
  return {
    x: (screenX - viewport.x) / viewport.zoom,
    y: (screenY - viewport.y) / viewport.zoom,
  };
}

/**
 * Convert canvas coordinate to screen coordinate
 * @param {number} canvasX
 * @param {number} canvasY
 * @param {Viewport} viewport
 * @returns {Point}
 */
export function canvasToScreen(canvasX, canvasY, viewport) {
  return {
    x: canvasX * viewport.zoom + viewport.x,
    y: canvasY * viewport.zoom + viewport.y,
  };
}

/**
 * Draws dotted background grid
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} width
 * @param {number} height
 * @param {Viewport} viewport
 * @param {boolean} isDark
 */
export function drawGrid(ctx, width, height, viewport, isDark) {
  const gridSize = 24 * viewport.zoom;
  if (gridSize < 8) return;

  const offsetX = ((viewport.x % gridSize) + gridSize) % gridSize;
  const offsetY = ((viewport.y % gridSize) + gridSize) % gridSize;

  ctx.save();
  ctx.fillStyle = isDark ? "rgba(148, 163, 184, 0.15)" : "rgba(100, 116, 139, 0.2)";

  for (let x = offsetX; x < width; x += gridSize) {
    for (let y = offsetY; y < height; y += gridSize) {
      ctx.beginPath();
      ctx.arc(x, y, 1 * Math.min(viewport.zoom, 1.5), 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

/**
 * Draws arrowhead at endpoint of line/arrow
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} fromX
 * @param {number} fromY
 * @param {number} toX
 * @param {number} toY
 * @param {number} [size=14]
 */
export function drawArrowHead(ctx, fromX, fromY, toX, toY, size = 14) {
  const angle = Math.atan2(toY - fromY, toX - fromX);
  ctx.save();
  ctx.fillStyle = ctx.strokeStyle;
  ctx.beginPath();
  ctx.moveTo(toX, toY);
  ctx.lineTo(
    toX - size * Math.cos(angle - Math.PI / 6),
    toY - size * Math.sin(angle - Math.PI / 6)
  );
  ctx.lineTo(
    toX - size * Math.cos(angle + Math.PI / 6),
    toY - size * Math.sin(angle + Math.PI / 6)
  );
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/**
 * Renders a single whiteboard element on canvas context
 * @param {CanvasRenderingContext2D} ctx
 * @param {WhiteboardElement} el
 */
export function renderElement(ctx, el) {
  ctx.save();
  ctx.strokeStyle = el.strokeColor;
  ctx.fillStyle = el.fillColor;
  ctx.lineWidth = el.strokeWidth;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  if (el.strokeStyle === "dashed") {
    ctx.setLineDash([8, 6]);
  } else {
    ctx.setLineDash([]);
  }

  switch (el.type) {
    case "pen": {
      if (!el.points || el.points.length === 0) break;
      ctx.beginPath();
      ctx.moveTo(el.points[0].x, el.points[0].y);
      for (let i = 1; i < el.points.length; i++) {
        const p = el.points[i];
        ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();
      break;
    }

    case "rectangle": {
      ctx.beginPath();
      const radius = 6;
      ctx.roundRect(el.x, el.y, el.width, el.height, radius);
      if (el.fillColor && el.fillColor !== "transparent") ctx.fill();
      ctx.stroke();
      break;
    }

    case "ellipse": {
      ctx.beginPath();
      const cx = el.x + el.width / 2;
      const cy = el.y + el.height / 2;
      const rx = Math.max(1, Math.abs(el.width) / 2);
      const ry = Math.max(1, Math.abs(el.height) / 2);
      ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
      if (el.fillColor && el.fillColor !== "transparent") ctx.fill();
      ctx.stroke();
      break;
    }

    case "line": {
      ctx.beginPath();
      ctx.moveTo(el.x, el.y);
      ctx.lineTo(el.x + el.width, el.y + el.height);
      ctx.stroke();
      break;
    }

    case "arrow": {
      ctx.beginPath();
      const endX = el.x + el.width;
      const endY = el.y + el.height;
      ctx.moveTo(el.x, el.y);
      ctx.lineTo(endX, endY);
      ctx.stroke();
      drawArrowHead(ctx, el.x, el.y, endX, endY, Math.max(10, el.strokeWidth * 4));
      break;
    }

    case "text": {
      if (!el.text) break;
      ctx.font = `${el.fontSize ?? 18}px ${el.fontFamily ?? '"Inter", sans-serif'}`;
      ctx.fillStyle = el.strokeColor;
      ctx.textBaseline = "top";
      const lines = el.text.split("\n");
      const lineHeight = (el.fontSize ?? 18) * 1.3;
      lines.forEach((line, i) => {
        ctx.fillText(line, el.x, el.y + i * lineHeight);
      });
      break;
    }
  }

  ctx.restore();
}

/**
 * Draws selection bounding box with corner handles
 * @param {CanvasRenderingContext2D} ctx
 * @param {WhiteboardElement} el
 * @param {Viewport} viewport
 */
export function drawSelectionBox(ctx, el, viewport) {
  let minX = el.x;
  let minY = el.y;
  let maxX = el.x + el.width;
  let maxY = el.y + el.height;

  if (el.points && el.points.length > 0) {
    minX = Math.min(...el.points.map((p) => p.x));
    minY = Math.min(...el.points.map((p) => p.y));
    maxX = Math.max(...el.points.map((p) => p.x));
    maxY = Math.max(...el.points.map((p) => p.y));
  } else {
    minX = Math.min(el.x, el.x + el.width);
    maxX = Math.max(el.x, el.x + el.width);
    minY = Math.min(el.y, el.y + el.height);
    maxY = Math.max(el.y, el.y + el.height);
  }

  const padding = 6 / viewport.zoom;
  ctx.save();
  ctx.strokeStyle = "#6366f1";
  ctx.lineWidth = 1.5 / viewport.zoom;
  ctx.setLineDash([4 / viewport.zoom, 4 / viewport.zoom]);
  ctx.strokeRect(
    minX - padding,
    minY - padding,
    maxX - minX + padding * 2,
    maxY - minY + padding * 2
  );

  const handleSize = 6 / viewport.zoom;
  ctx.fillStyle = "#ffffff";
  ctx.setLineDash([]);
  const corners = [
    [minX - padding, minY - padding],
    [maxX + padding, minY - padding],
    [minX - padding, maxY + padding],
    [maxX + padding, maxY + padding],
  ];
  for (const [cx, cy] of corners) {
    ctx.fillRect(cx - handleSize / 2, cy - handleSize / 2, handleSize, handleSize);
    ctx.strokeRect(cx - handleSize / 2, cy - handleSize / 2, handleSize, handleSize);
  }

  ctx.restore();
}

/**
 * Hit test an element with tolerance
 * @param {WhiteboardElement} el
 * @param {Point} p
 * @param {number} [tolerance=8]
 * @returns {boolean}
 */
export function hitTestElement(el, p, tolerance = 8) {
  if (el.type === "pen" && el.points) {
    for (const pt of el.points) {
      const dist = Math.hypot(pt.x - p.x, pt.y - p.y);
      if (dist <= tolerance + el.strokeWidth / 2) return true;
    }
    return false;
  }

  const minX = Math.min(el.x, el.x + el.width) - tolerance;
  const maxX = Math.max(el.x, el.x + el.width) + tolerance;
  const minY = Math.min(el.y, el.y + el.height) - tolerance;
  const maxY = Math.max(el.y, el.y + el.height) + tolerance;

  if (p.x >= minX && p.x <= maxX && p.y >= minY && p.y <= maxY) {
    if (el.type === "rectangle" || el.type === "text") return true;
    if (el.type === "ellipse") {
      const cx = el.x + el.width / 2;
      const cy = el.y + el.height / 2;
      const rx = Math.abs(el.width) / 2 + tolerance;
      const ry = Math.abs(el.height) / 2 + tolerance;
      const normalized = Math.pow(p.x - cx, 2) / Math.pow(rx, 2) + Math.pow(p.y - cy, 2) / Math.pow(ry, 2);
      return normalized <= 1;
    }
    if (el.type === "line" || el.type === "arrow") {
      const x1 = el.x, y1 = el.y, x2 = el.x + el.width, y2 = el.y + el.height;
      const lenSq = Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2);
      if (lenSq === 0) return Math.hypot(p.x - x1, p.y - y1) <= tolerance;
      const t = Math.max(0, Math.min(1, ((p.x - x1) * (x2 - x1) + (p.y - y1) * (y2 - y1)) / lenSq));
      const projX = x1 + t * (x2 - x1);
      const projY = y1 + t * (y2 - y1);
      return Math.hypot(p.x - projX, p.y - projY) <= tolerance + el.strokeWidth / 2;
    }
  }

  return false;
}

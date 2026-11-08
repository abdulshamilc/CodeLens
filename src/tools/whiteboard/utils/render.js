// src/tools/whiteboard/utils/render.js
// High-performance Canvas 2D rendering engine, developer diagram symbols, connectors, and hit-testing

/**
 * @typedef {import('../types').WhiteboardElement} WhiteboardElement
 * @typedef {import('../types').Viewport} Viewport
 * @typedef {import('../types').Point} Point
 * @typedef {import('../types').AnchorPosition} AnchorPosition
 */

export function screenToCanvas(screenX, screenY, viewport) {
  return {
    x: (screenX - viewport.x) / viewport.zoom,
    y: (screenY - viewport.y) / viewport.zoom,
  };
}

export function canvasToScreen(canvasX, canvasY, viewport) {
  return {
    x: canvasX * viewport.zoom + viewport.x,
    y: canvasY * viewport.zoom + viewport.y,
  };
}

/**
 * Get normalized bounding box for any element
 */
export function getElementBounds(el) {
  if (el.points && el.points.length > 0) {
    const xs = el.points.map((p) => p.x);
    const ys = el.points.map((p) => p.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    return {
      x: minX,
      y: minY,
      width: Math.max(12, maxX - minX),
      height: Math.max(12, maxY - minY),
    };
  }

  const x = el.width < 0 ? el.x + el.width : el.x;
  const y = el.height < 0 ? el.y + el.height : el.y;
  const width = Math.max(8, Math.abs(el.width));
  const height = Math.max(8, Math.abs(el.height));

  return { x, y, width, height };
}

/**
 * Computes connection anchor points on midpoints of the bounding box
 */
export function getElementAnchors(el) {
  const b = getElementBounds(el);
  return {
    top: { x: b.x + b.width / 2, y: b.y },
    bottom: { x: b.x + b.width / 2, y: b.y + b.height },
    left: { x: b.x, y: b.y + b.height / 2 },
    right: { x: b.x + b.width, y: b.y + b.height / 2 },
  };
}

/**
 * Draws dotted or cross background grid
 */
export function drawGrid(ctx, width, height, viewport, background = "dark") {
  const gridSize = 24 * viewport.zoom;
  if (gridSize < 8) return;

  const offsetX = ((viewport.x % gridSize) + gridSize) % gridSize;
  const offsetY = ((viewport.y % gridSize) + gridSize) % gridSize;

  ctx.save();
  const isLight = background === "light" || background === "white";
  ctx.fillStyle = isLight ? "rgba(100, 116, 139, 0.2)" : "rgba(148, 163, 184, 0.16)";

  for (let x = offsetX; x < width; x += gridSize) {
    for (let y = offsetY; y < height; y += gridSize) {
      ctx.beginPath();
      ctx.arc(x, y, 1 * Math.min(viewport.zoom, 1.4), 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

/**
 * Draws arrowhead at endpoint of line/arrow
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
 * Safe round rect helper supporting all canvas contexts
 */
function pathRoundedRect(ctx, x, y, width, height, radius) {
  const r = Math.min(Math.abs(width) / 2, Math.abs(height) / 2, Math.max(0, radius || 0));
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

/**
 * Basic syntax highlighter for code block rendering
 */
function tokenizeCode(line) {
  const tokens = [];
  // Basic regex tokenizer for keywords, strings, comments, numbers
  const re = /(\/\/[^\n]*|\/\*[\s\S]*?\*\/|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`|\b(?:const|let|var|function|return|if|else|for|while|import|export|from|class|extends|async|await|try|catch|new|this|typeof|interface|type)\b|\b\d+(?:\.\d+)?\b|[{}()[\].,;:+\-*/%=<>!&|^~?]+|[a-zA-Z_$][a-zA-Z0-9_$]*)/g;
  let lastIdx = 0;
  let match;
  while ((match = re.exec(line)) !== null) {
    if (match.index > lastIdx) {
      tokens.push({ text: line.slice(lastIdx, match.index), type: "plain" });
    }
    const val = match[0];
    let type = "plain";
    if (val.startsWith("//") || val.startsWith("/*")) type = "comment";
    else if (val.startsWith('"') || val.startsWith("'") || val.startsWith("`")) type = "string";
    else if (/^(const|let|var|function|return|if|else|for|while|import|export|from|class|extends|async|await|try|catch|new|this|typeof|interface|type)$/.test(val)) type = "keyword";
    else if (/^\d/.test(val)) type = "number";
    else if (/^[{}()[\].,;:+\-*/%=<>!&|^~?]+$/.test(val)) type = "punctuation";
    else type = "identifier";
    tokens.push({ text: val, type });
    lastIdx = re.lastIndex;
  }
  if (lastIdx < line.length) {
    tokens.push({ text: line.slice(lastIdx), type: "plain" });
  }
  return tokens;
}

/**
 * Renders a single whiteboard element on canvas context
 * @param {CanvasRenderingContext2D} ctx
 * @param {WhiteboardElement} el
 * @param {WhiteboardElement[]} [allElements]
 */
export function renderElement(ctx, el, allElements = []) {
  if (el.hidden) return;

  ctx.save();
  ctx.globalAlpha = Math.max(0, Math.min(1, el.opacity ?? 1));
  ctx.strokeStyle = el.strokeColor || "#6366f1";
  ctx.fillStyle = el.fillColor || "transparent";
  ctx.lineWidth = Math.max(1, el.strokeWidth ?? 2);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  if (el.strokeStyle === "dashed") {
    ctx.setLineDash([8, 6]);
  } else if (el.strokeStyle === "dotted") {
    ctx.setLineDash([2, 4]);
  } else {
    ctx.setLineDash([]);
  }

  // Handle element rotation if present
  if (el.rotation && el.rotation !== 0) {
    const b = getElementBounds(el);
    const cx = b.x + b.width / 2;
    const cy = b.y + b.height / 2;
    ctx.translate(cx, cy);
    ctx.rotate((el.rotation * Math.PI) / 180);
    ctx.translate(-cx, -cy);
  }

  const { x, y, width, height } = el;

  switch (el.type) {
    // ── Freehand Pencil & Brush ───────────────────────────────────────────────
    case "pen":
    case "brush": {
      if (!el.points || el.points.length === 0) break;
      if (el.type === "brush") {
        ctx.lineWidth = Math.max(3, (el.strokeWidth ?? 3) * 1.6);
        ctx.lineCap = "round";
      }
      ctx.beginPath();
      ctx.moveTo(el.points[0].x, el.points[0].y);
      for (let i = 1; i < el.points.length; i++) {
        const p = el.points[i];
        ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();
      break;
    }

    // ── Basic Shapes ──────────────────────────────────────────────────────────
    case "rectangle": {
      pathRoundedRect(ctx, x, y, width, height, el.borderRadius ?? 0);
      if (el.fillColor && el.fillColor !== "transparent") ctx.fill();
      ctx.stroke();
      break;
    }

    case "rounded-rect": {
      pathRoundedRect(ctx, x, y, width, height, el.borderRadius ?? 12);
      if (el.fillColor && el.fillColor !== "transparent") ctx.fill();
      ctx.stroke();
      break;
    }

    case "circle": {
      const radius = Math.min(Math.abs(width), Math.abs(height)) / 2;
      const cx = x + width / 2;
      const cy = y + height / 2;
      ctx.beginPath();
      ctx.arc(cx, cy, Math.max(1, radius), 0, Math.PI * 2);
      if (el.fillColor && el.fillColor !== "transparent") ctx.fill();
      ctx.stroke();
      break;
    }

    case "ellipse": {
      const cx = x + width / 2;
      const cy = y + height / 2;
      const rx = Math.max(1, Math.abs(width) / 2);
      const ry = Math.max(1, Math.abs(height) / 2);
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
      if (el.fillColor && el.fillColor !== "transparent") ctx.fill();
      ctx.stroke();
      break;
    }

    case "triangle": {
      ctx.beginPath();
      ctx.moveTo(x + width / 2, y);
      ctx.lineTo(x + width, y + height);
      ctx.lineTo(x, y + height);
      ctx.closePath();
      if (el.fillColor && el.fillColor !== "transparent") ctx.fill();
      ctx.stroke();
      break;
    }

    case "diamond": {
      ctx.beginPath();
      ctx.moveTo(x + width / 2, y);
      ctx.lineTo(x + width, y + height / 2);
      ctx.lineTo(x + width / 2, y + height);
      ctx.lineTo(x, y + height / 2);
      ctx.closePath();
      if (el.fillColor && el.fillColor !== "transparent") ctx.fill();
      ctx.stroke();
      break;
    }

    case "polygon": {
      // Regular hexagon
      const cx = x + width / 2;
      const cy = y + height / 2;
      const rx = Math.abs(width) / 2;
      const ry = Math.abs(height) / 2;
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const angle = (i * Math.PI) / 3;
        const px = cx + rx * Math.cos(angle);
        const py = cy + ry * Math.sin(angle);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      if (el.fillColor && el.fillColor !== "transparent") ctx.fill();
      ctx.stroke();
      break;
    }

    case "line": {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + width, y + height);
      ctx.stroke();
      break;
    }

    case "arrow": {
      const endX = x + width;
      const endY = y + height;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(endX, endY);
      ctx.stroke();
      drawArrowHead(ctx, x, y, endX, endY, Math.max(10, el.strokeWidth * 4));
      break;
    }

    case "double-arrow": {
      const endX = x + width;
      const endY = y + height;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(endX, endY);
      ctx.stroke();
      drawArrowHead(ctx, endX, endY, x, y, Math.max(10, el.strokeWidth * 4));
      drawArrowHead(ctx, x, y, endX, endY, Math.max(10, el.strokeWidth * 4));
      break;
    }

    // ── Connectors ────────────────────────────────────────────────────────────
    case "connector-straight":
    case "connector-elbow":
    case "connector-curved": {
      let startX = x;
      let startY = y;
      let endX = x + width;
      let endY = y + height;

      // Snap to connected shape anchors if present
      if (el.fromId && el.fromAnchor && allElements.length > 0) {
        const fromEl = allElements.find((e) => e.id === el.fromId);
        if (fromEl) {
          const anchors = getElementAnchors(fromEl);
          if (anchors[el.fromAnchor]) {
            startX = anchors[el.fromAnchor].x;
            startY = anchors[el.fromAnchor].y;
          }
        }
      }
      if (el.toId && el.toAnchor && allElements.length > 0) {
        const toEl = allElements.find((e) => e.id === el.toId);
        if (toEl) {
          const anchors = getElementAnchors(toEl);
          if (anchors[el.toAnchor]) {
            endX = anchors[el.toAnchor].x;
            endY = anchors[el.toAnchor].y;
          }
        }
      }

      ctx.beginPath();
      if (el.type === "connector-elbow" || el.routing === "elbow") {
        const midX = startX + (endX - startX) / 2;
        ctx.moveTo(startX, startY);
        ctx.lineTo(midX, startY);
        ctx.lineTo(midX, endY);
        ctx.lineTo(endX, endY);
        ctx.stroke();
        drawArrowHead(ctx, midX, endY, endX, endY, Math.max(10, el.strokeWidth * 4));
      } else if (el.type === "connector-curved" || el.routing === "curved") {
        const dx = endX - startX;
        const dy = endY - startY;
        const cp1x = startX + dx * 0.25;
        const cp1y = startY + dy * 0.75;
        const cp2x = startX + dx * 0.75;
        const cp2y = startY + dy * 0.25;
        ctx.moveTo(startX, startY);
        ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, endX, endY);
        ctx.stroke();
        drawArrowHead(ctx, cp2x, cp2y, endX, endY, Math.max(10, el.strokeWidth * 4));
      } else {
        // Straight
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.stroke();
        drawArrowHead(ctx, startX, startY, endX, endY, Math.max(10, el.strokeWidth * 4));
      }

      if (el.startArrow) {
        drawArrowHead(ctx, endX, endY, startX, startY, Math.max(10, el.strokeWidth * 4));
      }

      // Draw connector label if present
      if (el.label) {
        const midX = (startX + endX) / 2;
        const midY = (startY + endY) / 2;
        ctx.save();
        ctx.font = '11px "Inter", sans-serif';
        const tw = ctx.measureText(el.label).width;
        ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
        ctx.strokeStyle = el.strokeColor;
        ctx.lineWidth = 1;
        pathRoundedRect(ctx, midX - tw / 2 - 6, midY - 10, tw + 12, 20, 6);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = "#ffffff";
        ctx.textBaseline = "middle";
        ctx.textAlign = "center";
        ctx.fillText(el.label, midX, midY);
        ctx.restore();
      }
      break;
    }

    // ── Developer Flowchart Blocks ────────────────────────────────────────────
    case "flowchart-start": {
      // Rounded pill / capsule
      const radius = Math.min(Math.abs(width), Math.abs(height)) / 2;
      pathRoundedRect(ctx, x, y, width, height, radius);
      if (el.fillColor && el.fillColor !== "transparent") ctx.fill();
      ctx.stroke();
      break;
    }

    case "process": {
      pathRoundedRect(ctx, x, y, width, height, 6);
      if (el.fillColor && el.fillColor !== "transparent") ctx.fill();
      ctx.stroke();
      // Accent bar on top or left
      ctx.save();
      ctx.fillStyle = el.strokeColor;
      pathRoundedRect(ctx, x, y, 6, height, 3);
      ctx.fill();
      ctx.restore();
      break;
    }

    case "decision": {
      ctx.beginPath();
      ctx.moveTo(x + width / 2, y);
      ctx.lineTo(x + width, y + height / 2);
      ctx.lineTo(x + width / 2, y + height);
      ctx.lineTo(x, y + height / 2);
      ctx.closePath();
      if (el.fillColor && el.fillColor !== "transparent") ctx.fill();
      ctx.stroke();
      break;
    }

    case "input-output": {
      // Parallelogram
      const skew = Math.min(24, Math.abs(width) * 0.2);
      ctx.beginPath();
      ctx.moveTo(x + skew, y);
      ctx.lineTo(x + width, y);
      ctx.lineTo(x + width - skew, y + height);
      ctx.lineTo(x, y + height);
      ctx.closePath();
      if (el.fillColor && el.fillColor !== "transparent") ctx.fill();
      ctx.stroke();
      break;
    }

    // ── Developer Architecture Blocks ─────────────────────────────────────────
    case "database": {
      // 3D Cylinder
      const topCapHeight = Math.min(20, Math.abs(height) * 0.25);
      const cx = x + width / 2;
      const rx = Math.max(1, Math.abs(width) / 2);
      const ry = topCapHeight / 2;

      // Base fill
      if (el.fillColor && el.fillColor !== "transparent") {
        ctx.beginPath();
        ctx.ellipse(cx, y + height - ry, rx, ry, 0, 0, Math.PI * 2);
        ctx.rect(x, y + ry, width, height - topCapHeight);
        ctx.ellipse(cx, y + ry, rx, ry, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      // Cylinder body outline
      ctx.beginPath();
      ctx.moveTo(x, y + ry);
      ctx.lineTo(x, y + height - ry);
      ctx.ellipse(cx, y + height - ry, rx, ry, 0, 0, Math.PI);
      ctx.lineTo(x + width, y + ry);
      ctx.stroke();

      // Top oval cap
      ctx.beginPath();
      ctx.ellipse(cx, y + ry, rx, ry, 0, 0, Math.PI * 2);
      ctx.stroke();

      // Middle ribbed line
      ctx.beginPath();
      ctx.ellipse(cx, y + ry + (height - topCapHeight) * 0.45, rx, ry, 0, 0, Math.PI);
      ctx.stroke();
      break;
    }

    case "server": {
      // Server rack unit
      pathRoundedRect(ctx, x, y, width, height, 6);
      if (el.fillColor && el.fillColor !== "transparent") ctx.fill();
      ctx.stroke();

      // Horizontal rack dividers
      const bayHeight = height / 3;
      for (let i = 1; i <= 2; i++) {
        ctx.beginPath();
        ctx.moveTo(x + 4, y + i * bayHeight);
        ctx.lineTo(x + width - 4, y + i * bayHeight);
        ctx.stroke();
      }

      // LED indicator lights
      ctx.save();
      for (let i = 0; i < 3; i++) {
        const cy = y + i * bayHeight + bayHeight / 2;
        ctx.fillStyle = "#10b981"; // Green LED
        ctx.beginPath();
        ctx.arc(x + 12, cy, 2.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "#06b6d4"; // Cyan LED
        ctx.beginPath();
        ctx.arc(x + 22, cy, 2.5, 0, Math.PI * 2);
        ctx.fill();

        // Vent slits
        ctx.strokeStyle = "rgba(148, 163, 184, 0.4)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(x + 36, cy);
        ctx.lineTo(x + width - 12, cy);
        ctx.stroke();
      }
      ctx.restore();
      break;
    }

    case "client": {
      // Workstation / monitor with stand
      const screenH = height * 0.78;
      pathRoundedRect(ctx, x, y, width, screenH, 6);
      if (el.fillColor && el.fillColor !== "transparent") ctx.fill();
      ctx.stroke();

      // Inner screen border
      ctx.strokeRect(x + 6, y + 6, width - 12, screenH - 12);

      // Stand neck
      ctx.beginPath();
      ctx.moveTo(x + width * 0.44, y + screenH);
      ctx.lineTo(x + width * 0.4, y + height);
      ctx.lineTo(x + width * 0.6, y + height);
      ctx.lineTo(x + width * 0.56, y + screenH);
      ctx.stroke();

      // Base foot
      ctx.beginPath();
      ctx.moveTo(x + width * 0.3, y + height);
      ctx.lineTo(x + width * 0.7, y + height);
      ctx.stroke();
      break;
    }

    case "api-endpoint": {
      // API endpoint card with method badge
      pathRoundedRect(ctx, x, y, width, height, 8);
      if (el.fillColor && el.fillColor !== "transparent") ctx.fill();
      ctx.stroke();

      // Method badge on left
      const badgeW = Math.min(54, width * 0.35);
      ctx.save();
      ctx.fillStyle = el.strokeColor;
      pathRoundedRect(ctx, x + 4, y + 4, badgeW, height - 8, 4);
      ctx.fill();

      ctx.fillStyle = "#ffffff";
      ctx.font = 'bold 10px "Fira Code", monospace';
      ctx.textBaseline = "middle";
      ctx.textAlign = "center";
      ctx.fillText("API", x + 4 + badgeW / 2, y + height / 2);
      ctx.restore();
      break;
    }

    case "component": {
      // UML / Component block with 2 left tabs
      pathRoundedRect(ctx, x, y, width, height, 6);
      if (el.fillColor && el.fillColor !== "transparent") ctx.fill();
      ctx.stroke();

      // 2 connector tabs on the left border
      const tabW = 12;
      const tabH = 10;
      ctx.save();
      ctx.fillStyle = el.fillColor && el.fillColor !== "transparent" ? el.fillColor : "#0f172a";
      ctx.fillRect(x - tabW / 2, y + height * 0.25 - tabH / 2, tabW, tabH);
      ctx.strokeRect(x - tabW / 2, y + height * 0.25 - tabH / 2, tabW, tabH);
      ctx.fillRect(x - tabW / 2, y + height * 0.75 - tabH / 2, tabW, tabH);
      ctx.strokeRect(x - tabW / 2, y + height * 0.75 - tabH / 2, tabW, tabH);
      ctx.restore();
      break;
    }

    case "backend-service": {
      // Backend microservice container
      pathRoundedRect(ctx, x, y, width, height, 10);
      if (el.fillColor && el.fillColor !== "transparent") ctx.fill();
      ctx.stroke();

      // Header strip
      ctx.save();
      ctx.fillStyle = el.strokeColor;
      ctx.globalAlpha = 0.2;
      pathRoundedRect(ctx, x, y, width, 24, 8);
      ctx.fill();
      ctx.restore();

      // Gear symbol in top right
      ctx.save();
      ctx.strokeStyle = el.strokeColor;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(x + width - 16, y + 12, 4, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
      break;
    }

    case "auth": {
      // Security shield block
      ctx.beginPath();
      ctx.moveTo(x + width / 2, y);
      ctx.lineTo(x + width, y + height * 0.25);
      ctx.quadraticCurveTo(x + width, y + height * 0.7, x + width / 2, y + height);
      ctx.quadraticCurveTo(x, y + height * 0.7, x, y + height * 0.25);
      ctx.closePath();
      if (el.fillColor && el.fillColor !== "transparent") ctx.fill();
      ctx.stroke();

      // Center keyhole icon
      const kx = x + width / 2;
      const ky = y + height * 0.45;
      ctx.beginPath();
      ctx.arc(kx, ky, 5, 0, Math.PI * 2);
      ctx.moveTo(kx - 3, ky + 4);
      ctx.lineTo(kx - 5, ky + 14);
      ctx.lineTo(kx + 5, ky + 14);
      ctx.lineTo(kx + 3, ky + 4);
      ctx.stroke();
      break;
    }

    case "cloud": {
      // Cloud silhouette
      const r = Math.min(width, height) / 3.8;
      ctx.beginPath();
      ctx.arc(x + width * 0.35, y + height * 0.45, r, Math.PI * 0.8, Math.PI * 1.8);
      ctx.arc(x + width * 0.65, y + height * 0.4, r * 1.1, Math.PI * 1.2, Math.PI * 2.1);
      ctx.arc(x + width * 0.78, y + height * 0.65, r * 0.8, Math.PI * 1.6, Math.PI * 0.4);
      ctx.arc(x + width * 0.5, y + height * 0.78, r * 0.9, 0, Math.PI);
      ctx.arc(x + width * 0.22, y + height * 0.65, r * 0.8, Math.PI * 0.6, Math.PI * 1.3);
      ctx.closePath();
      if (el.fillColor && el.fillColor !== "transparent") ctx.fill();
      ctx.stroke();
      break;
    }

    case "terminal": {
      // macOS Terminal window
      pathRoundedRect(ctx, x, y, width, height, 8);
      ctx.fillStyle = "#090d16";
      ctx.fill();
      ctx.stroke();

      // Header bar
      ctx.save();
      ctx.fillStyle = "#1e293b";
      pathRoundedRect(ctx, x, y, width, 22, 6);
      ctx.fill();

      // 3 dots
      ctx.fillStyle = "#ef4444";
      ctx.beginPath();
      ctx.arc(x + 12, y + 11, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#eab308";
      ctx.beginPath();
      ctx.arc(x + 22, y + 11, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#22c55e";
      ctx.beginPath();
      ctx.arc(x + 32, y + 11, 3.5, 0, Math.PI * 2);
      ctx.fill();

      // Prompt text >_
      ctx.fillStyle = "#38bdf8";
      ctx.font = 'bold 12px "Fira Code", monospace';
      ctx.textBaseline = "top";
      ctx.fillText(">_ bash", x + 12, y + 30);
      ctx.restore();
      break;
    }

    case "browser": {
      // Web browser window
      pathRoundedRect(ctx, x, y, width, height, 8);
      if (el.fillColor && el.fillColor !== "transparent") ctx.fill();
      else {
        ctx.fillStyle = "#0f172a";
        ctx.fill();
      }
      ctx.stroke();

      // Header bar
      ctx.save();
      ctx.fillStyle = "rgba(30, 41, 59, 0.8)";
      pathRoundedRect(ctx, x, y, width, 28, 6);
      ctx.fill();

      // 3 dots
      ctx.fillStyle = "#ef4444";
      ctx.beginPath();
      ctx.arc(x + 12, y + 14, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#eab308";
      ctx.beginPath();
      ctx.arc(x + 22, y + 14, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#22c55e";
      ctx.beginPath();
      ctx.arc(x + 32, y + 14, 3.5, 0, Math.PI * 2);
      ctx.fill();

      // URL address bar
      ctx.fillStyle = "rgba(15, 23, 42, 0.7)";
      pathRoundedRect(ctx, x + 42, y + 6, width - 52, 16, 4);
      ctx.fill();
      ctx.fillStyle = "#94a3b8";
      ctx.font = '10px "Inter", sans-serif';
      ctx.textBaseline = "middle";
      ctx.fillText("https://api.codelens.dev", x + 48, y + 14);
      ctx.restore();
      break;
    }

    case "network": {
      // Network router node
      const cx = x + width / 2;
      const cy = y + height / 2;
      const r = Math.min(width, height) / 2;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      if (el.fillColor && el.fillColor !== "transparent") ctx.fill();
      ctx.stroke();

      // 4 arrows cross pattern
      const arm = r * 0.55;
      ctx.beginPath();
      ctx.moveTo(cx - arm, cy);
      ctx.lineTo(cx + arm, cy);
      ctx.moveTo(cx, cy - arm);
      ctx.lineTo(cx, cy + arm);
      ctx.stroke();
      drawArrowHead(ctx, cx, cy, cx + arm, cy, 6);
      drawArrowHead(ctx, cx, cy, cx - arm, cy, 6);
      drawArrowHead(ctx, cx, cy, cx, cy - arm, 6);
      drawArrowHead(ctx, cx, cy, cx, cy + arm, 6);
      break;
    }

    // ── Dedicated Code Block ──────────────────────────────────────────────────
    case "code-block": {
      const isLightTheme = el.codeTheme === "light";
      const bg = isLightTheme ? "#ffffff" : "#0d1117";
      const headerBg = isLightTheme ? "#f1f5f9" : "#161b22";
      const textColor = isLightTheme ? "#1e293b" : "#e6edf3";
      const borderCol = el.strokeColor || "#6366f1";

      pathRoundedRect(ctx, x, y, width, height, 8);
      ctx.fillStyle = bg;
      ctx.fill();
      ctx.strokeStyle = borderCol;
      ctx.stroke();

      // Top title bar
      ctx.save();
      ctx.fillStyle = headerBg;
      pathRoundedRect(ctx, x, y, width, 26, 6);
      ctx.fill();

      // 3 macOS dots
      ctx.fillStyle = "#ef4444";
      ctx.beginPath();
      ctx.arc(x + 12, y + 13, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#eab308";
      ctx.beginPath();
      ctx.arc(x + 22, y + 13, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#22c55e";
      ctx.beginPath();
      ctx.arc(x + 32, y + 13, 3.5, 0, Math.PI * 2);
      ctx.fill();

      // Language badge in top right
      const langText = (el.language || "javascript").toUpperCase();
      ctx.fillStyle = "#6366f1";
      ctx.font = 'bold 9px "Fira Code", monospace';
      ctx.textAlign = "right";
      ctx.textBaseline = "middle";
      ctx.fillText(langText, x + width - 12, y + 13);

      // Render Code Lines
      const codeLines = (el.code || "// Enter code here...").split("\n");
      const fontSize = el.fontSize ?? 13;
      const lineHeight = fontSize * 1.5;
      const showLineNos = el.lineNumbers ?? true;
      const leftGutter = showLineNos ? 38 : 12;

      ctx.font = `${fontSize}px "Fira Code", "Consolas", monospace`;
      ctx.textBaseline = "top";

      codeLines.forEach((line, idx) => {
        const lineY = y + 34 + idx * lineHeight;
        if (lineY + lineHeight > y + height) return; // clip bottom

        // Line number
        if (showLineNos) {
          ctx.fillStyle = isLightTheme ? "#94a3b8" : "#484f58";
          ctx.textAlign = "right";
          ctx.fillText(String(idx + 1), x + 28, lineY);
        }

        // Tokenized line
        let curX = x + leftGutter;
        ctx.textAlign = "left";
        const tokens = tokenizeCode(line);
        tokens.forEach((t) => {
          if (t.type === "keyword") ctx.fillStyle = "#ff7b72";
          else if (t.type === "string") ctx.fillStyle = "#a5d6ff";
          else if (t.type === "comment") ctx.fillStyle = "#8b949e";
          else if (t.type === "number") ctx.fillStyle = "#79c0ff";
          else ctx.fillStyle = textColor;
          ctx.fillText(t.text, curX, lineY);
          curX += ctx.measureText(t.text).width;
        });
      });
      ctx.restore();
      break;
    }

    // ── Upgraded Text Element ─────────────────────────────────────────────────
    case "text": {
      if (!el.text) break;
      const fontSize = el.fontSize ?? 16;
      const fontFamily = el.fontFamily ?? '"Inter", sans-serif';
      const fontWeight = el.fontWeight === "bold" ? "bold " : "";
      const fontStyle = el.fontStyle === "italic" ? "italic " : "";
      ctx.font = `${fontStyle}${fontWeight}${fontSize}px ${fontFamily}`;

      const lines = el.text.split("\n");
      const lineHeight = fontSize * (el.lineHeight ?? 1.35);

      // Measure total text bounds
      let maxLineWidth = 0;
      lines.forEach((l) => {
        const lw = ctx.measureText(l).width;
        if (lw > maxLineWidth) maxLineWidth = lw;
      });

      const totalH = lines.length * lineHeight;
      const pad = el.padding ?? (el.textBgColor && el.textBgColor !== "transparent" ? 8 : 0);

      // Draw optional text background / annotation badge
      if (el.textBgColor && el.textBgColor !== "transparent") {
        ctx.save();
        ctx.fillStyle = el.textBgColor;
        pathRoundedRect(ctx, x - pad, y - pad, maxLineWidth + pad * 2, totalH + pad * 2, 6);
        ctx.fill();
        if (el.strokeWidth && el.strokeWidth > 0 && el.strokeColor) {
          ctx.strokeStyle = el.strokeColor;
          ctx.lineWidth = 1;
          ctx.stroke();
        }
        ctx.restore();
      }

      ctx.fillStyle = el.strokeColor || "#ffffff";
      ctx.textBaseline = "top";

      lines.forEach((line, i) => {
        const curY = y + i * lineHeight;
        let lineX = x;
        if (el.textAlign === "center") {
          lineX = x + maxLineWidth / 2;
          ctx.textAlign = "center";
        } else if (el.textAlign === "right") {
          lineX = x + maxLineWidth;
          ctx.textAlign = "right";
        } else {
          ctx.textAlign = "left";
        }

        ctx.fillText(line, lineX, curY);

        // Underline or Strikethrough
        if (el.textDecoration === "underline" || el.textDecoration === "line-through") {
          const tw = ctx.measureText(line).width;
          let ux = lineX;
          if (el.textAlign === "center") ux = lineX - tw / 2;
          else if (el.textAlign === "right") ux = lineX - tw;

          const uy = el.textDecoration === "underline" ? curY + fontSize + 2 : curY + fontSize / 2;
          ctx.save();
          ctx.strokeStyle = ctx.fillStyle;
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(ux, uy);
          ctx.lineTo(ux + tw, uy);
          ctx.stroke();
          ctx.restore();
        }
      });
      break;
    }
  }

  // Draw element text label inside shapes if defined (e.g. for flowchart / blocks)
  if (el.type !== "text" && el.type !== "code-block" && el.text) {
    ctx.save();
    ctx.fillStyle = el.strokeColor;
    ctx.font = `${el.fontSize ?? 13}px ${el.fontFamily ?? '"Inter", sans-serif'}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const cx = x + width / 2;
    const cy = y + height / 2;
    ctx.fillText(el.text, cx, cy);
    ctx.restore();
  }

  ctx.restore();
}

/**
 * Draws 8 resize handles and rotation handle around selected element(s)
 */
export function drawSelectionBox(ctx, el, viewport) {
  const b = getElementBounds(el);
  const padding = 8 / viewport.zoom;
  const minX = b.x - padding;
  const minY = b.y - padding;
  const maxX = b.x + b.width + padding;
  const maxY = b.y + b.height + padding;
  const w = maxX - minX;
  const h = maxY - minY;

  ctx.save();
  ctx.strokeStyle = "#6366f1";
  ctx.lineWidth = 1.5 / viewport.zoom;
  ctx.setLineDash([4 / viewport.zoom, 4 / viewport.zoom]);
  ctx.strokeRect(minX, minY, w, h);

  // 8 Resize Handles
  const handleSize = 7 / viewport.zoom;
  ctx.fillStyle = "#ffffff";
  ctx.strokeStyle = "#4f46e5";
  ctx.lineWidth = 1.5 / viewport.zoom;
  ctx.setLineDash([]);

  const handles = [
    { handle: "nw", x: minX, y: minY },
    { handle: "n", x: minX + w / 2, y: minY },
    { handle: "ne", x: maxX, y: minY },
    { handle: "e", x: maxX, y: minY + h / 2 },
    { handle: "se", x: maxX, y: maxY },
    { handle: "s", x: minX + w / 2, y: maxY },
    { handle: "sw", x: minX, y: maxY },
    { handle: "w", x: minX, y: minY + h / 2 },
  ];

  for (const hPt of handles) {
    ctx.fillRect(hPt.x - handleSize / 2, hPt.y - handleSize / 2, handleSize, handleSize);
    ctx.strokeRect(hPt.x - handleSize / 2, hPt.y - handleSize / 2, handleSize, handleSize);
  }

  // Rotation Handle at top
  const rotDist = 20 / viewport.zoom;
  const rotX = minX + w / 2;
  const rotY = minY - rotDist;

  // Stem line
  ctx.beginPath();
  ctx.moveTo(rotX, minY);
  ctx.lineTo(rotX, rotY);
  ctx.stroke();

  // Circle handle
  ctx.beginPath();
  ctx.arc(rotX, rotY, handleSize / 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Lock badge if locked
  if (el.locked) {
    ctx.fillStyle = "#ef4444";
    ctx.font = `${10 / viewport.zoom}px sans-serif`;
    ctx.fillText("🔒", maxX - 12 / viewport.zoom, minY - 4 / viewport.zoom);
  }

  ctx.restore();
}

/**
 * Draws connection anchor dots when user is drawing a connector
 */
export function drawAnchorPoints(ctx, el, viewport) {
  const anchors = getElementAnchors(el);
  const r = 5 / viewport.zoom;

  ctx.save();
  ctx.fillStyle = "#38bdf8";
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 1.5 / viewport.zoom;

  Object.values(anchors).forEach((pt) => {
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  });
  ctx.restore();
}

/**
 * Hit test resize handles on a selected element
 */
export function hitTestResizeHandle(el, p, zoom) {
  const b = getElementBounds(el);
  const padding = 8 / zoom;
  const minX = b.x - padding;
  const minY = b.y - padding;
  const maxX = b.x + b.width + padding;
  const maxY = b.y + b.height + padding;
  const w = maxX - minX;
  const h = maxY - minY;
  const tol = 8 / zoom;

  // Check rotation handle
  const rotDist = 20 / zoom;
  const rotX = minX + w / 2;
  const rotY = minY - rotDist;
  if (Math.hypot(p.x - rotX, p.y - rotY) <= tol) return "rot";

  const handles = [
    { handle: "nw", x: minX, y: minY },
    { handle: "n", x: minX + w / 2, y: minY },
    { handle: "ne", x: maxX, y: minY },
    { handle: "e", x: maxX, y: minY + h / 2 },
    { handle: "se", x: maxX, y: maxY },
    { handle: "s", x: minX + w / 2, y: maxY },
    { handle: "sw", x: minX, y: maxY },
    { handle: "w", x: minX, y: minY + h / 2 },
  ];

  for (const hPt of handles) {
    if (Math.hypot(p.x - hPt.x, p.y - hPt.y) <= tol) {
      return hPt.handle;
    }
  }

  return null;
}

/**
 * Hit test anchor points on candidate elements
 */
export function hitTestAnchors(elements, p, zoom) {
  const tol = 12 / zoom;
  for (const el of elements) {
    if (el.hidden || el.type.startsWith("connector")) continue;
    const anchors = getElementAnchors(el);
    for (const [pos, pt] of Object.entries(anchors)) {
      if (Math.hypot(p.x - pt.x, p.y - pt.y) <= tol) {
        return { elementId: el.id, anchor: pos, point: pt };
      }
    }
  }
  return null;
}

/**
 * Hit test element with tolerance
 */
export function hitTestElement(el, p, tolerance = 8) {
  if (el.hidden) return false;

  if ((el.type === "pen" || el.type === "brush") && el.points) {
    for (const pt of el.points) {
      const dist = Math.hypot(pt.x - p.x, pt.y - p.y);
      if (dist <= tolerance + (el.strokeWidth || 2) / 2) return true;
    }
    return false;
  }

  const b = getElementBounds(el);
  const minX = b.x - tolerance;
  const maxX = b.x + b.width + tolerance;
  const minY = b.y - tolerance;
  const maxY = b.y + b.height + tolerance;

  if (p.x >= minX && p.x <= maxX && p.y >= minY && p.y <= maxY) {
    if (el.type === "ellipse" || el.type === "circle") {
      const cx = b.x + b.width / 2;
      const cy = b.y + b.height / 2;
      const rx = b.width / 2 + tolerance;
      const ry = b.height / 2 + tolerance;
      return Math.pow(p.x - cx, 2) / Math.pow(rx, 2) + Math.pow(p.y - cy, 2) / Math.pow(ry, 2) <= 1;
    }
    if (el.type === "line" || el.type === "arrow" || el.type === "double-arrow" || el.type.startsWith("connector")) {
      const x1 = el.x, y1 = el.y, x2 = el.x + el.width, y2 = el.y + el.height;
      const lenSq = Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2);
      if (lenSq === 0) return Math.hypot(p.x - x1, p.y - y1) <= tolerance;
      const t = Math.max(0, Math.min(1, ((p.x - x1) * (x2 - x1) + (p.y - y1) * (y2 - y1)) / lenSq));
      const projX = x1 + t * (x2 - x1);
      const projY = y1 + t * (y2 - y1);
      return Math.hypot(p.x - projX, p.y - projY) <= tolerance + (el.strokeWidth || 2) / 2;
    }
    return true;
  }

  return false;
}

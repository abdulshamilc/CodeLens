// src/tools/whiteboard/utils/export.js
// Export Whiteboard diagram to high-res PNG, JPEG, SVG vector, PDF, and JSON project backup

import { renderElement, getElementBounds } from "./render";

/**
 * @typedef {import('../types').WhiteboardElement} WhiteboardElement
 */

/**
 * Computes bounding box encompassing all canvas elements
 */
export function getBoundingBox(elements) {
  if (!elements || elements.length === 0) {
    return { minX: 0, minY: 0, maxX: 800, maxY: 600, width: 800, height: 600 };
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const el of elements) {
    if (el.hidden) continue;
    const b = getElementBounds(el);
    minX = Math.min(minX, b.x);
    minY = Math.min(minY, b.y);
    maxX = Math.max(maxX, b.x + b.width);
    maxY = Math.max(maxY, b.y + b.height);
  }

  if (minX === Infinity) {
    return { minX: 0, minY: 0, maxX: 800, maxY: 600, width: 800, height: 600 };
  }

  const padding = 40;
  minX -= padding;
  minY -= padding;
  maxX += padding;
  maxY += padding;

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: Math.max(120, maxX - minX),
    height: Math.max(120, maxY - minY),
  };
}

/**
 * Creates an offscreen rendered canvas
 */
function createExportCanvas(elements, background = "dark", scale = 2) {
  const box = getBoundingBox(elements);
  const canvas = document.createElement("canvas");
  canvas.width = box.width * scale;
  canvas.height = box.height * scale;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.scale(scale, scale);
  ctx.translate(-box.minX, -box.minY);

  if (background === "dark") {
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(box.minX, box.minY, box.width, box.height);
  } else if (background === "light") {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(box.minX, box.minY, box.width, box.height);
  } else if (background === "black") {
    ctx.fillStyle = "#020617";
    ctx.fillRect(box.minX, box.minY, box.width, box.height);
  }

  for (const el of elements) {
    renderElement(ctx, el, elements);
  }

  return { canvas, box };
}

/**
 * Exports elements to high-resolution PNG
 */
export function exportToPNG(elements, background = "dark") {
  const result = createExportCanvas(elements, background, 2);
  if (!result) return;
  const dateStr = new Date().toISOString().slice(0, 10);
  const url = result.canvas.toDataURL("image/png");
  const a = document.createElement("a");
  a.href = url;
  a.download = `codelens-diagram-${dateStr}.png`;
  a.click();
}

/**
 * Exports elements to JPEG
 */
export function exportToJPEG(elements, background = "dark") {
  const effectiveBg = background === "transparent" ? "dark" : background;
  const result = createExportCanvas(elements, effectiveBg, 2);
  if (!result) return;
  const dateStr = new Date().toISOString().slice(0, 10);
  const url = result.canvas.toDataURL("image/jpeg", 0.95);
  const a = document.createElement("a");
  a.href = url;
  a.download = `codelens-diagram-${dateStr}.jpg`;
  a.click();
}

/**
 * Exports elements to PDF document
 */
export function exportToPDF(elements, background = "dark") {
  const result = createExportCanvas(elements, background === "transparent" ? "dark" : background, 2);
  if (!result) return;
  const dataUrl = result.canvas.toDataURL("image/png");
  const dateStr = new Date().toISOString().slice(0, 10);

  // Open printable document window with vector PDF print dialog
  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    // Fallback: download as PNG
    exportToPNG(elements, background);
    return;
  }

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>CodeLens Diagram - ${dateStr}</title>
        <style>
          @page { size: auto; margin: 0mm; }
          body { margin: 0; display: flex; align-items: center; justify-content: center; background: ${background === 'light' ? '#fff' : '#0f172a'}; }
          img { max-width: 100%; height: auto; display: block; }
        </style>
      </head>
      <body>
        <img src="${dataUrl}" onload="window.print();window.close();" />
      </body>
    </html>
  `);
  printWindow.document.close();
}

/**
 * Exports elements to structured JSON backup
 */
export function exportToJSON(elements, name = "diagram") {
  const dateStr = new Date().toISOString().slice(0, 10);
  const data = JSON.stringify(
    {
      app: "CodeLens",
      tool: "whiteboard",
      version: 2,
      exportedAt: new Date().toISOString(),
      elements,
    },
    null,
    2
  );
  const blob = new Blob([data], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `codelens-${name}-${dateStr}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Resilient JSON backup importer
 */
export function importFromJSON(jsonStr) {
  try {
    const parsed = JSON.parse(jsonStr);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    if (parsed && Array.isArray(parsed.elements)) {
      return parsed.elements;
    }
    throw new Error("Invalid format: no elements found.");
  } catch (err) {
    throw new Error(`Failed to import whiteboard backup: ${String(err)}`);
  }
}

/**
 * Exports elements to scalable SVG
 */
export function exportToSVG(elements, background = "dark") {
  const box = getBoundingBox(elements);
  const isLight = background === "light";
  const bgFill = background === "transparent" ? "none" : isLight ? "#ffffff" : "#0f172a";

  let svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${box.minX} ${box.minY} ${box.width} ${box.height}" width="${box.width}" height="${box.height}">\n`;
  if (bgFill !== "none") {
    svgContent += `  <rect x="${box.minX}" y="${box.minY}" width="${box.width}" height="${box.height}" fill="${bgFill}" />\n`;
  }

  for (const el of elements) {
    if (el.hidden) continue;
    const strokeDash =
      el.strokeStyle === "dashed"
        ? 'stroke-dasharray="8 6"'
        : el.strokeStyle === "dotted"
        ? 'stroke-dasharray="3 3"'
        : "";
    const fill = el.fillColor && el.fillColor !== "transparent" ? el.fillColor : "none";
    const stroke = el.strokeColor || "#6366f1";
    const strokeWidth = el.strokeWidth || 2;
    const opacity = el.opacity !== undefined ? `opacity="${el.opacity}"` : "";

    switch (el.type) {
      case "pen":
      case "brush": {
        if (!el.points || el.points.length === 0) break;
        const d = el.points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
        svgContent += `  <path d="${d}" fill="none" stroke="${stroke}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" ${strokeDash} ${opacity} />\n`;
        break;
      }
      case "rectangle":
      case "rounded-rect":
      case "process":
      case "component":
      case "server":
      case "terminal":
      case "browser": {
        const rx = el.type === "rounded-rect" ? el.borderRadius || 12 : 6;
        svgContent += `  <rect x="${el.x}" y="${el.y}" width="${el.width}" height="${el.height}" rx="${rx}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" ${strokeDash} ${opacity} />\n`;
        if (el.text) {
          svgContent += `  <text x="${el.x + el.width / 2}" y="${el.y + el.height / 2}" fill="${stroke}" font-size="${el.fontSize || 13}" font-family="sans-serif" text-anchor="middle" dominant-baseline="middle">${el.text}</text>\n`;
        }
        break;
      }
      case "circle":
      case "ellipse": {
        const cx = el.x + el.width / 2;
        const cy = el.y + el.height / 2;
        const rx = Math.abs(el.width) / 2;
        const ry = Math.abs(el.height) / 2;
        svgContent += `  <ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" ${strokeDash} ${opacity} />\n`;
        break;
      }
      case "triangle": {
        const points = `${el.x + el.width / 2},${el.y} ${el.x + el.width},${el.y + el.height} ${el.x},${el.y + el.height}`;
        svgContent += `  <polygon points="${points}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" ${strokeDash} ${opacity} />\n`;
        break;
      }
      case "diamond":
      case "decision": {
        const points = `${el.x + el.width / 2},${el.y} ${el.x + el.width},${el.y + el.height / 2} ${el.x + el.width / 2},${el.y + el.height} ${el.x},${el.y + el.height / 2}`;
        svgContent += `  <polygon points="${points}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" ${strokeDash} ${opacity} />\n`;
        break;
      }
      case "line":
      case "arrow":
      case "double-arrow":
      case "connector-straight":
      case "connector-elbow":
      case "connector-curved": {
        svgContent += `  <line x1="${el.x}" y1="${el.y}" x2="${el.x + el.width}" y2="${el.y + el.height}" stroke="${stroke}" stroke-width="${strokeWidth}" stroke-linecap="round" ${strokeDash} ${opacity} />\n`;
        break;
      }
      case "code-block": {
        svgContent += `  <rect x="${el.x}" y="${el.y}" width="${el.width}" height="${el.height}" rx="8" fill="#0d1117" stroke="${stroke}" stroke-width="${strokeWidth}" ${opacity} />\n`;
        const codeLines = (el.code || "").split("\n");
        codeLines.forEach((line, idx) => {
          svgContent += `  <text x="${el.x + 16}" y="${el.y + 36 + idx * 18}" fill="#e6edf3" font-size="12" font-family="monospace">${line.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</text>\n`;
        });
        break;
      }
      case "text": {
        if (!el.text) break;
        const lines = el.text.split("\n");
        const fs = el.fontSize || 16;
        lines.forEach((line, idx) => {
          svgContent += `  <text x="${el.x}" y="${el.y + (idx + 1) * fs * 1.3}" fill="${stroke}" font-size="${fs}" font-family="${el.fontFamily || 'sans-serif'}" ${opacity}>${line.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</text>\n`;
        });
        break;
      }
    }
  }

  svgContent += "</svg>";
  const dateStr = new Date().toISOString().slice(0, 10);
  const blob = new Blob([svgContent], { type: "image/svg+xml" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `codelens-diagram-${dateStr}.svg`;
  a.click();
  URL.revokeObjectURL(url);
}

// src/tools/whiteboard/utils/export.js
// Export Whiteboard to PNG, SVG, or JSON file

import { renderElement } from "./render";

/**
 * @typedef {import('./types').WhiteboardElement} WhiteboardElement
 */

/**
 * Computes the bounding box of all elements on the canvas
 * @param {WhiteboardElement[]} elements
 * @returns {{ minX: number, minY: number, maxX: number, maxY: number, width: number, height: number }}
 */
export function getBoundingBox(elements) {
  if (elements.length === 0) {
    return { minX: 0, minY: 0, maxX: 800, maxY: 600, width: 800, height: 600 };
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const el of elements) {
    if (el.points && el.points.length > 0) {
      for (const p of el.points) {
        minX = Math.min(minX, p.x);
        minY = Math.min(minY, p.y);
        maxX = Math.max(maxX, p.x);
        maxY = Math.max(maxY, p.y);
      }
    } else {
      minX = Math.min(minX, el.x, el.x + el.width);
      maxX = Math.max(maxX, el.x, el.x + el.width);
      minY = Math.min(minY, el.y, el.y + el.height);
      maxY = Math.max(maxY, el.y, el.y + el.height);
    }
  }

  const padding = 32;
  minX -= padding;
  minY -= padding;
  maxX += padding;
  maxY += padding;

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: Math.max(100, maxX - minX),
    height: Math.max(100, maxY - minY),
  };
}

/**
 * Exports elements to high-resolution PNG
 * @param {WhiteboardElement[]} elements
 * @param {'dark' | 'light' | 'transparent'} [background='dark']
 */
export function exportToPNG(elements, background = "dark") {
  const box = getBoundingBox(elements);
  const canvas = document.createElement("canvas");
  const scale = 2; // High-res 2x
  canvas.width = box.width * scale;
  canvas.height = box.height * scale;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  ctx.scale(scale, scale);
  ctx.translate(-box.minX, -box.minY);

  if (background === "dark") {
    ctx.fillStyle = "#0f172a"; // slate-900
    ctx.fillRect(box.minX, box.minY, box.width, box.height);
  } else if (background === "light") {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(box.minX, box.minY, box.width, box.height);
  }

  for (const el of elements) {
    renderElement(ctx, el);
  }

  const dateStr = new Date().toISOString().slice(0, 10);
  const url = canvas.toDataURL("image/png");
  const a = document.createElement("a");
  a.href = url;
  a.download = `codelens-board-canvas-${dateStr}.png`;
  a.click();
}

/**
 * Exports elements to structured JSON backup
 * @param {WhiteboardElement[]} elements
 * @param {string} [name='canvas']
 */
export function exportToJSON(elements, name = "canvas") {
  const dateStr = new Date().toISOString().slice(0, 10);
  const data = JSON.stringify({ app: "CodeLens", tool: "board", version: 1, elements }, null, 2);
  const blob = new Blob([data], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `codelens-board-${name}-${dateStr}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Resilient JSON backup importer.
 * Accepts CodeLens backups, legacy DevToolbox backups, or generic element arrays.
 * @param {string} jsonStr
 * @returns {WhiteboardElement[]}
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
    throw new Error("Invalid backup format: no elements found.");
  } catch (err) {
    throw new Error(`Failed to import whiteboard backup: ${String(err)}`);
  }
}

/**
 * Exports elements to scalable SVG
 * @param {WhiteboardElement[]} elements
 * @param {string} [name='canvas']
 */
export function exportToSVG(elements, name = "canvas") {
  const box = getBoundingBox(elements);
  let svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${box.minX} ${box.minY} ${box.width} ${box.height}" width="${box.width}" height="${box.height}">\n`;
  svgContent += `  <rect x="${box.minX}" y="${box.minY}" width="${box.width}" height="${box.height}" fill="#0f172a" />\n`;

  for (const el of elements) {
    const strokeDash = el.strokeStyle === "dashed" ? 'stroke-dasharray="8 6"' : "";
    switch (el.type) {
      case "pen": {
        if (!el.points || el.points.length === 0) break;
        const d = el.points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
        svgContent += `  <path d="${d}" fill="none" stroke="${el.strokeColor}" stroke-width="${el.strokeWidth}" stroke-linecap="round" stroke-linejoin="round" ${strokeDash} />\n`;
        break;
      }
      case "rectangle": {
        svgContent += `  <rect x="${el.x}" y="${el.y}" width="${el.width}" height="${el.height}" rx="6" fill="${el.fillColor}" stroke="${el.strokeColor}" stroke-width="${el.strokeWidth}" ${strokeDash} />\n`;
        break;
      }
      case "ellipse": {
        const cx = el.x + el.width / 2;
        const cy = el.y + el.height / 2;
        const rx = Math.abs(el.width) / 2;
        const ry = Math.abs(el.height) / 2;
        svgContent += `  <ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${el.fillColor}" stroke="${el.strokeColor}" stroke-width="${el.strokeWidth}" ${strokeDash} />\n`;
        break;
      }
      case "line": {
        svgContent += `  <line x1="${el.x}" y1="${el.y}" x2="${el.x + el.width}" y2="${el.y + el.height}" stroke="${el.strokeColor}" stroke-width="${el.strokeWidth}" stroke-linecap="round" ${strokeDash} />\n`;
        break;
      }
      case "arrow": {
        svgContent += `  <line x1="${el.x}" y1="${el.y}" x2="${el.x + el.width}" y2="${el.y + el.height}" stroke="${el.strokeColor}" stroke-width="${el.strokeWidth}" stroke-linecap="round" ${strokeDash} />\n`;
        break;
      }
      case "text": {
        if (!el.text) break;
        svgContent += `  <text x="${el.x}" y="${el.y + (el.fontSize ?? 18)}" fill="${el.strokeColor}" font-size="${el.fontSize ?? 18}" font-family="sans-serif">${el.text}</text>\n`;
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
  a.download = `codelens-board-${name}-${dateStr}.svg`;
  a.click();
  URL.revokeObjectURL(url);
}

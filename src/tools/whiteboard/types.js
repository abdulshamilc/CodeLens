// src/tools/whiteboard/types.js
// Comprehensive JSDoc types for the Whiteboard infinite canvas

/**
 * @typedef {"select" | "hand" | "pen" | "rectangle" | "ellipse" | "arrow" | "line" | "text" | "eraser"} ToolType
 * @typedef {"pen" | "rectangle" | "ellipse" | "arrow" | "line" | "text"} ElementType
 * 
 * @typedef {Object} Point
 * @property {number} x
 * @property {number} y
 * 
 * @typedef {Object} WhiteboardElement
 * @property {string} id
 * @property {ElementType} type
 * @property {number} x
 * @property {number} y
 * @property {number} width
 * @property {number} height
 * @property {Point[]} [points]
 * @property {string} strokeColor
 * @property {string} fillColor
 * @property {number} strokeWidth
 * @property {"solid" | "dashed"} strokeStyle
 * @property {string} [text]
 * @property {number} [fontSize]
 * @property {string} [fontFamily]
 * @property {number} [roughness]
 * 
 * @typedef {Object} Viewport
 * @property {number} x
 * @property {number} y
 * @property {number} zoom
 * 
 * @typedef {Object} DragState
 * @property {boolean} isDragging
 * @property {number} startX
 * @property {number} startY
 * @property {number} currentX
 * @property {number} currentY
 * @property {WhiteboardElement[]} [initialElementSnapshot]
 */

export const TOOL_TYPES = Object.freeze([
  "select",
  "hand",
  "pen",
  "rectangle",
  "ellipse",
  "arrow",
  "line",
  "text",
  "eraser",
]);

// src/tools/whiteboard/types.js
// Comprehensive JSDoc types and definitions for the CodeLens Whiteboard & Diagramming Suite

/**
 * @typedef {"select" | "hand" | "pen" | "brush" | "eraser" |
 *   "rectangle" | "rounded-rect" | "circle" | "ellipse" | "triangle" | "diamond" | "polygon" | "line" | "arrow" | "double-arrow" |
 *   "connector-straight" | "connector-elbow" | "connector-curved" |
 *   "flowchart-start" | "process" | "decision" | "input-output" |
 *   "database" | "server" | "client" | "api-endpoint" | "component" | "backend-service" | "auth" | "cloud" |
 *   "code-block" | "terminal" | "browser" | "network" |
 *   "text"} ToolType
 */

/**
 * @typedef {ToolType} ElementType
 */

/**
 * @typedef {Object} Point
 * @property {number} x
 * @property {number} y
 */

/**
 * @typedef {"top" | "bottom" | "left" | "right"} AnchorPosition
 */

/**
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
 * @property {"solid" | "dashed" | "dotted"} strokeStyle
 * @property {number} [opacity]
 * @property {number} [rotation]
 * @property {number} [borderRadius]
 * @property {string} [name]
 * @property {boolean} [locked]
 * @property {boolean} [hidden]
 * @property {string | null} [groupId]
 * 
 * Text fields:
 * @property {string} [text]
 * @property {number} [fontSize]
 * @property {string} [fontFamily]
 * @property {"normal" | "bold"} [fontWeight]
 * @property {"normal" | "italic"} [fontStyle]
 * @property {"none" | "underline" | "line-through"} [textDecoration]
 * @property {"left" | "center" | "right"} [textAlign]
 * @property {string} [textBgColor]
 * @property {number} [padding]
 * 
 * Code Block fields:
 * @property {string} [code]
 * @property {string} [language]
 * @property {boolean} [lineNumbers]
 * @property {"dark" | "light"} [codeTheme]
 * 
 * Connector fields:
 * @property {"straight" | "elbow" | "curved"} [routing]
 * @property {string | null} [fromId]
 * @property {AnchorPosition | null} [fromAnchor]
 * @property {string | null} [toId]
 * @property {AnchorPosition | null} [toAnchor]
 * @property {boolean} [startArrow]
 * @property {boolean} [endArrow]
 * @property {string} [label]
 */

/**
 * @typedef {Object} Viewport
 * @property {number} x
 * @property {number} y
 * @property {number} zoom
 */

export const BASIC_TOOLS = Object.freeze([
  { id: "select", name: "Select & Move", icon: "↖" },
  { id: "hand", name: "Pan Hand", icon: "✋" },
  { id: "pen", name: "Pencil", icon: "✏️" },
  { id: "brush", name: "Brush", icon: "🖌️" },
  { id: "eraser", name: "Eraser", icon: "⌫" },
]);

export const SHAPE_TOOLS = Object.freeze([
  { id: "rectangle", name: "Rectangle", icon: "▢" },
  { id: "rounded-rect", name: "Rounded Rectangle", icon: "▢" },
  { id: "circle", name: "Circle", icon: "◯" },
  { id: "ellipse", name: "Ellipse", icon: "⬭" },
  { id: "triangle", name: "Triangle", icon: "△" },
  { id: "diamond", name: "Diamond", icon: "◇" },
  { id: "polygon", name: "Hexagon", icon: "⬡" },
  { id: "line", name: "Line", icon: "╱" },
  { id: "arrow", name: "Arrow", icon: "➔" },
  { id: "double-arrow", name: "Double Arrow", icon: "↔" },
]);

export const CONNECTOR_TOOLS = Object.freeze([
  { id: "connector-straight", name: "Straight Connector", icon: "─→" },
  { id: "connector-elbow", name: "Elbow Connector", icon: "↳" },
  { id: "connector-curved", name: "Curved Connector", icon: "⤹" },
]);

export const DEVELOPER_TOOLS = Object.freeze([
  { id: "flowchart-start", name: "Start / End", category: "flowchart", icon: "⬯" },
  { id: "process", name: "Process Block", category: "flowchart", icon: "▭" },
  { id: "decision", name: "Decision Block", category: "flowchart", icon: "◇" },
  { id: "input-output", name: "Input / Output", category: "flowchart", icon: "▰" },
  { id: "database", name: "Database", category: "architecture", icon: "🗄️" },
  { id: "server", name: "Server", category: "architecture", icon: "🖥️" },
  { id: "client", name: "Client / UI", category: "architecture", icon: "💻" },
  { id: "api-endpoint", name: "API Endpoint", category: "architecture", icon: "⚡" },
  { id: "component", name: "Component", category: "architecture", icon: "📦" },
  { id: "backend-service", name: "Backend Service", category: "architecture", icon: "⚙️" },
  { id: "auth", name: "Auth / Security", category: "architecture", icon: "🛡️" },
  { id: "cloud", name: "Cloud Storage", category: "architecture", icon: "☁️" },
  { id: "code-block", name: "Code Snippet", category: "developer", icon: "📝" },
  { id: "terminal", name: "Terminal / CLI", category: "developer", icon: "💻" },
  { id: "browser", name: "Web Browser", category: "developer", icon: "🌐" },
  { id: "network", name: "Network Node", category: "architecture", icon: "🔀" },
]);

export const CODE_LANGUAGES = Object.freeze([
  { id: "javascript", label: "JavaScript" },
  { id: "typescript", label: "TypeScript" },
  { id: "html", label: "HTML" },
  { id: "css", label: "CSS" },
  { id: "json", label: "JSON" },
  { id: "jsx", label: "React JSX" },
  { id: "tsx", label: "React TSX" },
  { id: "python", label: "Python" },
  { id: "java", label: "Java" },
  { id: "sql", label: "SQL" },
  { id: "bash", label: "Bash / Shell" },
]);

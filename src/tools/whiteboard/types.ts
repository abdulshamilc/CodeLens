// src/tools/whiteboard/types.ts
// Comprehensive types for the Whiteboard infinite canvas

export type ToolType =
  | "select"
  | "hand"
  | "pen"
  | "rectangle"
  | "ellipse"
  | "arrow"
  | "line"
  | "text"
  | "eraser";

export type ElementType =
  | "pen"
  | "rectangle"
  | "ellipse"
  | "arrow"
  | "line"
  | "text";

export interface Point {
  x: number;
  y: number;
}

export interface WhiteboardElement {
  id: string;
  type: ElementType;
  x: number;
  y: number;
  width: number;
  height: number;
  points?: Point[]; // For pen strokes, lines, and arrows
  strokeColor: string;
  fillColor: string;
  strokeWidth: number;
  strokeStyle: "solid" | "dashed";
  text?: string;
  fontSize?: number;
  fontFamily?: string;
  roughness?: number;
}

export interface Viewport {
  x: number;
  y: number;
  zoom: number;
}

export interface DragState {
  isDragging: boolean;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  initialElementSnapshot?: WhiteboardElement[];
}

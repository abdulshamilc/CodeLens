// src/tools/dbv/examples/index.js
// Central curated examples library for CodeLens DBV.
// Contains 50+ learning examples across 14 JavaScript execution categories.

import { VARIABLES_EXAMPLES } from "./variables";
import { HOISTING_EXAMPLES } from "./hoisting";
import { TDZ_EXAMPLES } from "./tdz";
import { SCOPE_EXAMPLES } from "./scope";
import { CALLSTACK_EXAMPLES } from "./callstack";
import { CLOSURES_EXAMPLES } from "./closures";
import { THIS_BINDING_EXAMPLES } from "./thisBinding";
import { FUNCTIONS_EXAMPLES } from "./functions";
import { OBJECTS_EXAMPLES } from "./objects";
import { ARRAYS_EXAMPLES } from "./arrays";
import { PROTOTYPES_EXAMPLES } from "./prototypes";
import { EVENT_LOOP_EXAMPLES } from "./eventLoop";
import { CONTROL_FLOW_EXAMPLES } from "./controlFlow";
import { BEHAVIORS_EXAMPLES } from "./behaviors";

export const DEFAULT_CODE = `// Welcome to DBV – JavaScript Execution Visualizer
// Select an example from the 📚 library or press ⚡ Visualize to start!

var greeting = "hello";
let count = 0;
const MAX = 10;

function add(a, b) {
  return a + b;
}

count = add(3, 7);
console.log(greeting, count);
`;

export const EXAMPLES = [
  ...VARIABLES_EXAMPLES,
  ...HOISTING_EXAMPLES,
  ...TDZ_EXAMPLES,
  ...SCOPE_EXAMPLES,
  ...CALLSTACK_EXAMPLES,
  ...CLOSURES_EXAMPLES,
  ...THIS_BINDING_EXAMPLES,
  ...FUNCTIONS_EXAMPLES,
  ...OBJECTS_EXAMPLES,
  ...ARRAYS_EXAMPLES,
  ...PROTOTYPES_EXAMPLES,
  ...EVENT_LOOP_EXAMPLES,
  ...CONTROL_FLOW_EXAMPLES,
  ...BEHAVIORS_EXAMPLES,
];

export const CATEGORIES = [
  "All",
  "Variables",
  "Hoisting",
  "TDZ",
  "Scope Chain",
  "Call Stack",
  "Closures",
  "this",
  "Functions",
  "Objects",
  "Arrays",
  "Prototypes",
  "Event Loop",
  "Control Flow",
  "Behaviors",
];

export function getExampleById(id) {
  return EXAMPLES.find((ex) => ex.id === id) || null;
}

export function getExamplesByCategory(category) {
  if (!category || category === "All") return EXAMPLES;
  return EXAMPLES.filter((ex) => ex.category === category);
}

export function getStartHereExamples() {
  return EXAMPLES.filter((ex) => ex.tags && ex.tags.includes("start-here"));
}

export {
  VARIABLES_EXAMPLES,
  HOISTING_EXAMPLES,
  TDZ_EXAMPLES,
  SCOPE_EXAMPLES,
  CALLSTACK_EXAMPLES,
  CLOSURES_EXAMPLES,
  THIS_BINDING_EXAMPLES,
  FUNCTIONS_EXAMPLES,
  OBJECTS_EXAMPLES,
  ARRAYS_EXAMPLES,
  PROTOTYPES_EXAMPLES,
  EVENT_LOOP_EXAMPLES,
  CONTROL_FLOW_EXAMPLES,
  BEHAVIORS_EXAMPLES,
};

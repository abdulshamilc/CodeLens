// src/tools/dbv/types.ts
// Complete TypeScript types for the DBV execution trace and interpreter

// ─── Binding kinds and states ────────────────────────────────────────────────

export type BindingKind = "var" | "let" | "const" | "function" | "param" | "class" | "import";
export type BindingState = "undefined" | "uninitialized" | "initialized" | "tdz";

export interface HeapRef {
  /** Points to a heap object id */
  type: "ref";
  id: string;
}
export type BindingValue = number | string | boolean | null | undefined | HeapRef;

export interface Binding {
  kind: BindingKind;
  state: BindingState;
  value: BindingValue;
}

// ─── Environment records ──────────────────────────────────────────────────────

export interface EnvironmentRecord {
  id: string;
  /** Ordered map of identifier → binding */
  bindings: Record<string, Binding>;
  /** Id of outer environment (null = global) */
  outer: string | null;
}

// ─── Execution context ───────────────────────────────────────────────────────

export type ContextType = "Global" | "Function" | "Block" | "Module" | "Eval";
export type ContextPhase = "Creation" | "Execution";

export interface ExecutionContext {
  id: string;
  type: ContextType;
  name: string; // "global", or function name
  phase: ContextPhase;
  thisBinding: BindingValue;
  /** variableEnvironment record id */
  variableEnvId: string;
  /** lexicalEnvironment record id (may differ after block-scopes) */
  lexicalEnvId: string;
  /** outer lexical env for scope-chain */
  outerEnvId: string | null;
  /** Source line that created this context */
  sourceLine: number;
}

// ─── Heap objects ─────────────────────────────────────────────────────────────

export type HeapObjectKind = "object" | "array" | "function" | "closure" | "class" | "promise" | "generator";

export interface HeapObject {
  id: string;
  kind: HeapObjectKind;
  /** For display: function name, "(anonymous)", etc. */
  label: string;
  /** object property map */
  properties: Record<string, BindingValue>;
  /** prototype ref or null */
  prototype: string | null;
  /** For closures: the captured environment record ids */
  capturedEnvIds?: string[];
  /** For functions: source start/end lines */
  sourceRange?: [number, number];
}

// ─── Web APIs / queues ───────────────────────────────────────────────────────

export type WebApiKind = "setTimeout" | "setInterval" | "fetch" | "promise";

export interface WebApiEntry {
  id: string;
  kind: WebApiKind;
  label: string;
  remainingMs?: number;
  callbackRef?: string; // heap id of the callback fn
}

export interface QueuedTask {
  id: string;
  kind: "macrotask" | "microtask";
  label: string;
  callbackRef?: string;
}

export type EventLoopState =
  | "idle"
  | "running-sync"
  | "draining-microtasks"
  | "pulling-macrotask";

// ─── Trace snapshot ──────────────────────────────────────────────────────────

export type TraceEventType =
  | "program-start"
  | "creation-phase"
  | "execution-phase"
  | "declare"
  | "assign"
  | "call"
  | "return"
  | "block-enter"
  | "block-exit"
  | "enqueue-task"
  | "event-loop-tick"
  | "microtask-drain"
  | "yield"
  | "await-suspend"
  | "await-resume"
  | "throw"
  | "catch"
  | "finally"
  | "expression-eval"
  | "hoisting"
  | "tdz-error"
  | "unsupported";

export interface SourceRange {
  startLine: number;
  endLine: number;
  startCol: number;
  endCol: number;
}

export interface TraceStep {
  index: number;
  /** Which AST node we are currently at */
  nodeRange: SourceRange | null;
  eventType: TraceEventType;
  /** Plain-English explanation for the current step */
  explanation: string;
  /** Full call stack at this step */
  callStack: ExecutionContext[];
  /** All environment records (by id) at this step */
  environments: Record<string, EnvironmentRecord>;
  /** All heap objects at this step */
  heap: Record<string, HeapObject>;
  /** Web API pending entries */
  webApis: WebApiEntry[];
  /** Microtask queue */
  microtaskQueue: QueuedTask[];
  /** Macrotask (callback) queue */
  macrotaskQueue: QueuedTask[];
  /** Event loop state */
  eventLoopState: EventLoopState;
  /** Console output accumulated so far */
  consoleOutput: ConsoleEntry[];
  /** Set of binding keys that changed in this step (for highlight animations) */
  changedBindings: string[]; // format: "envId/name"
  /** Binding being accessed for scope chain lookup */
  lookupBinding?: string;
  /** Error if thrown */
  error?: { name: string; message: string; stack: string[] };
}

export interface ConsoleEntry {
  id: string;
  method: "log" | "warn" | "error" | "info";
  args: string[];
  stepIndex: number;
}

// ─── Worker messages ──────────────────────────────────────────────────────────

export type WorkerInMessage =
  | { type: "run"; code: string; stepLimit: number }
  | { type: "cancel" };

export type WorkerOutMessage =
  | { type: "trace"; steps: TraceStep[] }
  | { type: "parse-error"; message: string; line: number; col: number }
  | { type: "progress"; done: number; total: number }
  | { type: "error"; message: string };

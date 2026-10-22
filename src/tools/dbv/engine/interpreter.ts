// src/tools/dbv/engine/interpreter.ts
// Step-by-step AST interpreter for JavaScript
// Uses acorn for parsing and generator functions for pauseable execution
// Produces an array of TraceStep snapshots (immutable, time-travel safe)

import * as acorn from "acorn";
import type {
  TraceStep,
  TraceEventType,
  ExecutionContext,
  EnvironmentRecord,
  HeapObject,
  Binding,
  BindingValue,
  BindingKind,
  BindingState,
  HeapRef,
  HeapObjectKind,
  ConsoleEntry,
  SourceRange,
  WebApiEntry,
  QueuedTask,
  EventLoopState,
} from "../types";

// ─── ID generators ────────────────────────────────────────────────────────────
let _id = 0;
const nextId = (prefix = "id") => `${prefix}-${++_id}`;

// ─── Deep clone helper (for immutable snapshots) ─────────────────────────────
function deepClone<T>(val: T): T {
  return JSON.parse(JSON.stringify(val)) as T;
}

// ─── Heap reference helper ────────────────────────────────────────────────────
function isRef(v: BindingValue): v is HeapRef {
  return typeof v === "object" && v !== null && (v as HeapRef).type === "ref";
}
function mkRef(id: string): HeapRef {
  return { type: "ref", id };
}

// ─── Interpreter state ────────────────────────────────────────────────────────
interface InterpreterState {
  callStack: ExecutionContext[];
  environments: Record<string, EnvironmentRecord>;
  heap: Record<string, HeapObject>;
  webApis: WebApiEntry[];
  microtaskQueue: QueuedTask[];
  macrotaskQueue: QueuedTask[];
  eventLoopState: EventLoopState;
  consoleOutput: ConsoleEntry[];
  steps: TraceStep[];
  stepLimit: number;
  changedBindings: string[];
}

// ─── Runtime value (internal, richer than BindingValue) ──────────────────────
type RtVal =
  | number
  | string
  | boolean
  | null
  | undefined
  | HeapRef
  | { __internal: "function"; envId: string; node: acorn.Function; name: string; heapId: string }
  | { __internal: "builtin"; name: string; fn: (...a: RtVal[]) => RtVal };

function rtToBinding(v: RtVal): BindingValue {
  if (v === null || v === undefined || typeof v === "number" || typeof v === "string" || typeof v === "boolean") return v;
  if (isRef(v as BindingValue)) return v as HeapRef;
  if (typeof v === "object" && (v as any).__internal === "function") return mkRef((v as any).heapId);
  if (typeof v === "object" && (v as any).__internal === "builtin") return `[built-in: ${(v as any).name}]`;
  return String(v);
}

function rtToDisplay(v: RtVal, heap: Record<string, HeapObject>): string {
  if (v === undefined) return "undefined";
  if (v === null) return "null";
  if (typeof v === "string") return JSON.stringify(v);
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  if (isRef(v as BindingValue)) {
    const obj = heap[(v as HeapRef).id];
    if (!obj) return "[object]";
    if (obj.kind === "function") return `[Function: ${obj.label}]`;
    if (obj.kind === "array") {
      const items = obj.properties;
      const len = Number(items.length) || 0;
      const vals = Array.from({ length: len }, (_, i) => rtToDisplay(items[i] as RtVal, heap));
      return `[${vals.join(", ")}]`;
    }
    const entries = Object.entries(obj.properties)
      .map(([k, vv]) => `${k}: ${rtToDisplay(vv as RtVal, heap)}`)
      .join(", ");
    return `{${entries}}`;
  }
  if (typeof v === "object" && (v as any).__internal === "function") return `[Function: ${(v as any).name}]`;
  if (typeof v === "object" && (v as any).__internal === "builtin") return `[built-in: ${(v as any).name}]`;
  return String(v);
}

// ─── Signal types for control flow ────────────────────────────────────────────
class ReturnSignal { constructor(public value: RtVal) {} }
class ThrowSignal { constructor(public value: RtVal) {} }
class BreakSignal { constructor(public label?: string) {} }
class ContinueSignal { constructor(public label?: string) {} }

// ─── Main interpreter class ───────────────────────────────────────────────────
export class Interpreter {
  private s: InterpreterState;
  private builtins: Record<string, (...a: RtVal[]) => RtVal> = {};

  constructor(stepLimit = 20_000) {
    _id = 0;
    this.s = {
      callStack: [],
      environments: {},
      heap: {},
      webApis: [],
      microtaskQueue: [],
      macrotaskQueue: [],
      eventLoopState: "idle",
      consoleOutput: [],
      steps: [],
      stepLimit,
      changedBindings: [],
    };
  }

  // ─── Public entry point ────────────────────────────────────────────────────
  run(code: string): TraceStep[] {
    let ast: acorn.Program;
    try {
      ast = acorn.parse(code, {
        ecmaVersion: 2022,
        sourceType: "script",
        locations: true,
      });
    } catch (err: any) {
      const parseErr: TraceStep = {
        index: 0,
        nodeRange: err.loc
          ? { startLine: err.loc.line, endLine: err.loc.line, startCol: err.loc.column, endCol: err.loc.column }
          : null,
        eventType: "throw",
        explanation: `SyntaxError: ${err.message}`,
        callStack: [],
        environments: {},
        heap: {},
        webApis: [],
        microtaskQueue: [],
        macrotaskQueue: [],
        eventLoopState: "idle",
        consoleOutput: [],
        changedBindings: [],
        error: { name: "SyntaxError", message: err.message, stack: [] },
      };
      return [parseErr];
    }

    // Create global environment
    const globalEnvId = nextId("env");
    this.s.environments[globalEnvId] = { id: globalEnvId, bindings: {}, outer: null };

    // Create global execution context
    const globalCtx: ExecutionContext = {
      id: nextId("ctx"),
      type: "Global",
      name: "global",
      phase: "Creation",
      thisBinding: undefined,
      variableEnvId: globalEnvId,
      lexicalEnvId: globalEnvId,
      outerEnvId: null,
      sourceLine: 1,
    };
    this.s.callStack = [globalCtx];

    // Record program-start step
    this.recordStep(null, "program-start", "JavaScript engine starts. Creating the Global Execution Context.");

    // Setup built-ins
    this.setupBuiltins(globalEnvId);

    // Creation phase: hoist all top-level declarations
    this.hoistDeclarations(ast.body as acorn.Statement[], globalEnvId, globalEnvId, globalCtx);
    this.recordStep(null, "creation-phase",
      "Creation phase complete. var declarations are set to undefined, function declarations are fully hoisted, let/const are in the Temporal Dead Zone (TDZ).");

    // Switch to execution phase
    this.s.callStack[0] = { ...this.s.callStack[0], phase: "Execution" };
    this.recordStep(null, "execution-phase", "Execution phase begins. The engine now runs the code line by line.");

    // Execute top-level statements
    try {
      this.execBody(ast.body as acorn.Statement[], globalEnvId);
    } catch (sig) {
      if (sig instanceof ThrowSignal) {
        const msg = rtToDisplay(sig.value, this.s.heap);
        this.s.consoleOutput.push({
          id: nextId("con"),
          method: "error",
          args: [`Uncaught ${msg}`],
          stepIndex: this.s.steps.length,
        });
        this.recordStep(null, "throw", `Uncaught error: ${msg}`, {
          error: { name: "Error", message: msg, stack: this.s.callStack.map((c) => c.name) },
        });
      }
    }

    // Drain Event Loop (Microtasks and Macrotasks)
    this.drainEventLoop();

    return this.s.steps;
  }

  // ─── Built-in setup ────────────────────────────────────────────────────────
  private setupBuiltins(envId: string) {
    const builtins: Array<[string, (...a: RtVal[]) => RtVal]> = [
      ["console", () => undefined], // handled separately
      ["undefined", () => undefined],
      ["NaN", () => NaN],
      ["Infinity", () => Infinity],
      ["parseInt", (...a) => parseInt(String(a[0]), Number(a[1]) || 10)],
      ["parseFloat", (...a) => parseFloat(String(a[0]))],
      ["isNaN", (...a) => isNaN(Number(a[0]))],
      ["isFinite", (...a) => isFinite(Number(a[0]))],
      ["String", (...a) => String(a[0])],
      ["Number", (...a) => Number(a[0])],
      ["Boolean", (...a) => Boolean(a[0])],
      ["Array", (...a) => {
        const id = nextId("heap");
        const props: Record<string, any> = { length: a.length };
        a.forEach((v, i) => (props[i] = rtToBinding(v)));
        this.s.heap[id] = { id, kind: "array", label: "Array", properties: props, prototype: null };
        return mkRef(id);
      }],
      ["Object", (...a) => {
        if (a[0] === null || a[0] === undefined) {
          const id = nextId("heap");
          this.s.heap[id] = { id, kind: "object", label: "Object", properties: {}, prototype: null };
          return mkRef(id);
        }
        return a[0];
      }],
      ["Math", () => {
        const id = nextId("heap");
        this.s.heap[id] = {
          id, kind: "object", label: "Math", prototype: null,
          properties: { PI: Math.PI, E: Math.E, abs: "[built-in]", floor: "[built-in]", ceil: "[built-in]", round: "[built-in]", sqrt: "[built-in]", max: "[built-in]", min: "[built-in]", random: "[built-in]" },
        };
        return mkRef(id);
      }],
      ["JSON", () => undefined],
      ["setTimeout", (...a) => {
        const id = nextId("wa");
        const cb = a[0];
        const ms = Number(a[1]) || 0;
        const cbRef = isRef(cb as BindingValue) ? (cb as HeapRef).id : undefined;
        this.s.webApis.push({ id, kind: "setTimeout", label: `setTimeout(${ms}ms)`, remainingMs: ms, callbackRef: cbRef });
        this.s.macrotaskQueue.push({ id: nextId("mt"), kind: "macrotask", label: `setTimeout cb (${ms}ms)`, callback: cb, webApiId: id } as any);
        this.recordStep(null, "enqueue-task", `setTimeout() called with ${ms}ms delay. The callback is sent to Web APIs and will be queued in the Callback Queue after ${ms}ms.`);
        return id;
      }],
      ["Promise", () => undefined],
    ];

    for (const [name, fn] of builtins) {
      this.builtins[name] = fn;
      this.s.environments[envId].bindings[name] = {
        kind: "var",
        state: "initialized",
        value: name === "undefined" ? undefined : `[built-in: ${name}]`,
      };
    }
  }

  // ─── Drain Event Loop ──────────────────────────────────────────────────────
  private drainEventLoop() {
    while (this.s.macrotaskQueue.length > 0) {
      if (this.s.steps.length >= this.s.stepLimit) break;
      const task = this.s.macrotaskQueue.shift()!;
      this.s.webApis = this.s.webApis.filter((w) => w.id !== (task as any).webApiId);
      this.s.eventLoopState = "pulling-macrotask";
      this.recordStep(null, "event-loop-tick", `Event Loop: moving task "${task.label}" from Callback Queue onto Call Stack.`);

      const cb = (task as any).callback;
      if (cb) {
        try {
          this.invokeCallable(cb, []);
        } catch (sig) {
          if (sig instanceof ThrowSignal) {
            const msg = rtToDisplay(sig.value, this.s.heap);
            this.s.consoleOutput.push({
              id: nextId("con"),
              method: "error",
              args: [`Uncaught ${msg}`],
              stepIndex: this.s.steps.length,
            });
            this.recordStep(null, "throw", `Uncaught error in task callback: ${msg}`);
          }
        }
      }
    }
    this.s.eventLoopState = "idle";
  }

  // ─── Hoisting ──────────────────────────────────────────────────────────────
  private hoistDeclarations(
    body: acorn.Statement[],
    varEnvId: string,
    lexEnvId: string,
    ctx: ExecutionContext
  ) {
    for (const node of body) {
      if (node.type === "FunctionDeclaration") {
        const fn = node as acorn.FunctionDeclaration;
        const name = fn.id?.name ?? "(anonymous)";
        // Function declarations are fully hoisted
        const fnHeapId = this.createFunctionObject(name, fn, ctx.lexicalEnvId);
        this.setBinding(varEnvId, name, "function", "initialized", mkRef(fnHeapId));
        this.recordStep(nodeRange(node), "hoisting",
          `Hoisting: function declaration \`${name}\` is fully hoisted to the top of scope. It is immediately available.`);
      } else if (node.type === "VariableDeclaration") {
        const vd = node as acorn.VariableDeclaration;
        for (const decl of vd.declarations) {
          const names = collectPatternNames(decl.id as acorn.Pattern);
          for (const name of names) {
            if (vd.kind === "var") {
              this.setBinding(varEnvId, name, "var", "initialized", undefined);
              this.recordStep(nodeRange(decl), "hoisting",
                `Hoisting: \`var ${name}\` is hoisted and initialized to \`undefined\`. It is accessible (but undefined) anywhere in this scope before its declaration.`);
            } else {
              // let/const go into TDZ
              this.setBinding(lexEnvId, name, vd.kind as BindingKind, "uninitialized", undefined);
              this.recordStep(nodeRange(decl), "hoisting",
                `Hoisting: \`${vd.kind} ${name}\` is hoisted to the Temporal Dead Zone (TDZ). Accessing it before line ${(node.loc?.start.line ?? 0)} will throw a ReferenceError.`);
            }
          }
        }
      }
    }
  }

  // ─── Execute a list of statements ─────────────────────────────────────────
  private execBody(body: acorn.Statement[], envId: string): RtVal {
    let last: RtVal = undefined;
    for (const stmt of body) {
      if (this.s.steps.length >= this.s.stepLimit) {
        throw new ThrowSignal("Step limit exceeded (possible infinite loop)");
      }
      last = this.execStatement(stmt, envId);
      if (last instanceof ReturnSignal || last instanceof BreakSignal || last instanceof ContinueSignal) {
        return last as unknown as RtVal;
      }
    }
    return last;
  }

  // ─── Statement execution ───────────────────────────────────────────────────
  private execStatement(node: acorn.Statement, envId: string): RtVal {
    switch (node.type) {
      case "VariableDeclaration": return this.execVarDecl(node as acorn.VariableDeclaration, envId);
      case "ExpressionStatement": {
        const es = node as acorn.ExpressionStatement;
        const val = this.evalExpr(es.expression, envId);
        return val;
      }
      case "ReturnStatement": {
        const rs = node as acorn.ReturnStatement;
        const val = rs.argument ? this.evalExpr(rs.argument, envId) : undefined;
        this.recordStep(nodeRange(node), "return",
          `return statement: the value \`${rtToDisplay(val, this.s.heap)}\` is returned to the caller.`);
        return new ReturnSignal(val) as unknown as RtVal;
      }
      case "IfStatement": return this.execIf(node as acorn.IfStatement, envId);
      case "BlockStatement": return this.execBlock(node as acorn.BlockStatement, envId);
      case "WhileStatement": return this.execWhile(node as acorn.WhileStatement, envId);
      case "ForStatement": return this.execFor(node as acorn.ForStatement, envId);
      case "ForOfStatement": return this.execForOf(node as acorn.ForOfStatement, envId);
      case "ForInStatement": return this.execForIn(node as acorn.ForInStatement, envId);
      case "FunctionDeclaration": return undefined; // already hoisted
      case "TryStatement": return this.execTry(node as acorn.TryStatement, envId);
      case "ThrowStatement": {
        const ts = node as acorn.ThrowStatement;
        const val = this.evalExpr(ts.argument, envId);
        this.recordStep(nodeRange(node), "throw",
          `throw: \`${rtToDisplay(val, this.s.heap)}\` is thrown.`);
        throw new ThrowSignal(val);
      }
      case "BreakStatement": return new BreakSignal((node as any).label?.name) as unknown as RtVal;
      case "ContinueStatement": return new ContinueSignal((node as any).label?.name) as unknown as RtVal;
      case "SwitchStatement": return this.execSwitch(node as acorn.SwitchStatement, envId);
      case "EmptyStatement": return undefined;
      case "LabeledStatement": return this.execStatement((node as acorn.LabeledStatement).body, envId);
      case "DoWhileStatement": return this.execDoWhile(node as acorn.DoWhileStatement, envId);
      default:
        this.recordStep(nodeRange(node), "unsupported",
          `Unsupported syntax: \`${node.type}\` at line ${node.loc?.start.line}. This statement is skipped.`);
        return undefined;
    }
  }

  // ─── Variable declaration ─────────────────────────────────────────────────
  private execVarDecl(node: acorn.VariableDeclaration, envId: string): RtVal {
    for (const decl of node.declarations) {
      const initVal = decl.init ? this.evalExpr(decl.init, envId) : undefined;
      const names = collectPatternNames(decl.id as acorn.Pattern);
      for (const name of names) {
        const old = this.lookupBinding(name, envId);
        if (node.kind === "var") {
          // var: update in place (already hoisted as undefined)
          this.updateBinding(name, envId, "initialized", initVal);
          this.recordStep(nodeRange(decl), "assign",
            `\`var ${name}\` is assigned the value \`${rtToDisplay(initVal, this.s.heap)}\`. (It was already hoisted as \`undefined\`.)`);
        } else {
          // let/const: transition from TDZ to initialized in target envId
          this.setBinding(envId, name, node.kind as BindingKind, "initialized", initVal);
          this.recordStep(nodeRange(decl), "declare",
            `\`${node.kind} ${name}\` is initialized to \`${rtToDisplay(initVal, this.s.heap)}\`. It is now accessible. (TDZ period is over.)`);
        }
      }
    }
    return undefined;
  }

  // ─── Block scope ──────────────────────────────────────────────────────────
  private execBlock(node: acorn.BlockStatement, envId: string): RtVal {
    // Create a new lexical environment for block scope
    const blockEnvId = nextId("env");
    this.s.environments[blockEnvId] = { id: blockEnvId, bindings: {}, outer: envId };

    this.recordStep(nodeRange(node), "block-enter",
      `Entering a block scope. A new lexical environment is created (outer → current scope).`);

    // Hoist let/const in this block to TDZ
    for (const stmt of node.body) {
      if (stmt.type === "VariableDeclaration" && (stmt as acorn.VariableDeclaration).kind !== "var") {
        const vd = stmt as acorn.VariableDeclaration;
        for (const d of vd.declarations) {
          for (const name of collectPatternNames(d.id as acorn.Pattern)) {
            this.setBinding(blockEnvId, name, vd.kind as BindingKind, "uninitialized", undefined);
          }
        }
      }
    }

    let result: RtVal = undefined;
    try {
      result = this.execBody(node.body, blockEnvId);
    } finally {
      this.recordStep(nodeRange(node), "block-exit",
        `Exiting block scope. The block's lexical environment is popped from the scope chain.`);
    }
    return result;
  }

  // ─── If statement ─────────────────────────────────────────────────────────
  private execIf(node: acorn.IfStatement, envId: string): RtVal {
    const test = this.evalExpr(node.test, envId);
    const bool = Boolean(test);
    this.recordStep(nodeRange(node), "expression-eval",
      `if (${rtToDisplay(test, this.s.heap)}): condition is ${bool ? "truthy" : "falsy"}, ${bool ? "taking the then branch" : node.alternate ? "taking the else branch" : "skipping the block"}.`);
    if (bool) {
      return this.execStatement(node.consequent, envId);
    } else if (node.alternate) {
      return this.execStatement(node.alternate, envId);
    }
    return undefined;
  }

  // ─── While loop ───────────────────────────────────────────────────────────
  private execWhile(node: acorn.WhileStatement, envId: string): RtVal {
    let iterations = 0;
    while (true) {
      if (this.s.steps.length >= this.s.stepLimit) break;
      const test = this.evalExpr(node.test, envId);
      const bool = Boolean(test);
      this.recordStep(nodeRange(node), "expression-eval",
        `while loop iteration ${++iterations}: condition \`${rtToDisplay(test, this.s.heap)}\` is ${bool ? "truthy" : "falsy"}.`);
      if (!bool) break;
      const result = this.execStatement(node.body, envId);
      if (result instanceof ReturnSignal) return result as unknown as RtVal;
      if (result instanceof BreakSignal) break;
      // ContinueSignal: continue to next iteration
    }
    return undefined;
  }

  // ─── Do-while loop ────────────────────────────────────────────────────────
  private execDoWhile(node: acorn.DoWhileStatement, envId: string): RtVal {
    let iterations = 0;
    do {
      if (this.s.steps.length >= this.s.stepLimit) break;
      const result = this.execStatement(node.body, envId);
      if (result instanceof ReturnSignal) return result as unknown as RtVal;
      if (result instanceof BreakSignal) break;
      const test = this.evalExpr(node.test, envId);
      this.recordStep(nodeRange(node), "expression-eval",
        `do-while: condition \`${rtToDisplay(test, this.s.heap)}\` after iteration ${++iterations}.`);
      if (!Boolean(test)) break;
    } while (true);
    return undefined;
  }

  // ─── For loop ─────────────────────────────────────────────────────────────
  private execFor(node: acorn.ForStatement, envId: string): RtVal {
    const forEnvId = nextId("env");
    this.s.environments[forEnvId] = { id: forEnvId, bindings: {}, outer: envId };

    const isLexical =
      node.init &&
      node.init.type === "VariableDeclaration" &&
      (node.init as acorn.VariableDeclaration).kind !== "var";

    if (node.init) {
      if (node.init.type === "VariableDeclaration") {
        this.execVarDecl(node.init as acorn.VariableDeclaration, forEnvId);
      } else {
        this.evalExpr(node.init as acorn.Expression, forEnvId);
      }
    }

    let iterations = 0;
    while (true) {
      if (this.s.steps.length >= this.s.stepLimit) break;

      // Each iteration of a lexical loop gets its own environment record
      let iterEnvId = forEnvId;
      if (isLexical) {
        iterEnvId = nextId("env");
        const clonedBindings: Record<string, Binding> = {};
        for (const [k, b] of Object.entries(this.s.environments[forEnvId].bindings)) {
          clonedBindings[k] = { ...b };
        }
        this.s.environments[iterEnvId] = { id: iterEnvId, bindings: clonedBindings, outer: envId };
      }

      if (node.test) {
        const test = this.evalExpr(node.test, iterEnvId);
        const bool = Boolean(test);
        this.recordStep(nodeRange(node), "expression-eval",
          `for loop: test condition \`${rtToDisplay(test, this.s.heap)}\` → ${bool}. Iteration ${++iterations}.`);
        if (!bool) break;
      }

      const result = this.execStatement(node.body, iterEnvId);
      if (result instanceof ReturnSignal) return result as unknown as RtVal;
      if (result instanceof BreakSignal) break;

      // Sync bindings back to forEnvId so update can read and modify variables
      if (isLexical) {
        for (const [k, b] of Object.entries(this.s.environments[iterEnvId].bindings)) {
          this.s.environments[forEnvId].bindings[k] = { ...b };
        }
      }

      if (node.update) this.evalExpr(node.update, forEnvId);
    }
    return undefined;
  }

  // ─── For-of loop ──────────────────────────────────────────────────────────
  private execForOf(node: acorn.ForOfStatement, envId: string): RtVal {
    const iterable = this.evalExpr(node.right, envId);
    let items: RtVal[] = [];
    if (isRef(iterable as BindingValue)) {
      const obj = this.s.heap[(iterable as HeapRef).id];
      if (obj?.kind === "array") {
        const len = Number(obj.properties.length) || 0;
        items = Array.from({ length: len }, (_, i) => obj.properties[i] as RtVal);
      }
    }
    for (let i = 0; i < items.length; i++) {
      if (this.s.steps.length >= this.s.stepLimit) break;
      const loopEnvId = nextId("env");
      this.s.environments[loopEnvId] = { id: loopEnvId, bindings: {}, outer: envId };
      const left = node.left;
      if (left.type === "VariableDeclaration") {
        const vd = left as acorn.VariableDeclaration;
        const name = collectPatternNames(vd.declarations[0].id as acorn.Pattern)[0];
        this.setBinding(loopEnvId, name, vd.kind as BindingKind, "initialized", items[i]);
        this.recordStep(nodeRange(node), "assign",
          `for-of: \`${vd.kind} ${name}\` = \`${rtToDisplay(items[i], this.s.heap)}\` (item ${i}).`);
      }
      const result = this.execStatement(node.body, loopEnvId);
      if (result instanceof ReturnSignal) return result as unknown as RtVal;
      if (result instanceof BreakSignal) break;
    }
    return undefined;
  }

  // ─── For-in loop ──────────────────────────────────────────────────────────
  private execForIn(node: acorn.ForInStatement, envId: string): RtVal {
    const obj = this.evalExpr(node.right, envId);
    let keys: string[] = [];
    if (isRef(obj as BindingValue)) {
      const heapObj = this.s.heap[(obj as HeapRef).id];
      if (heapObj) keys = Object.keys(heapObj.properties).filter((k) => k !== "length" || heapObj.kind !== "array");
    }
    for (const key of keys) {
      if (this.s.steps.length >= this.s.stepLimit) break;
      const loopEnvId = nextId("env");
      this.s.environments[loopEnvId] = { id: loopEnvId, bindings: {}, outer: envId };
      const left = node.left;
      if (left.type === "VariableDeclaration") {
        const vd = left as acorn.VariableDeclaration;
        const name = collectPatternNames(vd.declarations[0].id as acorn.Pattern)[0];
        this.setBinding(loopEnvId, name, vd.kind as BindingKind, "initialized", key);
        this.recordStep(nodeRange(node), "assign",
          `for-in: \`${vd.kind} ${name}\` = "${key}".`);
      }
      const result = this.execStatement(node.body, loopEnvId);
      if (result instanceof ReturnSignal) return result as unknown as RtVal;
      if (result instanceof BreakSignal) break;
    }
    return undefined;
  }

  // ─── Try/catch/finally ────────────────────────────────────────────────────
  private execTry(node: acorn.TryStatement, envId: string): RtVal {
    let result: RtVal = undefined;
    let thrown = false;
    let thrownVal: RtVal = undefined;

    try {
      result = this.execStatement(node.block, envId);
    } catch (sig) {
      if (sig instanceof ThrowSignal) {
        thrown = true;
        thrownVal = sig.value;
        this.recordStep(nodeRange(node), "catch",
          `Exception caught: \`${rtToDisplay(thrownVal, this.s.heap)}\`. Entering catch block.`);
      } else {
        throw sig;
      }
    }

    if (thrown && node.handler) {
      const catchEnvId = nextId("env");
      this.s.environments[catchEnvId] = { id: catchEnvId, bindings: {}, outer: envId };
      if (node.handler.param) {
        const name = collectPatternNames(node.handler.param as acorn.Pattern)[0];
        this.setBinding(catchEnvId, name, "let", "initialized", thrownVal);
      }
      try {
        result = this.execStatement(node.handler.body, catchEnvId);
      } catch (sig) {
        if (node.finalizer) {
          this.recordStep(nodeRange(node.finalizer), "finally",
            `finally block runs (even though an exception occurred inside catch).`);
          this.execStatement(node.finalizer, envId);
        }
        throw sig;
      }
    }

    if (node.finalizer) {
      this.recordStep(nodeRange(node.finalizer), "finally",
        `finally block always runs, regardless of whether an exception occurred.`);
      const finalResult = this.execStatement(node.finalizer, envId);
      if (finalResult instanceof ReturnSignal) return finalResult as unknown as RtVal;
    }

    return result;
  }

  // ─── Switch statement ─────────────────────────────────────────────────────
  private execSwitch(node: acorn.SwitchStatement, envId: string): RtVal {
    const disc = this.evalExpr(node.discriminant, envId);
    this.recordStep(nodeRange(node), "expression-eval",
      `switch (${rtToDisplay(disc, this.s.heap)}): evaluating which case matches.`);
    let matched = false;
    for (const c of node.cases) {
      if (!matched) {
        if (c.test === null) {
          // default – only match if nothing else did
          continue;
        }
        const testVal = this.evalExpr(c.test as acorn.Expression, envId);
        if (testVal === disc) {
          matched = true;
          this.recordStep(nodeRange(c), "expression-eval",
            `Switch: case \`${rtToDisplay(testVal, this.s.heap)}\` matched.`);
        }
      }
      if (matched) {
        const result = this.execBody(c.consequent, envId);
        if (result instanceof BreakSignal) return undefined;
        if (result instanceof ReturnSignal) return result as unknown as RtVal;
      }
    }
    if (!matched) {
      const def = node.cases.find((c) => c.test === null);
      if (def) {
        this.recordStep(nodeRange(def), "expression-eval", `Switch: no cases matched, executing default.`);
        const result = this.execBody(def.consequent, envId);
        if (result instanceof ReturnSignal) return result as unknown as RtVal;
      }
    }
    return undefined;
  }

  // ─── Expression evaluation ─────────────────────────────────────────────────
  private evalExpr(node: acorn.Expression | acorn.Pattern, envId: string): RtVal {
    if (this.s.steps.length >= this.s.stepLimit) {
      throw new ThrowSignal("Step limit exceeded (possible infinite loop)");
    }

    switch (node.type) {
      case "Literal": {
        const val = (node as acorn.Literal).value;
        return val as RtVal;
      }

      case "Identifier": {
        const name = (node as acorn.Identifier).name;
        return this.resolveIdentifier(name, envId, node);
      }

      case "AssignmentExpression": {
        const ae = node as acorn.AssignmentExpression;
        let val = this.evalExpr(ae.right, envId);
        if (ae.operator !== "=") {
          const current = this.evalExpr(ae.left, envId);
          val = this.applyCompoundOp(ae.operator, current, val);
        }
        this.assignTo(ae.left, val, envId, node);
        return val;
      }

      case "BinaryExpression": {
        const be = node as acorn.BinaryExpression;
        const left = this.evalExpr(be.left as acorn.Expression, envId);
        const right = this.evalExpr(be.right as acorn.Expression, envId);
        const result = this.applyBinaryOp(be.operator, left, right);
        this.recordStep(nodeRange(node), "expression-eval",
          `Binary: \`${rtToDisplay(left, this.s.heap)} ${be.operator} ${rtToDisplay(right, this.s.heap)}\` = \`${rtToDisplay(result, this.s.heap)}\``);
        return result;
      }

      case "LogicalExpression": {
        const le = node as acorn.LogicalExpression;
        const left = this.evalExpr(le.left, envId);
        if (le.operator === "&&" && !left) return left;
        if (le.operator === "||" && left) return left;
        if (le.operator === "??" && left !== null && left !== undefined) return left;
        return this.evalExpr(le.right, envId);
      }

      case "UnaryExpression": {
        const ue = node as acorn.UnaryExpression;
        const arg = this.evalExpr(ue.argument as acorn.Expression, envId);
        return this.applyUnaryOp(ue.operator, arg);
      }

      case "UpdateExpression": {
        const upe = node as acorn.UpdateExpression;
        const name = (upe.argument as acorn.Identifier).name;
        const old = this.resolveIdentifier(name, envId, node) as number;
        const newVal = upe.operator === "++" ? old + 1 : old - 1;
        this.updateBinding(name, envId, "initialized", newVal);
        this.recordStep(nodeRange(node), "assign",
          `${upe.operator === "++" ? "Increment" : "Decrement"}: \`${name}\` ${upe.operator === "++" ? "incremented from" : "decremented from"} ${old} to ${newVal}.`);
        return upe.prefix ? newVal : old;
      }

      case "CallExpression": {
        const ce = node as acorn.CallExpression;
        return this.evalCallExpr(ce, envId);
      }

      case "MemberExpression": {
        const me = node as acorn.MemberExpression;
        return this.evalMemberExpr(me, envId);
      }

      case "ObjectExpression": {
        const oe = node as acorn.ObjectExpression;
        const id = nextId("heap");
        const props: Record<string, BindingValue> = {};
        for (const prop of oe.properties) {
          if (prop.type === "Property") {
            const p = prop as acorn.Property;
            const key = p.computed
              ? String(this.evalExpr(p.key as acorn.Expression, envId))
              : (p.key as acorn.Identifier).name ?? String((p.key as acorn.Literal).value);
            const val = this.evalExpr(p.value as acorn.Expression, envId);
            props[key] = rtToBinding(val);
          }
        }
        this.s.heap[id] = { id, kind: "object", label: "Object", properties: props, prototype: null };
        this.recordStep(nodeRange(node), "expression-eval",
          `Object literal created on the heap (id: ${id}).`);
        return mkRef(id);
      }

      case "ArrayExpression": {
        const arrE = node as acorn.ArrayExpression;
        const id = nextId("heap");
        const props: Record<string, BindingValue> = { length: arrE.elements.length };
        for (let i = 0; i < arrE.elements.length; i++) {
          const el = arrE.elements[i];
          props[i] = el ? rtToBinding(this.evalExpr(el as acorn.Expression, envId)) : undefined;
        }
        this.s.heap[id] = { id, kind: "array", label: "Array", properties: props, prototype: null };
        this.recordStep(nodeRange(node), "expression-eval",
          `Array literal created on the heap (id: ${id}), length ${arrE.elements.length}.`);
        return mkRef(id);
      }

      case "FunctionExpression":
      case "ArrowFunctionExpression": {
        const fe = node as acorn.FunctionExpression | acorn.ArrowFunctionExpression;
        const name = (fe as acorn.FunctionExpression).id?.name ?? "(anonymous)";
        const fnHeapId = this.createFunctionObject(name, fe, envId);
        this.recordStep(nodeRange(node), "expression-eval",
          `Function expression \`${name}\` is defined. A closure is created capturing the current environment (id: ${envId}).`);
        return mkRef(fnHeapId);
      }

      case "TemplateLiteral": {
        const tl = node as acorn.TemplateLiteral;
        let result = "";
        for (let i = 0; i < tl.quasis.length; i++) {
          result += tl.quasis[i].value.cooked ?? "";
          if (i < tl.expressions.length) {
            result += rtToDisplay(this.evalExpr(tl.expressions[i], envId), this.s.heap);
          }
        }
        return result;
      }

      case "ConditionalExpression": {
        const cond = node as acorn.ConditionalExpression;
        const test = this.evalExpr(cond.test, envId);
        return Boolean(test)
          ? this.evalExpr(cond.consequent, envId)
          : this.evalExpr(cond.alternate, envId);
      }

      case "SequenceExpression": {
        const seq = node as acorn.SequenceExpression;
        let last: RtVal = undefined;
        for (const e of seq.expressions) last = this.evalExpr(e, envId);
        return last;
      }

      case "SpreadElement" as any: {
        return this.evalExpr((node as any).argument, envId);
      }

      case "NewExpression": {
        return this.evalNewExpr(node as acorn.NewExpression, envId);
      }

      case "ThisExpression": {
        // Walk up call stack to find this
        const ctx = this.s.callStack[this.s.callStack.length - 1];
        this.recordStep(nodeRange(node), "expression-eval",
          `\`this\` refers to: \`${rtToDisplay(ctx?.thisBinding as RtVal, this.s.heap)}\` in context "${ctx?.name}".`);
        return ctx?.thisBinding as RtVal;
      }

      default:
        this.recordStep(nodeRange(node), "unsupported",
          `Unsupported expression: \`${node.type}\` at line ${(node as any).loc?.start.line}.`);
        return undefined;
    }
  }

  // ─── Call expression ───────────────────────────────────────────────────────
  private evalCallExpr(node: acorn.CallExpression, envId: string): RtVal {
    // Handle console.log specially
    if (
      node.callee.type === "MemberExpression" &&
      (node.callee as acorn.MemberExpression).object.type === "Identifier" &&
      ((node.callee as acorn.MemberExpression).object as acorn.Identifier).name === "console"
    ) {
      const method = ((node.callee as acorn.MemberExpression).property as acorn.Identifier).name as "log" | "warn" | "error" | "info";
      const args = node.arguments.map((a) => this.evalExpr(a as acorn.Expression, envId));
      const display = args.map((a) => rtToDisplay(a, this.s.heap));
      this.s.consoleOutput.push({
        id: nextId("con"),
        method: method || "log",
        args: display,
        stepIndex: this.s.steps.length,
      });
      this.recordStep(nodeRange(node), "expression-eval",
        `console.${method}(${display.join(", ")}) → output printed to console.`);
      return undefined;
    }

    // Handle Math methods
    if (
      node.callee.type === "MemberExpression" &&
      (node.callee as acorn.MemberExpression).object.type === "Identifier" &&
      ((node.callee as acorn.MemberExpression).object as acorn.Identifier).name === "Math"
    ) {
      const method = ((node.callee as acorn.MemberExpression).property as acorn.Identifier).name;
      const args = node.arguments.map((a) => Number(this.evalExpr(a as acorn.Expression, envId)));
      const mathFns: Record<string, (...a: number[]) => number> = {
        abs: Math.abs, floor: Math.floor, ceil: Math.ceil, round: Math.round,
        sqrt: Math.sqrt, max: Math.max, min: Math.min, random: Math.random,
        pow: Math.pow, log: Math.log, log2: Math.log2, log10: Math.log10,
      };
      const result = method in mathFns ? mathFns[method](...args) : undefined;
      this.recordStep(nodeRange(node), "expression-eval",
        `Math.${method}(${args.join(", ")}) = ${result}`);
      return result as RtVal;
    }

    // Evaluate callee and thisVal
    let thisVal: RtVal = undefined;
    let callee: RtVal;

    if (node.callee.type === "MemberExpression") {
      const me = node.callee as acorn.MemberExpression;
      const obj = this.evalExpr(me.object as acorn.Expression, envId);
      thisVal = obj;
      const prop = me.computed
        ? String(this.evalExpr(me.property as acorn.Expression, envId))
        : (me.property as acorn.Identifier).name;
      callee = this.getMemberProperty(obj, prop);
    } else {
      callee = this.evalExpr(node.callee as acorn.Expression, envId);
    }

    const args = node.arguments.map((a) => this.evalExpr(a as acorn.Expression, envId));

    if (callee === undefined || callee === null) {
      throw new ThrowSignal(`TypeError: ${(node.callee as any).name ?? "value"} is not a function`);
    }

    return this.invokeCallable(callee, args, thisVal, node);
  }

  // ─── Unified callable invocation ──────────────────────────────────────────
  private invokeCallable(
    callee: RtVal,
    args: RtVal[],
    thisVal: RtVal = undefined,
    callNode: acorn.Node | null = null
  ): RtVal {
    if (typeof callee === "object" && callee !== null && (callee as any).__internal === "builtin") {
      return (callee as any).fn(...args);
    }

    if (typeof callee === "object" && callee !== null && (callee as any).__internal === "function") {
      return this.callFunction(callee as any, args, thisVal, callNode);
    }

    if (isRef(callee as BindingValue)) {
      const heapObj = this.s.heap[(callee as HeapRef).id];
      if (heapObj?.kind === "function" || heapObj?.kind === "closure") {
        const fnData = heapObj.properties.__fnData as any;
        if (fnData) return this.callFunction(fnData, args, thisVal, callNode);
      }
    }

    throw new ThrowSignal(
      `TypeError: \`${rtToDisplay(callee, this.s.heap)}\` is not a function (at line ${(callNode as any)?.loc?.start.line ?? "unknown"})`
    );
  }

  // ─── Call a user-defined function ─────────────────────────────────────────
  private callFunction(
    fn: { node: acorn.Function; envId: string; name: string; heapId: string },
    args: RtVal[],
    thisVal: RtVal = undefined,
    callNode: acorn.Node | null = null
  ): RtVal {
    if (this.s.callStack.length >= 500) {
      throw new ThrowSignal("Maximum call stack size exceeded (stack overflow)");
    }

    const fnName = fn.name || "(anonymous)";
    const fnNode = fn.node;

    // Create new function environment (lexically linked to where fn was defined)
    const fnEnvId = nextId("env");
    this.s.environments[fnEnvId] = { id: fnEnvId, bindings: {}, outer: fn.envId };

    // Create new execution context
    const ctx: ExecutionContext = {
      id: nextId("ctx"),
      type: "Function",
      name: fnName,
      phase: "Creation",
      thisBinding: rtToBinding(thisVal),
      variableEnvId: fnEnvId,
      lexicalEnvId: fnEnvId,
      outerEnvId: fn.envId,
      sourceLine: fnNode.loc?.start.line ?? 0,
    };

    this.s.callStack.push(ctx);
    this.recordStep(callNode ? nodeRange(callNode) : null, "call",
      `Calling function \`${fnName}\`. A new Function Execution Context is pushed onto the Call Stack (Creation Phase).`);

    // Creation phase: hoist params, var declarations, function declarations
    const params = fnNode.params ?? [];
    for (let i = 0; i < params.length; i++) {
      const pnames = collectPatternNames(params[i] as acorn.Pattern);
      for (const name of pnames) {
        this.setBinding(fnEnvId, name, "param", "initialized", args[i]);
        this.recordStep(null, "declare",
          `Parameter \`${name}\` = \`${rtToDisplay(args[i], this.s.heap)}\` is added to the function's variable environment.`);
      }
    }

    const body = fnNode.body;
    if (body.type === "BlockStatement") {
      this.hoistDeclarations(body.body, fnEnvId, fnEnvId, ctx);
    }

    // Switch to execution phase
    const stackTop = this.s.callStack[this.s.callStack.length - 1];
    this.s.callStack[this.s.callStack.length - 1] = { ...stackTop, phase: "Execution" };
    this.recordStep(null, "execution-phase",
      `Function \`${fnName}\` enters Execution Phase. Code inside the function now runs.`);

    let returnVal: RtVal = undefined;
    try {
      let result: RtVal;
      if (body.type === "BlockStatement") {
        result = this.execBody((body as acorn.BlockStatement).body, fnEnvId);
      } else {
        // Arrow function with expression body
        result = this.evalExpr(body as acorn.Expression, fnEnvId);
        returnVal = result;
      }
      if (result instanceof ReturnSignal) {
        returnVal = (result as unknown as ReturnSignal).value;
      }
    } catch (sig) {
      this.s.callStack.pop();
      throw sig;
    }

    this.s.callStack.pop();
    this.recordStep(callNode ? nodeRange(callNode) : null, "return",
      `Function \`${fnName}\` returns \`${rtToDisplay(returnVal, this.s.heap)}\`. Its Execution Context is popped from the Call Stack.`);
    return returnVal;
  }

  // ─── Member expression ────────────────────────────────────────────────────
  private evalMemberExpr(node: acorn.MemberExpression, envId: string): RtVal {
    const obj = this.evalExpr(node.object as acorn.Expression, envId);
    const prop = node.computed
      ? String(this.evalExpr(node.property as acorn.Expression, envId))
      : (node.property as acorn.Identifier).name;
    return this.getMemberProperty(obj, prop);
  }

  private getMemberProperty(obj: RtVal, prop: string): RtVal {
    if (obj === null || obj === undefined) {
      throw new ThrowSignal(`TypeError: Cannot read properties of ${obj} (reading '${prop}')`);
    }

    // String properties
    if (typeof obj === "string") {
      if (prop === "length") return obj.length;
      if (prop === "toUpperCase") return { __internal: "builtin", name: "String.toUpperCase", fn: () => obj.toUpperCase() } as any;
      if (prop === "toLowerCase") return { __internal: "builtin", name: "String.toLowerCase", fn: () => obj.toLowerCase() } as any;
      if (prop === "trim") return { __internal: "builtin", name: "String.trim", fn: () => obj.trim() } as any;
      if (prop === "split") return { __internal: "builtin", name: "String.split", fn: (sep: any) => {
        const id = nextId("heap");
        const parts = obj.split(String(sep));
        const props: Record<string, any> = { length: parts.length };
        parts.forEach((p, i) => (props[i] = p));
        this.s.heap[id] = { id, kind: "array", label: "Array", properties: props, prototype: null };
        return mkRef(id);
      } } as any;
      if (prop === "includes") return { __internal: "builtin", name: "String.includes", fn: (s: any) => obj.includes(String(s)) } as any;
      if (prop === "slice") return { __internal: "builtin", name: "String.slice", fn: (s: any, e: any) => obj.slice(Number(s), e !== undefined ? Number(e) : undefined) } as any;
      if (!isNaN(Number(prop))) return obj[Number(prop)];
    }

    if (!isRef(obj as BindingValue)) return undefined;
    const heapObj = this.s.heap[(obj as HeapRef).id];
    if (!heapObj) return undefined;

    // Array methods
    if (heapObj.kind === "array") {
      const len = Number(heapObj.properties.length) || 0;
      if (prop === "length") return len;
      if (prop === "push") return { __internal: "builtin", name: "Array.push", fn: (...items: RtVal[]) => {
        for (const item of items) {
          heapObj.properties[len] = rtToBinding(item);
          (heapObj.properties.length as any) = len + items.length;
        }
        return len + items.length;
      } } as any;
      if (prop === "pop") return { __internal: "builtin", name: "Array.pop", fn: () => {
        if (len === 0) return undefined;
        const last = heapObj.properties[len - 1];
        delete heapObj.properties[len - 1];
        (heapObj.properties.length as any) = len - 1;
        return last as RtVal;
      } } as any;
      if (prop === "map") return { __internal: "builtin", name: "Array.map", fn: (cb: RtVal) => {
        const resultId = nextId("heap");
        const resultProps: Record<string, any> = { length: len };
        for (let i = 0; i < len; i++) {
          const item = heapObj.properties[i] as RtVal;
          const mapped = this.invokeCallable(cb, [item, i, obj], undefined, null);
          resultProps[i] = rtToBinding(mapped);
        }
        this.s.heap[resultId] = { id: resultId, kind: "array", label: "Array", properties: resultProps, prototype: null };
        return mkRef(resultId);
      } } as any;
      if (prop === "filter") return { __internal: "builtin", name: "Array.filter", fn: (cb: RtVal) => {
        const resultId = nextId("heap");
        const resultProps: Record<string, any> = {};
        let count = 0;
        for (let i = 0; i < len; i++) {
          const item = heapObj.properties[i] as RtVal;
          const keep = Boolean(this.invokeCallable(cb, [item, i, obj], undefined, null));
          if (keep) resultProps[count++] = rtToBinding(item);
        }
        resultProps.length = count;
        this.s.heap[resultId] = { id: resultId, kind: "array", label: "Array", properties: resultProps, prototype: null };
        return mkRef(resultId);
      } } as any;
      if (prop === "forEach") return { __internal: "builtin", name: "Array.forEach", fn: (cb: RtVal) => {
        for (let i = 0; i < len; i++) {
          const item = heapObj.properties[i] as RtVal;
          this.invokeCallable(cb, [item, i, obj], undefined, null);
        }
        return undefined;
      } } as any;
      if (prop === "reduce") return { __internal: "builtin", name: "Array.reduce", fn: (cb: RtVal, init: RtVal) => {
        let acc = init;
        for (let i = 0; i < len; i++) {
          const item = heapObj.properties[i] as RtVal;
          acc = this.invokeCallable(cb, [acc, item, i, obj], undefined, null);
        }
        return acc;
      } } as any;
      if (prop === "join") return { __internal: "builtin", name: "Array.join", fn: (sep: RtVal = ",") => {
        const parts = Array.from({ length: len }, (_, i) => rtToDisplay(heapObj.properties[i] as RtVal, this.s.heap));
        return parts.join(String(sep));
      } } as any;
      if (prop === "includes") return { __internal: "builtin", name: "Array.includes", fn: (val: RtVal) => {
        for (let i = 0; i < len; i++) if (heapObj.properties[i] === val) return true;
        return false;
      } } as any;
      if (prop === "indexOf") return { __internal: "builtin", name: "Array.indexOf", fn: (val: RtVal) => {
        for (let i = 0; i < len; i++) if (heapObj.properties[i] === val) return i;
        return -1;
      } } as any;
      if (prop === "slice") return { __internal: "builtin", name: "Array.slice", fn: (start: RtVal = 0, end: RtVal = len) => {
        const resultId = nextId("heap");
        const s = Number(start), e = Number(end);
        const sliced = Array.from({ length: Math.max(0, e - s) }, (_, i) => heapObj.properties[i + s] ?? undefined);
        const resultProps: Record<string, any> = { length: sliced.length };
        sliced.forEach((v, i) => (resultProps[i] = v));
        this.s.heap[resultId] = { id: resultId, kind: "array", label: "Array", properties: resultProps, prototype: null };
        return mkRef(resultId);
      } } as any;
      if (!isNaN(Number(prop))) return heapObj.properties[Number(prop)] as RtVal;
    }

    // Regular object
    const propVal = heapObj.properties[prop];
    return (propVal as RtVal) ?? undefined;
  }

  // ─── New expression ────────────────────────────────────────────────────────
  private evalNewExpr(node: acorn.NewExpression, envId: string): RtVal {
    const callee = this.evalExpr(node.callee, envId);
    const args = node.arguments.map((a) => this.evalExpr(a as acorn.Expression, envId));

    const newObjId = nextId("heap");
    this.s.heap[newObjId] = { id: newObjId, kind: "object", label: "instance", properties: {}, prototype: null };
    const newObj = mkRef(newObjId);

    this.recordStep(nodeRange(node), "call",
      `new expression: creating a new object instance on the heap (id: ${newObjId}), then calling the constructor.`);

    if (typeof callee === "object" && (callee as any).__internal === "function") {
      const result = this.callFunction(callee as any, args, newObj, node);
      if (result && isRef(result as BindingValue)) return result;
    }

    return newObj;
  }

  // ─── Identifier resolution (scope chain walk) ─────────────────────────────
  private resolveIdentifier(name: string, envId: string, node: acorn.Node | null): RtVal {
    let currentEnvId: string | null = envId;
    while (currentEnvId !== null) {
      const env: EnvironmentRecord | undefined = this.s.environments[currentEnvId];
      if (!env) break;
      if (name in env.bindings) {
        const binding = env.bindings[name];
        if (binding.state === "uninitialized") {
          // TDZ error
          this.recordStep(node ? nodeRange(node) : null, "tdz-error",
            `ReferenceError: Cannot access \`${name}\` before initialization. It is in the Temporal Dead Zone (TDZ) at this point!`);
          throw new ThrowSignal(`ReferenceError: Cannot access '${name}' before initialization`);
        }
        // If this is an untouched built-in binding, return the callable builtin
        if (typeof binding.value === "string" && binding.value === `[built-in: ${name}]` && name in this.builtins) {
          return { __internal: "builtin", name, fn: this.builtins[name] };
        }
        this.recordStep(node ? nodeRange(node) : null, "expression-eval",
          `Reading \`${name}\` = \`${rtToDisplay(binding.value as RtVal, this.s.heap)}\` from environment ${currentEnvId}.`, { lookupBinding: `${currentEnvId}/${name}` });
        return binding.value as RtVal;
      }
      currentEnvId = env.outer;
    }
    if (name in this.builtins) {
      return { __internal: "builtin", name, fn: this.builtins[name] };
    }
    // Not found anywhere
    this.recordStep(node ? nodeRange(node) : null, "throw",
      `ReferenceError: \`${name}\` is not defined. It was not found in any scope in the scope chain.`);
    throw new ThrowSignal(`ReferenceError: ${name} is not defined`);
  }

  // ─── Assignment ──────────────────────────────────────────────────────────
  private assignTo(target: acorn.Pattern | acorn.Expression, val: RtVal, envId: string, node: acorn.Node | null) {
    if (target.type === "Identifier") {
      const name = (target as acorn.Identifier).name;
      this.updateBinding(name, envId, "initialized", val);
      this.recordStep(node ? nodeRange(node) : null, "assign",
        `\`${name}\` is assigned the value \`${rtToDisplay(val, this.s.heap)}\`.`);
    } else if (target.type === "MemberExpression") {
      const me = target as acorn.MemberExpression;
      const obj = this.evalExpr(me.object as acorn.Expression, envId);
      const prop = me.computed
        ? String(this.evalExpr(me.property as acorn.Expression, envId))
        : (me.property as acorn.Identifier).name;
      if (isRef(obj as BindingValue)) {
        const heapObj = this.s.heap[(obj as HeapRef).id];
        if (heapObj) {
          heapObj.properties[prop] = rtToBinding(val);
          this.recordStep(node ? nodeRange(node) : null, "assign",
            `Property \`${prop}\` on heap object \`${heapObj.label}\` (id: ${heapObj.id}) set to \`${rtToDisplay(val, this.s.heap)}\`.`);
        }
      }
    }
  }

  // ─── Compound operator (+=, -=, etc.) ─────────────────────────────────────
  private applyCompoundOp(op: string, left: RtVal, right: RtVal): RtVal {
    const l = left as number;
    const r = right as number;
    switch (op) {
      case "+=": return typeof left === "string" ? left + String(right) : l + r;
      case "-=": return l - r;
      case "*=": return l * r;
      case "/=": return l / r;
      case "%=": return l % r;
      case "**=": return l ** r;
      case "&=": return l & r;
      case "|=": return l | r;
      case "^=": return l ^ r;
      case "<<=": return l << r;
      case ">>=": return l >> r;
      case ">>>=": return l >>> r;
      default: return right;
    }
  }

  // ─── Binary operators ─────────────────────────────────────────────────────
  private applyBinaryOp(op: string, left: RtVal, right: RtVal): RtVal {
    const l = left as number;
    const r = right as number;
    switch (op) {
      case "+":
        return (typeof left === "string" || typeof right === "string")
          ? String(left) + String(right)
          : l + r;
      case "-": return l - r;
      case "*": return l * r;
      case "/": return l / r;
      case "%": return l % r;
      case "**": return l ** r;
      case "===": return left === right;
      case "!==": return left !== right;
      case "==": return left == right; // eslint-disable-line eqeqeq
      case "!=": return left != right; // eslint-disable-line eqeqeq
      case "<": return l < r;
      case "<=": return l <= r;
      case ">": return l > r;
      case ">=": return l >= r;
      case "&": return l & r;
      case "|": return l | r;
      case "^": return l ^ r;
      case "<<": return l << r;
      case ">>": return l >> r;
      case ">>>": return l >>> r;
      case "instanceof": return false; // simplified
      case "in":
        if (isRef(right as BindingValue)) {
          const obj = this.s.heap[(right as HeapRef).id];
          return obj ? String(left) in obj.properties : false;
        }
        return false;
      default: return undefined;
    }
  }

  // ─── Unary operators ──────────────────────────────────────────────────────
  private applyUnaryOp(op: string, val: RtVal): RtVal {
    switch (op) {
      case "-": return -(val as number);
      case "+": return +(val as number);
      case "!": return !val;
      case "~": return ~(val as number);
      case "typeof":
        if (val === null) return "object";
        if (isRef(val as BindingValue)) {
          const obj = this.s.heap[(val as HeapRef).id];
          return obj?.kind === "function" ? "function" : "object";
        }
        return typeof val;
      case "void": return undefined;
      default: return val;
    }
  }

  // ─── Create function heap object ──────────────────────────────────────────
  private createFunctionObject(
    name: string,
    node: acorn.Function,
    capturedEnvId: string
  ): string {
    const id = nextId("heap");
    const kind: HeapObjectKind = "function";
    const fnData = { __internal: "function", envId: capturedEnvId, node, name, heapId: id };
    this.s.heap[id] = {
      id,
      kind,
      label: name,
      properties: {
        name,
        length: node.params?.length ?? 0,
        __fnData: fnData as any,
      },
      prototype: null,
      capturedEnvIds: [capturedEnvId],
      sourceRange: node.loc
        ? [node.loc.start.line, node.loc.end.line]
        : undefined,
    };
    return id;
  }

  // ─── Environment helpers ──────────────────────────────────────────────────
  private setBinding(envId: string, name: string, kind: BindingKind, state: BindingState, value: RtVal) {
    const env = this.s.environments[envId];
    if (!env) return;
    env.bindings[name] = { kind, state, value: rtToBinding(value) };
    this.s.changedBindings.push(`${envId}/${name}`);
  }

  private updateBinding(name: string, fromEnvId: string, state: BindingState, value: RtVal) {
    let currentEnvId: string | null = fromEnvId;
    while (currentEnvId !== null) {
      const env: EnvironmentRecord | undefined = this.s.environments[currentEnvId];
      if (!env) break;
      if (name in env.bindings) {
        env.bindings[name] = { ...env.bindings[name], state, value: rtToBinding(value) };
        this.s.changedBindings.push(`${currentEnvId}/${name}`);
        return;
      }
      currentEnvId = env.outer;
    }
    // Global assignment for undeclared vars
    const globalEnv = Object.values(this.s.environments).find((e) => e.outer === null);
    if (globalEnv) {
      globalEnv.bindings[name] = { kind: "var", state, value: rtToBinding(value) };
      this.s.changedBindings.push(`${globalEnv.id}/${name}`);
    }
  }

  private lookupBinding(name: string, envId: string): Binding | null {
    let currentEnvId: string | null = envId;
    while (currentEnvId !== null) {
      const env: EnvironmentRecord | undefined = this.s.environments[currentEnvId];
      if (!env) break;
      if (name in env.bindings) return env.bindings[name];
      currentEnvId = env.outer;
    }
    return null;
  }

  // ─── Step recording ───────────────────────────────────────────────────────
  private recordStep(
    range: SourceRange | null,
    eventType: TraceEventType,
    explanation: string,
    extra?: Partial<TraceStep>
  ) {
    const step: TraceStep = {
      index: this.s.steps.length,
      nodeRange: range,
      eventType,
      explanation,
      callStack: deepClone(this.s.callStack),
      environments: deepClone(this.s.environments),
      heap: deepClone(this.s.heap),
      webApis: deepClone(this.s.webApis),
      microtaskQueue: deepClone(this.s.microtaskQueue),
      macrotaskQueue: deepClone(this.s.macrotaskQueue),
      eventLoopState: this.s.eventLoopState,
      consoleOutput: deepClone(this.s.consoleOutput),
      changedBindings: [...this.s.changedBindings],
      ...extra,
    };
    this.s.steps.push(step);
    this.s.changedBindings = []; // reset after recording
  }
}

// ─── Helper: extract source range from AST node ────────────────────────────
function nodeRange(node: acorn.Node | null | undefined): SourceRange | null {
  if (!node || !node.loc) return null;
  return {
    startLine: node.loc.start.line,
    endLine: node.loc.end.line,
    startCol: node.loc.start.column,
    endCol: node.loc.end.column,
  };
}

// ─── Helper: collect identifiers from patterns ────────────────────────────
function collectPatternNames(pattern: acorn.Pattern): string[] {
  if (!pattern) return [];
  if (pattern.type === "Identifier") return [(pattern as acorn.Identifier).name];
  if (pattern.type === "AssignmentPattern") {
    return collectPatternNames((pattern as acorn.AssignmentPattern).left as acorn.Pattern);
  }
  if (pattern.type === "ArrayPattern") {
    return (pattern as acorn.ArrayPattern).elements.flatMap((e) =>
      e ? collectPatternNames(e as acorn.Pattern) : []
    );
  }
  if (pattern.type === "ObjectPattern") {
    return (pattern as acorn.ObjectPattern).properties.flatMap((p) => {
      if (p.type === "RestElement") return collectPatternNames((p as acorn.RestElement).argument as acorn.Pattern);
      return collectPatternNames((p as acorn.Property).value as acorn.Pattern);
    });
  }
  if (pattern.type === "RestElement") {
    return collectPatternNames((pattern as acorn.RestElement).argument as acorn.Pattern);
  }
  return [];
}

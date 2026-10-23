// src/tools/dbv/engine/interpreter.ts
// Step-by-step AST interpreter for JavaScript
// Uses acorn for parsing and generator functions for pauseable execution
// Produces an array of TraceStep snapshots (immutable, time-travel safe)
import * as acorn from "acorn";
// ─── ID generators ────────────────────────────────────────────────────────────
let _id = 0;
const nextId = (prefix = "id") => `${prefix}-${++_id}`;
// ─── Deep clone helper (for immutable snapshots) ─────────────────────────────
function deepClone(val) {
    return JSON.parse(JSON.stringify(val));
}
// ─── Heap reference helper ────────────────────────────────────────────────────
function isRef(v) {
    return typeof v === "object" && v !== null && v.type === "ref";
}
function mkRef(id) {
    return { type: "ref", id };
}
function rtToBinding(v) {
    if (v === null || v === undefined || typeof v === "number" || typeof v === "string" || typeof v === "boolean")
        return v;
    if (isRef(v))
        return v;
    if (typeof v === "object" && v.__internal === "function")
        return mkRef(v.heapId);
    if (typeof v === "object" && v !== null && v.__internal === "builtin")
        return v;
    return String(v);
}
function rtToDisplay(v, heap) {
    if (v === undefined)
        return "undefined";
    if (v === null)
        return "null";
    if (typeof v === "string")
        return JSON.stringify(v);
    if (typeof v === "number" || typeof v === "boolean")
        return String(v);
    if (isRef(v)) {
        const obj = heap[v.id];
        if (!obj)
            return "[object]";
        if (obj.kind === "function")
            return `[Function: ${obj.label}]`;
        if (obj.kind === "array") {
            const items = obj.properties;
            const len = Number(items.length) || 0;
            const vals = Array.from({ length: len }, (_, i) => rtToDisplay(items[i], heap));
            return `[${vals.join(", ")}]`;
        }
        const entries = Object.entries(obj.properties)
            .map(([k, vv]) => `${k}: ${rtToDisplay(vv, heap)}`)
            .join(", ");
        return `{${entries}}`;
    }
    if (typeof v === "object" && v.__internal === "function")
        return `[Function: ${v.name}]`;
    if ((typeof v === "object" || typeof v === "function") && v?.__internal === "builtin")
        return `[built-in: ${v.fnName || v.name}]`;
    return String(v);
}
// ─── Signal types for control flow ────────────────────────────────────────────
class ReturnSignal {
    value;
    constructor(value) {
        this.value = value;
    }
}
class ThrowSignal {
    value;
    node;
    kind;
    stack;
    constructor(value, node = null, kind = "runtime", callStack = []) {
        this.value = value;
        this.node = node;
        this.kind = kind;
        this.stack = Array.isArray(callStack) ? callStack.map(ctx => ({
            fnName: ctx.name || "(anonymous)",
            line: ctx.callSiteLine || ctx.sourceLine || 1,
            column: ctx.callSiteColumn || 1,
        })) : [];
    }
}
class BreakSignal {
    label;
    constructor(label) {
        this.label = label;
    }
}
class ContinueSignal {
    label;
    constructor(label) {
        this.label = label;
    }
}
class AwaitSignal {
    value;
    node;
    remainingStmts;
    targetVar;
    constructor(value, node) {
        this.value = value;
        this.node = node;
        this.remainingStmts = [];
        this.targetVar = null;
    }
}
// ─── Main interpreter class ───────────────────────────────────────────────────
export class Interpreter {
    s;
    builtins = {};
    _currentNode = null;
    _sourceCode = "";

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

    buildSourceSnippet(source, line, column, endLine, endColumn) {
        if (!source || !line) return "";
        const lines = source.split("\n");
        const targetIdx = line - 1;
        if (targetIdx < 0 || targetIdx >= lines.length) return "";

        const startIdx = Math.max(0, targetIdx - 1);
        const endIdx = Math.min(lines.length - 1, targetIdx + 1);
        const maxLineNumWidth = String(endIdx + 1).length;

        const snippetLines = [];
        for (let i = startIdx; i <= endIdx; i++) {
            const lineNum = String(i + 1).padStart(maxLineNumWidth, " ");
            snippetLines.push(`  ${lineNum} | ${lines[i]}`);
            if (i === targetIdx) {
                const pad = Math.max(0, (column ?? 1) - 1);
                const lineLen = lines[i].length;
                let span = 1;
                if (endLine === line && endColumn > column) {
                    span = Math.max(1, endColumn - column);
                } else if (lineLen > pad) {
                    span = Math.max(1, lineLen - pad);
                }
                snippetLines.push(`  ${" ".repeat(maxLineNumWidth)} | ${" ".repeat(pad)}${"^".repeat(Math.min(span, 60))}`);
            }
        }
        return snippetLines.join("\n");
    }

    createThrowSignal(value, node = null, kind = "runtime") {
        return new ThrowSignal(value, node || this._currentNode, kind, this.s.callStack);
    }

    buildDBVError(rawVal, node = null, kind = "runtime", capturedStack = null) {
        let name = "Error";
        let message = "";

        if (isRef(rawVal) && this.s.heap[rawVal.id]) {
            const obj = this.s.heap[rawVal.id];
            name = obj.properties?.name || obj.label || "Error";
            message = obj.properties?.message !== undefined ? String(obj.properties.message) : rtToDisplay(rawVal, this.s.heap);
        } else if (typeof rawVal === "string") {
            const match = rawVal.match(/^([A-Z][a-zA-Z0-9_]*Error):\s*(.*)$/);
            if (match) {
                name = match[1];
                message = match[2];
            } else {
                message = rawVal;
            }
        } else if (rawVal && typeof rawVal === "object" && rawVal.name && rawVal.message) {
            name = rawVal.name;
            message = rawVal.message;
        } else {
            message = rtToDisplay(rawVal, this.s.heap);
        }

        // Clean message of any "Uncaught " prefix
        message = message.replace(/^Uncaught\s+/, "");

        const locNode = node || this._currentNode;
        const line = locNode?.loc?.start?.line ?? 1;
        const column = (locNode?.loc?.start?.column ?? 0) + 1;
        const endLine = locNode?.loc?.end?.line ?? line;
        const endColumn = (locNode?.loc?.end?.column !== undefined ? locNode.loc.end.column + 1 : column + 1);

        let stack = [];
        if (capturedStack && capturedStack.length > 0) {
            stack = [...capturedStack].reverse();
        } else {
            for (let i = this.s.callStack.length - 1; i >= 0; i--) {
                const ctx = this.s.callStack[i];
                if (ctx) {
                    stack.push({
                        fnName: ctx.name || "(anonymous)",
                        line: ctx.callSiteLine || ctx.sourceLine || line,
                        column: ctx.callSiteColumn || 1,
                    });
                }
            }
        }

        const sourceSnippet = this.buildSourceSnippet(this._sourceCode, line, column, endLine, endColumn);

        return {
            name,
            message,
            stack,
            line,
            column,
            endLine,
            endColumn,
            kind,
            sourceSnippet,
        };
    }

    // ─── Public entry point ────────────────────────────────────────────────────
    run(code) {
        this._sourceCode = code;
        this._currentNode = null;
        let ast;
        try {
            ast = acorn.parse(code, {
                ecmaVersion: 2022,
                sourceType: "script",
                locations: true,
            });
        }
        catch (err) {
            const line = err.loc?.line ?? 1;
            const column = (err.loc?.column ?? 0) + 1;
            const cleanMsg = (err.message || "Syntax error").replace(/\s*\(\d+:\d+\)$/, "");
            const snippet = this.buildSourceSnippet(code, line, column, line, column + 1);
            const dbvErr = {
                name: "SyntaxError",
                message: cleanMsg,
                stack: [],
                line,
                column,
                endLine: line,
                endColumn: column + 1,
                kind: "parse",
                sourceSnippet: snippet,
            };
            const parseErr = {
                index: 0,
                nodeRange: { startLine: line, endLine: line, startCol: column, endCol: column + 1 },
                eventType: "throw",
                explanation: `SyntaxError: ${cleanMsg}`,
                callStack: [],
                environments: {},
                heap: {},
                webApis: [],
                microtaskQueue: [],
                macrotaskQueue: [],
                eventLoopState: "idle",
                consoleOutput: [{
                    id: nextId("con"),
                    method: "error",
                    args: [`Uncaught SyntaxError: ${cleanMsg}`],
                    stepIndex: 0,
                    error: dbvErr,
                }],
                changedBindings: [],
                error: dbvErr,
            };
            return [parseErr];
        }
        // Create intrinsics environment (hidden built-ins realm)
        const intrinsicsEnvId = nextId("env");
        this.s.environments[intrinsicsEnvId] = {
            id: intrinsicsEnvId,
            bindings: {},
            outer: null,
            isIntrinsics: true,
        };
        this.setupBuiltins(intrinsicsEnvId);

        // Create global environment (user bindings only, inherits from intrinsics)
        const globalEnvId = nextId("env");
        this.s.environments[globalEnvId] = {
            id: globalEnvId,
            bindings: {},
            outer: intrinsicsEnvId,
            isIntrinsics: false,
        };

        // Create global execution context
        const globalCtx = {
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

        // Creation phase: hoist all top-level declarations
        this.hoistDeclarations(ast.body, globalEnvId, globalEnvId, globalCtx);
        this.recordStep(null, "creation-phase", "Creation phase complete. var declarations are set to undefined, function declarations are fully hoisted, let/const are in the Temporal Dead Zone (TDZ).");
        // Switch to execution phase
        this.s.callStack[0] = { ...this.s.callStack[0], phase: "Execution" };
        this.recordStep(null, "execution-phase", "Execution phase begins. The engine now runs the code line by line.");
        // Execute top-level statements
        try {
            this.execBody(ast.body, globalEnvId);
        }
        catch (sig) {
            if (sig instanceof ThrowSignal) {
                const dbvErr = this.buildDBVError(sig.value, sig.node, sig.kind || "runtime", sig.stack);
                const msg = `${dbvErr.name}: ${dbvErr.message}`;
                this.s.consoleOutput.push({
                    id: nextId("con"),
                    method: "error",
                    args: [`Uncaught ${msg}`],
                    stepIndex: this.s.steps.length,
                    error: dbvErr,
                });
                this.recordStep(sig.node ? nodeRange(sig.node) : (this._currentNode ? nodeRange(this._currentNode) : null), "throw", `Uncaught error: ${msg}`, {
                    error: dbvErr,
                });
            }
        }
        // Drain Event Loop (Microtasks and Macrotasks)
        this.drainEventLoop();
        return this.s.steps;
    }
    // ─── Built-in setup ────────────────────────────────────────────────────────
    setupBuiltins(envId) {
        const builtins = [
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
                    const props = { length: a.length };
                    a.forEach((v, i) => (props[i] = rtToBinding(v)));
                    this.s.heap[id] = { id, kind: "array", label: "Array", properties: props, prototype: null };
                    return mkRef(id);
                }],
            ["Object", (() => {
                const objFn = (...a) => {
                    if (a[0] === null || a[0] === undefined) {
                        const id = nextId("heap");
                        this.s.heap[id] = { id, kind: "object", label: "Object", properties: {}, prototype: null };
                        return mkRef(id);
                    }
                    return a[0];
                };
                objFn.__internal = "builtin";
                objFn.fnName = "Object";
                objFn.assign = {
                    __internal: "builtin",
                    name: "Object.assign",
                    fn: (target, ...sources) => {
                        if (!isRef(target)) return target;
                        const targetObj = this.s.heap[target.id];
                        if (!targetObj) return target;
                        for (const src of sources) {
                            if (isRef(src)) {
                                const srcObj = this.s.heap[src.id];
                                if (srcObj?.properties) {
                                    Object.assign(targetObj.properties, srcObj.properties);
                                }
                            } else if (typeof src === "object" && src !== null) {
                                Object.assign(targetObj.properties, src);
                            }
                        }
                        return target;
                    }
                };
                return objFn;
            })()],
            ["Math", () => {
                    const id = nextId("heap");
                    this.s.heap[id] = {
                        id, kind: "object", label: "Math", prototype: null,
                        properties: { PI: Math.PI, E: Math.E, abs: "[built-in]", floor: "[built-in]", ceil: "[built-in]", round: "[built-in]", sqrt: "[built-in]", max: "[built-in]", min: "[built-in]", random: "[built-in]" },
                    };
                    return mkRef(id);
                }],
            ["JSON", () => undefined],
            ["Error", (...a) => {
                    const id = nextId("heap");
                    this.s.heap[id] = { id, kind: "object", label: "Error", properties: { name: "Error", message: String(a[0] ?? "") }, prototype: null };
                    return mkRef(id);
                }],
            ["TypeError", (...a) => {
                    const id = nextId("heap");
                    this.s.heap[id] = { id, kind: "object", label: "TypeError", properties: { name: "TypeError", message: String(a[0] ?? "") }, prototype: null };
                    return mkRef(id);
                }],
            ["RangeError", (...a) => {
                    const id = nextId("heap");
                    this.s.heap[id] = { id, kind: "object", label: "RangeError", properties: { name: "RangeError", message: String(a[0] ?? "") }, prototype: null };
                    return mkRef(id);
                }],
            ["ReferenceError", (...a) => {
                    const id = nextId("heap");
                    this.s.heap[id] = { id, kind: "object", label: "ReferenceError", properties: { name: "ReferenceError", message: String(a[0] ?? "") }, prototype: null };
                    return mkRef(id);
                }],
            ["SyntaxError", (...a) => {
                    const id = nextId("heap");
                    this.s.heap[id] = { id, kind: "object", label: "SyntaxError", properties: { name: "SyntaxError", message: String(a[0] ?? "") }, prototype: null };
                    return mkRef(id);
                }],
            ["setTimeout", (...a) => {
                    const id = nextId("wa");
                    const cb = a[0];
                    const ms = Number(a[1]) || 0;
                    const cbRef = isRef(cb) ? cb.id : undefined;
                    this.s.webApis.push({ id, kind: "setTimeout", label: `setTimeout(${ms}ms)`, remainingMs: ms, callbackRef: cbRef });
                    this.s.macrotaskQueue.push({ id: nextId("mt"), kind: "macrotask", label: `setTimeout cb (${ms}ms)`, callback: cb, webApiId: id });
                    this.recordStep(null, "enqueue-task", `setTimeout() called with ${ms}ms delay. The callback is sent to Web APIs and will be queued in the Callback Queue after ${ms}ms.`);
                    return id;
                }],
            ["queueMicrotask", (...a) => {
                    const id = nextId("micro");
                    const cb = a[0];
                    this.s.microtaskQueue.push({ id, kind: "microtask", label: "queueMicrotask cb", callback: cb });
                    this.recordStep(null, "enqueue-task", "queueMicrotask() queued a microtask into the Microtask Queue (High Priority).");
                    return undefined;
                }],
            ["clearTimeout", (id) => {
                    this.s.webApis = this.s.webApis.filter((w) => w.id !== id);
                    this.s.macrotaskQueue = this.s.macrotaskQueue.filter((m) => m.webApiId !== id);
                    this.recordStep(null, "event-loop-tick", `clearTimeout() canceled task.`);
                    return undefined;
                }],
            ["setInterval", (...a) => {
                    const id = nextId("wa");
                    const cb = a[0];
                    const ms = Number(a[1]) || 0;
                    const cbRef = isRef(cb) ? cb.id : undefined;
                    this.s.webApis.push({ id, kind: "setInterval", label: `setInterval(${ms}ms)`, remainingMs: ms, callbackRef: cbRef });
                    this.s.macrotaskQueue.push({ id: nextId("mt"), kind: "macrotask", label: `setInterval cb (${ms}ms)`, callback: cb, webApiId: id });
                    this.recordStep(null, "enqueue-task", `setInterval() registered in Web APIs.`);
                    return id;
                }],
            ["clearInterval", (id) => {
                    this.s.webApis = this.s.webApis.filter((w) => w.id !== id);
                    this.s.macrotaskQueue = this.s.macrotaskQueue.filter((m) => m.webApiId !== id);
                    this.recordStep(null, "event-loop-tick", `clearInterval() canceled interval.`);
                    return undefined;
                }],
            ["Promise", this.getPromiseConstructor()],
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
    // ─── Spec-Accurate Promise Implementation ──────────────────────────────────
    getPromiseConstructor() {
        const promiseCtor = (executor) => this.constructPromise(executor);
        promiseCtor.__internal = "builtin";
        promiseCtor.fnName = "Promise";
        promiseCtor.resolve = {
            __internal: "builtin",
            name: "Promise.resolve",
            fn: (val) => {
                if (isRef(val) && this.s.heap[val.id]?.kind === "promise") return val;
                const id = nextId("heap");
                this.s.heap[id] = {
                    id, kind: "promise", label: "Promise (pending)", state: "pending",
                    value: undefined, reactions: [], handled: false, prototype: null, properties: {}
                };
                this.fulfillPromiseOrAdopt(id, val);
                return mkRef(id);
            }
        };
        promiseCtor.reject = {
            __internal: "builtin",
            name: "Promise.reject",
            fn: (err) => {
                const id = nextId("heap");
                this.s.heap[id] = {
                    id, kind: "promise", label: "Promise (rejected)", state: "rejected",
                    value: err, reactions: [], handled: false, prototype: null, properties: {}
                };
                return mkRef(id);
            }
        };
        promiseCtor.all = {
            __internal: "builtin",
            name: "Promise.all",
            fn: (iterable) => this.promiseAll(iterable)
        };
        promiseCtor.allSettled = {
            __internal: "builtin",
            name: "Promise.allSettled",
            fn: (iterable) => this.promiseAllSettled(iterable)
        };
        promiseCtor.race = {
            __internal: "builtin",
            name: "Promise.race",
            fn: (iterable) => this.promiseRace(iterable)
        };
        promiseCtor.any = {
            __internal: "builtin",
            name: "Promise.any",
            fn: (iterable) => this.promiseAny(iterable)
        };
        return promiseCtor;
    }
    constructPromise(executor, callNode) {
        const promiseId = nextId("heap");
        this.s.heap[promiseId] = {
            id: promiseId,
            kind: "promise",
            label: "Promise (pending)",
            state: "pending",
            value: undefined,
            reactions: [],
            handled: false,
            prototype: null,
            properties: {},
        };
        const promiseRef = mkRef(promiseId);

        if (!this.isCallable(executor)) {
            throw this.createThrowSignal(`TypeError: Promise resolver ${rtToDisplay(executor, this.s.heap)} is not a function`, callNode);
        }

        let alreadySettled = false;
        const resolve = (resolution) => {
            if (alreadySettled) return;
            alreadySettled = true;
            this.fulfillPromiseOrAdopt(promiseId, resolution);
        };
        const reject = (reason) => {
            if (alreadySettled) return;
            alreadySettled = true;
            this.rejectPromise(promiseId, reason);
        };

        const resolveCallable = {
            __internal: "builtin",
            name: "resolve",
            fn: resolve,
        };
        const rejectCallable = {
            __internal: "builtin",
            name: "reject",
            fn: reject,
        };

        try {
            this.call(executor, undefined, [resolveCallable, rejectCallable], callNode);
        } catch (err) {
            const errVal = err instanceof ThrowSignal ? err.value : err;
            reject(errVal);
        }

        return promiseRef;
    }
    fulfillPromiseOrAdopt(promiseId, resolution) {
        const p = this.s.heap[promiseId];
        if (!p || p.state !== "pending") return;

        if (isRef(resolution) && resolution.id === promiseId) {
            this.rejectPromise(promiseId, "TypeError: Chaining cycle detected for promise #<Promise>");
            return;
        }

        // Check if resolution is a thenable (has a .then method)
        let thenMethod = null;
        if (isRef(resolution) || (typeof resolution === "object" && resolution !== null)) {
            try {
                thenMethod = this.getMemberProperty(resolution, "then");
            } catch {
                // ignore
            }
        }

        if (thenMethod && this.isCallable(thenMethod)) {
            // Extra microtask hop to adopt thenable
            this.s.microtaskQueue.push({
                id: nextId("micro"),
                kind: "microtask",
                label: "promiseResolveThenableJob",
                callback: {
                    __internal: "builtin",
                    name: "resolveThenable",
                    fn: () => {
                        let settled = false;
                        const resFn = {
                            __internal: "builtin",
                            name: "resolve",
                            fn: (v) => {
                                if (!settled) {
                                    settled = true;
                                    this.fulfillPromiseOrAdopt(promiseId, v);
                                }
                            }
                        };
                        const rejFn = {
                            __internal: "builtin",
                            name: "reject",
                            fn: (r) => {
                                if (!settled) {
                                    settled = true;
                                    this.rejectPromise(promiseId, r);
                                }
                            }
                        };
                        try {
                            this.call(thenMethod, resolution, [resFn, rejFn]);
                        } catch (err) {
                            if (!settled) {
                                settled = true;
                                this.rejectPromise(promiseId, err instanceof ThrowSignal ? err.value : err);
                            }
                        }
                    }
                }
            });
            return;
        }

        p.state = "fulfilled";
        p.value = resolution;
        p.label = "Promise (fulfilled)";
        this.recordStep(null, "promise-settled", `Promise fulfilled with value \`${rtToDisplay(resolution, this.s.heap)}\`.`);

        const reactions = p.reactions || [];
        p.reactions = [];
        for (const r of reactions) {
            this.queuePromiseReactionJob(r, "fulfilled", resolution);
        }
    }
    rejectPromise(promiseId, reason) {
        const p = this.s.heap[promiseId];
        if (!p || p.state !== "pending") return;

        p.state = "rejected";
        p.value = reason;
        p.label = "Promise (rejected)";
        this.recordStep(null, "promise-settled", `Promise rejected with reason \`${rtToDisplay(reason, this.s.heap)}\`.`);

        const reactions = p.reactions || [];
        if (reactions.length > 0) {
            p.handled = true;
        }
        p.reactions = [];
        for (const r of reactions) {
            this.queuePromiseReactionJob(r, "rejected", reason);
        }
    }
    queuePromiseReactionJob(reaction, state, valueOrReason) {
        const isFulfilled = state === "fulfilled";
        const handler = isFulfilled ? reaction.onFulfilled : reaction.onRejected;
        const taskLabel = isFulfilled ? "then callback" : "catch callback";

        this.s.microtaskQueue.push({
            id: nextId("micro"),
            kind: "microtask",
            label: taskLabel,
            callback: {
                __internal: "builtin",
                name: isFulfilled ? "thenReaction" : "catchReaction",
                fn: () => {
                    if (!reaction.childId) return;
                    if (isFulfilled) {
                        if (this.isCallable(handler)) {
                            try {
                                const res = this.call(handler, undefined, [valueOrReason]);
                                this.fulfillPromiseOrAdopt(reaction.childId, res);
                            } catch (err) {
                                const errVal = err instanceof ThrowSignal ? err.value : err;
                                this.rejectPromise(reaction.childId, errVal);
                            }
                        } else {
                            this.fulfillPromiseOrAdopt(reaction.childId, valueOrReason);
                        }
                    } else {
                        // Rejection path
                        if (this.isCallable(handler)) {
                            try {
                                const res = this.call(handler, undefined, [valueOrReason]);
                                // Recovery: catch handler resolved derived promise
                                this.fulfillPromiseOrAdopt(reaction.childId, res);
                            } catch (err) {
                                const errVal = err instanceof ThrowSignal ? err.value : err;
                                this.rejectPromise(reaction.childId, errVal);
                            }
                        } else {
                            // Pass-through rejection
                            this.rejectPromise(reaction.childId, valueOrReason);
                        }
                    }
                }
            }
        });
        this.recordStep(null, "enqueue-task", `Promise: registered reaction queued as microtask "${taskLabel}".`);
    }
    promiseAll(iterable) {
        const id = nextId("heap");
        this.s.heap[id] = {
            id, kind: "promise", label: "Promise (pending)", state: "pending",
            value: undefined, reactions: [], handled: false, prototype: null, properties: {}
        };
        let items = [];
        if (isRef(iterable) && this.s.heap[iterable.id]?.kind === "array") {
            const len = Number(this.s.heap[iterable.id].properties.length) || 0;
            items = Array.from({ length: len }, (_, i) => this.s.heap[iterable.id].properties[i]);
        } else if (Array.isArray(iterable)) {
            items = iterable;
        }
        if (items.length === 0) {
            const resArrId = nextId("heap");
            this.s.heap[resArrId] = { id: resArrId, kind: "array", label: "Array", properties: { length: 0 }, prototype: null };
            this.fulfillPromiseOrAdopt(id, mkRef(resArrId));
            return mkRef(id);
        }
        const results = new Array(items.length);
        let remaining = items.length;
        let settled = false;
        items.forEach((item, index) => {
            const itemPromise = (isRef(item) && this.s.heap[item.id]?.kind === "promise")
                ? item
                : this.builtins["Promise"].resolve.fn(item);
            const thenFn = this.getMemberProperty(itemPromise, "then");
            this.call(thenFn, itemPromise, [
                {
                    __internal: "builtin",
                    name: `allResolve_${index}`,
                    fn: (val) => {
                        if (settled) return;
                        results[index] = val;
                        remaining--;
                        if (remaining === 0) {
                            settled = true;
                            const resArrId = nextId("heap");
                            const props = { length: results.length };
                            results.forEach((v, i) => (props[i] = v));
                            this.s.heap[resArrId] = { id: resArrId, kind: "array", label: "Array", properties: props, prototype: null };
                            this.fulfillPromiseOrAdopt(id, mkRef(resArrId));
                        }
                    }
                },
                {
                    __internal: "builtin",
                    name: `allReject_${index}`,
                    fn: (err) => {
                        if (settled) return;
                        settled = true;
                        this.rejectPromise(id, err);
                    }
                }
            ]);
        });
        return mkRef(id);
    }
    promiseAllSettled(iterable) {
        const id = nextId("heap");
        this.s.heap[id] = {
            id, kind: "promise", label: "Promise (pending)", state: "pending",
            value: undefined, reactions: [], handled: false, prototype: null, properties: {}
        };
        let items = [];
        if (isRef(iterable) && this.s.heap[iterable.id]?.kind === "array") {
            const len = Number(this.s.heap[iterable.id].properties.length) || 0;
            items = Array.from({ length: len }, (_, i) => this.s.heap[iterable.id].properties[i]);
        } else if (Array.isArray(iterable)) {
            items = iterable;
        }
        if (items.length === 0) {
            const resArrId = nextId("heap");
            this.s.heap[resArrId] = { id: resArrId, kind: "array", label: "Array", properties: { length: 0 }, prototype: null };
            this.fulfillPromiseOrAdopt(id, mkRef(resArrId));
            return mkRef(id);
        }
        const results = new Array(items.length);
        let remaining = items.length;
        items.forEach((item, index) => {
            const itemPromise = (isRef(item) && this.s.heap[item.id]?.kind === "promise")
                ? item
                : this.builtins["Promise"].resolve.fn(item);
            const thenFn = this.getMemberProperty(itemPromise, "then");
            this.call(thenFn, itemPromise, [
                {
                    __internal: "builtin",
                    name: `allSettledFulfilled_${index}`,
                    fn: (val) => {
                        const oId = nextId("heap");
                        this.s.heap[oId] = { id: oId, kind: "object", label: "Object", properties: { status: "fulfilled", value: val }, prototype: null };
                        results[index] = mkRef(oId);
                        remaining--;
                        if (remaining === 0) {
                            const arrId = nextId("heap");
                            const props = { length: results.length };
                            results.forEach((v, i) => (props[i] = v));
                            this.s.heap[arrId] = { id: arrId, kind: "array", label: "Array", properties: props, prototype: null };
                            this.fulfillPromiseOrAdopt(id, mkRef(arrId));
                        }
                    }
                },
                {
                    __internal: "builtin",
                    name: `allSettledRejected_${index}`,
                    fn: (err) => {
                        const oId = nextId("heap");
                        this.s.heap[oId] = { id: oId, kind: "object", label: "Object", properties: { status: "rejected", reason: err }, prototype: null };
                        results[index] = mkRef(oId);
                        remaining--;
                        if (remaining === 0) {
                            const arrId = nextId("heap");
                            const props = { length: results.length };
                            results.forEach((v, i) => (props[i] = v));
                            this.s.heap[arrId] = { id: arrId, kind: "array", label: "Array", properties: props, prototype: null };
                            this.fulfillPromiseOrAdopt(id, mkRef(arrId));
                        }
                    }
                }
            ]);
        });
        return mkRef(id);
    }
    promiseRace(iterable) {
        const id = nextId("heap");
        this.s.heap[id] = {
            id, kind: "promise", label: "Promise (pending)", state: "pending",
            value: undefined, reactions: [], handled: false, prototype: null, properties: {}
        };
        let items = [];
        if (isRef(iterable) && this.s.heap[iterable.id]?.kind === "array") {
            const len = Number(this.s.heap[iterable.id].properties.length) || 0;
            items = Array.from({ length: len }, (_, i) => this.s.heap[iterable.id].properties[i]);
        } else if (Array.isArray(iterable)) {
            items = iterable;
        }
        items.forEach((item) => {
            const itemPromise = (isRef(item) && this.s.heap[item.id]?.kind === "promise")
                ? item
                : this.builtins["Promise"].resolve.fn(item);
            const thenFn = this.getMemberProperty(itemPromise, "then");
            this.call(thenFn, itemPromise, [
                { __internal: "builtin", name: "raceResolve", fn: (v) => this.fulfillPromiseOrAdopt(id, v) },
                { __internal: "builtin", name: "raceReject", fn: (r) => this.rejectPromise(id, r) }
            ]);
        });
        return mkRef(id);
    }
    promiseAny(iterable) {
        const id = nextId("heap");
        this.s.heap[id] = {
            id, kind: "promise", label: "Promise (pending)", state: "pending",
            value: undefined, reactions: [], handled: false, prototype: null, properties: {}
        };
        let items = [];
        if (isRef(iterable) && this.s.heap[iterable.id]?.kind === "array") {
            const len = Number(this.s.heap[iterable.id].properties.length) || 0;
            items = Array.from({ length: len }, (_, i) => this.s.heap[iterable.id].properties[i]);
        } else if (Array.isArray(iterable)) {
            items = iterable;
        }
        if (items.length === 0) {
            const aggId = nextId("heap");
            this.s.heap[aggId] = {
                id: aggId,
                kind: "object",
                label: "AggregateError",
                properties: {
                    name: "AggregateError",
                    message: "All promises were rejected",
                    errors: [],
                },
                prototype: null,
            };
            this.rejectPromise(id, mkRef(aggId));
            return mkRef(id);
        }
        let remaining = items.length;
        const errors = new Array(items.length);
        let settled = false;
        items.forEach((item, index) => {
            const itemPromise = (isRef(item) && this.s.heap[item.id]?.kind === "promise")
                ? item
                : this.builtins["Promise"].resolve.fn(item);
            const thenFn = this.getMemberProperty(itemPromise, "then");
            this.call(thenFn, itemPromise, [
                {
                    __internal: "builtin",
                    name: `anyResolve_${index}`,
                    fn: (v) => {
                        if (!settled) {
                            settled = true;
                            this.fulfillPromiseOrAdopt(id, v);
                        }
                    }
                },
                {
                    __internal: "builtin",
                    name: `anyReject_${index}`,
                    fn: (err) => {
                        if (settled) return;
                        errors[index] = err;
                        remaining--;
                        if (remaining === 0) {
                            settled = true;
                            const aggId = nextId("heap");
                            this.s.heap[aggId] = {
                                id: aggId,
                                kind: "object",
                                label: "AggregateError",
                                properties: {
                                    name: "AggregateError",
                                    message: "All promises were rejected",
                                    errors: errors,
                                },
                                prototype: null,
                            };
                            this.rejectPromise(id, mkRef(aggId));
                        }
                    }
                }
            ]);
        });
        return mkRef(id);
    }
    // ─── Resolve Promise Helper ───────────────────────────────────────────────
    resolvePromise(promiseId, val) {
        this.fulfillPromiseOrAdopt(promiseId, val);
    }
    // ─── Drain Event Loop ──────────────────────────────────────────────────────
    drainEventLoop() {
        while (this.s.microtaskQueue.length > 0 || this.s.macrotaskQueue.length > 0) {
            if (this.s.steps.length >= this.s.stepLimit)
                break;
            // 1. Drain ALL microtasks before any macrotask
            if (this.s.microtaskQueue.length > 0) {
                const task = this.s.microtaskQueue.shift();
                this.s.eventLoopState = "draining-microtask";
                this.recordStep(null, "event-loop-tick", `Event Loop: moving microtask "${task.label}" from Microtask Queue onto Call Stack (draining microtasks before macrotasks).`);
                const cb = task.callback;
                if (cb) {
                    try {
                        this.call(cb, undefined, task.arg !== undefined ? [task.arg] : []);
                    }
                    catch (sig) {
                        if (sig instanceof ThrowSignal) {
                            const dbvErr = this.buildDBVError(sig.value, sig.node, sig.kind || "runtime", sig.stack);
                            const msg = `${dbvErr.name}: ${dbvErr.message}`;
                            this.s.consoleOutput.push({
                                id: nextId("con"),
                                method: "error",
                                args: [`Uncaught ${msg}`],
                                stepIndex: this.s.steps.length,
                                error: dbvErr,
                            });
                            this.recordStep(sig.node ? nodeRange(sig.node) : null, "throw", `Uncaught error in microtask: ${msg}`, { error: dbvErr });
                        }
                    }
                }
                continue;
            }
            // 2. Macrotask (Callback Queue)
            if (this.s.macrotaskQueue.length > 0) {
                const task = this.s.macrotaskQueue.shift();
                this.s.webApis = this.s.webApis.filter((w) => w.id !== task.webApiId);
                this.s.eventLoopState = "pulling-macrotask";
                this.recordStep(null, "event-loop-tick", `Event Loop: moving task "${task.label}" from Callback Queue onto Call Stack.`);
                const cb = task.callback;
                if (cb) {
                    try {
                        this.call(cb, undefined, []);
                    }
                    catch (sig) {
                        if (sig instanceof ThrowSignal) {
                            const dbvErr = this.buildDBVError(sig.value, sig.node, sig.kind || "runtime", sig.stack);
                            const msg = `${dbvErr.name}: ${dbvErr.message}`;
                            this.s.consoleOutput.push({
                                id: nextId("con"),
                                method: "error",
                                args: [`Uncaught ${msg}`],
                                stepIndex: this.s.steps.length,
                                error: dbvErr,
                            });
                            this.recordStep(sig.node ? nodeRange(sig.node) : null, "throw", `Uncaught error in task callback: ${msg}`, { error: dbvErr });
                        }
                    }
                }
            }
        }
        // Check unhandled rejections after microtask checkpoint
        for (const obj of Object.values(this.s.heap)) {
            if (obj && obj.kind === "promise" && obj.state === "rejected" && !obj.handled && (!obj.reactions || obj.reactions.length === 0)) {
                obj.handled = true;
                const dbvErr = this.buildDBVError(obj.value, null, "unhandledrejection");
                dbvErr.name = dbvErr.name === "Error" ? "UnhandledPromiseRejection" : dbvErr.name;
                const reason = rtToDisplay(obj.value, this.s.heap);
                this.s.consoleOutput.push({
                    id: nextId("con"),
                    method: "error",
                    args: [`Uncaught (in promise) ${reason}`],
                    stepIndex: this.s.steps.length,
                    error: dbvErr,
                });
                this.recordStep(null, "unhandled-rejection", `Uncaught (in promise) ${reason}`, {
                    error: dbvErr,
                });
            }
        }
        this.s.eventLoopState = "idle";
    }
    // ─── Hoisting ──────────────────────────────────────────────────────────────
    hoistDeclarations(body, varEnvId, lexEnvId, ctx) {
        for (const node of body) {
            if (node.type === "FunctionDeclaration") {
                const fn = node;
                const name = fn.id?.name ?? "(anonymous)";
                // Function declarations are fully hoisted
                const fnHeapId = this.createFunctionObject(name, fn, ctx.lexicalEnvId);
                this.setBinding(varEnvId, name, "function", "initialized", mkRef(fnHeapId));
                this.recordStep(nodeRange(node), "hoisting", `Hoisting: function declaration \`${name}\` is fully hoisted to the top of scope. It is immediately available.`);
            }
            else if (node.type === "VariableDeclaration") {
                const vd = node;
                for (const decl of vd.declarations) {
                    const names = collectPatternNames(decl.id);
                    for (const name of names) {
                        if (vd.kind === "var") {
                            this.setBinding(varEnvId, name, "var", "initialized", undefined);
                            this.recordStep(nodeRange(decl), "hoisting", `Hoisting: \`var ${name}\` is hoisted and initialized to \`undefined\`. It is accessible (but undefined) anywhere in this scope before its declaration.`);
                        }
                        else {
                            // let/const go into TDZ
                            this.setBinding(lexEnvId, name, vd.kind, "uninitialized", undefined);
                            this.recordStep(nodeRange(decl), "hoisting", `Hoisting: \`${vd.kind} ${name}\` is hoisted to the Temporal Dead Zone (TDZ). Accessing it before line ${(node.loc?.start.line ?? 0)} will throw a ReferenceError.`);
                        }
                    }
                }
            }
        }
    }
    // ─── Execute a list of statements ─────────────────────────────────────────
    execBody(body, envId) {
        let last = undefined;
        for (let i = 0; i < body.length; i++) {
            const stmt = body[i];
            if (this.s.steps.length >= this.s.stepLimit) {
                throw this.createThrowSignal("Step limit exceeded (possible infinite loop)", stmt, "step_limit");
            }
            try {
                last = this.execStatement(stmt, envId);
                if (last instanceof ReturnSignal || last instanceof BreakSignal || last instanceof ContinueSignal) {
                    return last;
                }
            } catch (err) {
                if (err instanceof AwaitSignal) {
                    err.remainingStmts = body.slice(i + 1);
                    if (stmt.type === "VariableDeclaration" && stmt.declarations?.[0]?.init === err.node) {
                        err.targetVar = stmt.declarations[0];
                    }
                    throw err;
                }
                throw err;
            }
        }
        return last;
    }
    // ─── Statement execution ───────────────────────────────────────────────────
    execStatement(node, envId) {
        if (!node) return undefined;
        this._currentNode = node;
        switch (node.type) {
            case "VariableDeclaration": return this.execVarDecl(node, envId);
            case "ExpressionStatement": {
                const es = node;
                const val = this.evalExpr(es.expression, envId);
                return val;
            }
            case "ReturnStatement": {
                const rs = node;
                const val = rs.argument ? this.evalExpr(rs.argument, envId) : undefined;
                this.recordStep(nodeRange(node), "return", `return statement: the value \`${rtToDisplay(val, this.s.heap)}\` is returned to the caller.`);
                return new ReturnSignal(val);
            }
            case "IfStatement": return this.execIf(node, envId);
            case "BlockStatement": return this.execBlock(node, envId);
            case "WhileStatement": return this.execWhile(node, envId);
            case "ForStatement": return this.execFor(node, envId);
            case "ForOfStatement": return this.execForOf(node, envId);
            case "ForInStatement": return this.execForIn(node, envId);
            case "FunctionDeclaration": return undefined; // already hoisted
            case "TryStatement": return this.execTry(node, envId);
            case "ThrowStatement": {
                const ts = node;
                const val = this.evalExpr(ts.argument, envId);
                this.recordStep(nodeRange(node), "throw", `throw: \`${rtToDisplay(val, this.s.heap)}\` is thrown.`);
                throw this.createThrowSignal(val, ts);
            }
            case "BreakStatement": return new BreakSignal(node.label?.name);
            case "ContinueStatement": return new ContinueSignal(node.label?.name);
            case "SwitchStatement": return this.execSwitch(node, envId);
            case "ClassDeclaration": return this.execClassDecl(node, envId);
            case "EmptyStatement": return undefined;
            case "LabeledStatement": return this.execStatement(node.body, envId);
            case "DoWhileStatement": return this.execDoWhile(node, envId);
            default:
                this.recordStep(nodeRange(node), "unsupported", `Unsupported syntax: \`${node.type}\` at line ${node.loc?.start.line}. This statement is skipped.`);
                return undefined;
        }
    }
    // ─── Variable declaration ─────────────────────────────────────────────────
    execVarDecl(node, envId) {
        for (const decl of node.declarations) {
            const initVal = decl.init ? this.evalExpr(decl.init, envId) : undefined;
            if (decl.id.type === "Identifier") {
                const name = decl.id.name;
                if (node.kind === "var") {
                    this.updateBinding(name, envId, "initialized", initVal);
                    this.recordStep(nodeRange(decl), "assign", `\`var ${name}\` is assigned the value \`${rtToDisplay(initVal, this.s.heap)}\`. (It was already hoisted as \`undefined\`.)`);
                }
                else {
                    this.setBinding(envId, name, node.kind, "initialized", initVal);
                    this.recordStep(nodeRange(decl), "declare", `\`${node.kind} ${name}\` is initialized to \`${rtToDisplay(initVal, this.s.heap)}\`. It is now accessible. (TDZ period is over.)`);
                }
            }
            else {
                this.assignPattern(decl.id, initVal, node.kind, envId, decl);
            }
        }
        return undefined;
    }
    // ─── Block scope ──────────────────────────────────────────────────────────
    execBlock(node, envId) {
        // Create a new lexical environment for block scope
        const blockEnvId = nextId("env");
        this.s.environments[blockEnvId] = { id: blockEnvId, bindings: {}, outer: envId };
        this.recordStep(nodeRange(node), "block-enter", `Entering a block scope. A new lexical environment is created (outer → current scope).`);
        // Hoist let/const in this block to TDZ
        for (const stmt of node.body) {
            if (stmt.type === "VariableDeclaration" && stmt.kind !== "var") {
                const vd = stmt;
                for (const d of vd.declarations) {
                    for (const name of collectPatternNames(d.id)) {
                        this.setBinding(blockEnvId, name, vd.kind, "uninitialized", undefined);
                    }
                }
            }
        }
        let result = undefined;
        try {
            result = this.execBody(node.body, blockEnvId);
        }
        finally {
            this.recordStep(nodeRange(node), "block-exit", `Exiting block scope. The block's lexical environment is popped from the scope chain.`);
        }
        return result;
    }
    // ─── If statement ─────────────────────────────────────────────────────────
    execIf(node, envId) {
        const test = this.evalExpr(node.test, envId);
        const bool = Boolean(test);
        this.recordStep(nodeRange(node), "expression-eval", `if (${rtToDisplay(test, this.s.heap)}): condition is ${bool ? "truthy" : "falsy"}, ${bool ? "taking the then branch" : node.alternate ? "taking the else branch" : "skipping the block"}.`);
        if (bool) {
            return this.execStatement(node.consequent, envId);
        }
        else if (node.alternate) {
            return this.execStatement(node.alternate, envId);
        }
        return undefined;
    }
    // ─── While loop ───────────────────────────────────────────────────────────
    execWhile(node, envId) {
        let iterations = 0;
        while (true) {
            if (this.s.steps.length >= this.s.stepLimit)
                throw this.createThrowSignal("Step limit exceeded (possible infinite loop)", node, "step_limit");
            const test = this.evalExpr(node.test, envId);
            const bool = Boolean(test);
            this.recordStep(nodeRange(node), "expression-eval", `while loop iteration ${++iterations}: condition \`${rtToDisplay(test, this.s.heap)}\` is ${bool ? "truthy" : "falsy"}.`);
            if (!bool)
                break;
            const result = this.execStatement(node.body, envId);
            if (result instanceof ReturnSignal)
                return result;
            if (result instanceof BreakSignal)
                break;
            // ContinueSignal: continue to next iteration
        }
        return undefined;
    }
    // ─── Do-while loop ────────────────────────────────────────────────────────
    execDoWhile(node, envId) {
        let iterations = 0;
        do {
            if (this.s.steps.length >= this.s.stepLimit)
                throw this.createThrowSignal("Step limit exceeded (possible infinite loop)", node, "step_limit");
            const result = this.execStatement(node.body, envId);
            if (result instanceof ReturnSignal)
                return result;
            if (result instanceof BreakSignal)
                break;
            const test = this.evalExpr(node.test, envId);
            this.recordStep(nodeRange(node), "expression-eval", `do-while: condition \`${rtToDisplay(test, this.s.heap)}\` after iteration ${++iterations}.`);
            if (!Boolean(test))
                break;
        } while (true);
        return undefined;
    }
    // ─── For loop ─────────────────────────────────────────────────────────────
    execFor(node, envId) {
        const forEnvId = nextId("env");
        this.s.environments[forEnvId] = { id: forEnvId, bindings: {}, outer: envId };
        const isLexical = node.init &&
            node.init.type === "VariableDeclaration" &&
            node.init.kind !== "var";
        if (node.init) {
            if (node.init.type === "VariableDeclaration") {
                this.execVarDecl(node.init, forEnvId);
            }
            else {
                this.evalExpr(node.init, forEnvId);
            }
        }
        let iterations = 0;
        while (true) {
            if (this.s.steps.length >= this.s.stepLimit)
                throw this.createThrowSignal("Step limit exceeded (possible infinite loop)", node, "step_limit");
            // Each iteration of a lexical loop gets its own environment record
            let iterEnvId = forEnvId;
            if (isLexical) {
                iterEnvId = nextId("env");
                const clonedBindings = {};
                for (const [k, b] of Object.entries(this.s.environments[forEnvId].bindings)) {
                    clonedBindings[k] = { ...b };
                }
                this.s.environments[iterEnvId] = { id: iterEnvId, bindings: clonedBindings, outer: envId };
            }
            if (node.test) {
                const test = this.evalExpr(node.test, iterEnvId);
                const bool = Boolean(test);
                this.recordStep(nodeRange(node), "expression-eval", `for loop: test condition \`${rtToDisplay(test, this.s.heap)}\` → ${bool}. Iteration ${++iterations}.`);
                if (!bool)
                    break;
            }
            const result = this.execStatement(node.body, iterEnvId);
            if (result instanceof ReturnSignal)
                return result;
            if (result instanceof BreakSignal)
                break;
            // Sync bindings back to forEnvId so update can read and modify variables
            if (isLexical) {
                for (const [k, b] of Object.entries(this.s.environments[iterEnvId].bindings)) {
                    this.s.environments[forEnvId].bindings[k] = { ...b };
                }
            }
            if (node.update)
                this.evalExpr(node.update, forEnvId);
        }
        return undefined;
    }
    // ─── For-of loop ──────────────────────────────────────────────────────────
    execForOf(node, envId) {
        const iterable = this.evalExpr(node.right, envId);
        let items = [];
        if (isRef(iterable)) {
            const obj = this.s.heap[iterable.id];
            if (obj?.kind === "array") {
                const len = Number(obj.properties.length) || 0;
                items = Array.from({ length: len }, (_, i) => obj.properties[i]);
            }
        }
        for (let i = 0; i < items.length; i++) {
            if (this.s.steps.length >= this.s.stepLimit)
                throw this.createThrowSignal("Step limit exceeded (possible infinite loop)", node, "step_limit");
            const loopEnvId = nextId("env");
            this.s.environments[loopEnvId] = { id: loopEnvId, bindings: {}, outer: envId };
            const left = node.left;
            if (left.type === "VariableDeclaration") {
                const vd = left;
                const name = collectPatternNames(vd.declarations[0].id)[0];
                this.setBinding(loopEnvId, name, vd.kind, "initialized", items[i]);
                this.recordStep(nodeRange(node), "assign", `for-of: \`${vd.kind} ${name}\` = \`${rtToDisplay(items[i], this.s.heap)}\` (item ${i}).`);
            }
            const result = this.execStatement(node.body, loopEnvId);
            if (result instanceof ReturnSignal)
                return result;
            if (result instanceof BreakSignal)
                break;
        }
        return undefined;
    }
    // ─── For-in loop ──────────────────────────────────────────────────────────
    execForIn(node, envId) {
        const obj = this.evalExpr(node.right, envId);
        let keys = [];
        if (isRef(obj)) {
            const heapObj = this.s.heap[obj.id];
            if (heapObj)
                keys = Object.keys(heapObj.properties).filter((k) => k !== "length" || heapObj.kind !== "array");
        }
        for (const key of keys) {
            if (this.s.steps.length >= this.s.stepLimit)
                throw this.createThrowSignal("Step limit exceeded (possible infinite loop)", node, "step_limit");
            const loopEnvId = nextId("env");
            this.s.environments[loopEnvId] = { id: loopEnvId, bindings: {}, outer: envId };
            const left = node.left;
            if (left.type === "VariableDeclaration") {
                const vd = left;
                const name = collectPatternNames(vd.declarations[0].id)[0];
                this.setBinding(loopEnvId, name, vd.kind, "initialized", key);
                this.recordStep(nodeRange(node), "assign", `for-in: \`${vd.kind} ${name}\` = "${key}".`);
            }
            const result = this.execStatement(node.body, loopEnvId);
            if (result instanceof ReturnSignal)
                return result;
            if (result instanceof BreakSignal)
                break;
        }
        return undefined;
    }
    // ─── Try/catch/finally ────────────────────────────────────────────────────
    execTry(node, envId) {
        let result = undefined;
        let thrown = false;
        let thrownVal = undefined;
        try {
            result = this.execStatement(node.block, envId);
        }
        catch (sig) {
            if (sig instanceof ThrowSignal) {
                thrown = true;
                thrownVal = sig.value;
                this.recordStep(nodeRange(node), "catch", `Exception caught: \`${rtToDisplay(thrownVal, this.s.heap)}\`. Entering catch block.`);
            }
            else if (sig instanceof AwaitSignal) {
                sig.tryNode = node;
                sig.tryEnvId = envId;
                throw sig;
            }
            else {
                throw sig;
            }
        }
        if (thrown && node.handler) {
            const catchEnvId = nextId("env");
            this.s.environments[catchEnvId] = { id: catchEnvId, bindings: {}, outer: envId };
            if (node.handler.param) {
                const name = collectPatternNames(node.handler.param)[0];
                this.setBinding(catchEnvId, name, "let", "initialized", thrownVal);
            }
            try {
                result = this.execStatement(node.handler.body, catchEnvId);
            }
            catch (sig) {
                if (node.finalizer) {
                    this.recordStep(nodeRange(node.finalizer), "finally", `finally block runs (even though an exception occurred inside catch).`);
                    this.execStatement(node.finalizer, envId);
                }
                throw sig;
            }
        }
        if (node.finalizer) {
            this.recordStep(nodeRange(node.finalizer), "finally", `finally block always runs, regardless of whether an exception occurred.`);
            const finalResult = this.execStatement(node.finalizer, envId);
            if (finalResult instanceof ReturnSignal)
                return finalResult;
        }
        return result;
    }
    // ─── Switch statement ─────────────────────────────────────────────────────
    execSwitch(node, envId) {
        const disc = this.evalExpr(node.discriminant, envId);
        this.recordStep(nodeRange(node), "expression-eval", `switch (${rtToDisplay(disc, this.s.heap)}): evaluating which case matches.`);
        let matched = false;
        for (const c of node.cases) {
            if (!matched) {
                if (c.test === null) {
                    // default – only match if nothing else did
                    continue;
                }
                const testVal = this.evalExpr(c.test, envId);
                if (testVal === disc) {
                    matched = true;
                    this.recordStep(nodeRange(c), "expression-eval", `Switch: case \`${rtToDisplay(testVal, this.s.heap)}\` matched.`);
                }
            }
            if (matched) {
                const result = this.execBody(c.consequent, envId);
                if (result instanceof BreakSignal)
                    return undefined;
                if (result instanceof ReturnSignal)
                    return result;
            }
        }
        if (!matched) {
            const def = node.cases.find((c) => c.test === null);
            if (def) {
                this.recordStep(nodeRange(def), "expression-eval", `Switch: no cases matched, executing default.`);
                const result = this.execBody(def.consequent, envId);
                if (result instanceof ReturnSignal)
                    return result;
            }
        }
        return undefined;
    }
    // ─── Expression evaluation ─────────────────────────────────────────────────
    evalExpr(node, envId) {
        if (!node) return undefined;
        this._currentNode = node;
        if (this.s.steps.length >= this.s.stepLimit) {
            throw this.createThrowSignal("Step limit exceeded (possible infinite loop)", node, "step_limit");
        }
        switch (node.type) {
            case "Literal": {
                const val = node.value;
                return val;
            }
            case "Identifier": {
                const name = node.name;
                return this.resolveIdentifier(name, envId, node);
            }
            case "AssignmentExpression": {
                const ae = node;
                let val = this.evalExpr(ae.right, envId);
                if (ae.operator !== "=") {
                    const current = this.evalExpr(ae.left, envId);
                    val = this.applyCompoundOp(ae.operator, current, val);
                }
                this.assignTo(ae.left, val, envId, node);
                return val;
            }
            case "BinaryExpression": {
                const be = node;
                const left = this.evalExpr(be.left, envId);
                const right = this.evalExpr(be.right, envId);
                const result = this.applyBinaryOp(be.operator, left, right);
                this.recordStep(nodeRange(node), "expression-eval", `Binary: \`${rtToDisplay(left, this.s.heap)} ${be.operator} ${rtToDisplay(right, this.s.heap)}\` = \`${rtToDisplay(result, this.s.heap)}\``);
                return result;
            }
            case "LogicalExpression": {
                const le = node;
                const left = this.evalExpr(le.left, envId);
                if (le.operator === "&&" && !left)
                    return left;
                if (le.operator === "||" && left)
                    return left;
                if (le.operator === "??" && left !== null && left !== undefined)
                    return left;
                return this.evalExpr(le.right, envId);
            }
            case "UnaryExpression": {
                const ue = node;
                if (ue.operator === "typeof" && ue.argument.type === "Identifier") {
                    try {
                        const val = this.resolveIdentifier(ue.argument.name, envId, node);
                        return this.applyUnaryOp("typeof", val);
                    } catch (err) {
                        if (err instanceof ThrowSignal && String(err.value).includes("is not defined")) {
                            return "undefined";
                        }
                        throw err; // TDZ errors will still throw as expected!
                    }
                }
                const arg = this.evalExpr(ue.argument, envId);
                return this.applyUnaryOp(ue.operator, arg);
            }
            case "UpdateExpression": {
                const upe = node;
                if (upe.argument.type === "Identifier") {
                    const name = upe.argument.name;
                    const old = Number(this.resolveIdentifier(name, envId, node)) || 0;
                    const newVal = upe.operator === "++" ? old + 1 : old - 1;
                    this.updateBinding(name, envId, "initialized", newVal);
                    this.recordStep(nodeRange(node), "assign", `${upe.operator === "++" ? "Increment" : "Decrement"}: \`${name}\` ${upe.operator === "++" ? "incremented from" : "decremented from"} ${old} to ${newVal}.`);
                    return upe.prefix ? newVal : old;
                } else if (upe.argument.type === "MemberExpression") {
                    const me = upe.argument;
                    const obj = this.evalExpr(me.object, envId);
                    const prop = me.computed ? String(this.evalExpr(me.property, envId)) : me.property.name;
                    const old = Number(this.getMemberProperty(obj, prop)) || 0;
                    const newVal = upe.operator === "++" ? old + 1 : old - 1;
                    if (isRef(obj)) {
                        const heapObj = this.s.heap[obj.id];
                        if (heapObj) {
                            heapObj.properties[prop] = newVal;
                            this.recordStep(nodeRange(node), "assign", `Property \`${prop}\` updated to ${newVal}.`);
                        }
                    }
                    return upe.prefix ? newVal : old;
                }
                return 0;
            }
            case "CallExpression": {
                const ce = node;
                return this.evalCallExpr(ce, envId);
            }
            case "MemberExpression": {
                const me = node;
                return this.evalMemberExpr(me, envId);
            }
            case "ObjectExpression": {
                const oe = node;
                const id = nextId("heap");
                const props = {};
                for (const prop of oe.properties) {
                    if (prop.type === "Property") {
                        const p = prop;
                        const key = p.computed
                            ? String(this.evalExpr(p.key, envId))
                            : p.key.name ?? String(p.key.value);
                        const val = this.evalExpr(p.value, envId);
                        props[key] = rtToBinding(val);
                    }
                }
                this.s.heap[id] = { id, kind: "object", label: "Object", properties: props, prototype: null };
                this.recordStep(nodeRange(node), "expression-eval", `Object literal created on the heap (id: ${id}).`);
                return mkRef(id);
            }
            case "ArrayExpression": {
                const arrE = node;
                const id = nextId("heap");
                const props = { length: arrE.elements.length };
                for (let i = 0; i < arrE.elements.length; i++) {
                    const el = arrE.elements[i];
                    props[i] = el ? rtToBinding(this.evalExpr(el, envId)) : undefined;
                }
                this.s.heap[id] = { id, kind: "array", label: "Array", properties: props, prototype: null };
                this.recordStep(nodeRange(node), "expression-eval", `Array literal created on the heap (id: ${id}), length ${arrE.elements.length}.`);
                return mkRef(id);
            }
            case "FunctionExpression":
            case "ArrowFunctionExpression": {
                const fe = node;
                const name = fe.id?.name ?? "(anonymous)";
                const fnHeapId = this.createFunctionObject(name, fe, envId);
                this.recordStep(nodeRange(node), "expression-eval", `Function expression \`${name}\` is defined. A closure is created capturing the current environment (id: ${envId}).`);
                return mkRef(fnHeapId);
            }
            case "TemplateLiteral": {
                const tl = node;
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
                const cond = node;
                const test = this.evalExpr(cond.test, envId);
                return Boolean(test)
                    ? this.evalExpr(cond.consequent, envId)
                    : this.evalExpr(cond.alternate, envId);
            }
            case "SequenceExpression": {
                const seq = node;
                let last = undefined;
                for (const e of seq.expressions)
                    last = this.evalExpr(e, envId);
                return last;
            }
            case "SpreadElement": {
                return this.evalExpr(node.argument, envId);
            }
            case "NewExpression": {
                return this.evalNewExpr(node, envId);
            }
            case "ThisExpression": {
                // Walk up call stack to find this
                const ctx = this.s.callStack[this.s.callStack.length - 1];
                this.recordStep(nodeRange(node), "expression-eval", `\`this\` refers to: \`${rtToDisplay(ctx?.thisBinding, this.s.heap)}\` in context "${ctx?.name}".`);
                return ctx?.thisBinding;
            }
            case "AwaitExpression": {
                const ae = node;
                const arg = this.evalExpr(ae.argument, envId);
                this.recordStep(nodeRange(node), "expression-eval", `await paused execution; yielding to event loop.`);
                throw new AwaitSignal(arg, ae);
            }
            case "ClassExpression": {
                return this.evalClassExpr(node, envId);
            }
            default:
                this.recordStep(nodeRange(node), "unsupported", `Unsupported expression: \`${node.type}\` at line ${node.loc?.start.line}.`);
                return undefined;
        }
    }
    // ─── Call expression ───────────────────────────────────────────────────────
    evalCallExpr(node, envId) {
        if (node.callee.type === "Super") {
            const ctx = this.s.callStack[this.s.callStack.length - 1];
            if (ctx?.superConstructor) {
                const superArgs = node.arguments.map((a) => this.evalExpr(a, envId));
                return this.invokeCallable(ctx.superConstructor, superArgs, ctx.thisBinding, node);
            }
            return undefined;
        }
        // Handle console.log specially
        if (node.callee.type === "MemberExpression" &&
            node.callee.object.type === "Identifier" &&
            node.callee.object.name === "console") {
            const method = node.callee.property.name;
            const args = node.arguments.map((a) => this.evalExpr(a, envId));
            const display = args.map((a) => rtToDisplay(a, this.s.heap, true));
            this.s.consoleOutput.push({
                id: nextId("con"),
                method: method || "log",
                args: display,
                stepIndex: this.s.steps.length,
            });
            this.recordStep(nodeRange(node), "expression-eval", `console.${method}(${display.join(", ")}) → output printed to console.`);
            return undefined;
        }
        // Handle Math methods
        if (node.callee.type === "MemberExpression" &&
            node.callee.object.type === "Identifier" &&
            node.callee.object.name === "Math") {
            const method = node.callee.property.name;
            const args = node.arguments.map((a) => Number(this.evalExpr(a, envId)));
            const mathFns = {
                abs: Math.abs, floor: Math.floor, ceil: Math.ceil, round: Math.round,
                sqrt: Math.sqrt, max: Math.max, min: Math.min, random: Math.random,
                pow: Math.pow, log: Math.log, log2: Math.log2, log10: Math.log10,
            };
            const result = method in mathFns ? mathFns[method](...args) : undefined;
            this.recordStep(nodeRange(node), "expression-eval", `Math.${method}(${args.join(", ")}) = ${result}`);
            return result;
        }
        // Evaluate callee and thisVal
        let thisVal = undefined;
        let callee;
        if (node.callee.type === "MemberExpression") {
            const me = node.callee;
            const obj = this.evalExpr(me.object, envId);
            thisVal = obj;
            const prop = me.computed
                ? String(this.evalExpr(me.property, envId))
                : me.property.name;
            callee = this.getMemberProperty(obj, prop);
        }
        else {
            callee = this.evalExpr(node.callee, envId);
        }
        const args = node.arguments.map((a) => this.evalExpr(a, envId));
        if (callee === undefined || callee === null) {
            const exprName = node.callee?.name || node.callee?.property?.name || "value";
            throw this.createThrowSignal(`TypeError: ${exprName} is not a function`, node);
        }
        return this.call(callee, thisVal, args, node);
    }
    // ─── Unified canonical callable model ─────────────────────────────────────
    isCallable(v) {
        if (v === null || v === undefined) return false;
        if (typeof v === "function") return true;
        if (typeof v === "object") {
            if (v.__internal === "builtin" && (typeof v.fn === "function" || typeof v === "function")) return true;
            if (v.__internal === "function") return true;
            if (isRef(v)) {
                const heapObj = this.s.heap[v.id];
                if (heapObj && (heapObj.kind === "function" || heapObj.kind === "closure" || heapObj.properties?.__fnData)) {
                    return true;
                }
            }
        }
        return false;
    }

    call(callee, thisVal = undefined, args = [], callNode = null) {
        if (!this.isCallable(callee)) {
            const name = callNode?.callee?.name || callNode?.callee?.property?.name || rtToDisplay(callee, this.s.heap);
            throw this.createThrowSignal(`TypeError: ${name} is not a function`, callNode || this._currentNode);
        }

        if (typeof callee === "object" && callee !== null && callee.__internal === "builtin") {
            if (typeof callee.fn === "function") {
                return callee.fn.apply(thisVal, args);
            }
            if (typeof callee === "function") {
                return callee.apply(thisVal, args);
            }
        }

        if (typeof callee === "function") {
            return callee.apply(thisVal, args);
        }

        if (typeof callee === "object" && callee !== null && callee.__internal === "function") {
            return this.callFunction(callee, args, thisVal, callNode);
        }

        if (isRef(callee)) {
            const heapObj = this.s.heap[callee.id];
            if (heapObj?.properties?.__fnData) {
                return this.callFunction(heapObj.properties.__fnData, args, thisVal, callNode);
            }
        }

        throw this.createThrowSignal(`TypeError: ${rtToDisplay(callee, this.s.heap)} is not a function`, callNode || this._currentNode);
    }

    construct(callee, args = [], newTarget = null, callNode = null) {
        const ctorName = callee?.fnName || (typeof callee === "function" ? callee.name : callee?.name) || (callNode?.callee?.type === "Identifier" ? callNode.callee.name : "");

        // Builtin Promise constructor
        if (callee === this.builtins["Promise"] || ctorName === "Promise") {
            return this.constructPromise(args[0], callNode);
        }

        // Builtin Error constructors
        if (["Error", "TypeError", "RangeError", "ReferenceError", "SyntaxError"].includes(ctorName)) {
            const errName = ctorName || "Error";
            const msg = args[0] !== undefined ? String(args[0]) : "";
            const id = nextId("heap");
            this.s.heap[id] = {
                id,
                kind: "object",
                label: errName,
                properties: { name: errName, message: msg },
                prototype: null,
            };
            return mkRef(id);
        }

        // Builtin Array constructor
        if (callee === this.builtins["Array"] || ctorName === "Array") {
            const id = nextId("heap");
            const props = { length: args.length };
            args.forEach((v, i) => (props[i] = rtToBinding(v)));
            this.s.heap[id] = { id, kind: "array", label: "Array", properties: props, prototype: null };
            return mkRef(id);
        }

        // Builtin Object constructor
        if (callee === this.builtins["Object"] || ctorName === "Object") {
            const id = nextId("heap");
            this.s.heap[id] = { id, kind: "object", label: "Object", properties: {}, prototype: null };
            return mkRef(id);
        }

        if (!this.isCallable(callee)) {
            const name = callNode?.callee?.name || rtToDisplay(callee, this.s.heap);
            throw this.createThrowSignal(`TypeError: ${name} is not a constructor`, callNode || this._currentNode);
        }

        const newObjId = nextId("heap");
        this.s.heap[newObjId] = { id: newObjId, kind: "object", label: "instance", properties: {}, prototype: null };
        const newObj = mkRef(newObjId);

        let fnData = null;
        if (typeof callee === "object" && callee !== null && callee.__internal === "function") {
            fnData = callee;
        } else if (isRef(callee)) {
            const heapObj = this.s.heap[callee.id];
            if (heapObj?.properties?.__fnData) {
                fnData = heapObj.properties.__fnData;
            }
        }

        if (fnData) {
            if (fnData.methods) {
                const instObj = this.s.heap[newObjId];
                if (instObj) {
                    instObj.label = `${fnData.name || "Object"} instance`;
                    Object.assign(instObj.properties, fnData.methods);
                    if (fnData.superConstructor && isRef(fnData.superConstructor)) {
                        const parentFnData = this.s.heap[fnData.superConstructor.id]?.properties?.__fnData;
                        if (parentFnData?.methods) {
                            Object.assign(instObj.properties, parentFnData.methods);
                        }
                    }
                }
            }
            const result = this.callFunction(fnData, args, newObj, callNode);
            if (result && (isRef(result) || (typeof result === "object" && result !== null))) {
                return result;
            }
            return newObj;
        }

        return newObj;
    }

    invokeCallable(callee, args, thisVal = undefined, callNode = null) {
        return this.call(callee, thisVal, args, callNode);
    }
    // ─── Call a user-defined function ─────────────────────────────────────────
    callFunction(fn, args, thisVal = undefined, callNode = null) {
        if (this.s.callStack.length >= 500) {
            throw this.createThrowSignal("Maximum call stack size exceeded (stack overflow)", callNode || this._currentNode, "runtime");
        }
        if (fn.boundThis !== undefined) {
            thisVal = fn.boundThis;
        }
        if (fn.boundArgs && fn.boundArgs.length > 0) {
            args = [...fn.boundArgs, ...args];
        }
        const fnName = fn.name || "(anonymous)";
        const fnNode = fn.node;
        // Create new function environment (lexically linked to where fn was defined)
        const fnEnvId = nextId("env");
        this.s.environments[fnEnvId] = { id: fnEnvId, bindings: {}, outer: fn.envId };
        // Create new execution context
        const ctx = {
            id: nextId("ctx"),
            type: "Function",
            name: fnName,
            phase: "Creation",
            thisBinding: rtToBinding(thisVal),
            variableEnvId: fnEnvId,
            lexicalEnvId: fnEnvId,
            outerEnvId: fn.envId,
            sourceLine: fnNode.loc?.start.line ?? 0,
            callSiteLine: callNode?.loc?.start?.line,
            callSiteColumn: (callNode?.loc?.start?.column ?? 0) + 1,
            superConstructor: fn.superConstructor,
        };
        this.s.callStack.push(ctx);
        this.recordStep(callNode ? nodeRange(callNode) : null, "call", `Calling function \`${fnName}\`. A new Function Execution Context is pushed onto the Call Stack (Creation Phase).`);
        // Creation phase: hoist params, var declarations, function declarations
        const params = fnNode.params ?? [];
        for (let i = 0; i < params.length; i++) {
            const param = params[i];
            if (param.type === "RestElement") {
                const restName = param.argument?.name ?? "args";
                const restArr = args.slice(i);
                const restId = nextId("heap");
                const restProps = { length: restArr.length };
                restArr.forEach((v, idx) => (restProps[idx] = rtToBinding(v)));
                this.s.heap[restId] = { id: restId, kind: "array", label: "Array", properties: restProps, prototype: null };
                this.setBinding(fnEnvId, restName, "param", "initialized", mkRef(restId));
                this.recordStep(null, "declare", `Rest parameter \`...${restName}\` initialized with ${restArr.length} arguments.`);
                break;
            }
            let paramVal = args[i];
            if (param.type === "AssignmentPattern") {
                if (paramVal === undefined) {
                    paramVal = this.evalExpr(param.right, fnEnvId);
                }
                const pnames = collectPatternNames(param.left);
                for (const name of pnames) {
                    this.setBinding(fnEnvId, name, "param", "initialized", paramVal);
                    this.recordStep(null, "declare", `Parameter \`${name}\` = \`${rtToDisplay(paramVal, this.s.heap)}\` is initialized.`);
                }
            } else {
                const pnames = collectPatternNames(param);
                for (const name of pnames) {
                    this.setBinding(fnEnvId, name, "param", "initialized", paramVal);
                    this.recordStep(null, "declare", `Parameter \`${name}\` = \`${rtToDisplay(paramVal, this.s.heap)}\` is added to the function's variable environment.`);
                }
            }
        }
        const body = fnNode.body;
        if (body.type === "BlockStatement") {
            this.hoistDeclarations(body.body, fnEnvId, fnEnvId, ctx);
        }
        // Switch to execution phase
        const stackTop = this.s.callStack[this.s.callStack.length - 1];
        this.s.callStack[this.s.callStack.length - 1] = { ...stackTop, phase: "Execution" };
        this.recordStep(null, "execution-phase", `Function \`${fnName}\` enters Execution Phase. Code inside the function now runs.`);

        if (fnNode.async) {
            const promiseId = nextId("heap");
            this.s.heap[promiseId] = {
                id: promiseId,
                kind: "promise",
                label: "Promise (pending)",
                state: "pending",
                value: undefined,
                prototype: null,
                properties: {},
                callbacks: [],
            };
            const promiseRef = mkRef(promiseId);
            try {
                let result;
                if (body.type === "BlockStatement") {
                    result = this.execBody(body.body, fnEnvId);
                } else {
                    result = this.evalExpr(body, fnEnvId);
                }
                const retVal = result instanceof ReturnSignal ? result.value : result;
                this.resolvePromise(promiseId, retVal);
            } catch (err) {
                if (err instanceof AwaitSignal) {
                    const remaining = err.remainingStmts;
                    const targetVar = err.targetVar;
                    const awaitArg = err.value;
                    let resolvedVal = awaitArg;
                    let isRejected = false;
                    let rejectionVal = undefined;

                    if (isRef(awaitArg) && this.s.heap[awaitArg.id]?.kind === "promise") {
                        const hp = this.s.heap[awaitArg.id];
                        hp.handled = true;
                        if (hp.state === "rejected") {
                            isRejected = true;
                            rejectionVal = hp.value;
                        } else {
                            resolvedVal = hp.value;
                        }
                    }

                    this.s.microtaskQueue.push({
                        id: nextId("micro"),
                        kind: "microtask",
                        label: `await continuation: ${fnName}`,
                        callback: {
                            __internal: "builtin",
                            name: `resume:${fnName}`,
                            fn: () => {
                                const resumeCtx = { ...ctx, phase: "Execution" };
                                this.s.callStack.push(resumeCtx);
                                this.recordStep(nodeRange(err.node), "expression-eval", `Resuming \`${fnName}\` after await from Microtask Queue.`);
                                
                                if (isRejected) {
                                    if (err.tryNode?.handler) {
                                        const handler = err.tryNode.handler;
                                        const catchEnvId = nextId("env");
                                        this.s.environments[catchEnvId] = { id: catchEnvId, bindings: {}, outer: err.tryEnvId || fnEnvId };
                                        if (handler.param) {
                                            const name = collectPatternNames(handler.param)[0];
                                            this.setBinding(catchEnvId, name, "let", "initialized", rejectionVal);
                                        }
                                        this.recordStep(nodeRange(err.tryNode), "catch", `Awaited promise rejected: \`${rtToDisplay(rejectionVal, this.s.heap)}\`. Entering catch block.`);
                                        let res;
                                        if (handler.body?.type === "BlockStatement") {
                                            res = this.execBody(handler.body.body, catchEnvId);
                                        } else {
                                            res = this.execStatement(handler.body, catchEnvId);
                                        }
                                        if (err.tryNode.finalizer) {
                                            this.execStatement(err.tryNode.finalizer, err.tryEnvId || fnEnvId);
                                        }
                                        if (remaining.length > 0) {
                                            res = this.execBody(remaining, fnEnvId);
                                        }
                                        const ret = res instanceof ReturnSignal ? res.value : undefined;
                                        this.resolvePromise(promiseId, ret);
                                    } else {
                                        this.rejectPromise(promiseId, rejectionVal);
                                    }
                                    this.s.callStack.pop();
                                    return;
                                }

                                if (targetVar) {
                                    const vName = collectPatternNames(targetVar.id)[0];
                                    if (vName) {
                                        this.setBinding(fnEnvId, vName, "let", "initialized", resolvedVal);
                                    }
                                }
                                const res = this.execBody(remaining, fnEnvId);
                                const ret = res instanceof ReturnSignal ? res.value : undefined;
                                this.resolvePromise(promiseId, ret);
                                this.s.callStack.pop();
                            }
                        }
                    });
                    this.recordStep(nodeRange(err.node), "enqueue-task", `\`await\` paused \`${fnName}\`. Continuation queued into Microtask Queue.`);
                    this.s.callStack.pop();
                    return promiseRef;
                }
                this.s.callStack.pop();
                throw err;
            }
            this.s.callStack.pop();
            return promiseRef;
        }

        let returnVal = undefined;
        try {
            let result;
            if (body.type === "BlockStatement") {
                result = this.execBody(body.body, fnEnvId);
            }
            else {
                // Arrow function with expression body
                result = this.evalExpr(body, fnEnvId);
                returnVal = result;
            }
            if (result instanceof ReturnSignal) {
                returnVal = result.value;
            }
        }
        catch (sig) {
            this.s.callStack.pop();
            throw sig;
        }
        this.s.callStack.pop();
        this.recordStep(callNode ? nodeRange(callNode) : null, "return", `Function \`${fnName}\` returns \`${rtToDisplay(returnVal, this.s.heap)}\`. Its Execution Context is popped from the Call Stack.`);
        return returnVal;
    }
    // ─── Member expression ────────────────────────────────────────────────────
    evalMemberExpr(node, envId) {
        const obj = this.evalExpr(node.object, envId);
        const prop = node.computed
            ? String(this.evalExpr(node.property, envId))
            : node.property.name;
        return this.getMemberProperty(obj, prop);
    }
    getMemberProperty(obj, prop) {
        if (obj === null || obj === undefined) {
            throw new ThrowSignal(`TypeError: Cannot read properties of ${obj} (reading '${prop}')`, this._currentNode);
        }
        // Builtin object / function static methods (e.g. Object.assign, Promise.resolve, Promise.reject)
        if ((typeof obj === "object" || typeof obj === "function") && obj !== null && obj.__internal === "builtin") {
            if (prop in obj) return obj[prop];
        }
        // String properties
        if (typeof obj === "string") {
            if (prop === "length")
                return obj.length;
            if (prop === "toUpperCase")
                return { __internal: "builtin", name: "String.toUpperCase", fn: () => obj.toUpperCase() };
            if (prop === "toLowerCase")
                return { __internal: "builtin", name: "String.toLowerCase", fn: () => obj.toLowerCase() };
            if (prop === "trim")
                return { __internal: "builtin", name: "String.trim", fn: () => obj.trim() };
            if (prop === "split")
                return { __internal: "builtin", name: "String.split", fn: (sep) => {
                        const id = nextId("heap");
                        const parts = obj.split(String(sep));
                        const props = { length: parts.length };
                        parts.forEach((p, i) => (props[i] = p));
                        this.s.heap[id] = { id, kind: "array", label: "Array", properties: props, prototype: null };
                        return mkRef(id);
                    } };
            if (prop === "includes")
                return { __internal: "builtin", name: "String.includes", fn: (s) => obj.includes(String(s)) };
            if (prop === "slice")
                return { __internal: "builtin", name: "String.slice", fn: (s, e) => obj.slice(Number(s), e !== undefined ? Number(e) : undefined) };
            if (!isNaN(Number(prop)))
                return obj[Number(prop)];
        }
        if (!isRef(obj))
            return undefined;
        const heapObj = this.s.heap[obj.id];
        if (!heapObj)
            return undefined;
        // Promise instance methods
        if (heapObj.kind === "promise") {
            if (prop === "then") {
                return {
                    __internal: "builtin",
                    name: "Promise.prototype.then",
                    fn: (onFulfilled, onRejected) => {
                        const childId = nextId("heap");
                        this.s.heap[childId] = {
                            id: childId,
                            kind: "promise",
                            label: "Promise (pending)",
                            state: "pending",
                            value: undefined,
                            reactions: [],
                            handled: false,
                            prototype: null,
                            properties: {},
                        };
                        const reaction = { onFulfilled, onRejected, childId };
                        heapObj.handled = true;
                        if (heapObj.state === "pending") {
                            heapObj.reactions = heapObj.reactions || [];
                            heapObj.reactions.push(reaction);
                        } else if (heapObj.state === "fulfilled") {
                            this.queuePromiseReactionJob(reaction, "fulfilled", heapObj.value);
                        } else if (heapObj.state === "rejected") {
                            this.queuePromiseReactionJob(reaction, "rejected", heapObj.value);
                        }
                        return mkRef(childId);
                    },
                };
            }
            if (prop === "catch") {
                return {
                    __internal: "builtin",
                    name: "Promise.prototype.catch",
                    fn: (onRejected) => {
                        const thenFn = this.getMemberProperty(obj, "then");
                        return this.call(thenFn, obj, [undefined, onRejected]);
                    },
                };
            }
            if (prop === "finally") {
                return {
                    __internal: "builtin",
                    name: "Promise.prototype.finally",
                    fn: (onFinally) => {
                        const childId = nextId("heap");
                        this.s.heap[childId] = {
                            id: childId,
                            kind: "promise",
                            label: "Promise (pending)",
                            state: "pending",
                            value: undefined,
                            reactions: [],
                            handled: false,
                            prototype: null,
                            properties: {},
                        };
                        const reaction = {
                            onFulfilled: {
                                __internal: "builtin",
                                name: "finallyOnFulfilled",
                                fn: (val) => {
                                    if (this.isCallable(onFinally)) this.call(onFinally, undefined, []);
                                    return val;
                                }
                            },
                            onRejected: {
                                __internal: "builtin",
                                name: "finallyOnRejected",
                                fn: (err) => {
                                    if (this.isCallable(onFinally)) this.call(onFinally, undefined, []);
                                    throw this.createThrowSignal(err);
                                }
                            },
                            childId
                        };
                        if (heapObj.state === "pending") {
                            heapObj.reactions = heapObj.reactions || [];
                            heapObj.reactions.push(reaction);
                        } else if (heapObj.state === "fulfilled") {
                            this.queuePromiseReactionJob(reaction, "fulfilled", heapObj.value);
                        } else if (heapObj.state === "rejected") {
                            heapObj.handled = true;
                            this.queuePromiseReactionJob(reaction, "rejected", heapObj.value);
                        }
                        return mkRef(childId);
                    }
                };
            }
        }
        // Array methods
        if (heapObj.kind === "array") {
            const len = Number(heapObj.properties.length) || 0;
            if (prop === "length")
                return len;
            if (prop === "push")
                return { __internal: "builtin", name: "Array.push", fn: (...items) => {
                        let curLen = Number(heapObj.properties.length) || 0;
                        for (const item of items) {
                            heapObj.properties[curLen] = rtToBinding(item);
                            curLen++;
                        }
                        heapObj.properties.length = curLen;
                        return curLen;
                    } };
            if (prop === "pop")
                return { __internal: "builtin", name: "Array.pop", fn: () => {
                        if (len === 0)
                            return undefined;
                        const last = heapObj.properties[len - 1];
                        delete heapObj.properties[len - 1];
                        heapObj.properties.length = len - 1;
                        return last;
                    } };
            if (prop === "map")
                return { __internal: "builtin", name: "Array.map", fn: (cb) => {
                        const resultId = nextId("heap");
                        const resultProps = { length: len };
                        for (let i = 0; i < len; i++) {
                            const item = heapObj.properties[i];
                            const mapped = this.invokeCallable(cb, [item, i, obj], undefined, null);
                            resultProps[i] = rtToBinding(mapped);
                        }
                        this.s.heap[resultId] = { id: resultId, kind: "array", label: "Array", properties: resultProps, prototype: null };
                        return mkRef(resultId);
                    } };
            if (prop === "filter")
                return { __internal: "builtin", name: "Array.filter", fn: (cb) => {
                        const resultId = nextId("heap");
                        const resultProps = {};
                        let count = 0;
                        for (let i = 0; i < len; i++) {
                            const item = heapObj.properties[i];
                            const keep = Boolean(this.invokeCallable(cb, [item, i, obj], undefined, null));
                            if (keep)
                                resultProps[count++] = rtToBinding(item);
                        }
                        resultProps.length = count;
                        this.s.heap[resultId] = { id: resultId, kind: "array", label: "Array", properties: resultProps, prototype: null };
                        return mkRef(resultId);
                    } };
            if (prop === "forEach")
                return { __internal: "builtin", name: "Array.forEach", fn: (cb) => {
                        for (let i = 0; i < len; i++) {
                            const item = heapObj.properties[i];
                            this.invokeCallable(cb, [item, i, obj], undefined, null);
                        }
                        return undefined;
                    } };
            if (prop === "reduce")
                return { __internal: "builtin", name: "Array.reduce", fn: (cb, init) => {
                        let acc = init;
                        for (let i = 0; i < len; i++) {
                            const item = heapObj.properties[i];
                            acc = this.invokeCallable(cb, [acc, item, i, obj], undefined, null);
                        }
                        return acc;
                    } };
            if (prop === "join")
                return { __internal: "builtin", name: "Array.join", fn: (sep = ",") => {
                        const parts = Array.from({ length: len }, (_, i) => {
                            const val = heapObj.properties[i];
                            return val === undefined || val === null ? "" : String(val);
                        });
                        return parts.join(String(sep));
                    } };
            if (prop === "includes")
                return { __internal: "builtin", name: "Array.includes", fn: (val) => {
                        for (let i = 0; i < len; i++)
                            if (heapObj.properties[i] === val)
                                return true;
                        return false;
                    } };
            if (prop === "indexOf")
                return { __internal: "builtin", name: "Array.indexOf", fn: (val) => {
                        for (let i = 0; i < len; i++)
                            if (heapObj.properties[i] === val)
                                return i;
                        return -1;
                    } };
            if (prop === "slice")
                return { __internal: "builtin", name: "Array.slice", fn: (start = 0, end = len) => {
                        const resultId = nextId("heap");
                        const s = Number(start), e = Number(end);
                        const sliced = Array.from({ length: Math.max(0, e - s) }, (_, i) => heapObj.properties[i + s] ?? undefined);
                        const resultProps = { length: sliced.length };
                        sliced.forEach((v, i) => (resultProps[i] = v));
                        this.s.heap[resultId] = { id: resultId, kind: "array", label: "Array", properties: resultProps, prototype: null };
                        return mkRef(resultId);
                    } };
            if (prop === "find")
                return { __internal: "builtin", name: "Array.find", fn: (cb) => {
                        for (let i = 0; i < len; i++) {
                            const item = heapObj.properties[i];
                            if (this.invokeCallable(cb, [item, i, obj], undefined, null)) return item;
                        }
                        return undefined;
                    } };
            if (prop === "findIndex")
                return { __internal: "builtin", name: "Array.findIndex", fn: (cb) => {
                        for (let i = 0; i < len; i++) {
                            const item = heapObj.properties[i];
                            if (this.invokeCallable(cb, [item, i, obj], undefined, null)) return i;
                        }
                        return -1;
                    } };
            if (prop === "some")
                return { __internal: "builtin", name: "Array.some", fn: (cb) => {
                        for (let i = 0; i < len; i++) {
                            const item = heapObj.properties[i];
                            if (this.invokeCallable(cb, [item, i, obj], undefined, null)) return true;
                        }
                        return false;
                    } };
            if (prop === "every")
                return { __internal: "builtin", name: "Array.every", fn: (cb) => {
                        for (let i = 0; i < len; i++) {
                            const item = heapObj.properties[i];
                            if (!this.invokeCallable(cb, [item, i, obj], undefined, null)) return false;
                        }
                        return true;
                    } };
            if (prop === "sort")
                return { __internal: "builtin", name: "Array.sort", fn: (cmp) => {
                        const arr = Array.from({ length: len }, (_, i) => heapObj.properties[i]);
                        if (cmp) {
                            arr.sort((a, b) => this.invokeCallable(cmp, [a, b], undefined, null));
                        } else {
                            arr.sort((a, b) => String(a).localeCompare(String(b)));
                        }
                        arr.forEach((v, i) => (heapObj.properties[i] = v));
                        return obj;
                    } };
            if (!isNaN(Number(prop)))
                return heapObj.properties[Number(prop)];
        }
        if (heapObj.kind === "function" || heapObj.kind === "closure") {
            if (prop === "call") {
                return {
                    __internal: "builtin",
                    name: "Function.prototype.call",
                    fn: (thisArg, ...callArgs) => this.invokeCallable(obj, callArgs, thisArg, null),
                };
            }
            if (prop === "apply") {
                return {
                    __internal: "builtin",
                    name: "Function.prototype.apply",
                    fn: (thisArg, argArray) => {
                        let callArgs = [];
                        if (Array.isArray(argArray)) {
                            callArgs = argArray;
                        } else if (isRef(argArray)) {
                            const arrObj = this.s.heap[argArray.id];
                            if (arrObj && arrObj.kind === "array") {
                                const len = Number(arrObj.properties.length) || 0;
                                callArgs = Array.from({ length: len }, (_, i) => arrObj.properties[i]);
                            }
                        }
                        return this.invokeCallable(obj, callArgs, thisArg, null);
                    },
                };
            }
            if (prop === "bind") {
                return {
                    __internal: "builtin",
                    name: "Function.prototype.bind",
                    fn: (boundThis, ...boundArgs) => {
                        const boundFnId = nextId("heap");
                        const origFnData = heapObj.properties.__fnData;
                        const boundFnData = {
                            __internal: "function",
                            envId: origFnData?.envId,
                            node: origFnData?.node,
                            name: `bound ${origFnData?.name || ""}`,
                            boundThis,
                            boundArgs,
                        };
                        this.s.heap[boundFnId] = {
                            id: boundFnId,
                            kind: "function",
                            label: `bound ${heapObj.label}`,
                            properties: { __fnData: boundFnData, length: Math.max(0, (origFnData?.node?.params?.length || 0) - boundArgs.length) },
                            prototype: null,
                            capturedEnvIds: heapObj.capturedEnvIds || [],
                        };
                        return mkRef(boundFnId);
                    },
                };
            }
        }
        // Prototype chain resolution
        let cur = heapObj;
        while (cur) {
            if (prop in cur.properties) {
                return cur.properties[prop];
            }
            if (cur.prototype && isRef(cur.prototype)) {
                cur = this.s.heap[cur.prototype.id];
            } else {
                break;
            }
        }
        return undefined;
    }
    // ─── New expression ────────────────────────────────────────────────────────
    evalNewExpr(node, envId) {
        let callee;
        if (node.callee.type === "Identifier") {
            callee = this.resolveIdentifier(node.callee.name, envId, node.callee);
        } else {
            callee = this.evalExpr(node.callee, envId);
        }
        const args = node.arguments.map((a) => this.evalExpr(a, envId));
        return this.construct(callee, args, callee, node);
    }
    // ─── Identifier resolution (scope chain walk) ─────────────────────────────
    resolveIdentifier(name, envId, node) {
        let currentEnvId = envId;
        while (currentEnvId !== null) {
            const env = this.s.environments[currentEnvId];
            if (!env)
                break;
            if (name in env.bindings) {
                const binding = env.bindings[name];
                if (binding.state === "uninitialized") {
                    // TDZ error
                    this.recordStep(node ? nodeRange(node) : null, "tdz-error", `ReferenceError: Cannot access \`${name}\` before initialization. It is in the Temporal Dead Zone (TDZ) at this point!`);
                    throw this.createThrowSignal(`ReferenceError: Cannot access '${name}' before initialization`, node || this._currentNode);
                }
                // If this is an untouched built-in binding, return the callable builtin
                if (typeof binding.value === "string" && binding.value === `[built-in: ${name}]` && name in this.builtins) {
                    const b = this.builtins[name];
                    if (typeof b === "object" && b !== null && b.__internal === "builtin") return b;
                    if (typeof b === "function") {
                        if (b.__internal === "builtin") return b;
                        const callable = (...a) => b(...a);
                        callable.__internal = "builtin";
                        callable.fnName = name;
                        callable.fn = b;
                        for (const k of Object.keys(b)) callable[k] = b[k];
                        return callable;
                    }
                    return b;
                }
                this.recordStep(node ? nodeRange(node) : null, "expression-eval", `Reading \`${name}\` = \`${rtToDisplay(binding.value, this.s.heap)}\` from environment ${currentEnvId}.`, { lookupBinding: `${currentEnvId}/${name}` });
                return binding.value;
            }
            currentEnvId = env.outer;
        }
        if (name in this.builtins) {
            const b = this.builtins[name];
            if (typeof b === "object" && b !== null && b.__internal === "builtin") return b;
            if (typeof b === "function") {
                if (b.__internal === "builtin") return b;
                const callable = (...a) => b(...a);
                callable.__internal = "builtin";
                callable.fnName = name;
                callable.fn = b;
                for (const k of Object.keys(b)) callable[k] = b[k];
                return callable;
            }
            return b;
        }
        // Not found anywhere
        this.recordStep(node ? nodeRange(node) : null, "throw", `ReferenceError: \`${name}\` is not defined. It was not found in any scope in the scope chain.`);
        throw this.createThrowSignal(`ReferenceError: ${name} is not defined`, node || this._currentNode);
    }
    // ─── Assignment ──────────────────────────────────────────────────────────
    assignTo(target, val, envId, node) {
        if (target.type === "Identifier") {
            const name = target.name;
            this.updateBinding(name, envId, "initialized", val);
            this.recordStep(node ? nodeRange(node) : null, "assign", `\`${name}\` is assigned the value \`${rtToDisplay(val, this.s.heap)}\`.`);
        }
        else if (target.type === "MemberExpression") {
            const me = target;
            const obj = this.evalExpr(me.object, envId);
            const prop = me.computed
                ? String(this.evalExpr(me.property, envId))
                : me.property.name;
            if (isRef(obj)) {
                const heapObj = this.s.heap[obj.id];
                if (heapObj) {
                    heapObj.properties[prop] = rtToBinding(val);
                    this.recordStep(node ? nodeRange(node) : null, "assign", `Property \`${prop}\` on heap object \`${heapObj.label}\` (id: ${heapObj.id}) set to \`${rtToDisplay(val, this.s.heap)}\`.`);
                }
            }
        }
        else if (target.type === "ArrayPattern" || target.type === "ObjectPattern") {
            this.assignPattern(target, val, "var", envId, node);
        }
    }
    // ─── Destructuring pattern assignment ─────────────────────────────────────
    assignPattern(pattern, val, kind, envId, declNode) {
        if (!pattern) return;
        if (pattern.type === "Identifier") {
            const name = pattern.name;
            if (kind === "var") {
                this.updateBinding(name, envId, "initialized", val);
            } else {
                this.setBinding(envId, name, kind, "initialized", val);
            }
            this.recordStep(nodeRange(declNode), "declare", `\`${kind} ${name}\` = \`${rtToDisplay(val, this.s.heap)}\` (destructured).`);
        }
        else if (pattern.type === "ArrayPattern") {
            let items = [];
            if (isRef(val)) {
                const heapObj = this.s.heap[val.id];
                if (heapObj?.kind === "array") {
                    const len = Number(heapObj.properties.length) || 0;
                    items = Array.from({ length: len }, (_, i) => heapObj.properties[i]);
                }
            } else if (Array.isArray(val)) {
                items = val;
            } else if (typeof val === "string") {
                items = Array.from(val);
            }
            for (let i = 0; i < pattern.elements.length; i++) {
                const el = pattern.elements[i];
                if (el) {
                    if (el.type === "RestElement") {
                        const restId = nextId("heap");
                        const restSlice = items.slice(i);
                        const restProps = { length: restSlice.length };
                        restSlice.forEach((v, idx) => (restProps[idx] = v));
                        this.s.heap[restId] = { id: restId, kind: "array", label: "Array", properties: restProps, prototype: null };
                        this.assignPattern(el.argument, mkRef(restId), kind, envId, declNode);
                        break;
                    } else {
                        this.assignPattern(el, items[i], kind, envId, declNode);
                    }
                }
            }
        }
        else if (pattern.type === "ObjectPattern") {
            for (const prop of pattern.properties) {
                if (prop.type === "Property") {
                    const key = prop.key.name ?? String(prop.key.value);
                    const propVal = this.getMemberProperty(val, key);
                    this.assignPattern(prop.value, propVal, kind, envId, declNode);
                } else if (prop.type === "RestElement") {
                    const restId = nextId("heap");
                    const restProps = {};
                    if (isRef(val)) {
                        const heapObj = this.s.heap[val.id];
                        if (heapObj) {
                            Object.assign(restProps, heapObj.properties);
                        }
                    }
                    this.s.heap[restId] = { id: restId, kind: "object", label: "Object", properties: restProps, prototype: null };
                    this.assignPattern(prop.argument, mkRef(restId), kind, envId, declNode);
                }
            }
        }
        else if (pattern.type === "AssignmentPattern") {
            const actualVal = val !== undefined ? val : this.evalExpr(pattern.right, envId);
            this.assignPattern(pattern.left, actualVal, kind, envId, declNode);
        }
    }
    // ─── Class object creation ────────────────────────────────────────────────
    createClassObject(classNode, envId) {
        const className = classNode.id?.name ?? "(anonymous)";
        let constructorMethod = null;
        const methods = {};

        for (const item of classNode.body.body) {
            if (item.type === "MethodDefinition") {
                const methodName = item.key.name ?? String(item.key.value);
                if (item.kind === "constructor") {
                    constructorMethod = item.value;
                } else {
                    const fnId = this.createFunctionObject(methodName, item.value, envId);
                    methods[methodName] = mkRef(fnId);
                }
            }
        }

        if (!constructorMethod) {
            constructorMethod = {
                type: "FunctionExpression",
                id: null,
                params: [],
                body: { type: "BlockStatement", body: [] },
                loc: classNode.loc,
            };
        }

        let superConstructor = null;
        if (classNode.superClass) {
            superConstructor = this.evalExpr(classNode.superClass, envId);
        }

        const classHeapId = nextId("heap");
        const fnData = {
            __internal: "function",
            envId,
            node: constructorMethod,
            name: className,
            heapId: classHeapId,
            isClass: true,
            methods,
            superConstructor,
        };

        this.s.heap[classHeapId] = {
            id: classHeapId,
            kind: "function",
            label: `class ${className}`,
            properties: {
                name: className,
                length: constructorMethod.params?.length ?? 0,
                __fnData: fnData,
                prototype: mkRef(classHeapId),
                ...methods,
            },
            prototype: superConstructor && isRef(superConstructor) ? superConstructor : null,
            capturedEnvIds: [envId],
        };

        return mkRef(classHeapId);
    }
    execClassDecl(node, envId) {
        const className = node.id?.name ?? "(anonymous)";
        const classRef = this.createClassObject(node, envId);
        this.setBinding(envId, className, "class", "initialized", classRef);
        this.recordStep(nodeRange(node), "declare", `Class \`${className}\` is declared.`);
        return undefined;
    }
    evalClassExpr(node, envId) {
        const classRef = this.createClassObject(node, envId);
        this.recordStep(nodeRange(node), "expression-eval", `Class expression evaluated.`);
        return classRef;
    }
    // ─── Compound operator (+=, -=, etc.) ─────────────────────────────────────
    applyCompoundOp(op, left, right) {
        const l = left;
        const r = right;
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
    applyBinaryOp(op, left, right) {
        const l = left;
        const r = right;
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
                if (isRef(right)) {
                    const obj = this.s.heap[right.id];
                    return obj ? String(left) in obj.properties : false;
                }
                return false;
            default: return undefined;
        }
    }
    // ─── Unary operators ──────────────────────────────────────────────────────
    applyUnaryOp(op, val) {
        switch (op) {
            case "-": return -val;
            case "+": return +val;
            case "!": return !val;
            case "~": return ~val;
            case "typeof":
                if (val === null)
                    return "object";
                if (isRef(val)) {
                    const obj = this.s.heap[val.id];
                    return obj?.kind === "function" ? "function" : "object";
                }
                return typeof val;
            case "void": return undefined;
            default: return val;
        }
    }
    // ─── Create function heap object ──────────────────────────────────────────
    createFunctionObject(name, node, capturedEnvId) {
        const id = nextId("heap");
        const kind = "function";
        const fnData = { __internal: "function", envId: capturedEnvId, node, name, heapId: id };
        this.s.heap[id] = {
            id,
            kind,
            label: name,
            properties: {
                name,
                length: node.params?.length ?? 0,
                __fnData: fnData,
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
    setBinding(envId, name, kind, state, value) {
        const env = this.s.environments[envId];
        if (!env)
            return;
        env.bindings[name] = { kind, state, value: rtToBinding(value) };
        this.s.changedBindings.push(`${envId}/${name}`);
    }
    updateBinding(name, fromEnvId, state, value) {
        let currentEnvId = fromEnvId;
        while (currentEnvId !== null) {
            const env = this.s.environments[currentEnvId];
            if (!env)
                break;
            if (!env.isIntrinsics && name in env.bindings) {
                env.bindings[name] = { ...env.bindings[name], state, value: rtToBinding(value) };
                this.s.changedBindings.push(`${currentEnvId}/${name}`);
                return;
            }
            currentEnvId = env.outer;
        }
        // Global assignment for undeclared vars
        const globalEnv = Object.values(this.s.environments).find((e) => !e.isIntrinsics && (e.outer === null || this.s.environments[e.outer]?.isIntrinsics));
        if (globalEnv) {
            globalEnv.bindings[name] = { kind: "var", state, value: rtToBinding(value) };
            this.s.changedBindings.push(`${globalEnv.id}/${name}`);
        }
    }
    lookupBinding(name, envId) {
        let currentEnvId = envId;
        while (currentEnvId !== null) {
            const env = this.s.environments[currentEnvId];
            if (!env)
                break;
            if (name in env.bindings)
                return env.bindings[name];
            currentEnvId = env.outer;
        }
        return null;
    }
    // ─── Step recording ───────────────────────────────────────────────────────
    recordStep(range, eventType, explanation, extra) {
        const visibleEnvs = {};
        for (const [id, env] of Object.entries(this.s.environments)) {
            if (!env.isIntrinsics) {
                const cloned = deepClone(env);
                if (cloned.outer && this.s.environments[cloned.outer]?.isIntrinsics) {
                    cloned.outer = null;
                }
                visibleEnvs[id] = cloned;
            }
        }

        const step = {
            index: this.s.steps.length,
            nodeRange: range,
            eventType,
            explanation,
            callStack: deepClone(this.s.callStack),
            environments: visibleEnvs,
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
function nodeRange(node) {
    if (!node || !node.loc)
        return null;
    return {
        startLine: node.loc.start.line,
        endLine: node.loc.end.line,
        startCol: node.loc.start.column,
        endCol: node.loc.end.column,
    };
}
// ─── Helper: collect identifiers from patterns ────────────────────────────
function collectPatternNames(pattern) {
    if (!pattern)
        return [];
    if (pattern.type === "Identifier")
        return [pattern.name];
    if (pattern.type === "AssignmentPattern") {
        return collectPatternNames(pattern.left);
    }
    if (pattern.type === "ArrayPattern") {
        return pattern.elements.flatMap((e) => e ? collectPatternNames(e) : []);
    }
    if (pattern.type === "ObjectPattern") {
        return pattern.properties.flatMap((p) => {
            if (p.type === "RestElement")
                return collectPatternNames(p.argument);
            return collectPatternNames(p.value);
        });
    }
    if (pattern.type === "RestElement") {
        return collectPatternNames(pattern.argument);
    }
    return [];
}

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
    if (typeof v === "object" && v.__internal === "builtin")
        return `[built-in: ${v.name}]`;
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
    if (typeof v === "object" && v.__internal === "builtin")
        return `[built-in: ${v.name}]`;
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
    constructor(value) {
        this.value = value;
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
// ─── Main interpreter class ───────────────────────────────────────────────────
export class Interpreter {
    s;
    builtins = {};
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
    run(code) {
        let ast;
        try {
            ast = acorn.parse(code, {
                ecmaVersion: 2022,
                sourceType: "script",
                locations: true,
            });
        }
        catch (err) {
            const parseErr = {
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
        // Setup built-ins
        this.setupBuiltins(globalEnvId);
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
                    const cbRef = isRef(cb) ? cb.id : undefined;
                    this.s.webApis.push({ id, kind: "setTimeout", label: `setTimeout(${ms}ms)`, remainingMs: ms, callbackRef: cbRef });
                    this.s.macrotaskQueue.push({ id: nextId("mt"), kind: "macrotask", label: `setTimeout cb (${ms}ms)`, callback: cb, webApiId: id });
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
    drainEventLoop() {
        while (this.s.macrotaskQueue.length > 0) {
            if (this.s.steps.length >= this.s.stepLimit)
                break;
            const task = this.s.macrotaskQueue.shift();
            this.s.webApis = this.s.webApis.filter((w) => w.id !== task.webApiId);
            this.s.eventLoopState = "pulling-macrotask";
            this.recordStep(null, "event-loop-tick", `Event Loop: moving task "${task.label}" from Callback Queue onto Call Stack.`);
            const cb = task.callback;
            if (cb) {
                try {
                    this.invokeCallable(cb, []);
                }
                catch (sig) {
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
        for (const stmt of body) {
            if (this.s.steps.length >= this.s.stepLimit) {
                throw new ThrowSignal("Step limit exceeded (possible infinite loop)");
            }
            last = this.execStatement(stmt, envId);
            if (last instanceof ReturnSignal || last instanceof BreakSignal || last instanceof ContinueSignal) {
                return last;
            }
        }
        return last;
    }
    // ─── Statement execution ───────────────────────────────────────────────────
    execStatement(node, envId) {
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
                throw new ThrowSignal(val);
            }
            case "BreakStatement": return new BreakSignal(node.label?.name);
            case "ContinueStatement": return new ContinueSignal(node.label?.name);
            case "SwitchStatement": return this.execSwitch(node, envId);
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
            const names = collectPatternNames(decl.id);
            for (const name of names) {
                const old = this.lookupBinding(name, envId);
                if (node.kind === "var") {
                    // var: update in place (already hoisted as undefined)
                    this.updateBinding(name, envId, "initialized", initVal);
                    this.recordStep(nodeRange(decl), "assign", `\`var ${name}\` is assigned the value \`${rtToDisplay(initVal, this.s.heap)}\`. (It was already hoisted as \`undefined\`.)`);
                }
                else {
                    // let/const: transition from TDZ to initialized in target envId
                    this.setBinding(envId, name, node.kind, "initialized", initVal);
                    this.recordStep(nodeRange(decl), "declare", `\`${node.kind} ${name}\` is initialized to \`${rtToDisplay(initVal, this.s.heap)}\`. It is now accessible. (TDZ period is over.)`);
                }
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
                break;
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
                break;
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
                break;
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
                break;
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
                break;
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
        if (this.s.steps.length >= this.s.stepLimit) {
            throw new ThrowSignal("Step limit exceeded (possible infinite loop)");
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
                const arg = this.evalExpr(ue.argument, envId);
                return this.applyUnaryOp(ue.operator, arg);
            }
            case "UpdateExpression": {
                const upe = node;
                const name = upe.argument.name;
                const old = this.resolveIdentifier(name, envId, node);
                const newVal = upe.operator === "++" ? old + 1 : old - 1;
                this.updateBinding(name, envId, "initialized", newVal);
                this.recordStep(nodeRange(node), "assign", `${upe.operator === "++" ? "Increment" : "Decrement"}: \`${name}\` ${upe.operator === "++" ? "incremented from" : "decremented from"} ${old} to ${newVal}.`);
                return upe.prefix ? newVal : old;
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
            default:
                this.recordStep(nodeRange(node), "unsupported", `Unsupported expression: \`${node.type}\` at line ${node.loc?.start.line}.`);
                return undefined;
        }
    }
    // ─── Call expression ───────────────────────────────────────────────────────
    evalCallExpr(node, envId) {
        // Handle console.log specially
        if (node.callee.type === "MemberExpression" &&
            node.callee.object.type === "Identifier" &&
            node.callee.object.name === "console") {
            const method = node.callee.property.name;
            const args = node.arguments.map((a) => this.evalExpr(a, envId));
            const display = args.map((a) => rtToDisplay(a, this.s.heap));
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
            throw new ThrowSignal(`TypeError: ${node.callee.name ?? "value"} is not a function`);
        }
        return this.invokeCallable(callee, args, thisVal, node);
    }
    // ─── Unified callable invocation ──────────────────────────────────────────
    invokeCallable(callee, args, thisVal = undefined, callNode = null) {
        if (typeof callee === "object" && callee !== null && callee.__internal === "builtin") {
            return callee.fn(...args);
        }
        if (typeof callee === "object" && callee !== null && callee.__internal === "function") {
            return this.callFunction(callee, args, thisVal, callNode);
        }
        if (isRef(callee)) {
            const heapObj = this.s.heap[callee.id];
            if (heapObj?.kind === "function" || heapObj?.kind === "closure") {
                const fnData = heapObj.properties.__fnData;
                if (fnData)
                    return this.callFunction(fnData, args, thisVal, callNode);
            }
        }
        throw new ThrowSignal(`TypeError: \`${rtToDisplay(callee, this.s.heap)}\` is not a function (at line ${callNode?.loc?.start.line ?? "unknown"})`);
    }
    // ─── Call a user-defined function ─────────────────────────────────────────
    callFunction(fn, args, thisVal = undefined, callNode = null) {
        if (this.s.callStack.length >= 500) {
            throw new ThrowSignal("Maximum call stack size exceeded (stack overflow)");
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
        };
        this.s.callStack.push(ctx);
        this.recordStep(callNode ? nodeRange(callNode) : null, "call", `Calling function \`${fnName}\`. A new Function Execution Context is pushed onto the Call Stack (Creation Phase).`);
        // Creation phase: hoist params, var declarations, function declarations
        const params = fnNode.params ?? [];
        for (let i = 0; i < params.length; i++) {
            const pnames = collectPatternNames(params[i]);
            for (const name of pnames) {
                this.setBinding(fnEnvId, name, "param", "initialized", args[i]);
                this.recordStep(null, "declare", `Parameter \`${name}\` = \`${rtToDisplay(args[i], this.s.heap)}\` is added to the function's variable environment.`);
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
            throw new ThrowSignal(`TypeError: Cannot read properties of ${obj} (reading '${prop}')`);
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
        // Array methods
        if (heapObj.kind === "array") {
            const len = Number(heapObj.properties.length) || 0;
            if (prop === "length")
                return len;
            if (prop === "push")
                return { __internal: "builtin", name: "Array.push", fn: (...items) => {
                        for (const item of items) {
                            heapObj.properties[len] = rtToBinding(item);
                            heapObj.properties.length = len + items.length;
                        }
                        return len + items.length;
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
                        const parts = Array.from({ length: len }, (_, i) => rtToDisplay(heapObj.properties[i], this.s.heap));
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
            if (!isNaN(Number(prop)))
                return heapObj.properties[Number(prop)];
        }
        // Regular object
        const propVal = heapObj.properties[prop];
        return propVal ?? undefined;
    }
    // ─── New expression ────────────────────────────────────────────────────────
    evalNewExpr(node, envId) {
        const callee = this.evalExpr(node.callee, envId);
        const args = node.arguments.map((a) => this.evalExpr(a, envId));
        const newObjId = nextId("heap");
        this.s.heap[newObjId] = { id: newObjId, kind: "object", label: "instance", properties: {}, prototype: null };
        const newObj = mkRef(newObjId);
        this.recordStep(nodeRange(node), "call", `new expression: creating a new object instance on the heap (id: ${newObjId}), then calling the constructor.`);
        if (typeof callee === "object" && callee.__internal === "function") {
            const result = this.callFunction(callee, args, newObj, node);
            if (result && isRef(result))
                return result;
        }
        return newObj;
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
                    throw new ThrowSignal(`ReferenceError: Cannot access '${name}' before initialization`);
                }
                // If this is an untouched built-in binding, return the callable builtin
                if (typeof binding.value === "string" && binding.value === `[built-in: ${name}]` && name in this.builtins) {
                    return { __internal: "builtin", name, fn: this.builtins[name] };
                }
                this.recordStep(node ? nodeRange(node) : null, "expression-eval", `Reading \`${name}\` = \`${rtToDisplay(binding.value, this.s.heap)}\` from environment ${currentEnvId}.`, { lookupBinding: `${currentEnvId}/${name}` });
                return binding.value;
            }
            currentEnvId = env.outer;
        }
        if (name in this.builtins) {
            return { __internal: "builtin", name, fn: this.builtins[name] };
        }
        // Not found anywhere
        this.recordStep(node ? nodeRange(node) : null, "throw", `ReferenceError: \`${name}\` is not defined. It was not found in any scope in the scope chain.`);
        throw new ThrowSignal(`ReferenceError: ${name} is not defined`);
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
        const step = {
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

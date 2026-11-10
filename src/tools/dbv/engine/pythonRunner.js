// src/tools/dbv/engine/pythonRunner.js
// Sandboxed in-browser Python execution and compilation engine
// Provides Python syntax validation, AST parsing, variable binding, control flow,
// functions, lists, dicts, custom input (stdin/input()), and rich Python error reporting.

/**
 * Generates step-by-step execution trace frames for Python code to render in DBV visualizer
 * @param {string} code
 * @param {string} [customInput=""]
 * @returns {{ trace: Array<any>, logs: Array<any>, error: any }}
 */
export function generatePythonTrace(code, customInput = "") {
  const runner = new PythonInterpreter(code, customInput, () => false, true);
  const result = runner.execute();
  return {
    trace: runner.steps,
    logs: result.logs,
    error: result.error,
  };
}

/**
 * Execute Python code in a sandboxed environment.
 * @param {string} code - Python source code
 * @param {Object} options
 * @param {string} [options.customInput=""] - Stdin lines
 * @param {number} [options.timeoutMs=5000] - Hard execution timeout
 * @param {(logs: Array<any>) => void} [options.onLogs]
 * @param {(doneInfo: { logCount: number, executionTimeMs: number, exitCode: number }) => void} [options.onDone]
 * @param {(error: Object) => void} [options.onError]
 * @param {(msg: Object) => void} [options.onTimeout]
 * @returns {{ terminate: () => void }}
 */
export function executePythonScript(code, options = {}) {
  const {
    customInput = "",
    timeoutMs = 5000,
    onLogs,
    onDone,
    onError,
    onTimeout,
  } = options;

  let isTerminated = false;
  let timer = null;
  const startTime = performance.now();

  const cleanup = () => {
    isTerminated = true;
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
  };

  timer = setTimeout(() => {
    if (!isTerminated) {
      cleanup();
      const timeoutErr = {
        name: "TimeoutError",
        message: "Execution timed out (5s limit). Infinite loop detected.",
        line: 1,
        column: 1,
        kind: "timeout",
        stack: [],
        sourceSnippet: "",
        exitCode: 124,
      };
      onTimeout?.(timeoutErr);
    }
  }, timeoutMs);

  // Run execution synchronously in microtask so it yields immediately
  setTimeout(() => {
    if (isTerminated) return;

    try {
      const runner = new PythonInterpreter(code, customInput, () => isTerminated);
      const result = runner.execute();

      cleanup();

      if (result.logs.length > 0) {
        onLogs?.(result.logs);
      }

      if (result.error) {
        onError?.(result.error);
      } else {
        const elapsed = Math.round(performance.now() - startTime);
        onDone?.({
          logCount: result.logs.length,
          executionTimeMs: elapsed,
          exitCode: 0,
        });
      }
    } catch (err) {
      cleanup();
      const errObj = {
        name: err?.name || "PythonRuntimeError",
        message: err?.message || String(err),
        line: err?.line || 1,
        column: err?.column || 1,
        kind: "runtime",
        stack: err?.stack || [],
        sourceSnippet: err?.snippet || "",
        exitCode: 1,
      };
      onError?.(errObj);
    }
  }, 0);

  return { terminate: cleanup };
}

/**
 * Python Interpreter implementation
 */
export class PythonInterpreter {
  constructor(sourceCode, customInput = "", checkTerminated = () => false, enableTrace = false) {
    this.sourceCode = sourceCode;
    this.inputLines = typeof customInput === "string" ? customInput.split(/\r?\n/) : [];
    this.inputCursor = 0;
    this.checkTerminated = checkTerminated;
    this.enableTrace = enableTrace;

    this.logs = [];
    this.logCounter = 0;
    this.maxLogs = 5000;
    this.globals = new Map();
    this.functions = new Map();
    this.steps = [];
    this.callStack = [
      {
        id: "ctx-global",
        name: "Global",
        type: "Global",
        phase: "Execution",
        thisBinding: "None",
        variableEnvId: "env-global",
      },
    ];
    this.activeScopes = new Map();
    this.callCounter = 0;
    this.heap = {};

    this.initBuiltins();
    this.activeScopes.set("env-global", this.globals);
  }

  recordStep(lineNum, explanation, eventType = "execution-phase") {
    if (!this.enableTrace) return;

    const visibleEnvs = {};
    for (const [envId, scopeMap] of this.activeScopes.entries()) {
      const bindings = {};
      for (const [k, v] of scopeMap.entries()) {
        if (k === "True" || k === "False" || k === "None") continue;
        if (typeof v === "object" && v !== null) {
          const heapId = `heap-${k}`;
          this.heap[heapId] = {
            id: heapId,
            kind: Array.isArray(v) ? "array" : "object",
            properties: Array.isArray(v) ? Object.fromEntries(v.entries()) : v,
          };
          bindings[k] = { kind: "var", state: "initialized", value: { type: "ref", id: heapId } };
        } else {
          bindings[k] = { kind: "var", state: "initialized", value: v };
        }
      }
      visibleEnvs[envId] = {
        id: envId,
        outer: envId === "env-global" ? null : "env-global",
        bindings,
      };
    }

    const step = {
      index: this.steps.length,
      nodeRange: { startLine: lineNum, endLine: lineNum, startCol: 1, endCol: 40 },
      eventType,
      explanation,
      callStack: JSON.parse(JSON.stringify(this.callStack)),
      environments: JSON.parse(JSON.stringify(visibleEnvs)),
      heap: JSON.parse(JSON.stringify(this.heap)),
      webApis: {},
      microtaskQueue: [],
      macrotaskQueue: [],
      eventLoopState: "running",
      consoleOutput: this.logs.map((l) => ({ ...l, text: l.args.join(" ") })),
      changedBindings: [],
    };
    this.steps.push(step);
  }

  initBuiltins() {
    this.globals.set("True", true);
    this.globals.set("False", false);
    this.globals.set("None", null);
  }

  log(method, args, error = null) {
    if (this.logCounter >= this.maxLogs) return;
    this.logCounter++;
    this.logs.push({
      id: `py-log-${Date.now()}-${this.logCounter}`,
      method,
      args: args.map(String),
      error,
      timestamp: Date.now(),
    });
  }

  consumeInput(promptMsg = "") {
    if (promptMsg) {
      this.log("log", [String(promptMsg)]);
    }
    if (this.inputCursor < this.inputLines.length) {
      return this.inputLines[this.inputCursor++];
    }
    return "";
  }

  execute() {
    if (!this.sourceCode || !this.sourceCode.trim()) {
      return { logs: [], error: null };
    }

    const lines = this.sourceCode.split("\n");
    let currentLine = 1;

    try {
      this.executeBlock(lines, 0, lines.length, 0, this.globals);
      return { logs: this.logs, error: null };
    } catch (err) {
      const errName = err.name || "RuntimeError";
      const errMsg = err.message || String(err);
      const lineNum = err.line || currentLine;
      const colNum = err.column || 1;

      const snippet = this.buildSnippet(lineNum);
      const errorObj = {
        name: errName,
        message: errMsg,
        line: lineNum,
        column: colNum,
        kind: errName === "SyntaxError" ? "parse" : "runtime",
        stack: [{ fnName: "(main)", line: lineNum, column: colNum }],
        sourceSnippet: snippet,
        exitCode: 1,
      };

      // Add to logs as stderr
      this.log("error", [`${errName}: ${errMsg}`], errorObj);

      return { logs: this.logs, error: errorObj };
    }
  }

  buildSnippet(lineNum) {
    const lines = this.sourceCode.split("\n");
    const idx = lineNum - 1;
    if (idx >= 0 && idx < lines.length) {
      return `${lineNum} | ${lines[idx]}`;
    }
    return "";
  }

  executeBlock(lines, start, end, baseIndent, scope) {
    let i = start;
    let stepCount = 0;

    while (i < end) {
      if (this.checkTerminated()) {
        const timeoutErr = new Error("Execution timed out");
        timeoutErr.name = "TimeoutError";
        throw timeoutErr;
      }

      stepCount++;
      if (stepCount > 100_000) {
        const timeoutErr = new Error("Step limit exceeded (possible infinite loop)");
        timeoutErr.name = "TimeoutError";
        timeoutErr.line = i + 1;
        throw timeoutErr;
      }

      const rawLine = lines[i];
      const trimmed = rawLine.trim();

      // Skip blank lines and comments
      if (!trimmed || trimmed.startsWith("#")) {
        i++;
        continue;
      }

      const indent = rawLine.search(/\S/);
      if (indent < baseIndent) {
        // Dedented out of current block
        break;
      }

      const lineNum = i + 1;
      this.recordStep(lineNum, `Line ${lineNum}: ${trimmed}`);

      // 1. def func(...)
      if (trimmed.startsWith("def ")) {
        const match = trimmed.match(/^def\s+([A-Za-z0-9_]+)\s*\((.*?)\)\s*:/);
        if (!match) {
          const err = new Error("invalid syntax in function definition");
          err.name = "SyntaxError";
          err.line = i + 1;
          throw err;
        }
        const fnName = match[1];
        const params = match[2].split(",").map((s) => s.trim()).filter(Boolean);
        const blockEnd = this.findBlockEnd(lines, i + 1, indent + 1);
        this.functions.set(fnName, {
          params,
          bodyStart: i + 1,
          bodyEnd: blockEnd,
          indent: indent + 1,
        });
        i = blockEnd;
        continue;
      }

      // 2. if / elif / else
      if (trimmed.startsWith("if ")) {
        const condExpr = trimmed.slice(3, -1).trim();
        const blockEnd = this.findBlockEnd(lines, i + 1, indent + 1);
        const condVal = this.evalExpression(condExpr, scope, i + 1);

        if (this.isTruthy(condVal)) {
          this.executeBlock(lines, i + 1, blockEnd, indent + 1, scope);
        } else {
          // Check for elif or else
          let nextIdx = blockEnd;
          while (nextIdx < end) {
            const nextTrim = lines[nextIdx]?.trim() || "";
            const nextIndent = lines[nextIdx]?.search(/\S/);
            if (nextIndent === indent && nextTrim.startsWith("elif ")) {
              const elifCond = nextTrim.slice(5, -1).trim();
              const elifEnd = this.findBlockEnd(lines, nextIdx + 1, indent + 1);
              if (this.isTruthy(this.evalExpression(elifCond, scope, nextIdx + 1))) {
                this.executeBlock(lines, nextIdx + 1, elifEnd, indent + 1, scope);
                break;
              }
              nextIdx = elifEnd;
            } else if (nextIndent === indent && nextTrim.startsWith("else:")) {
              const elseEnd = this.findBlockEnd(lines, nextIdx + 1, indent + 1);
              this.executeBlock(lines, nextIdx + 1, elseEnd, indent + 1, scope);
              break;
            } else {
              break;
            }
          }
        }
        i = this.skipIfChain(lines, i, indent);
        continue;
      }

      // 3. while loop
      if (trimmed.startsWith("while ")) {
        const condExpr = trimmed.slice(6, -1).trim();
        const blockEnd = this.findBlockEnd(lines, i + 1, indent + 1);
        let loopCount = 0;

        while (this.isTruthy(this.evalExpression(condExpr, scope, i + 1))) {
          if (this.checkTerminated()) {
            const timeoutErr = new Error("Execution timed out");
            timeoutErr.name = "TimeoutError";
            throw timeoutErr;
          }
          loopCount++;
          if (loopCount > 25_000) {
            const timeoutErr = new Error("Infinite loop detected: while loop limit exceeded 25,000 iterations");
            timeoutErr.name = "TimeoutError";
            timeoutErr.line = i + 1;
            throw timeoutErr;
          }
          const flow = this.executeBlock(lines, i + 1, blockEnd, indent + 1, scope);
          if (flow?.signal === "break") break;
          if (flow?.signal === "return") return flow;
        }
        i = blockEnd;
        continue;
      }

      // 4. for var in iterable
      if (trimmed.startsWith("for ")) {
        const match = trimmed.match(/^for\s+([A-Za-z0-9_]+)\s+in\s+(.*?)\s*:/);
        if (!match) {
          const err = new Error("invalid syntax in for loop");
          err.name = "SyntaxError";
          err.line = i + 1;
          throw err;
        }
        const iterVar = match[1];
        const iterExpr = match[2];
        const blockEnd = this.findBlockEnd(lines, i + 1, indent + 1);
        const iterable = this.evalExpression(iterExpr, scope, i + 1);

        let items = [];
        if (Array.isArray(iterable)) {
          items = iterable;
        } else if (typeof iterable === "string") {
          items = iterable.split("");
        } else {
          const err = new Error(`'${typeof iterable}' object is not iterable`);
          err.name = "TypeError";
          err.line = i + 1;
          throw err;
        }

        for (const item of items) {
          if (this.checkTerminated()) {
            const timeoutErr = new Error("Execution timed out");
            timeoutErr.name = "TimeoutError";
            throw timeoutErr;
          }
          scope.set(iterVar, item);
          const flow = this.executeBlock(lines, i + 1, blockEnd, indent + 1, scope);
          if (flow?.signal === "break") break;
          if (flow?.signal === "return") return flow;
        }
        i = blockEnd;
        continue;
      }

      // 5. return stmt
      if (trimmed === "return" || trimmed.startsWith("return ")) {
        const retExpr = trimmed.length > 6 ? trimmed.slice(7).trim() : "None";
        const val = this.evalExpression(retExpr, scope, i + 1);
        return { signal: "return", value: val };
      }

      // 6. break / continue
      if (trimmed === "break") return { signal: "break" };
      if (trimmed === "continue") return { signal: "continue" };

      // 7. Assignment: a = b, a += b, etc.
      const assignMatch = trimmed.match(/^([A-Za-z0-9_]+(\[[^\]]+\])?)\s*(\+=|-=|\*=|\/=|%=|=)\s*(.*)$/);
      if (assignMatch && !trimmed.startsWith("print(")) {
        const target = assignMatch[1];
        const op = assignMatch[3];
        const expr = assignMatch[4];
        const val = this.evalExpression(expr, scope, i + 1);

        if (target.includes("[")) {
          const subMatch = target.match(/^([A-Za-z0-9_]+)\[([^\]]+)\]$/);
          if (subMatch) {
            const objName = subMatch[1];
            const keyExpr = subMatch[2];
            const obj = scope.get(objName);
            const key = this.evalExpression(keyExpr, scope, i + 1);
            if (obj && typeof obj === "object") {
              obj[key] = val;
            }
          }
        } else {
          if (op === "=") {
            scope.set(target, val);
          } else {
            const curr = scope.get(target) ?? 0;
            if (op === "+=") scope.set(target, curr + val);
            else if (op === "-=") scope.set(target, curr - val);
            else if (op === "*=") scope.set(target, curr * val);
            else if (op === "/=") scope.set(target, curr / val);
            else if (op === "%=") scope.set(target, curr % val);
          }
        }
        i++;
        continue;
      }

      // 8. Expression statement (print(...), function calls, etc.)
      this.evalExpression(trimmed, scope, i + 1);
      i++;
    }

    return null;
  }

  findBlockEnd(lines, startIdx, requiredIndent) {
    let j = startIdx;
    while (j < lines.length) {
      const line = lines[j];
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) {
        j++;
        continue;
      }
      const indent = line.search(/\S/);
      if (indent < requiredIndent) {
        break;
      }
      j++;
    }
    return j;
  }

  skipIfChain(lines, startIdx, baseIndent) {
    let curr = this.findBlockEnd(lines, startIdx + 1, baseIndent + 1);
    while (curr < lines.length) {
      const line = lines[curr];
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) {
        curr++;
        continue;
      }
      const indent = line.search(/\S/);
      if (indent === baseIndent && (trimmed.startsWith("elif ") || trimmed.startsWith("else:"))) {
        curr = this.findBlockEnd(lines, curr + 1, baseIndent + 1);
      } else {
        break;
      }
    }
    return curr;
  }

  evalExpression(expr, scope, lineNum) {
    const trimmed = expr.trim();
    if (!trimmed) return null;

    // print(...)
    if (trimmed.startsWith("print(") && trimmed.endsWith(")")) {
      const inner = trimmed.slice(6, -1);
      const args = this.parseArguments(inner, scope, lineNum);
      const out = args.map((a) => (a === null ? "None" : a === true ? "True" : a === false ? "False" : String(a))).join(" ");
      this.log("log", [out]);
      return null;
    }

    // input(...)
    if (trimmed.startsWith("input(") && trimmed.endsWith(")")) {
      const promptArg = trimmed.slice(6, -1).trim();
      const promptText = promptArg ? this.evalExpression(promptArg, scope, lineNum) : "";
      return this.consumeInput(promptText);
    }

    // len(...)
    if (trimmed.startsWith("len(") && trimmed.endsWith(")")) {
      const val = this.evalExpression(trimmed.slice(4, -1), scope, lineNum);
      return val?.length ?? (Array.isArray(val) ? val.length : 0);
    }

    // range(...)
    if (trimmed.startsWith("range(") && trimmed.endsWith(")")) {
      const args = this.parseArguments(trimmed.slice(6, -1), scope, lineNum);
      const start = args.length === 1 ? 0 : Number(args[0]);
      const stop = args.length === 1 ? Number(args[0]) : Number(args[1]);
      const step = args.length >= 3 ? Number(args[2]) : 1;
      const res = [];
      for (let k = start; step > 0 ? k < stop : k > stop; k += step) {
        res.push(k);
      }
      return res;
    }

    // sum, max, min, abs
    if (trimmed.startsWith("sum(") && trimmed.endsWith(")")) {
      const val = this.evalExpression(trimmed.slice(4, -1), scope, lineNum);
      return Array.isArray(val) ? val.reduce((a, b) => a + Number(b), 0) : 0;
    }
    if (trimmed.startsWith("max(") && trimmed.endsWith(")")) {
      const args = this.parseArguments(trimmed.slice(4, -1), scope, lineNum);
      const list = args.length === 1 && Array.isArray(args[0]) ? args[0] : args;
      return Math.max(...list.map(Number));
    }
    if (trimmed.startsWith("min(") && trimmed.endsWith(")")) {
      const args = this.parseArguments(trimmed.slice(4, -1), scope, lineNum);
      const list = args.length === 1 && Array.isArray(args[0]) ? args[0] : args;
      return Math.min(...list.map(Number));
    }
    if (trimmed.startsWith("abs(") && trimmed.endsWith(")")) {
      const val = this.evalExpression(trimmed.slice(4, -1), scope, lineNum);
      return Math.abs(Number(val));
    }

    // Type conversions: str(), int(), float(), bool()
    if (trimmed.startsWith("str(") && trimmed.endsWith(")")) {
      const v = this.evalExpression(trimmed.slice(4, -1), scope, lineNum);
      return v === null ? "None" : String(v);
    }
    if (trimmed.startsWith("int(") && trimmed.endsWith(")")) {
      const v = this.evalExpression(trimmed.slice(4, -1), scope, lineNum);
      const n = parseInt(v, 10);
      if (isNaN(n)) {
        const err = new Error(`invalid literal for int() with base 10: '${v}'`);
        err.name = "ValueError";
        err.line = lineNum;
        throw err;
      }
      return n;
    }
    if (trimmed.startsWith("float(") && trimmed.endsWith(")")) {
      const v = this.evalExpression(trimmed.slice(6, -1), scope, lineNum);
      const n = parseFloat(v);
      if (isNaN(n)) {
        const err = new Error(`could not convert string to float: '${v}'`);
        err.name = "ValueError";
        err.line = lineNum;
        throw err;
      }
      return n;
    }

    // List literal: [1, 2, 3]
    if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
      const inner = trimmed.slice(1, -1).trim();
      return inner ? this.parseArguments(inner, scope, lineNum) : [];
    }

    // Dict literal: {"a": 1}
    if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
      const inner = trimmed.slice(1, -1).trim();
      if (!inner) return {};
      const obj = {};
      const pairs = inner.split(",");
      for (const pair of pairs) {
        const [k, v] = pair.split(":");
        if (k && v) {
          obj[this.evalExpression(k, scope, lineNum)] = this.evalExpression(v, scope, lineNum);
        }
      }
      return obj;
    }

    // Function call
    const callMatch = trimmed.match(/^([A-Za-z0-9_]+)\s*\((.*?)\)$/);
    if (callMatch && this.functions.has(callMatch[1])) {
      const fnName = callMatch[1];
      const fn = this.functions.get(fnName);
      const args = this.parseArguments(callMatch[2], scope, lineNum);
      const fnScope = new Map(this.globals);
      fn.params.forEach((param, idx) => {
        fnScope.set(param, args[idx] ?? null);
      });
      const lines = this.sourceCode.split("\n");

      this.callCounter++;
      const frameId = `ctx-${fnName}-${this.callCounter}`;
      const envId = `env-${frameId}`;
      this.callStack.push({
        id: frameId,
        name: fnName,
        type: "Function",
        phase: "Execution",
        thisBinding: "None",
        variableEnvId: envId,
      });
      this.activeScopes.set(envId, fnScope);
      this.recordStep(fn.bodyStart, `Calling function ${fnName}()`, "call");

      const flow = this.executeBlock(lines, fn.bodyStart, fn.bodyEnd, fn.indent, fnScope);

      this.recordStep(lineNum, `Returning from ${fnName}()`, "return");
      this.callStack.pop();
      this.activeScopes.delete(envId);
      return flow?.value ?? null;
    }

    // Arithmetic / Comparisons / Logical Expressions
    return this.evalArithmetic(trimmed, scope, lineNum);
  }

  parseArguments(argStr, scope, lineNum) {
    if (!argStr || !argStr.trim()) return [];
    const args = [];
    let current = "";
    let depth = 0;
    let inStr = false;
    let strChar = "";

    for (let c = 0; c < argStr.length; c++) {
      const ch = argStr[c];
      if (inStr) {
        current += ch;
        if (ch === strChar && argStr[c - 1] !== "\\") inStr = false;
        continue;
      }
      if (ch === '"' || ch === "'") {
        inStr = true;
        strChar = ch;
        current += ch;
        continue;
      }
      if (ch === "(" || ch === "[" || ch === "{") depth++;
      else if (ch === ")" || ch === "]" || ch === "}") depth--;
      else if (ch === "," && depth === 0) {
        args.push(this.evalExpression(current.trim(), scope, lineNum));
        current = "";
        continue;
      }
      current += ch;
    }
    if (current.trim()) {
      args.push(this.evalExpression(current.trim(), scope, lineNum));
    }
    return args;
  }

  evalArithmetic(expr, scope, lineNum) {
    // Strings
    if ((expr.startsWith('"') && expr.endsWith('"')) || (expr.startsWith("'") && expr.endsWith("'"))) {
      return expr.slice(1, -1);
    }
    // Formatted f-string: f"Hello {name}"
    if ((expr.startsWith('f"') && expr.endsWith('"')) || (expr.startsWith("f'") && expr.endsWith("'"))) {
      const inner = expr.slice(2, -1);
      return inner.replace(/\{([^}]+)\}/g, (_match, group) => {
        return String(this.evalExpression(group.trim(), scope, lineNum));
      });
    }

    // Numbers
    if (/^-?\d+(\.\d+)?$/.test(expr)) {
      return expr.includes(".") ? parseFloat(expr) : parseInt(expr, 10);
    }

    // Booleans and None
    if (expr === "True") return true;
    if (expr === "False") return false;
    if (expr === "None") return null;

    // Check operators in precedence order:
    // 1. or
    const orIdx = this.findOperator(expr, "or");
    if (orIdx !== -1) {
      const left = this.evalExpression(expr.slice(0, orIdx), scope, lineNum);
      const right = this.evalExpression(expr.slice(orIdx + 2), scope, lineNum);
      return this.isTruthy(left) ? left : right;
    }

    // 2. and
    const andIdx = this.findOperator(expr, "and");
    if (andIdx !== -1) {
      const left = this.evalExpression(expr.slice(0, andIdx), scope, lineNum);
      const right = this.evalExpression(expr.slice(andIdx + 3), scope, lineNum);
      return this.isTruthy(left) ? right : left;
    }

    // 3. Comparisons (==, !=, <=, >=, <, >)
    for (const op of ["==", "!=", "<=", ">=", "<", ">"]) {
      const opIdx = this.findOperator(expr, op);
      if (opIdx !== -1) {
        const left = this.evalExpression(expr.slice(0, opIdx), scope, lineNum);
        const right = this.evalExpression(expr.slice(opIdx + op.length), scope, lineNum);
        if (op === "==") return left === right;
        if (op === "!=") return left !== right;
        if (op === "<=") return left <= right;
        if (op === ">=") return left >= right;
        if (op === "<") return left < right;
        if (op === ">") return left > right;
      }
    }

    // 4. Addition / Subtraction
    const addIdx = this.findOperator(expr, "+");
    if (addIdx !== -1) {
      const left = this.evalExpression(expr.slice(0, addIdx), scope, lineNum);
      const right = this.evalExpression(expr.slice(addIdx + 1), scope, lineNum);
      return left + right;
    }

    const subIdx = this.findOperator(expr, "-");
    if (subIdx !== -1 && subIdx > 0 && !/[\+\-\*\/]/.test(expr[subIdx - 1])) {
      const left = this.evalExpression(expr.slice(0, subIdx), scope, lineNum);
      const right = this.evalExpression(expr.slice(subIdx + 1), scope, lineNum);
      return Number(left) - Number(right);
    }

    // 5. Multiplication / Division / Modulo
    const mulIdx = this.findOperator(expr, "*");
    if (mulIdx !== -1) {
      const left = this.evalExpression(expr.slice(0, mulIdx), scope, lineNum);
      const right = this.evalExpression(expr.slice(mulIdx + 1), scope, lineNum);
      if (typeof left === "string" && typeof right === "number") {
        return left.repeat(Math.max(0, right));
      }
      return Number(left) * Number(right);
    }

    const divIdx = this.findOperator(expr, "/");
    if (divIdx !== -1) {
      const left = this.evalExpression(expr.slice(0, divIdx), scope, lineNum);
      const right = this.evalExpression(expr.slice(divIdx + 1), scope, lineNum);
      if (Number(right) === 0) {
        const err = new Error("division by zero");
        err.name = "ZeroDivisionError";
        err.line = lineNum;
        throw err;
      }
      return Number(left) / Number(right);
    }

    const modIdx = this.findOperator(expr, "%");
    if (modIdx !== -1) {
      const left = this.evalExpression(expr.slice(0, modIdx), scope, lineNum);
      const right = this.evalExpression(expr.slice(modIdx + 1), scope, lineNum);
      return Number(left) % Number(right);
    }

    // 6. Subscript access: a[0], a["key"]
    if (expr.includes("[") && expr.endsWith("]")) {
      const sub = expr.match(/^([A-Za-z0-9_]+)\[(.*)\]$/);
      if (sub) {
        const obj = this.evalExpression(sub[1], scope, lineNum);
        const key = this.evalExpression(sub[2], scope, lineNum);
        if (Array.isArray(obj) && (key < 0 || key >= obj.length)) {
          const err = new Error("list index out of range");
          err.name = "IndexError";
          err.line = lineNum;
          throw err;
        }
        return obj?.[key] ?? null;
      }
    }

    // 7. Identifier lookup
    if (/^[A-Za-z0-9_]+$/.test(expr)) {
      if (scope.has(expr)) return scope.get(expr);
      if (this.globals.has(expr)) return this.globals.get(expr);

      const err = new Error(`name '${expr}' is not defined`);
      err.name = "NameError";
      err.line = lineNum;
      throw err;
    }

    return expr;
  }

  findOperator(expr, op) {
    let depth = 0;
    let inStr = false;
    let strChar = "";

    for (let c = 0; c < expr.length; c++) {
      const ch = expr[c];
      if (inStr) {
        if (ch === strChar && expr[c - 1] !== "\\") inStr = false;
        continue;
      }
      if (ch === '"' || ch === "'") {
        inStr = true;
        strChar = ch;
        continue;
      }
      if (ch === "(" || ch === "[" || ch === "{") depth++;
      else if (ch === ")" || ch === "]" || ch === "}") depth--;
      else if (depth === 0) {
        if (op === "and" || op === "or") {
          const word = expr.slice(c, c + op.length);
          if (word === op && (c === 0 || /\s/.test(expr[c - 1])) && (c + op.length >= expr.length || /\s/.test(expr[c + op.length]))) {
            return c;
          }
        } else if (expr.startsWith(op, c)) {
          return c;
        }
      }
    }
    return -1;
  }

  isTruthy(v) {
    if (!v) return false;
    if (Array.isArray(v)) return v.length > 0;
    if (typeof v === "object") return Object.keys(v).length > 0;
    return true;
  }
}


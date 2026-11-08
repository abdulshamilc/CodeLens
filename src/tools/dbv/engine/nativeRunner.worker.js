// src/tools/dbv/engine/nativeRunner.worker.js
// Sandboxed native JavaScript execution worker.
// Executes standard JS natively with mock fetch, throttled console serializer,
// custom input (prompt/readline/input), escape-hatch isolation, and hard safety limits.

import { serializeConsoleArgs } from "./nativeSerializer";

const MAX_LOG_LINES = 5000;
let logCount = 0;
let pendingLogs = [];
let flushTimer = null;

function flushLogs() {
  if (pendingLogs.length > 0) {
    self.postMessage({ type: "logs", items: pendingLogs });
    pendingLogs = [];
  }
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
}

function queueLog(method, rawArgs, error = null) {
  if (logCount >= MAX_LOG_LINES) {
    if (logCount === MAX_LOG_LINES) {
      logCount++;
      pendingLogs.push({
        id: `sys-cap-${Date.now()}`,
        method: "warn",
        args: [`[CodeLens] Output limit reached (${MAX_LOG_LINES} lines). Further output truncated.`],
        error: null,
        timestamp: Date.now(),
      });
      flushLogs();
    }
    return;
  }

  logCount++;
  const serialized = serializeConsoleArgs(rawArgs);
  pendingLogs.push({
    id: `log-${Date.now()}-${logCount}`,
    method,
    args: serialized,
    error,
    timestamp: Date.now(),
  });

  if (pendingLogs.length >= 50) {
    flushLogs();
  } else if (!flushTimer) {
    flushTimer = setTimeout(flushLogs, 30);
  }
}

// Custom sandboxed console
const timers = new Map();
const customConsole = {
  log: (...args) => queueLog("log", args),
  info: (...args) => queueLog("info", args),
  warn: (...args) => queueLog("warn", args),
  error: (...args) => queueLog("error", args),
  clear: () => {
    pendingLogs = [];
    self.postMessage({ type: "clear" });
  },
  dir: (...args) => queueLog("log", args),
  table: (...args) => queueLog("log", args),
  time: (label = "default") => {
    timers.set(label, performance.now());
  },
  timeEnd: (label = "default") => {
    const start = timers.get(label);
    if (start !== undefined) {
      const elapsed = (performance.now() - start).toFixed(3);
      timers.delete(label);
      queueLog("log", [`${label}: ${elapsed} ms`]);
    } else {
      queueLog("warn", [`Timer '${label}' does not exist`]);
    }
  },
};

// Mock fetch for offline API demos
function mockFetch(url, options = {}) {
  const urlStr = String(url).toLowerCase();

  let responseData = { message: "Mock API response", success: true };
  if (urlStr.includes("user")) {
    responseData = [
      { id: 1, name: "Leanne Graham", username: "Bret", email: "Sincere@april.biz" },
      { id: 2, name: "Ervin Howell", username: "Antonette", email: "Shanna@melissa.tv" },
      { id: 3, name: "Clementine Bauch", username: "Samantha", email: "Nathan@yesenia.net" },
    ];
  } else if (urlStr.includes("post") || urlStr.includes("todo")) {
    responseData = [
      { id: 1, userId: 1, title: "Explore CodeLens Visualizer", completed: true },
      { id: 2, userId: 1, title: "Master JavaScript Async/Await", completed: false },
    ];
  } else if (urlStr.includes("fact") || urlStr.includes("quote")) {
    responseData = {
      fact: "JavaScript was created in 10 days in May 1995 by Brendan Eich.",
      length: 64,
    };
  }

  return Promise.resolve({
    ok: true,
    status: 200,
    statusText: "OK",
    headers: new Headers({ "content-type": "application/json" }),
    json: async () => responseData,
    text: async () => JSON.stringify(responseData),
  });
}

// Shadow dangerous escape hatches in worker context
const forbidden = () => {
  throw new Error("Access to network/storage escape hatches is disabled in the CodeLens sandbox.");
};

try {
  self.XMLHttpRequest = forbidden;
  self.WebSocket = forbidden;
  self.Worker = forbidden;
  self.SharedWorker = forbidden;
  self.indexedDB = null;
} catch {
  // Ignore property definition errors in strict environments
}

self.onmessage = async (event) => {
  const msg = event.data;
  if (!msg || msg.type !== "run") return;

  const { code, customInput = "" } = msg;
  logCount = 0;
  pendingLogs = [];

  // Setup custom input (stdin) providers
  let inputLines = typeof customInput === "string" ? customInput.split(/\r?\n/) : [];
  let inputIndex = 0;

  function customPrompt(promptMsg) {
    if (promptMsg !== undefined && promptMsg !== "") {
      queueLog("log", [String(promptMsg)]);
    }
    if (inputIndex < inputLines.length) {
      return inputLines[inputIndex++];
    }
    return "";
  }

  function customReadline() {
    if (inputIndex < inputLines.length) {
      return inputLines[inputIndex++];
    }
    return null;
  }

  try {
    // Construct AsyncFunction to support top-level await
    const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
    const runner = new AsyncFunction("console", "fetch", "prompt", "readline", "input", code);

    // Execute user code with sandboxed environment
    await runner(customConsole, mockFetch, customPrompt, customReadline, customPrompt);

    // Flush any pending logs
    flushLogs();

    self.postMessage({ type: "done", logCount });
  } catch (err) {
    const name = err?.name || "Error";
    const message = err?.message || String(err);
    let line = 1;
    let column = 1;

    if (err?.stack) {
      const match = err.stack.match(/<anonymous>:(\d+):(\d+)/) || err.stack.match(/:(\d+):(\d+)/);
      if (match) {
        line = Math.max(1, parseInt(match[1], 10) - 2);
        column = parseInt(match[2], 10) || 1;
      }
    }

    const codeLines = code.split("\n");
    const snippet = line <= codeLines.length ? `${line} | ${codeLines[line - 1]}` : "";

    const errorObj = {
      name,
      message,
      line,
      column,
      kind: name === "SyntaxError" ? "parse" : "runtime",
      stack: [{ fnName: "(anonymous)", line, column }],
      sourceSnippet: snippet,
      exitCode: 1,
    };

    queueLog("error", [`${name}: ${message}`], errorObj);
    flushLogs();

    self.postMessage({
      type: "error",
      error: errorObj,
      message: `${name}: ${message}`,
      stack: err?.stack,
    });
  }
};

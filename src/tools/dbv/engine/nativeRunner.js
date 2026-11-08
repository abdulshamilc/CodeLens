// src/tools/dbv/engine/nativeRunner.js
// Client interface for running JavaScript in the native Web Worker sandbox
// Enforces a 5-second hard watchdog timeout to protect against infinite loops.

/**
 * Execute code in the native Web Worker sandbox
 * @param {string} code
 * @param {Object} options
 * @param {string} [options.customInput=""]
 * @param {(logs: Array<any>) => void} [options.onLogs]
 * @param {(summary: { logCount: number, executionTimeMs: number, exitCode: number }) => void} [options.onDone]
 * @param {(error: Object) => void} [options.onError]
 * @param {(msg: Object) => void} [options.onTimeout]
 * @param {() => void} [options.onClear]
 * @param {number} [options.timeoutMs=5000]
 * @returns {{ terminate: () => void }}
 */
export function executeNativeScript(code, options = {}) {
  const {
    customInput = "",
    onLogs,
    onDone,
    onError,
    onTimeout,
    onClear,
    timeoutMs = 5000,
  } = options;

  let worker = null;
  let watchdog = null;
  let isFinished = false;
  const startTime = performance.now();

  function cleanup() {
    isFinished = true;
    if (watchdog) {
      clearTimeout(watchdog);
      watchdog = null;
    }
    if (worker) {
      try {
        worker.terminate();
      } catch {}
      worker = null;
    }
  }

  try {
    worker = new Worker(new URL("./nativeRunner.worker.js", import.meta.url), {
      type: "module",
    });

    worker.onmessage = (event) => {
      const msg = event.data;
      if (!msg) return;

      if (msg.type === "logs") {
        onLogs?.(msg.items);
      } else if (msg.type === "clear") {
        onClear?.();
      } else if (msg.type === "done") {
        const elapsed = Math.round(performance.now() - startTime);
        cleanup();
        onDone?.({ logCount: msg.logCount, executionTimeMs: elapsed, exitCode: 0 });
      } else if (msg.type === "error") {
        cleanup();
        const errObj = msg.error || {
          name: "RuntimeError",
          message: msg.message || "Native runner execution error",
          line: 1,
          column: 1,
          kind: "runtime",
          stack: [],
          sourceSnippet: "",
          exitCode: 1,
        };
        onError?.(errObj);
      }
    };

    worker.onerror = (err) => {
      cleanup();
      const errObj = {
        name: "WorkerError",
        message: err?.message || "Native worker error",
        line: 1,
        column: 1,
        kind: "runtime",
        stack: [],
        sourceSnippet: "",
        exitCode: 1,
      };
      onError?.(errObj);
    };

    // Watchdog timer: hard kill at 5 seconds
    watchdog = setTimeout(() => {
      if (!isFinished && worker) {
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

    // Launch worker with code and customInput
    worker.postMessage({ type: "run", code, customInput });
  } catch (err) {
    cleanup();
    const errObj = {
      name: "StartupError",
      message: err?.message || "Failed to start native runner worker",
      line: 1,
      column: 1,
      kind: "runtime",
      stack: [],
      sourceSnippet: "",
      exitCode: 1,
    };
    onError?.(errObj);
  }

  return {
    terminate: cleanup,
  };
}

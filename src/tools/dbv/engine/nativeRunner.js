// src/tools/dbv/engine/nativeRunner.js
// Client interface for running JavaScript in the native Web Worker sandbox
// Enforces a 5-second hard watchdog timeout to protect against infinite loops.

/**
 * Execute code in the native Web Worker sandbox
 * @param {string} code
 * @param {Object} options
 * @param {(logs: Array<any>) => void} [options.onLogs]
 * @param {(summary: { logCount: number, executionTimeMs: number }) => void} [options.onDone]
 * @param {(error: { message: string, stack?: string }) => void} [options.onError]
 * @param {(msg: string) => void} [options.onTimeout]
 * @param {() => void} [options.onClear]
 * @param {number} [options.timeoutMs=5000]
 * @returns {{ terminate: () => void }}
 */
export function executeNativeScript(code, options = {}) {
  const {
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
      worker.terminate();
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
        onDone?.({ logCount: msg.logCount, executionTimeMs: elapsed });
      } else if (msg.type === "error") {
        cleanup();
        onError?.({ message: msg.message, stack: msg.stack });
      }
    };

    worker.onerror = (err) => {
      cleanup();
      onError?.({ message: err.message || "Native worker error" });
    };

    // Watchdog timer: hard kill at 5 seconds
    watchdog = setTimeout(() => {
      if (!isFinished && worker) {
        cleanup();
        onTimeout?.("Execution timed out (5s limit). Infinite loop detected.");
      }
    }, timeoutMs);

    // Launch worker
    worker.postMessage({ type: "run", code });
  } catch (err) {
    cleanup();
    onError?.({ message: err.message || "Failed to start native runner worker" });
  }

  return {
    terminate: cleanup,
  };
}

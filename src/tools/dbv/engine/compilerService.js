// src/tools/dbv/engine/compilerService.js
// Central Multi-Language Compiler & Execution Service
// Manages language configurations, syntax validation, input/output piping,
// runtime dispatching, error normalization, and execution lifecycle.

import * as acorn from "acorn";
import { executeNativeScript } from "./nativeRunner";
import { transpileTypeScript } from "./typeScriptCompiler";
import { executePythonScript } from "./pythonRunner";

export const SUPPORTED_LANGUAGES = [
  {
    id: "javascript",
    name: "JavaScript",
    fileName: "main.js",
    version: "ECMAScript 2022",
    icon: "JS",
    color: "#f7df1e",
    textColor: "#000000",
    badgeText: "JS",
    defaultCode: `// CodeLens JavaScript Runner\nconsole.log("Hello, World!");\n`,
  },
  {
    id: "typescript",
    name: "TypeScript",
    fileName: "main.ts",
    version: "TypeScript 5.x",
    icon: "TS",
    color: "#3178c6",
    textColor: "#ffffff",
    badgeText: "TS",
    defaultCode: `// CodeLens TypeScript Runner\ninterface Greeter {\n  greeting: string;\n  name: string;\n}\n\nconst user: Greeter = {\n  greeting: "Hello",\n  name: "TypeScript Developer",\n};\n\nconsole.log(\`\${user.greeting}, \${user.name}!\`);\n`,
  },
  {
    id: "python",
    name: "Python",
    fileName: "main.py",
    version: "Python 3.x",
    icon: "PY",
    color: "#3572A5",
    textColor: "#ffffff",
    badgeText: "PY",
    defaultCode: `# CodeLens Python Runner\ndef greet(name):\n    print(f"Hello, {name}!")\n\ngreet("Python Developer")\n`,
  },
];

/**
 * Find language metadata by ID
 * @param {string} langId
 * @returns {Object|null}
 */
export function getLanguageConfig(langId) {
  const norm = String(langId || "javascript").toLowerCase();
  return (
    SUPPORTED_LANGUAGES.find(
      (l) => l.id === norm || l.name.toLowerCase() === norm || l.fileName.endsWith(`.${norm}`)
    ) || null
  );
}

/**
 * Validate source code and language before compilation
 * @param {string} code
 * @param {string} language
 * @returns {{ valid: boolean, error: null | Object }}
 */
export function validateSourceCode(code, language = "javascript") {
  const langConfig = getLanguageConfig(language);
  if (!langConfig) {
    return {
      valid: false,
      error: {
        name: "UnsupportedLanguageError",
        message: `Language '${language}' is not supported. Supported languages: ${SUPPORTED_LANGUAGES.map((l) => l.id).join(", ")}.`,
        line: 1,
        column: 1,
        kind: "validation",
        stack: [],
        sourceSnippet: "",
        exitCode: 1,
      },
    };
  }

  if (typeof code !== "string" || !code.trim()) {
    return {
      valid: false,
      error: {
        name: "ValidationError",
        message: "Editor is empty. Enter source code to compile and execute.",
        line: 1,
        column: 1,
        kind: "validation",
        stack: [],
        sourceSnippet: "",
        exitCode: 1,
      },
    };
  }

  // Pre-validate syntax per language
  if (langConfig.id === "javascript") {
    try {
      acorn.parse(code, {
        ecmaVersion: 2022,
        sourceType: "script",
        locations: true,
      });
    } catch (err) {
      const line = err.loc?.line ?? 1;
      const col = (err.loc?.column ?? 0) + 1;
      const cleanMsg = (err.message || "Syntax error").replace(/\s*\(\d+:\d+\)$/, "");
      return {
        valid: false,
        error: {
          name: "SyntaxError",
          message: cleanMsg,
          line,
          column: col,
          kind: "parse",
          stack: [{ fnName: "(anonymous)", line, column: col }],
          sourceSnippet: `${line} | ${code.split("\n")[line - 1] || ""}`,
          exitCode: 1,
        },
      };
    }
  } else if (langConfig.id === "typescript") {
    const tsResult = transpileTypeScript(code);
    if (tsResult.error) {
      return {
        valid: false,
        error: tsResult.error,
      };
    }
  }

  return { valid: true, error: null };
}

/**
 * Execute program with unified lifecycle, input/output piping, and error normalization
 * @param {string} code
 * @param {Object} options
 * @param {string} [options.language="javascript"]
 * @param {string} [options.customInput=""]
 * @param {number} [options.timeoutMs=5000]
 * @param {(logs: Array<any>) => void} [options.onLogs]
 * @param {(summary: { logCount: number, executionTimeMs: number, exitCode: number }) => void} [options.onDone]
 * @param {(error: Object) => void} [options.onError]
 * @param {(msg: Object) => void} [options.onTimeout]
 * @param {() => void} [options.onClear]
 * @returns {{ terminate: () => void }}
 */
export function compileAndRun(code, options = {}) {
  const {
    language = "javascript",
    customInput = "",
    timeoutMs = 5000,
    onLogs,
    onDone,
    onError,
    onTimeout,
    onClear,
  } = options;

  // 1. Pre-compilation validation
  const validation = validateSourceCode(code, language);
  if (!validation.valid) {
    onClear?.();
    const err = validation.error;
    onLogs?.([
      {
        id: `err-${Date.now()}`,
        method: "error",
        args: [`${err.name}: ${err.message}`],
        error: err,
        timestamp: Date.now(),
      },
    ]);
    onError?.(err);
    return { terminate: () => {} };
  }

  const langConfig = getLanguageConfig(language);

  // 2. Language Dispatch
  if (langConfig.id === "python") {
    return executePythonScript(code, {
      customInput,
      timeoutMs,
      onLogs,
      onDone,
      onError: (err) => {
        onError?.(err);
      },
      onTimeout: (timeoutErr) => {
        onLogs?.([
          {
            id: `err-timeout-${Date.now()}`,
            method: "error",
            args: [`${timeoutErr.name}: ${timeoutErr.message}`],
            error: timeoutErr,
            timestamp: Date.now(),
          },
        ]);
        onTimeout?.(timeoutErr);
      },
    });
  }

  // 3. TypeScript Compilation
  let executableCode = code;
  if (langConfig.id === "typescript") {
    const tsRes = transpileTypeScript(code);
    if (tsRes.error) {
      onLogs?.([
        {
          id: `err-ts-${Date.now()}`,
          method: "error",
          args: [`${tsRes.error.name}: ${tsRes.error.message}`],
          error: tsRes.error,
          timestamp: Date.now(),
        },
      ]);
      onError?.(tsRes.error);
      return { terminate: () => {} };
    }
    executableCode = tsRes.code;
  }

  // 4. JavaScript / Transpiled TS Native Execution
  return executeNativeScript(executableCode, {
    customInput,
    timeoutMs,
    onLogs,
    onClear,
    onDone: (summary) => {
      onDone?.({
        ...summary,
        exitCode: 0,
      });
    },
    onError: (err) => {
      // Ensure error is normalized
      const normalized = {
        name: err.name || "RuntimeError",
        message: err.message || "Runtime Error",
        line: err.line || 1,
        column: err.column || 1,
        kind: err.kind || "runtime",
        stack: err.stack || [],
        sourceSnippet: err.sourceSnippet || "",
        exitCode: 1,
      };
      onLogs?.([
        {
          id: `err-rt-${Date.now()}`,
          method: "error",
          args: [`${normalized.name}: ${normalized.message}`],
          error: normalized,
          timestamp: Date.now(),
        },
      ]);
      onError?.(normalized);
    },
    onTimeout: (timeoutInfo) => {
      const timeoutErr = typeof timeoutInfo === "object" ? timeoutInfo : {
        name: "TimeoutError",
        message: String(timeoutInfo || "Execution timed out (5s limit). Infinite loop detected."),
        line: 1,
        column: 1,
        kind: "timeout",
        stack: [],
        sourceSnippet: "",
        exitCode: 124,
      };
      onLogs?.([
        {
          id: `err-to-${Date.now()}`,
          method: "error",
          args: [`${timeoutErr.name}: ${timeoutErr.message}`],
          error: timeoutErr,
          timestamp: Date.now(),
        },
      ]);
      onTimeout?.(timeoutErr);
    },
  });
}


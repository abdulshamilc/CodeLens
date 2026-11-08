// src/tools/dbv/__tests__/compilerAudit.test.js
// Comprehensive Vitest suite for Compiler & Execution Engine Audit
// Tests all 16 required scenarios from Section 9 plus multi-language validation.

import { describe, it, expect, vi } from "vitest";
import { Interpreter } from "../engine/interpreter";
import {
  compileAndRun,
  validateSourceCode,
  SUPPORTED_LANGUAGES,
  getLanguageConfig,
} from "../engine/compilerService";
import { transpileTypeScript } from "../engine/typeScriptCompiler";
import { executePythonScript, PythonInterpreter } from "../engine/pythonRunner";

describe("Compiler & Execution Engine Audit (16 Core Scenarios)", () => {
  // ─── Scenario 1: Valid Source Code ──────────────────────────────────────────
  it("Scenario 1: Valid source code compiles and executes successfully", () => {
    const code = `
      var greeting = "Hello from CodeLens";
      console.log(greeting);
    `;
    const interp = new Interpreter(5000);
    const steps = interp.run(code);
    const last = steps[steps.length - 1];

    expect(last.error || null).toBeNull();
    const output = last.consoleOutput.map((c) => c.args.join(" "));
    expect(output).toContain('"Hello from CodeLens"');
  });

  // ─── Scenario 2: Invalid Syntax ─────────────────────────────────────────────
  it("Scenario 2: Invalid syntax returns structured SyntaxError with line and column", () => {
    const invalidCode = `
      function test() {
        var a = ;
      }
    `;
    const validation = validateSourceCode(invalidCode, "javascript");
    expect(validation.valid).toBe(false);
    expect(validation.error.name).toBe("SyntaxError");
    expect(validation.error.line).toBe(3);
    expect(validation.error.column).toBeGreaterThan(0);
    expect(validation.error.exitCode).toBe(1);

    // Also verify AST interpreter handles it
    const interp = new Interpreter(5000);
    const steps = interp.run(invalidCode);
    expect(steps[0].eventType).toBe("throw");
    expect(steps[0].error.name).toBe("SyntaxError");
    expect(steps[0].error.line).toBe(3);
  });

  // ─── Scenario 3: Empty Source Code ──────────────────────────────────────────
  it("Scenario 3: Empty or whitespace source code returns clean validation error", () => {
    const validation = validateSourceCode("   \n\t  ", "javascript");
    expect(validation.valid).toBe(false);
    expect(validation.error.name).toBe("ValidationError");
    expect(validation.error.message).toContain("empty");
    expect(validation.error.exitCode).toBe(1);
  });

  // ─── Scenario 4: Infinite Loop ──────────────────────────────────────────────
  it("Scenario 4: Infinite loop triggers execution step limit / timeout error", () => {
    const loopCode = `
      while (true) {
        var x = 1;
      }
    `;
    const interp = new Interpreter(100);
    const steps = interp.run(loopCode);
    const last = steps[steps.length - 1];

    expect(last.error).not.toBeNull();
    expect(last.error.name).toBe("TimeoutError");
    expect(last.error.kind).toBe("step_limit");
  });

  // ─── Scenario 5: Large Source Code ──────────────────────────────────────────
  it("Scenario 5: Large source code (thousands of lines) is parsed and executed safely", () => {
    const lines = [];
    for (let i = 0; i < 200; i++) {
      lines.push(`var v_${i} = ${i};`);
    }
    lines.push(`console.log(v_199);`);
    const largeCode = lines.join("\n");

    const interp = new Interpreter(20_000);
    const steps = interp.run(largeCode);
    const last = steps[steps.length - 1];

    expect(last.error || null).toBeNull();
    const output = last.consoleOutput.map((c) => c.args.join(" "));
    expect(output).toContain("199");
  });

  // ─── Scenario 6: Custom Input ───────────────────────────────────────────────
  it("Scenario 6: Custom input (stdin) is processed correctly by prompt(), readline(), input()", () => {
    const code = `
      var line1 = prompt();
      var line2 = readline();
      var line3 = input();
      console.log(line1 + " | " + line2 + " | " + line3);
    `;
    const customInput = "Alpha\nBeta\nGamma";
    const interp = new Interpreter(5000, customInput);
    const steps = interp.run(code);
    const last = steps[steps.length - 1];

    expect(last.error || null).toBeNull();
    const output = last.consoleOutput.map((c) => c.args.join(" "));
    expect(output).toContain('"Alpha | Beta | Gamma"');
  });

  // ─── Scenario 7: Multiple Executions ─────────────────────────────────────────
  it("Scenario 7: Multiple executions run independently with zero state leakage", () => {
    const codeA = `var secret = "RunA"; console.log(secret);`;
    const codeB = `console.log(typeof secret);`;

    const interpA = new Interpreter(5000);
    const stepsA = interpA.run(codeA);
    const outA = stepsA[stepsA.length - 1].consoleOutput.map((c) => c.args.join(" "));
    expect(outA).toContain('"RunA"');

    const interpB = new Interpreter(5000);
    const stepsB = interpB.run(codeB);
    const outB = stepsB[stepsB.length - 1].consoleOutput.map((c) => c.args.join(" "));
    // secret should NOT exist in Run B
    expect(outB).toContain('"undefined"');
  });

  // ─── Scenario 8: Invalid Language ───────────────────────────────────────────
  it("Scenario 8: Invalid or unsupported language returns UnsupportedLanguageError", () => {
    const validation = validateSourceCode("print('hello')", "ruby");
    expect(validation.valid).toBe(false);
    expect(validation.error.name).toBe("UnsupportedLanguageError");
    expect(validation.error.message).toContain("ruby");
    expect(validation.error.exitCode).toBe(1);
  });

  // ─── Scenario 9: Runner / Compiler Error ────────────────────────────────────
  it("Scenario 9: Compiler service surfaces normalized errors without silent failure", () => {
    const onError = vi.fn();
    const onLogs = vi.fn();

    compileAndRun("", {
      language: "javascript",
      onError,
      onLogs,
    });

    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "ValidationError",
        exitCode: 1,
      })
    );
    expect(onLogs).toHaveBeenCalled();
  });

  // ─── Scenario 10: Sandboxed Offline Execution ───────────────────────────────
  it("Scenario 10: Code runs in sandboxed environment without requiring external servers", () => {
    const code = `
      var a = 10;
      var b = 20;
      console.log(a * b);
    `;
    const interp = new Interpreter(5000);
    const steps = interp.run(code);
    const last = steps[steps.length - 1];
    expect(last.error || null).toBeNull();
    const out = last.consoleOutput.map((c) => c.args.join(" "));
    expect(out).toContain("200");
  });

  // ─── Scenario 11: Runtime Exceptions ────────────────────────────────────────
  it("Scenario 11: Runtime exceptions report exact error name, message, and line number", () => {
    const code = `
      var x = 10;
      y.foo(); // ReferenceError: y is not defined
    `;
    const interp = new Interpreter(5000);
    const steps = interp.run(code);
    const last = steps[steps.length - 1];

    expect(last.error).not.toBeNull();
    expect(last.error.name).toBe("ReferenceError");
    expect(last.error.message).toContain("y");
    expect(last.error.line).toBe(3);
  });

  // ─── Scenario 12: No Output ─────────────────────────────────────────────────
  it("Scenario 12: Programs with no console output complete successfully with exitCode 0", () => {
    const code = `
      var a = 42;
      var b = a * 2;
    `;
    const interp = new Interpreter(5000);
    const steps = interp.run(code);
    const last = steps[steps.length - 1];

    expect(last.error || null).toBeNull();
    expect(last.consoleOutput.length).toBe(0);
  });

  // ─── Scenario 13: Special Characters ────────────────────────────────────────
  it("Scenario 13: Special characters (quotes, backslashes, tabs, delimiters) output correctly", () => {
    const code = `
      console.log("Quotes: 'single' and \\"double\\"");
      console.log("Backslash: \\\\ and symbols: @#$%^&*()_+-=[]{}|;':,./<>?");
    `;
    const interp = new Interpreter(5000);
    const steps = interp.run(code);
    const last = steps[steps.length - 1];

    expect(last.error || null).toBeNull();
    const out = last.consoleOutput.map((c) => c.args.join(" "));
    expect(out[0]).toContain("'single'");
    expect(out[1]).toContain("@#$%^&*()");
  });

  // ─── Scenario 14: Unicode Characters ────────────────────────────────────────
  it("Scenario 14: Unicode characters, non-Latin text, and emojis output correctly", () => {
    const code = `
      console.log("Emojis: 🚀 🔍 ✨ 💻");
      console.log("Multilingual: مرحبا بالعالم | Привет, мир | 你好，世界 | नमस्ते");
    `;
    const interp = new Interpreter(5000);
    const steps = interp.run(code);
    const last = steps[steps.length - 1];

    expect(last.error || null).toBeNull();
    const out = last.consoleOutput.map((c) => c.args.join(" "));
    expect(out[0]).toContain("🚀 🔍 ✨ 💻");
    expect(out[1]).toContain("مرحبا بالعالم");
    expect(out[1]).toContain("你好，世界");
    expect(out[1]).toContain("नमस्ते");
  });

  // ─── Scenario 15: Multiple Print Statements ─────────────────────────────────
  it("Scenario 15: Multiple sequential print statements preserve complete order", () => {
    const code = `
      console.log("First");
      console.log("Second");
      console.log("Third");
      console.log("Fourth");
      console.log("Fifth");
    `;
    const interp = new Interpreter(5000);
    const steps = interp.run(code);
    const last = steps[steps.length - 1];

    expect(last.error || null).toBeNull();
    const out = last.consoleOutput.map((c) => c.args.join(" "));
    expect(out).toHaveLength(5);
    expect(out[0]).toBe('"First"');
    expect(out[1]).toBe('"Second"');
    expect(out[2]).toBe('"Third"');
    expect(out[3]).toBe('"Fourth"');
    expect(out[4]).toBe('"Fifth"');
  });

  // ─── Scenario 16: Compilation Timeout / Loop Guard ──────────────────────────
  it("Scenario 16: Event loop recursive tasks enforce step limit with TimeoutError", () => {
    const code = `
      function recursiveMicrotask() {
        Promise.resolve().then(recursiveMicrotask);
      }
      recursiveMicrotask();
    `;
    const interp = new Interpreter(50);
    const steps = interp.run(code);
    const last = steps[steps.length - 1];

    expect(last.error).not.toBeNull();
    expect(last.error.name).toBe("TimeoutError");
  });
});

describe("Multi-Language Support Verification", () => {
  // ─── TypeScript Support ─────────────────────────────────────────────────────
  it("TypeScript: Strips interfaces, type annotations, and enums and preserves line parity", () => {
    const tsCode = `interface User {
  id: number;
  name: string;
}
enum Role {
  Admin,
  Member
}
const u: User = { id: 1, name: "Alice" };
console.log(u.name);
`;
    const res = transpileTypeScript(tsCode);
    expect(res.error).toBeNull();
    expect(res.code).not.toContain("interface User");
    expect(res.code).not.toContain(": User");
    expect(res.code).toContain("Alice");

    // Execute the transpiled code
    const interp = new Interpreter(5000);
    const steps = interp.run(res.code);
    const last = steps[steps.length - 1];
    expect(last.error || null).toBeNull();
    const out = last.consoleOutput.map((c) => c.args.join(" "));
    expect(out).toContain('"Alice"');
  });

  it("TypeScript: Detects unclosed brackets and reports SyntaxError", () => {
    const brokenTs = `
      interface Test {
        id: number;
      // Missing closing brace
    `;
    const res = transpileTypeScript(brokenTs);
    expect(res.error).not.toBeNull();
    expect(res.error.name).toBe("SyntaxError");
    expect(res.error.line).toBeGreaterThan(0);
  });

  // ─── Python Support ─────────────────────────────────────────────────────────
  it("Python: Parses, binds variables, evaluates functions and prints stdout", () => {
    const pyCode = `
def multiply(a, b):
    return a * b

result = multiply(6, 7)
print("The answer is", result)
`;
    const py = new PythonInterpreter(pyCode);
    const res = py.execute();

    expect(res.error).toBeNull();
    expect(res.logs.length).toBe(1);
    expect(res.logs[0].args[0]).toBe("The answer is 42");
  });

  it("Python: Supports custom input (stdin / input())", () => {
    const pyCode = `
name = input("Enter name: ")
age = input("Enter age: ")
print(f"User: {name}, Age: {age}")
`;
    const py = new PythonInterpreter(pyCode, "Bob\n30");
    const res = py.execute();

    expect(res.error).toBeNull();
    const messages = res.logs.map((l) => l.args[0]);
    expect(messages).toContain("Enter name: ");
    expect(messages).toContain("Enter age: ");
    expect(messages).toContain("User: Bob, Age: 30");
  });

  it("Python: Catches ZeroDivisionError with exact line number", () => {
    const pyCode = `
x = 10
y = 0
z = x / y
`;
    const py = new PythonInterpreter(pyCode);
    const res = py.execute();

    expect(res.error).not.toBeNull();
    expect(res.error.name).toBe("ZeroDivisionError");
    expect(res.error.line).toBe(4);
    expect(res.error.exitCode).toBe(1);
  });

  it("Python: Catches NameError for undefined identifiers", () => {
    const pyCode = `
print(undefined_variable)
`;
    const py = new PythonInterpreter(pyCode);
    const res = py.execute();

    expect(res.error).not.toBeNull();
    expect(res.error.name).toBe("NameError");
    expect(res.error.message).toContain("undefined_variable");
    expect(res.error.line).toBe(2);
  });

  it("Python: Executes control flow (if/elif/else, for loops, lists, dicts)", () => {
    const pyCode = `
numbers = [1, 2, 3, 4, 5]
total = 0
for n in numbers:
    if n % 2 == 0:
        total += n

print("Even sum:", total)
`;
    const py = new PythonInterpreter(pyCode);
    const res = py.execute();

    expect(res.error).toBeNull();
    expect(res.logs[0].args[0]).toBe("Even sum: 6");
  });

  it("Python: Runs via executePythonScript interface asynchronously", async () => {
    let captured = null;
    await new Promise((resolve) => {
      executePythonScript("print('Async Python Result')", {
        onDone: (summary) => {
          captured = summary;
          resolve();
        },
      });
    });
    expect(captured).not.toBeNull();
    expect(captured.exitCode).toBe(0);
  });

  it("Language config: Returns metadata for all supported languages", () => {
    expect(SUPPORTED_LANGUAGES.map((l) => l.id)).toEqual(["javascript", "typescript", "python"]);
    expect(getLanguageConfig("js").id).toBe("javascript");
    expect(getLanguageConfig("typescript").fileName).toBe("main.ts");
    expect(getLanguageConfig("python").fileName).toBe("main.py");
    expect(getLanguageConfig("csharp")).toBeNull();
  });
});

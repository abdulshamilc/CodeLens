// src/tools/dbv/__tests__/structuredErrors.test.js
import { describe, it, expect } from "vitest";
import { Interpreter } from "../engine/interpreter";

describe("C3: Structured Error Pipeline & Source Snippets", () => {
  it("produces structured parse error with 3-line code frame for SyntaxError", () => {
    const code = `const a = 10;\nconst b = ;\nconst c = 30;`;
    const interp = new Interpreter();
    const steps = interp.run(code);

    expect(steps.length).toBe(1);
    const errStep = steps[0];
    expect(errStep.eventType).toBe("throw");
    expect(errStep.error).toBeDefined();

    const err = errStep.error;
    expect(err.name).toBe("SyntaxError");
    expect(err.kind).toBe("parse");
    expect(err.line).toBe(2);
    expect(err.column).toBe(11);
    expect(err.sourceSnippet).toContain("const b = ;");
    expect(err.sourceSnippet).toContain("^");
  });

  it("produces structured runtime error with exact line, column, and code frame for TypeError", () => {
    const code = `let obj = null;\nobj.foo();`;
    const interp = new Interpreter();
    const steps = interp.run(code);

    const lastStep = steps[steps.length - 1];
    expect(lastStep.eventType).toBe("throw");
    expect(lastStep.error).toBeDefined();

    const err = lastStep.error;
    expect(err.name).toBe("TypeError");
    expect(err.kind).toBe("runtime");
    expect(err.message).toContain("Cannot read properties of null");
    expect(err.line).toBe(2);
    expect(err.sourceSnippet).toContain("2 | obj.foo();");
    expect(err.sourceSnippet).toContain("^");
  });

  it("produces structured ReferenceError for TDZ access with exact line and column", () => {
    const code = `function test() {\n  console.log(val);\n  let val = 42;\n}\ntest();`;
    const interp = new Interpreter();
    const steps = interp.run(code);

    const lastStep = steps[steps.length - 1];
    expect(lastStep.error).toBeDefined();
    const err = lastStep.error;
    expect(err.name).toBe("ReferenceError");
    expect(err.kind).toBe("runtime");
    expect(err.message).toContain("Cannot access 'val' before initialization");
    expect(err.line).toBe(2);
    expect(err.sourceSnippet).toContain("2 |   console.log(val);");

    // Stack should contain test() and global
    expect(err.stack.length).toBeGreaterThanOrEqual(1);
    expect(err.stack[0].fnName).toBe("test");
  });

  it("produces structured UnhandledPromiseRejection when a rejected promise is never caught", () => {
    const code = `Promise.reject("fatal error");`;
    const interp = new Interpreter();
    const steps = interp.run(code);

    const lastStep = steps[steps.length - 1];
    expect(lastStep.eventType).toBe("unhandled-rejection");
    expect(lastStep.error).toBeDefined();

    const err = lastStep.error;
    expect(err.name).toBe("UnhandledPromiseRejection");
    expect(err.kind).toBe("unhandledrejection");
    expect(err.message).toContain("fatal error");
  });

  it("produces structured step_limit error when execution exceeds stepLimit", () => {
    const code = `while (true) {}`;
    const interp = new Interpreter(100);
    const steps = interp.run(code);

    const lastStep = steps[steps.length - 1];
    expect(lastStep.error).toBeDefined();

    const err = lastStep.error;
    expect(err.kind).toBe("step_limit");
    expect(err.message).toContain("Step limit exceeded");
  });

  it("tracks user-level call-site stack across function invocations", () => {
    const code = `function a() {\n  throw new Error("failure");\n}\nfunction b() {\n  a();\n}\nb();`;
    const interp = new Interpreter();
    const steps = interp.run(code);

    const lastStep = steps[steps.length - 1];
    expect(lastStep.error).toBeDefined();

    const err = lastStep.error;
    expect(err.name).toBe("Error");
    expect(err.message).toBe("failure");
    expect(err.stack.length).toBeGreaterThanOrEqual(2);

    const fnNames = err.stack.map(s => s.fnName);
    expect(fnNames).toContain("a");
    expect(fnNames).toContain("b");
  });
});

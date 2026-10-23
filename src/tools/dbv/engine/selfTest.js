// src/tools/dbv/engine/selfTest.js
// In-memory diagnostic self-test suite for CodeLens DBV
// Verifies Promise mechanics, B0 reproduction, TDZ, structured error pipeline, and event loop.

import { Interpreter } from "./interpreter";

export function runSelfTest() {
  const startTime = performance.now();
  const results = [];

  function check(name, fn) {
    try {
      const res = fn();
      if (res === true) {
        results.push({ name, passed: true });
      } else {
        results.push({ name, passed: false, error: String(res || "Assertion failed") });
      }
    } catch (err) {
      results.push({ name, passed: false, error: err?.message || String(err) });
    }
  }

  // 1. SyntaxError diagnostic
  check("SyntaxError structured error pipeline", () => {
    const interp = new Interpreter();
    const steps = interp.run("const a = ;");
    const err = steps[0]?.error;
    return err && err.name === "SyntaxError" && err.kind === "parse" && err.line === 1;
  });

  // 2. TDZ ReferenceError diagnostic
  check("TDZ ReferenceError with call stack", () => {
    const interp = new Interpreter();
    const steps = interp.run("function f() { console.log(x); let x = 10; }\nf();");
    const lastStep = steps[steps.length - 1];
    const err = lastStep?.error;
    return err && err.name === "ReferenceError" && err.stack?.length >= 1;
  });

  // 3. TypeError diagnostic
  check("TypeError on non-function invocation", () => {
    const interp = new Interpreter();
    const steps = interp.run("let obj = null;\nobj.foo();");
    const err = steps[steps.length - 1]?.error;
    return err && err.name === "TypeError" && err.kind === "runtime";
  });

  // 4. B0 Promise executor reproduction
  check("B0 Promise executor with .then().catch()", () => {
    const code = `
      function simulateOperation() {
        return new Promise((resolve, reject) => {
          reject("Operation failed!");
        });
      }
      simulateOperation()
        .then(result => { console.log("Operation successful!"); })
        .catch(error => { console.log(error); });
    `;
    const interp = new Interpreter();
    const steps = interp.run(code);
    const logs = interp.s.consoleOutput.map(c => c.args.join(" "));
    const hasUncaught = steps.some(s => s.eventType === "unhandled-rejection");
    return !hasUncaught && logs.includes('"Operation failed!"') && !logs.includes('"Operation successful!"');
  });

  // 5. Promise.all ordering & resolution
  check("Promise.all resolution and order", () => {
    const interp = new Interpreter();
    interp.run("Promise.all([Promise.resolve(1), 2, Promise.resolve(3)]).then(arr => console.log(arr.join(',')));");
    const logs = interp.s.consoleOutput.map(c => c.args.join(" "));
    return logs.includes('"1,2,3"');
  });

  // 6. Microtask before Macrotask ordering
  check("Microtask vs Macrotask Event Loop priority", () => {
    const interp = new Interpreter();
    interp.run(`
      setTimeout(() => console.log("macro"), 0);
      Promise.resolve().then(() => console.log("micro"));
    `);
    const logs = interp.s.consoleOutput.map(c => c.args.join(" "));
    return logs.indexOf('"micro"') < logs.indexOf('"macro"');
  });

  // 7. Hidden Intrinsics Realm Isolation
  check("Hidden Intrinsics Realm Isolation", () => {
    const interp = new Interpreter();
    const steps = interp.run("const userVar = 100;");
    const envs = steps[steps.length - 1]?.environments || {};
    for (const env of Object.values(envs)) {
      if ("Promise" in env.bindings || "setTimeout" in env.bindings) {
        return false;
      }
    }
    return true;
  });

  const durationMs = Math.round((performance.now() - startTime) * 10) / 10;
  const passed = results.every(r => r.passed);

  return {
    passed,
    total: results.length,
    passedCount: results.filter(r => r.passed).length,
    failedCount: results.filter(r => !r.passed).length,
    results,
    durationMs,
  };
}

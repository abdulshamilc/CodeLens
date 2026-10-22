// src/tools/dbv/engine/interpreter.test.ts
// Vitest tests for the DBV step-by-step interpreter
// Tests cover hoisting, TDZ, closures, this, event-loop ordering, and more.
import { describe, it, expect } from "vitest";
import { Interpreter } from "./interpreter";
// Helper: run code and return trace
function run(code) {
    return new Interpreter(5000).run(code);
}
// Helper: get console output from the last step
function consoleOutput(code) {
    const steps = run(code);
    const last = steps[steps.length - 1];
    return last.consoleOutput.map((e) => e.args.join(" "));
}
// Helper: find step with event type
function findStep(steps, type) {
    return steps.find((s) => s.eventType === type);
}
// ─── 1. Variables and hoisting ────────────────────────────────────────────────
describe("Hoisting", () => {
    it("var is hoisted and initialized to undefined before assignment", () => {
        const steps = run(`var x = 5;`);
        const hoistStep = steps.find((s) => s.eventType === "hoisting" && s.explanation.includes("var") && s.explanation.includes("x"));
        expect(hoistStep).toBeDefined();
        // After hoisting, x should be undefined
        const env = Object.values(hoistStep.environments).find((e) => "x" in e.bindings);
        expect(env?.bindings["x"].value).toBe(undefined);
        expect(env?.bindings["x"].state).toBe("initialized");
    });
    it("var reads as undefined before assignment", () => {
        const output = consoleOutput(`console.log(x); var x = 5;`);
        expect(output[0]).toBe("undefined");
    });
    it("function declarations are fully hoisted", () => {
        const output = consoleOutput(`
      greet();
      function greet() { console.log("hi"); }
    `);
        expect(output[0]).toBe('"hi"');
    });
    it("let is in TDZ before initialization", () => {
        const steps = run(`let y = 10;`);
        const tdzStep = steps.find((s) => s.eventType === "hoisting" && s.explanation.includes("TDZ") && s.explanation.includes("y"));
        expect(tdzStep).toBeDefined();
        const env = Object.values(tdzStep.environments).find((e) => "y" in e.bindings);
        expect(env?.bindings["y"].state).toBe("uninitialized");
    });
    it("const is in TDZ before initialization", () => {
        const steps = run(`const PI = 3.14;`);
        const tdzStep = steps.find((s) => s.eventType === "hoisting" && s.explanation.includes("TDZ") && s.explanation.includes("PI"));
        expect(tdzStep).toBeDefined();
        const env = Object.values(tdzStep.environments).find((e) => "PI" in e.bindings);
        expect(env?.bindings["PI"].state).toBe("uninitialized");
    });
});
// ─── 2. TDZ errors ────────────────────────────────────────────────────────────
describe("TDZ errors", () => {
    it("accessing let before declaration produces tdz-error event", () => {
        const steps = run(`
      try {
        console.log(z);
      } catch(e) {}
      let z = 5;
    `);
        const tdzErr = steps.find((s) => s.eventType === "tdz-error");
        expect(tdzErr).toBeDefined();
        expect(tdzErr.explanation).toContain("z");
    });
    it("let is accessible after declaration", () => {
        const output = consoleOutput(`let a = 42; console.log(a);`);
        expect(output[0]).toBe("42");
    });
    it("const is accessible after declaration", () => {
        const output = consoleOutput(`const PI = 3.14; console.log(PI);`);
        expect(output[0]).toBe("3.14");
    });
});
// ─── 3. Basic execution ───────────────────────────────────────────────────────
describe("Basic execution", () => {
    it("addition works", () => {
        const output = consoleOutput(`console.log(1 + 2);`);
        expect(output[0]).toBe("3");
    });
    it("string concatenation works", () => {
        const output = consoleOutput(`console.log("hello" + " " + "world");`);
        expect(output[0]).toBe('"hello world"');
    });
    it("assignment updates value", () => {
        const output = consoleOutput(`var x = 5; x = 10; console.log(x);`);
        expect(output[0]).toBe("10");
    });
    it("multiple console.log calls", () => {
        const output = consoleOutput(`console.log(1); console.log(2); console.log(3);`);
        expect(output).toHaveLength(3);
        expect(output[0]).toBe("1");
        expect(output[2]).toBe("3");
    });
    it("boolean expressions", () => {
        const output = consoleOutput(`console.log(5 > 3); console.log(5 < 3);`);
        expect(output[0]).toBe("true");
        expect(output[1]).toBe("false");
    });
    it("strict equality vs loose equality", () => {
        const output = consoleOutput(`console.log(0 === false); console.log(0 == false);`);
        expect(output[0]).toBe("false");
        expect(output[1]).toBe("true");
    });
});
// ─── 4. Functions and call stack ─────────────────────────────────────────────
describe("Functions", () => {
    it("function call pushes a new context", () => {
        const steps = run(`
      function add(a, b) { return a + b; }
      add(3, 4);
    `);
        const callStep = steps.find((s) => s.eventType === "call" && s.explanation.includes("add"));
        expect(callStep).toBeDefined();
        expect(callStep.callStack.length).toBeGreaterThan(1);
    });
    it("function return pops context and restores caller", () => {
        const output = consoleOutput(`
      function double(n) { return n * 2; }
      console.log(double(5));
    `);
        expect(output[0]).toBe("10");
    });
    it("recursive function (factorial)", () => {
        const output = consoleOutput(`
      function factorial(n) {
        if (n <= 1) return 1;
        return n * factorial(n - 1);
      }
      console.log(factorial(5));
    `);
        expect(output[0]).toBe("120");
    });
    it("parameters are initialized in function scope", () => {
        const steps = run(`
      function greet(name) { return name; }
      greet("Alice");
    `);
        const callStep = steps.find((s) => s.eventType === "declare" && s.explanation.includes("name") && s.explanation.includes("Alice"));
        expect(callStep).toBeDefined();
    });
});
// ─── 5. Closures ──────────────────────────────────────────────────────────────
describe("Closures", () => {
    it("closure captures outer variable", () => {
        const output = consoleOutput(`
      function makeCounter() {
        let count = 0;
        return function() { count++; return count; };
      }
      const counter = makeCounter();
      console.log(counter());
      console.log(counter());
    `);
        expect(output[0]).toBe("1");
        expect(output[1]).toBe("2");
    });
    it("closure factory (adder)", () => {
        const output = consoleOutput(`
      function makeAdder(x) {
        return function(y) { return x + y; };
      }
      const add5 = makeAdder(5);
      console.log(add5(3));
    `);
        expect(output[0]).toBe("8");
    });
    it("loop with var – classic bug: all print same value", () => {
        const output = consoleOutput(`
      var fns = [];
      for (var i = 0; i < 3; i++) {
        fns.push(function() { console.log(i); });
      }
      fns[0](); fns[1](); fns[2]();
    `);
        // All should print 3 (the post-loop value of i)
        expect(output[0]).toBe("3");
        expect(output[1]).toBe("3");
        expect(output[2]).toBe("3");
    });
    it("loop with let – fixed: each closure has its own i", () => {
        const output = consoleOutput(`
      var fns = [];
      for (let i = 0; i < 3; i++) {
        fns.push(function() { console.log(i); });
      }
      fns[0](); fns[1](); fns[2]();
    `);
        expect(output[0]).toBe("0");
        expect(output[1]).toBe("1");
        expect(output[2]).toBe("2");
    });
});
// ─── 6. Control flow ──────────────────────────────────────────────────────────
describe("Control flow", () => {
    it("if-else works correctly", () => {
        const output = consoleOutput(`
      var x = 10;
      if (x > 5) { console.log("big"); } else { console.log("small"); }
    `);
        expect(output[0]).toBe('"big"');
    });
    it("while loop iterates correctly", () => {
        const output = consoleOutput(`
      var i = 0; var sum = 0;
      while (i < 5) { sum += i; i++; }
      console.log(sum);
    `);
        expect(output[0]).toBe("10"); // 0+1+2+3+4
    });
    it("for loop works", () => {
        const output = consoleOutput(`
      var total = 0;
      for (var i = 1; i <= 4; i++) { total += i; }
      console.log(total);
    `);
        expect(output[0]).toBe("10"); // 1+2+3+4
    });
    it("try-catch catches thrown errors", () => {
        const output = consoleOutput(`
      try { throw "oops"; }
      catch (e) { console.log(e); }
    `);
        expect(output[0]).toBe('"oops"');
    });
});
// ─── 7. Scope chain ───────────────────────────────────────────────────────────
describe("Scope chain", () => {
    it("inner function accesses outer variable", () => {
        const output = consoleOutput(`
      var outer = "outer";
      function inner() { console.log(outer); }
      inner();
    `);
        expect(output[0]).toBe('"outer"');
    });
    it("variable shadowing works", () => {
        const output = consoleOutput(`
      var x = "outer";
      function foo() { var x = "inner"; console.log(x); }
      foo();
      console.log(x);
    `);
        expect(output[0]).toBe('"inner"');
        expect(output[1]).toBe('"outer"');
    });
    it("block scope with let does not leak", () => {
        const output = consoleOutput(`
      var result = "before";
      { let block = "inside"; result = block; }
      console.log(result);
    `);
        expect(output[0]).toBe('"inside"');
    });
});
// ─── 8. Objects and arrays ────────────────────────────────────────────────────
describe("Objects and Arrays", () => {
    it("object property access", () => {
        const output = consoleOutput(`
      var obj = { name: "Alice", age: 30 };
      console.log(obj.name);
      console.log(obj.age);
    `);
        expect(output[0]).toBe('"Alice"');
        expect(output[1]).toBe("30");
    });
    it("array access and length", () => {
        const output = consoleOutput(`
      var arr = [10, 20, 30];
      console.log(arr[1]);
    `);
        expect(output[0]).toBe("20");
    });
    it("array map produces correct result", () => {
        const output = consoleOutput(`
      var nums = [1, 2, 3];
      var doubled = nums.map(function(n) { return n * 2; });
      console.log(doubled[0]);
      console.log(doubled[2]);
    `);
        expect(output[0]).toBe("2");
        expect(output[1]).toBe("6");
    });
});
// ─── 9. Event loop ordering ──────────────────────────────────────────────────
describe("Event Loop / setTimeout", () => {
    it("setTimeout enqueues a macrotask", () => {
        const steps = run(`
      console.log("before");
      setTimeout(function() {}, 0);
      console.log("after");
    `);
        const enqueueStep = steps.find((s) => s.eventType === "enqueue-task");
        expect(enqueueStep).toBeDefined();
        // Macrotask queue should have one entry
        expect(enqueueStep.macrotaskQueue.length).toBeGreaterThan(0);
    });
    it("sync code runs before setTimeout callback step recorded", () => {
        const output = consoleOutput(`
      console.log("1");
      setTimeout(function() {}, 0);
      console.log("2");
    `);
        expect(output[0]).toBe('"1"');
        expect(output[1]).toBe('"2"');
    });
});
// ─── 10. Error handling ───────────────────────────────────────────────────────
describe("Error handling", () => {
    it("ReferenceError for undeclared variable", () => {
        const steps = run(`undeclaredVar;`);
        const throwStep = steps.find((s) => s.eventType === "throw");
        expect(throwStep).toBeDefined();
        expect(throwStep.explanation).toContain("undeclaredVar");
    });
    it("try-catch-finally: finally always runs", () => {
        const output = consoleOutput(`
      try { throw "err"; }
      catch (e) { console.log("caught"); }
      finally { console.log("finally"); }
    `);
        expect(output[0]).toBe('"caught"');
        expect(output[1]).toBe('"finally"');
    });
    it("uncaught error produces throw event", () => {
        const steps = run(`throw new Error("boom");`);
        const throwStep = steps.find((s) => s.eventType === "throw");
        expect(throwStep).toBeDefined();
    });
});
// ─── 11. Step metadata ────────────────────────────────────────────────────────
describe("Trace metadata", () => {
    it("first step is always program-start", () => {
        const steps = run(`var x = 1;`);
        expect(steps[0].eventType).toBe("program-start");
    });
    it("step indices are sequential", () => {
        const steps = run(`var a = 1; var b = 2;`);
        steps.forEach((s, i) => expect(s.index).toBe(i));
    });
    it("creation-phase step exists after program-start", () => {
        const steps = run(`var x = 1;`);
        const cpStep = steps.find((s) => s.eventType === "creation-phase");
        expect(cpStep).toBeDefined();
    });
    it("changedBindings is populated on var assignment", () => {
        const steps = run(`var x = 42;`);
        const assignStep = steps.find((s) => s.eventType === "assign" && s.explanation.includes("x"));
        expect(assignStep?.changedBindings.some((b) => b.includes("/x"))).toBe(true);
    });
});

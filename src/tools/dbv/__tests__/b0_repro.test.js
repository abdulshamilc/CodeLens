import { describe, it, expect } from "vitest";
import { Interpreter } from "../engine/interpreter";

describe("B0 Reproduction & Intrinsics Isolation", () => {
  it("runs the B0 promise rejection snippet and logs 'Operation failed!'", () => {
    const code = `const myPromise = new Promise((resolve, reject) => {
  let success = false;

  if (success) {
    resolve("Operation successful!");
  } else {
    reject("Operation failed!");
  }
});

myPromise
  .then((result) => {
    console.log(result);
  })
  .catch((error) => {
    console.log(error);
  });
`;
    const interp = new Interpreter();
    const steps = interp.run(code);
    const lastStep = steps[steps.length - 1];
    expect(lastStep.consoleOutput.map(c => c.args.join(" "))).toEqual(['"Operation failed!"']);
  });

  it("runs the B0 promise snippet with success = true and logs 'Operation successful!'", () => {
    const code = `const myPromise = new Promise((resolve, reject) => {
  let success = true;

  if (success) {
    resolve("Operation successful!");
  } else {
    reject("Operation failed!");
  }
});

myPromise
  .then((result) => {
    console.log(result);
  })
  .catch((error) => {
    console.log(error);
  });
`;
    const interp = new Interpreter();
    const steps = interp.run(code);
    const lastStep = steps[steps.length - 1];
    expect(lastStep.consoleOutput.map(c => c.args.join(" "))).toEqual(['"Operation successful!"']);
  });

  it("hides built-in intrinsics from user environment snapshots", () => {
    const code = `let a = 10;
const b = 20;
console.log(a + b);
`;
    const interp = new Interpreter();
    const steps = interp.run(code);
    const builtins = ["Error", "TypeError", "RangeError", "ReferenceError", "SyntaxError", "Promise", "console", "Math", "Object", "Array", "String", "Number", "Boolean", "setTimeout", "clearTimeout", "setInterval", "clearInterval", "queueMicrotask"];

    for (const step of steps) {
      if (step.environments) {
        for (const env of Object.values(step.environments)) {
          expect(env.isIntrinsics).toBeFalsy();
          for (const b of builtins) {
            expect(env.bindings?.[b]).toBeUndefined();
          }
        }
      }
    }
  });
});

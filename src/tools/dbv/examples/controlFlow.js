// src/tools/dbv/examples/controlFlow.js
// Category: Control Flow and Error Handling

export const CONTROL_FLOW_EXAMPLES = [
  {
    id: "control-flow-try-catch-finally",
    title: "try / catch / finally execution order",
    category: "Control Flow",
    level: "beginner",
    description: "The finally block always runs whether an exception was caught or not.",
    whatToWatch: [
      "try block throws error on line 4",
      "catch block captures error and handles it",
      "finally block executes unconditionally before proceeding",
    ],
    code: `// try-catch-finally execution guarantee
try {
  console.log("1 - inside try");
  throw new Error("Something broke");
} catch (err) {
  console.log("2 - inside catch:", err.message);
} finally {
  console.log("3 - inside finally (always runs!)");
}

console.log("4 - after try-catch-finally");
`,
    expectedOutput: [
      '"1 - inside try"',
      '"2 - inside catch:" "Something broke"',
      '"3 - inside finally (always runs!)"',
      '"4 - after try-catch-finally"'
    ],
    focus: "callStack",
    breakpoints: [2, 5, 7, 10],
    tags: ["controlFlow", "errors", "try-catch", "finally", "start-here"],
  },
  {
    id: "control-flow-throw-unwinding",
    title: "throw unwinds call stack to matching catch",
    category: "Control Flow",
    level: "intermediate",
    description: "An unhandled throw pops frames off the call stack until reaching the nearest enclosing catch block.",
    whatToWatch: [
      "stepA calls stepB, which throws",
      "stepB immediately unwinds without executing remaining lines",
      "Control transfers directly to the catch block in the caller",
    ],
    code: `// Stack unwinding on throw
function stepB() {
  console.log("Entering B");
  throw new Error("Failure in B");
  console.log("Never reached in B");
}

function stepA() {
  console.log("Entering A");
  stepB();
  console.log("Never reached in A");
}

try {
  stepA();
} catch (e) {
  console.log("Handled in global catch:", e.message);
}
`,
    expectedOutput: [
      '"Entering A"',
      '"Entering B"',
      '"Handled in global catch:" "Failure in B"'
    ],
    focus: "callStack",
    breakpoints: [3, 9, 15],
    tags: ["controlFlow", "throw", "callStack", "unwinding"],
  },
  {
    id: "control-flow-short-circuit",
    title: "Short-circuit evaluation (&&, ||, ??)",
    category: "Control Flow",
    level: "beginner",
    description: "Logical operators short-circuit: && returns first falsy, || returns first truthy, ?? checks nullish.",
    whatToWatch: [
      "false && expr does not evaluate right side",
      "true || expr does not evaluate right side",
      "0 ?? 10 preserves 0 because 0 is not nullish",
    ],
    code: `// Logical operator short-circuiting
const a = false && "never evaluated";
const b = "first" || "fallback";
const count = 0;
const defaultCount = count ?? 10; // 0 is not nullish!

console.log(a);
console.log(b);
console.log(defaultCount);
`,
    expectedOutput: ["false", '"first"', "0"],
    focus: "memory",
    breakpoints: [2, 3, 5],
    tags: ["controlFlow", "operators", "short-circuit"],
  },
];

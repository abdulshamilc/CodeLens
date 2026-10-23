// src/tools/dbv/examples/callstack.js
// Category: Execution Context and Call Stack

export const CALLSTACK_EXAMPLES = [
  {
    id: "callstack-execution-context",
    title: "One function call: creation then execution phase",
    category: "Call Stack",
    level: "beginner",
    description: "Calling a function pushes a new Execution Context to the Call Stack with Creation and Execution phases.",
    whatToWatch: [
      "Global context is initially at the base of Call Stack",
      "Calling add(5, 7) pushes FEC: add() in Creation phase, binding params",
      "FEC switches to Execution phase, returns 12, then pops off the Call Stack",
    ],
    code: `// Function execution context pushing and popping
function add(a, b) {
  const sum = a + b;
  return sum;
}

const result = add(5, 7);
console.log(result);
`,
    expectedOutput: ["12"],
    focus: "callStack",
    breakpoints: [3, 7],
    tags: ["callStack", "executionContext", "start-here"],
  },
  {
    id: "callstack-nested-unwinding",
    title: "Nested calls (3 deep) and return unwinding",
    category: "Call Stack",
    level: "beginner",
    description: "Demonstrates stack frames stacking up 3 levels deep (LIFO) and unwinding as each returns.",
    whatToWatch: [
      "Watch the Call Stack chips grow: first -> second -> third",
      "third() finishes first, popping from top of stack",
      "first() finishes last and returns final string",
    ],
    code: `// Nested function calls stacking and unwinding
function third() {
  return "all done!";
}

function second() {
  const msg = third();
  return "2 -> " + msg;
}

function first() {
  return "1 -> " + second();
}

console.log(first());
`,
    expectedOutput: ['"1 -> 2 -> all done!"'],
    focus: "callStack",
    breakpoints: [3, 7, 12],
    tags: ["callStack", "nested", "lifo"],
  },
  {
    id: "callstack-recursion-factorial",
    title: "Recursion (factorial stack frames)",
    category: "Call Stack",
    level: "intermediate",
    description: "Recursive calls stack multiple frames for the same function, each holding distinct parameter values.",
    whatToWatch: [
      "Stack grows with factorial(4) -> factorial(3) -> factorial(2) -> factorial(1)",
      "Base case n <= 1 halts recursion and unwinds the multiplications back down",
    ],
    code: `// Recursive factorial function
function factorial(n) {
  if (n <= 1) {
    return 1;
  }
  return n * factorial(n - 1);
}

const answer = factorial(4);
console.log(answer); // 24
`,
    expectedOutput: ["24"],
    focus: "callStack",
    breakpoints: [3, 6],
    tags: ["callStack", "recursion", "factorial"],
  },
  {
    id: "callstack-overflow-depth",
    title: "Stack overflow (depth limit guard)",
    category: "Call Stack",
    level: "advanced",
    description: "Unbounded recursion fills the Call Stack until the engine limits are reached, throwing a Maximum call stack size exceeded error.",
    whatToWatch: [
      "Stack chips accumulate until reaching safety threshold",
      "Engine catches overflow and displays error without crashing IDE",
    ],
    code: `// Simulating stack overflow with catch
function infiniteRecursion(n) {
  if (n > 15) {
    throw new Error("Maximum call stack size exceeded");
  }
  return infiniteRecursion(n + 1);
}

try {
  infiniteRecursion(1);
} catch (e) {
  console.log("Caught:", e.message);
}
`,
    expectedOutput: ['"Caught:" "Maximum call stack size exceeded"'],
    focus: "callStack",
    breakpoints: [4, 10],
    tags: ["callStack", "overflow", "errors"],
  },
];

// src/tools/dbv/examples/scope.js
// Category: Scope and Scope Chain

export const SCOPE_EXAMPLES = [
  {
    id: "scope-chain-lookup",
    title: "Scope chain lookup through 3 levels",
    category: "Scope Chain",
    level: "beginner",
    description: "The engine resolves identifiers by walking outward from local to parent to global scope.",
    whatToWatch: [
      "inner() has access to local 'local', outer 'middle', and global 'global'",
      "Scope chain panel displays innerEnv -> outerEnv -> globalEnv",
    ],
    code: `// Looking up variables through nested scopes
const global = "global";

function outer() {
  const middle = "middle";

  function inner() {
    const local = "local";
    console.log(local, middle, global);
  }

  inner();
}

outer();
`,
    expectedOutput: ['"local" "middle" "global"'],
    focus: "scopeChain",
    breakpoints: [9],
    tags: ["scope", "scopeChain", "lookup", "start-here"],
  },
  {
    id: "scope-shadowing",
    title: "Variable shadowing across scopes",
    category: "Scope Chain",
    level: "beginner",
    description: "An inner variable declaration shadows an outer variable of the same name without mutating it.",
    whatToWatch: [
      "Outer x is 'outer'",
      "Inside foo(), inner x shadows outer x with 'inner'",
      "After foo() finishes, outer x remains 'outer'",
    ],
    code: `// Variable shadowing demonstration
let x = "outer";

function foo() {
  let x = "inner"; // Shadows outer x
  console.log(x);  // "inner"
}

foo();
console.log(x);    // "outer" (untouched)
`,
    expectedOutput: ['"inner"', '"outer"'],
    focus: "scopeChain",
    breakpoints: [6, 10],
    tags: ["scope", "shadowing", "variables"],
  },
  {
    id: "scope-var-leaking-block",
    title: "var leaks out of blocks while let is block-scoped",
    category: "Scope Chain",
    level: "intermediate",
    description: "var is scoped to the nearest function or global environment; let and const are strictly block-scoped.",
    whatToWatch: [
      "var leakedVar attaches to global/function environment",
      "let trappedVar is destroyed when exiting the if block",
    ],
    code: `// Block scoping: var vs let
if (true) {
  var leakedVar = "I escaped!";
  let trappedVar = "I am trapped";
  console.log(trappedVar);
}

// leakedVar is accessible outside the block!
console.log(leakedVar);

try {
  console.log(trappedVar); // ReferenceError
} catch (e) {
  console.log("trappedVar is not accessible outside");
}
`,
    expectedOutput: ['"I am trapped"', '"I escaped!"', '"trappedVar is not accessible outside"'],
    focus: "scopeChain",
    breakpoints: [5, 9, 14],
    tags: ["scope", "blocks", "var", "let"],
  },
  {
    id: "scope-lexical-vs-caller",
    title: "Lexical (static) scope vs call site",
    category: "Scope Chain",
    level: "intermediate",
    description: "JavaScript uses lexical scoping: functions resolve variables from where they are defined, not where called.",
    whatToWatch: [
      "printVal is defined in global scope where val is 'global'",
      "Calling printVal from callerContext (where val is 'local') STILL prints 'global'",
    ],
    code: `// Lexical scope depends on definition location, not call site
const val = "global";

function printVal() {
  console.log(val); // Always finds "global" lexically
}

function callerContext() {
  const val = "local";
  printVal(); // Called here, but does NOT see local val!
}

callerContext();
`,
    expectedOutput: ['"global"'],
    focus: "scopeChain",
    breakpoints: [5, 10],
    tags: ["scope", "lexical", "closure"],
  },
];

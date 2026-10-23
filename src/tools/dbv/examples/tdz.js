// src/tools/dbv/examples/tdz.js
// Category: Temporal Dead Zone (TDZ)

export const TDZ_EXAMPLES = [
  {
    id: "tdz-let-reference-error",
    title: "let TDZ throws ReferenceError",
    category: "TDZ",
    level: "beginner",
    description: "Accessing a let variable before its initialization line triggers a ReferenceError.",
    whatToWatch: [
      "In Creation phase, y is registered as uninitialized (in TDZ)",
      "Accessing y before declaration is caught as a ReferenceError",
      "After line 8 runs, y is initialized and accessible",
    ],
    code: `// let is in TDZ from start of block until declaration
try {
  console.log(y); // ReferenceError!
} catch (e) {
  console.log("Caught ReferenceError: Cannot access before init");
}

let y = 42;
console.log(y); // 42
`,
    expectedOutput: ['"Caught ReferenceError: Cannot access before init"', "42"],
    focus: "memory",
    breakpoints: [3, 9],
    tags: ["tdz", "let", "reference-error", "start-here"],
  },
  {
    id: "tdz-const-initialization",
    title: "const requires immediate initialization",
    category: "TDZ",
    level: "beginner",
    description: "const has the same TDZ behavior as let and must be assigned at declaration.",
    whatToWatch: [
      "PI remains uninitialized in TDZ until line 8",
      "Catch block catches the premature access",
      "PI value 3.14159 is assigned and logged",
    ],
    code: `// const TDZ access check
try {
  console.log(PI);
} catch (e) {
  console.log("PI is in TDZ");
}

const PI = 3.14159;
console.log(PI);
`,
    expectedOutput: ['"PI is in TDZ"', "3.14159"],
    focus: "memory",
    breakpoints: [3, 9],
    tags: ["tdz", "const", "initialization"],
  },
  {
    id: "tdz-block-scope",
    title: "TDZ is scoped to enclosing block",
    category: "TDZ",
    level: "intermediate",
    description: "An inner let declaration creates a TDZ inside that block, masking outer variables.",
    whatToWatch: [
      "Outer x is initialized to 10",
      "Inside the if block, a new TDZ is created for inner x",
      "Accessing x before inner declaration refers to inner TDZ, throwing ReferenceError",
    ],
    code: `// Block-level TDZ shadowing
let x = 10;

if (true) {
  try {
    console.log(x); // Throws ReferenceError (inner x in TDZ!)
  } catch (e) {
    console.log("Caught block TDZ");
  }

  let x = 20; // Initializes inner x
  console.log(x); // 20
}

console.log(x);   // 10 (outer x unchanged)
`,
    expectedOutput: ['"Caught block TDZ"', "20", "10"],
    focus: "scopeChain",
    breakpoints: [6, 12, 15],
    tags: ["tdz", "block-scope", "shadowing"],
  },
  {
    id: "tdz-typeof-check",
    title: "typeof in TDZ is not safe",
    category: "TDZ",
    level: "intermediate",
    description: "Unlike undeclared variables (which return 'undefined'), typeof on a TDZ variable throws ReferenceError.",
    whatToWatch: [
      "typeof on undeclaredVariable safely returns 'undefined'",
      "typeof on declaredButInTDZ throws ReferenceError",
    ],
    code: `// typeof is NOT safe in the TDZ
console.log(typeof undeclaredVar); // "undefined" (safe)

try {
  console.log(typeof declaredVar); // ReferenceError!
} catch (e) {
  console.log("typeof threw in TDZ");
}

let declaredVar = "initialized";
console.log(typeof declaredVar);   // "string"
`,
    expectedOutput: ['"undefined"', '"typeof threw in TDZ"', '"string"'],
    focus: "memory",
    breakpoints: [5, 12],
    tags: ["tdz", "typeof", "safety"],
  },
];

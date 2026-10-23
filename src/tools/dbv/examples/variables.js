// src/tools/dbv/examples/variables.js
// Category: Variables and Declarations

export const VARIABLES_EXAMPLES = [
  {
    id: "var-let-const-basics",
    title: "var, let, and const declarations",
    category: "Variables",
    level: "beginner",
    description: "Compares reassignability: var and let can be reassigned, const cannot.",
    whatToWatch: [
      "In Creation phase, var greeting is initialized to undefined; let and const enter TDZ",
      "let count is reassigned from 1 to 2",
      "const MAX remains constant throughout execution",
    ],
    code: `// var, let, and const in action
var greeting = "Hello";
let count = 1;
const MAX = 5;

// Reassigning var and let is valid
greeting = "Hi";
count = count + 1;

console.log(greeting);
console.log(count);
console.log(MAX);
`,
    expectedOutput: ['"Hi"', "2", "5"],
    focus: "memory",
    breakpoints: [7],
    tags: ["variables", "let", "const", "var", "start-here"],
  },
  {
    id: "reassigning-vs-redeclaring",
    title: "Reassigning vs redeclaring",
    category: "Variables",
    level: "beginner",
    description: "var permits redeclaration in the same scope, whereas let and const forbid it.",
    whatToWatch: [
      "var score is declared twice without error",
      "The value updates in the existing variable binding",
    ],
    code: `// var allows redeclaration in the same scope
var score = 10;
var score = 20; // Valid with var

let level = 1;
level = 2;      // Reassignment is allowed

console.log(score);
console.log(level);
`,
    expectedOutput: ["20", "2"],
    focus: "memory",
    breakpoints: [5],
    tags: ["variables", "redeclaring", "var", "let"],
  },
  {
    id: "const-object-mutation",
    title: "const with objects (reference is constant, contents are not)",
    category: "Variables",
    level: "intermediate",
    description: "const freezes the variable binding (the pointer to heap), not the object properties.",
    whatToWatch: [
      "The user variable holds a reference (ref:id) on the heap",
      "Mutating user.age alters heap memory without reassigning the user reference",
    ],
    code: `// const binds the reference, not the heap object contents
const user = { name: "Alice", age: 25 };

// Mutating a property is completely legal
user.age = 26;
user.role = "Admin";

console.log(user.name);
console.log(user.age);
console.log(user.role);
`,
    expectedOutput: ['"Alice"', "26", '"Admin"'],
    focus: "heap",
    breakpoints: [5],
    tags: ["const", "objects", "mutation", "heap", "start-here"],
  },
  {
    id: "declaring-without-initializing",
    title: "Declaring without initializing",
    category: "Variables",
    level: "beginner",
    description: "An uninitialized var or let evaluates to undefined until assigned.",
    whatToWatch: [
      "status is undefined until assignment on line 5",
      "msg remains undefined throughout",
    ],
    code: `// Declaring variables without initial values
var msg;
let status;

console.log(msg);    // undefined
console.log(status); // undefined

status = "ready";
console.log(status); // ready
`,
    expectedOutput: ["undefined", "undefined", '"ready"'],
    focus: "memory",
    breakpoints: [8],
    tags: ["variables", "undefined", "initialization"],
  },
  {
    id: "variable-shadowing-block",
    title: "Variable shadowing in nested blocks",
    category: "Variables",
    level: "intermediate",
    description: "An inner let declaration shadows an outer variable within its block.",
    whatToWatch: [
      "Outer scope creates title: 'Global'",
      "Inner block creates a distinct lexical environment shadowing title",
      "Exiting the block restores the outer title",
    ],
    code: `// Block-scoped shadowing
let title = "Global";

if (true) {
  let title = "Local"; // Shadows outer title
  console.log(title);  // "Local"
}

console.log(title);    // "Global"
`,
    expectedOutput: ['"Local"', '"Global"'],
    focus: "scopeChain",
    breakpoints: [5],
    tags: ["variables", "shadowing", "scope"],
  },
];

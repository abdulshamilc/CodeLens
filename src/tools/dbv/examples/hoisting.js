// src/tools/dbv/examples/hoisting.js
// Category: Hoisting

export const HOISTING_EXAMPLES = [
  {
    id: "hoisting-var-basics",
    title: "var is hoisted as undefined",
    category: "Hoisting",
    level: "beginner",
    description: "During creation phase, var declarations are hoisted and initialized to undefined.",
    whatToWatch: [
      "In Creation phase, x is allocated in the Variable Environment with undefined",
      "Line 2 reads undefined before line 3 assigns 10",
    ],
    code: `// var is hoisted and initialized to undefined
console.log(x); // undefined

var x = 10;

console.log(x); // 10
`,
    expectedOutput: ["undefined", "10"],
    focus: "memory",
    breakpoints: [2, 6],
    tags: ["hoisting", "var", "start-here"],
  },
  {
    id: "hoisting-function-declaration",
    title: "Function declaration is fully hoisted",
    category: "Hoisting",
    level: "beginner",
    description: "Function declarations are fully hoisted and callable before their definition line.",
    whatToWatch: [
      "Creation phase allocates greet function on heap and binds it to scope immediately",
      "Line 2 calls greet() before line 5 where it is written",
    ],
    code: `// Calling function declaration before its code
greet("Dev");

function greet(name) {
  console.log("Hello, " + name);
}
`,
    expectedOutput: ['"Hello, Dev"'],
    focus: "callStack",
    breakpoints: [2],
    tags: ["hoisting", "functions", "start-here"],
  },
  {
    id: "hoisting-priority",
    title: "Function vs var hoisting priority",
    category: "Hoisting",
    level: "intermediate",
    description: "When a function and var share the same identifier, the function declaration takes precedence during hoisting.",
    whatToWatch: [
      "Creation phase sets item to the function, overriding var item",
      "typeof item before assignment is 'function'",
      "Line 4 assigns number 99, changing typeof to 'number'",
    ],
    code: `// Function declaration takes hoisting precedence over var
console.log(typeof item); // "function"

var item = 99;
function item() {}

console.log(typeof item); // "number"
`,
    expectedOutput: ['"function"', '"number"'],
    focus: "memory",
    breakpoints: [2, 7],
    tags: ["hoisting", "precedence", "var", "function"],
  },
  {
    id: "hoisting-function-expression",
    title: "var function expression is undefined before assignment",
    category: "Hoisting",
    level: "intermediate",
    description: "var fn is hoisted as undefined, so attempting to invoke it before assignment throws TypeError.",
    whatToWatch: [
      "fn is hoisted as undefined, NOT as a function",
      "try/catch intercepts the TypeError when invoking undefined()",
    ],
    code: `// Function expressions are NOT fully hoisted
try {
  fn(); // TypeError: fn is not a function
} catch (e) {
  console.log("Caught call before assignment");
}

var fn = function() {
  console.log("fn executed");
};

fn(); // Works after assignment
`,
    expectedOutput: ['"Caught call before assignment"', '"fn executed"'],
    focus: "memory",
    breakpoints: [3, 13],
    tags: ["hoisting", "expressions", "errors"],
  },
  {
    id: "hoisting-inside-function",
    title: "Hoisting inside function execution context",
    category: "Hoisting",
    level: "intermediate",
    description: "Hoisting happens within each execution context creation phase, shadowing outer variables.",
    whatToWatch: [
      "Inside test(), var val is hoisted to local scope as undefined",
      "The outer val ('outer') is shadowed locally even before assignment",
    ],
    code: `// Local hoisting inside a function
var val = "outer";

function test() {
  console.log(val); // undefined (local val hoisted!)
  var val = "inner";
  console.log(val); // "inner"
}

test();
console.log(val);   // "outer"
`,
    expectedOutput: ["undefined", '"inner"', '"outer"'],
    focus: "scopeChain",
    breakpoints: [5, 7],
    tags: ["hoisting", "functions", "scopeChain"],
  },
];

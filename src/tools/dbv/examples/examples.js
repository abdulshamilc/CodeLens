// src/tools/dbv/examples/examples.js
// Built-in code examples for the DBV tool, organized by category

/**
 * @typedef {Object} DBVExample
 * @property {string} id
 * @property {string} category
 * @property {string} title
 * @property {string} description
 * @property {string} code
 */

export const DEFAULT_CODE = `// Welcome to DBV – JavaScript Execution Visualizer
// Press ⚡ Run / Analyze (or Ctrl+Enter) to see the magic!

var greeting = "hello";
let count = 0;
const MAX = 10;

function add(a, b) {
  return a + b;
}

count = add(3, 7);
console.log(greeting, count);
`;

export const EXAMPLES = [
  // ── Hoisting ──────────────────────────────────────────────────────────────
  {
    id: "hoisting-var",
    category: "Hoisting",
    title: "var hoisting",
    description: "Demonstrates how var declarations are hoisted to the top of scope and initialized to undefined.",
    code: `// var is hoisted and initialized to undefined
console.log(x); // undefined (not an error!)
var x = 5;
console.log(x); // 5
`,
  },
  {
    id: "hoisting-function",
    category: "Hoisting",
    title: "Function declaration hoisting",
    description: "Function declarations are fully hoisted – you can call them before they appear in code.",
    code: `// Function declarations are fully hoisted
greet("World"); // works before the definition!

function greet(name) {
  console.log("Hello, " + name + "!");
}
`,
  },
  {
    id: "hoisting-mixed",
    category: "Hoisting",
    title: "var vs function hoisting order",
    description: "When both var and function have the same name, function wins during hoisting.",
    code: `console.log(typeof foo); // "function"
var foo = 1;
function foo() {}
console.log(typeof foo); // "number"
`,
  },

  // ── TDZ ───────────────────────────────────────────────────────────────────
  {
    id: "tdz-let",
    category: "TDZ",
    title: "Temporal Dead Zone – let",
    description: "Accessing a let variable before its declaration throws a ReferenceError.",
    code: `// let is in the TDZ until this line runs
try {
  console.log(y); // ReferenceError!
} catch (e) {
  console.log("Caught:", e);
}
let y = 42;
console.log(y); // 42
`,
  },
  {
    id: "tdz-const",
    category: "TDZ",
    title: "Temporal Dead Zone – const",
    description: "const has the same TDZ behavior as let.",
    code: `try {
  console.log(PI); // ReferenceError: Cannot access 'PI' before initialization
} catch (e) {
  console.log("Error:", e);
}
const PI = 3.14159;
console.log("PI =", PI);
`,
  },

  // ── Closures ──────────────────────────────────────────────────────────────
  {
    id: "closure-basic",
    category: "Closures",
    title: "Basic closure",
    description: "A function captures the environment where it was defined.",
    code: `function makeCounter() {
  let count = 0;
  return function() {
    count++;
    return count;
  };
}

const counter = makeCounter();
console.log(counter()); // 1
console.log(counter()); // 2
console.log(counter()); // 3
`,
  },
  {
    id: "closure-adder",
    category: "Closures",
    title: "Closure factory (adder)",
    description: "Closures allow you to create functions with baked-in data.",
    code: `function makeAdder(x) {
  return function(y) {
    return x + y;
  };
}

const add5 = makeAdder(5);
const add10 = makeAdder(10);
console.log(add5(3));  // 8
console.log(add10(3)); // 13
`,
  },
  {
    id: "closure-loop-bug",
    category: "Closures",
    title: "Classic loop + var bug",
    description: "The infamous loop bug: all callbacks share the same var i.",
    code: `// Bug: all callbacks print the same value
var fns = [];
for (var i = 0; i < 3; i++) {
  fns.push(function() {
    console.log(i); // all print 3!
  });
}
fns[0]();
fns[1]();
fns[2]();
`,
  },
  {
    id: "closure-loop-fix",
    category: "Closures",
    title: "Loop bug fixed with let",
    description: "Using let creates a new binding per iteration, so each closure captures its own i.",
    code: `// Fix: let creates a new binding per iteration
var fns = [];
for (let i = 0; i < 3; i++) {
  fns.push(function() {
    console.log(i); // 0, 1, 2 ✓
  });
}
fns[0]();
fns[1]();
fns[2]();
`,
  },

  // ── this binding ──────────────────────────────────────────────────────────
  {
    id: "this-method",
    category: "this",
    title: "Method call – this is the object",
    description: "When a function is called as a method, this points to the calling object.",
    code: `const person = {
  name: "Alice",
  greet: function() {
    console.log("Hi, I am", this.name);
  }
};

person.greet(); // this = person
`,
  },
  {
    id: "this-lost",
    category: "this",
    title: "Lost this context",
    description: "Extracting a method and calling it standalone loses the this binding.",
    code: `const obj = {
  value: 42,
  getValue: function() {
    return this.value;
  }
};

const fn = obj.getValue;
console.log(obj.getValue()); // 42
console.log(fn());           // undefined (this is global/undefined)
`,
  },
  {
    id: "this-arrow",
    category: "this",
    title: "Arrow function – lexical this",
    description: "Arrow functions don't have their own this; they inherit it from the enclosing scope.",
    code: `function Timer() {
  this.seconds = 0;
  // Arrow: this is Timer instance
  this.tick = () => {
    this.seconds++;
    console.log(this.seconds);
  };
}

const t = new Timer();
t.tick(); // 1
t.tick(); // 2
`,
  },

  // ── Scope Chain ───────────────────────────────────────────────────────────
  {
    id: "scope-chain",
    category: "Scope Chain",
    title: "Scope chain lookup",
    description: "JavaScript looks up variables through nested scopes until it reaches global.",
    code: `const global = "global";

function outer() {
  const middle = "middle";

  function inner() {
    const local = "local";
    // scope chain: inner → outer → global
    console.log(local, middle, global);
  }

  inner();
}

outer();
`,
  },
  {
    id: "scope-shadowing",
    category: "Scope Chain",
    title: "Variable shadowing",
    description: "An inner declaration shadows an outer one without affecting it.",
    code: `let x = "outer";

function foo() {
  let x = "inner"; // shadows outer x
  console.log(x);  // "inner"
}

foo();
console.log(x); // "outer" (unchanged)
`,
  },

  // ── Event Loop ────────────────────────────────────────────────────────────
  {
    id: "event-loop-basic",
    category: "Event Loop",
    title: "setTimeout vs synchronous code",
    description: "Synchronous code always runs before setTimeout callbacks.",
    code: `console.log("1 - sync start");

setTimeout(function() {
  console.log("3 - setTimeout callback");
}, 0);

console.log("2 - sync end");
// Output: 1, 2, 3
`,
  },
  {
    id: "event-loop-order",
    category: "Event Loop",
    title: "Sync → microtasks → macrotasks",
    description: "The event loop drains the microtask queue before moving to the next macrotask.",
    code: `console.log("1 - sync");

setTimeout(() => console.log("4 - macrotask"), 0);

console.log("2 - sync");
// Note: Promise microtasks would run before setTimeout
// (Promise support coming in D4)
console.log("3 - sync end");
`,
  },

  // ── Functions ─────────────────────────────────────────────────────────────
  {
    id: "recursion",
    category: "Functions",
    title: "Recursion (factorial)",
    description: "Each recursive call adds a new frame to the call stack.",
    code: `function factorial(n) {
  if (n <= 1) return 1;
  return n * factorial(n - 1);
}

console.log(factorial(5)); // 120
`,
  },
  {
    id: "iife",
    category: "Functions",
    title: "IIFE (Immediately Invoked)",
    description: "An IIFE runs immediately and creates its own scope.",
    code: `const result = (function() {
  const secret = 42;
  return secret * 2;
})();

console.log(result); // 84
// console.log(secret); // would be ReferenceError
`,
  },
  {
    id: "higher-order",
    category: "Functions",
    title: "Higher-order functions",
    description: "Functions that take or return other functions.",
    code: `function apply(fn, value) {
  return fn(value);
}

function double(x) { return x * 2; }
function square(x) { return x * x; }

console.log(apply(double, 5)); // 10
console.log(apply(square, 5)); // 25
`,
  },
  {
    id: "default-params",
    category: "Functions",
    title: "Default parameters",
    description: "Functions can have default parameter values.",
    code: `function greet(name, greeting) {
  if (greeting === undefined) greeting = "Hello";
  return greeting + ", " + name + "!";
}

console.log(greet("Alice"));           // Hello, Alice!
console.log(greet("Bob", "Hi"));       // Hi, Bob!
`,
  },

  // ── Objects / Arrays ──────────────────────────────────────────────────────
  {
    id: "object-methods",
    category: "Objects",
    title: "Object with methods",
    description: "Objects can contain functions as properties (methods).",
    code: `const calc = {
  value: 0,
  add: function(n) {
    this.value += n;
    return this;
  },
  result: function() {
    return this.value;
  }
};

calc.add(10).add(5);
console.log(calc.result()); // 15
`,
  },
  {
    id: "array-methods",
    category: "Arrays",
    title: "Array map, filter, reduce",
    description: "Functional array operations each create new execution contexts.",
    code: `const numbers = [1, 2, 3, 4, 5];

const doubled = numbers.map(function(n) { return n * 2; });
const evens = numbers.filter(function(n) { return n % 2 === 0; });
const sum = numbers.reduce(function(acc, n) { return acc + n; }, 0);

console.log(doubled); // [2, 4, 6, 8, 10]
console.log(evens);   // [2, 4]
console.log(sum);     // 15
`,
  },
];

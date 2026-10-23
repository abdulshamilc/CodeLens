// src/tools/dbv/examples/closures.js
// Category: Closures

export const CLOSURES_EXAMPLES = [
  {
    id: "closure-counter-basic",
    title: "Basic closure: keeping state alive after return",
    category: "Closures",
    level: "beginner",
    description: "An inner function retains access to outer variables even after the outer function has finished executing.",
    whatToWatch: [
      "makeCounter() executes, returns the inner function, and pops off call stack",
      "count variable survives in the heap closure environment",
      "Each invocation of counter() increments the preserved count",
    ],
    code: `// Outer function returns an inner function that preserves count
function makeCounter() {
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
    expectedOutput: ["1", "2", "3"],
    focus: "heap",
    breakpoints: [5, 11],
    tags: ["closures", "counter", "state", "start-here"],
  },
  {
    id: "closure-factory-make-adder",
    title: "Function factory (makeAdder)",
    category: "Closures",
    level: "beginner",
    description: "Closures allow you to create customized functions with baked-in configuration data.",
    whatToWatch: [
      "add5 captures x = 5 in its own lexical environment",
      "add10 captures x = 10 in a separate lexical environment",
      "Calling add5(3) and add10(3) produces 8 and 13 independently",
    ],
    code: `// Function factory creating adder functions
function makeAdder(x) {
  return function(y) {
    return x + y;
  };
}

const add5 = makeAdder(5);
const add10 = makeAdder(10);

console.log(add5(3));  // 8
console.log(add10(3)); // 13
`,
    expectedOutput: ["8", "13"],
    focus: "scopeChain",
    breakpoints: [4, 11],
    tags: ["closures", "factory", "functions"],
  },
  {
    id: "closure-private-variables",
    title: "Data privacy with closures",
    category: "Closures",
    level: "intermediate",
    description: "Closures provide true encapsulation by keeping variables inaccessible to the outside world.",
    whatToWatch: [
      "balance cannot be accessed directly (account.balance is undefined)",
      "deposit and getBalance methods share access to the same enclosed balance",
    ],
    code: `// Simulating private state using closures
function createBankAccount(initialBalance) {
  let balance = initialBalance; // Private variable

  return {
    deposit: function(amount) {
      balance += amount;
      return balance;
    },
    getBalance: function() {
      return balance;
    }
  };
}

const account = createBankAccount(100);
account.deposit(50);
console.log(account.getBalance()); // 150
console.log(account.balance);       // undefined
`,
    expectedOutput: ["150", "undefined"],
    focus: "heap",
    breakpoints: [7, 18],
    tags: ["closures", "privacy", "encapsulation"],
  },
  {
    id: "closure-loop-var-vs-let",
    title: "The classic loop closure bug (var vs let)",
    category: "Closures",
    level: "intermediate",
    description: "With var, all callbacks share the single mutated i (printing 3). With let, each iteration creates a new binding.",
    whatToWatch: [
      "var loop shares a single binding across all callbacks",
      "let loop binds a distinct i per iteration, correctly preserving 0, 1, 2",
    ],
    code: `// Loop closure comparison
// 1. Buggy with var: all functions share the same i
var varFns = [];
for (var i = 0; i < 3; i++) {
  varFns.push(function() { return i; });
}

// 2. Fixed with let: new binding per iteration
var letFns = [];
for (let j = 0; j < 3; j++) {
  letFns.push(function() { return j; });
}

console.log(varFns[0](), varFns[1](), varFns[2]()); // 3 3 3
console.log(letFns[0](), letFns[1](), letFns[2]()); // 0 1 2
`,
    expectedOutput: ["3 3 3", "0 1 2"],
    focus: "scopeChain",
    breakpoints: [5, 11, 14],
    tags: ["closures", "loops", "let", "var", "bug"],
  },
  {
    id: "closure-shared-environment",
    title: "Shared closure between multiple functions",
    category: "Closures",
    level: "intermediate",
    description: "Two functions defined in the same scope share access to the exact same closed-over variable.",
    whatToWatch: [
      "increment and decrement mutate the same shared val",
      "Changes from increment are immediately reflected when calling decrement",
    ],
    code: `// Two functions sharing one closure environment
function setupShared() {
  let val = 0;

  function increment() {
    val += 1;
    return val;
  }

  function decrement() {
    val -= 1;
    return val;
  }

  return { increment, decrement };
}

const tools = setupShared();
console.log(tools.increment()); // 1
console.log(tools.increment()); // 2
console.log(tools.decrement()); // 1
`,
    expectedOutput: ["1", "2", "1"],
    focus: "memory",
    breakpoints: [6, 11, 21],
    tags: ["closures", "shared", "state"],
  },
];

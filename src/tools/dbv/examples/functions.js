// src/tools/dbv/examples/functions.js
// Category: Functions

export const FUNCTIONS_EXAMPLES = [
  {
    id: "functions-default-parameters",
    title: "Default parameters evaluation",
    category: "Functions",
    level: "beginner",
    description: "Default parameters evaluate when the passed argument is strictly undefined.",
    whatToWatch: [
      "Calling greet('Alice') uses default greeting 'Hello'",
      "Calling greet('Bob', 'Hi') overrides the default",
    ],
    code: `// Default parameter values
function greet(name, greeting = "Hello") {
  return greeting + ", " + name + "!";
}

console.log(greet("Alice"));
console.log(greet("Bob", "Hi"));
`,
    expectedOutput: ['"Hello, Alice!"', '"Hi, Bob!"'],
    focus: "callStack",
    breakpoints: [3, 6],
    tags: ["functions", "defaults", "parameters"],
  },
  {
    id: "functions-higher-order",
    title: "Higher-order functions: passing functions as arguments",
    category: "Functions",
    level: "beginner",
    description: "Functions are first-class citizens in JavaScript and can be passed as values and returned.",
    whatToWatch: [
      "applyOperation accepts fn as a parameter",
      "double and square are passed by reference and invoked within applyOperation",
    ],
    code: `// Passing functions as arguments
function applyOperation(fn, value) {
  return fn(value);
}

function double(x) { return x * 2; }
function square(x) { return x * x; }

console.log(applyOperation(double, 5)); // 10
console.log(applyOperation(square, 5)); // 25
`,
    expectedOutput: ["10", "25"],
    focus: "callStack",
    breakpoints: [3, 9],
    tags: ["functions", "higher-order", "first-class"],
  },
  {
    id: "functions-iife",
    title: "IIFE: Immediately Invoked Function Expression",
    category: "Functions",
    level: "beginner",
    description: "An IIFE runs immediately upon definition, keeping internal variables out of the outer scope.",
    whatToWatch: [
      "The anonymous function executes right away",
      "secretKey remains trapped inside the IIFE scope",
    ],
    code: `// Immediately Invoked Function Expression
const appConfig = (function() {
  const secretKey = "api_98234_xyz";
  const mode = "production";

  return {
    getMode: function() { return mode; }
  };
})();

console.log(appConfig.getMode());
`,
    expectedOutput: ['"production"'],
    focus: "scopeChain",
    breakpoints: [7, 11],
    tags: ["functions", "iife", "encapsulation"],
  },
  {
    id: "functions-rest-and-spread",
    title: "Rest parameters and array spread",
    category: "Functions",
    level: "intermediate",
    description: "Rest syntax gathers variable arguments into an array; spread unpacks them.",
    whatToWatch: [
      "collectParams gathers args into an array on the heap",
      "Array methods reduce can then operate on the gathered parameters",
    ],
    code: `// Rest parameters gathering arguments
function sumAll(multiplier, ...numbers) {
  const total = numbers.reduce((acc, n) => acc + n, 0);
  return total * multiplier;
}

const result = sumAll(2, 10, 20, 30);
console.log(result); // (10 + 20 + 30) * 2 = 120
`,
    expectedOutput: ["120"],
    focus: "callStack",
    breakpoints: [3, 7],
    tags: ["functions", "rest", "spread"],
  },
];

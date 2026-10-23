// src/tools/dbv/examples/behaviors.js
// Category: Core JavaScript Behaviors

export const BEHAVIORS_EXAMPLES = [
  {
    id: "behaviors-coercion-equality",
    title: "Loose (==) vs strict (===) equality coercion",
    category: "Behaviors",
    level: "beginner",
    description: "== performs implicit type coercion; === compares both type and value strictly without coercion.",
    whatToWatch: [
      "5 == '5' coerces string '5' to number, evaluating to true",
      "5 === '5' checks types (number !== string), evaluating to false",
      "0 == false coerces boolean to 0, evaluating to true",
    ],
    code: `// Implicit coercion in loose equality
console.log(5 == "5");   // true (coerced)
console.log(5 === "5");  // false (strict)

console.log(0 == false);  // true
console.log(0 === false); // false

console.log(null == undefined);  // true
console.log(null === undefined); // false
`,
    expectedOutput: [
      "true",
      "false",
      "true",
      "false",
      "true",
      "false"
    ],
    focus: "memory",
    breakpoints: [2, 5, 8],
    tags: ["behaviors", "coercion", "equality", "start-here"],
  },
  {
    id: "behaviors-truthy-falsy",
    title: "Truthy and falsy values",
    category: "Behaviors",
    level: "beginner",
    description: "In boolean contexts, values coerce to true or false. Only 0, '', null, undefined, NaN, and false are falsy.",
    whatToWatch: [
      "Empty string is falsy",
      "Empty array [] and object {} are truthy objects on the heap!",
    ],
    code: `// Boolean coercion of common values
console.log(Boolean(""));      // false (empty string)
console.log(Boolean("hello")); // true

console.log(Boolean(0));       // false
console.log(Boolean([]));      // true (all objects/arrays are truthy!)
console.log(Boolean({}));      // true
`,
    expectedOutput: ["false", "true", "false", "true", "true"],
    focus: "memory",
    breakpoints: [2, 5],
    tags: ["behaviors", "truthy", "falsy"],
  },
  {
    id: "behaviors-optional-chaining",
    title: "Optional chaining (?.) and nullish coalescing (??)",
    category: "Behaviors",
    level: "intermediate",
    description: "Optional chaining prevents TypeError when accessing nested properties on null or undefined.",
    whatToWatch: [
      "user.address?.street short-circuits to undefined without throwing",
      "Nullish coalescing ?? provides a fallback only when left side is null or undefined",
    ],
    code: `// Safe navigation with optional chaining
const user = { name: "Emma" };

// Without ?., user.address.city would throw TypeError
const city = user.address?.city ?? "Unknown City";

console.log(user.name);
console.log(city);
`,
    expectedOutput: ['"Emma"', '"Unknown City"'],
    focus: "heap",
    breakpoints: [5, 7],
    tags: ["behaviors", "optional-chaining", "nullish"],
  },
];

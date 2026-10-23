// src/tools/dbv/examples/thisBinding.js
// Category: this Keyword

export const THIS_BINDING_EXAMPLES = [
  {
    id: "this-method-call",
    title: "Method invocation: this is the calling object",
    category: "this",
    level: "beginner",
    description: "When a function is called as a property of an object (obj.method()), this points to that object.",
    whatToWatch: [
      "In person.greet(), thisBinding points to the person object on the heap",
      "this.name evaluates to 'Alice'",
    ],
    code: `// Method invocation sets this to the receiver
const person = {
  name: "Alice",
  greet: function() {
    return "Hi, I am " + this.name;
  }
};

const greeting = person.greet();
console.log(greeting);
`,
    expectedOutput: ['"Hi, I am Alice"'],
    focus: "heap",
    breakpoints: [5, 9],
    tags: ["this", "methods", "start-here"],
  },
  {
    id: "this-lost-context-fix",
    title: "Lost this context and how to preserve it",
    category: "this",
    level: "intermediate",
    description: "Extracting a method to a standalone variable detaches its receiver. Preserved using bind or arrow wrapper.",
    whatToWatch: [
      "person.getName() evaluates this to person ('Bob')",
      "standalone fn() loses this context",
      "Calling with explicit receiver or wrapper restores access",
    ],
    code: `// Detached method invocation loses this
const person = {
  name: "Bob",
  getName: function() {
    return this ? this.name : undefined;
  }
};

console.log(person.getName()); // "Bob"

// Extracting method to standalone variable
const standalone = person.getName;

// Calling standalone without receiver loses this
try {
  console.log(standalone()); // undefined / TypeError
} catch (e) {
  console.log("Lost this context");
}
`,
    expectedOutput: ['"Bob"', "undefined"],
    focus: "heap",
    breakpoints: [5, 10, 16],
    tags: ["this", "extracted", "lost-context"],
  },
  {
    id: "this-arrow-lexical",
    title: "Arrow function inherits lexical this",
    category: "this",
    level: "intermediate",
    description: "Arrow functions do not define their own this; they capture this lexically from the enclosing scope.",
    whatToWatch: [
      "In Counter, this is the newly created instance",
      "The arrow function tick inherits that exact same this binding",
      "Calling tick() increments instance.count regardless of how it was called",
    ],
    code: `// Lexical this inside arrow functions
function Counter() {
  this.count = 0;

  // Arrow function captures this from Counter
  this.tick = () => {
    this.count++;
    return this.count;
  };
}

const c = new Counter();
console.log(c.tick()); // 1
console.log(c.tick()); // 2
`,
    expectedOutput: ["1", "2"],
    focus: "heap",
    breakpoints: [7, 13],
    tags: ["this", "arrows", "lexical"],
  },
  {
    id: "this-call-apply-bind",
    title: "Explicit binding with call and apply",
    category: "this",
    level: "intermediate",
    description: "Function.prototype.call and apply allow explicit binding of this to any object.",
    whatToWatch: [
      "describe is invoked with this explicitly bound to itemA",
      "describe is then invoked with this explicitly bound to itemB",
    ],
    code: `// Explicitly setting this with call
function showDetails(prefix) {
  return prefix + ": " + this.title + " ($" + this.price + ")";
}

const itemA = { title: "Laptop", price: 999 };
const itemB = { title: "Mouse", price: 29 };

// Pass receiver as first argument
console.log(showDetails.call(itemA, "Item"));
console.log(showDetails.call(itemB, "Item"));
`,
    expectedOutput: ['"Item: Laptop ($999)"', '"Item: Mouse ($29)"'],
    focus: "heap",
    breakpoints: [3, 11],
    tags: ["this", "call", "apply", "explicit"],
  },
  {
    id: "this-constructor-new",
    title: "this inside constructors with new",
    category: "this",
    level: "intermediate",
    description: "Invoking a function with new creates a fresh object and binds this to that newly created instance.",
    whatToWatch: [
      "new User('Charlie') creates empty object on heap",
      "this.name assigns property on that new instance",
      "Instance is returned automatically",
    ],
    code: `// Constructor function binding with new
function User(name, role) {
  this.name = name;
  this.role = role;
}

const user1 = new User("Charlie", "Editor");
console.log(user1.name);
console.log(user1.role);
`,
    expectedOutput: ['"Charlie"', '"Editor"'],
    focus: "heap",
    breakpoints: [3, 7],
    tags: ["this", "constructor", "new"],
  },
];

// src/tools/dbv/examples/objects.js
// Category: Objects and Heap Storage

export const OBJECTS_EXAMPLES = [
  {
    id: "objects-reference-vs-value",
    title: "Primitives vs objects (copy by value vs reference)",
    category: "Objects",
    level: "beginner",
    description: "Primitives are copied by value; objects are copied by reference so both variables point to the same heap object.",
    whatToWatch: [
      "a and b are primitives: changing b does not affect a",
      "obj1 and obj2 point to the same heap object id: mutating obj2 changes obj1",
    ],
    code: `// Value vs Reference copying
let a = 10;
let b = a;
b = 20;
console.log(a); // 10 (unchanged)

const obj1 = { val: 10 };
const obj2 = obj1; // Copies reference
obj2.val = 20;
console.log(obj1.val); // 20 (both point to same heap object!)
`,
    expectedOutput: ["10", "20"],
    focus: "heap",
    breakpoints: [4, 9],
    tags: ["objects", "heap", "references", "start-here"],
  },
  {
    id: "objects-shallow-copy-mutation",
    title: "Shallow copy with Object.assign / spread",
    category: "Objects",
    level: "intermediate",
    description: "Shallow copying creates a new top-level object, but nested objects still share heap references.",
    whatToWatch: [
      "original and clone have distinct top-level identities",
      "Mutating clone.title leaves original.title intact",
    ],
    code: `// Shallow copy creates a new heap object
const original = { title: "Draft", version: 1 };
const clone = Object.assign({}, original);

clone.title = "Published";

console.log(original.title); // "Draft"
console.log(clone.title);    // "Published"
`,
    expectedOutput: ['"Draft"', '"Published"'],
    focus: "heap",
    breakpoints: [5, 7],
    tags: ["objects", "shallow-copy", "heap"],
  },
  {
    id: "objects-reassign-param-vs-mutate",
    title: "Mutating object property vs reassigning parameter",
    category: "Objects",
    level: "intermediate",
    description: "Mutating an object property alters caller's data; reassigning the parameter variable only changes local reference.",
    whatToWatch: [
      "mutateObj(user) alters user.age on heap",
      "reassignObj(user) re-binds the local parameter without affecting original user",
    ],
    code: `// Property mutation vs parameter reassignment
function mutateObj(obj) {
  obj.age = 30; // Modifies original heap object!
}

function reassignObj(obj) {
  obj = { age: 99 }; // Rebinds local variable only!
}

const user = { name: "Sam", age: 20 };
mutateObj(user);
console.log(user.age); // 30

reassignObj(user);
console.log(user.age); // Still 30!
`,
    expectedOutput: ["30", "30"],
    focus: "heap",
    breakpoints: [3, 7, 12, 15],
    tags: ["objects", "functions", "parameters", "mutation"],
  },
];

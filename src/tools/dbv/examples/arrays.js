// src/tools/dbv/examples/arrays.js
// Category: Arrays

export const ARRAYS_EXAMPLES = [
  {
    id: "arrays-reference-mutation",
    title: "Array stored by reference on heap",
    category: "Arrays",
    level: "beginner",
    description: "Arrays are objects on the heap. Assigning an array variable copies the pointer, not the elements.",
    whatToWatch: [
      "listA and listB point to the same array id on heap",
      "listB.push(4) modifies the shared array visible to listA",
    ],
    code: `// Arrays are reference types
const listA = [1, 2, 3];
const listB = listA; // Copies reference

listB.push(4);

console.log(listA.length); // 4
console.log(listB[3]);     // 4
`,
    expectedOutput: ["4", "4"],
    focus: "heap",
    breakpoints: [5, 8],
    tags: ["arrays", "heap", "references", "start-here"],
  },
  {
    id: "arrays-push-pop-shift-unshift",
    title: "Array push, pop, shift, and unshift",
    category: "Arrays",
    level: "beginner",
    description: "push and unshift add items; pop and shift remove items from the end and beginning.",
    whatToWatch: [
      "push adds to end, incrementing length",
      "pop removes from end and returns removed value",
    ],
    code: `// Array stack & queue operations
const items = [10, 20];

items.push(30);       // [10, 20, 30]
const removed = items.pop(); // 30

console.log(removed);
console.log(items.length);
`,
    expectedOutput: ["30", "2"],
    focus: "heap",
    breakpoints: [4, 5, 8],
    tags: ["arrays", "stack", "methods"],
  },
  {
    id: "arrays-map-filter-reduce-flow",
    title: "Array map, filter, and reduce transformation",
    category: "Arrays",
    level: "intermediate",
    description: "Functional array methods each create new contexts and return newly transformed values.",
    whatToWatch: [
      "map doubles each number and returns a new array on heap",
      "filter collects even elements into another new array",
      "reduce accumulates elements into a single integer sum",
    ],
    code: `// Array transformations step by step
const numbers = [1, 2, 3, 4, 5];

const doubled = numbers.map(function(n) { return n * 2; });
const evens = numbers.filter(function(n) { return n % 2 === 0; });
const sum = numbers.reduce(function(acc, n) { return acc + n; }, 0);

console.log(doubled.length); // 5
console.log(evens.length);   // 2
console.log(sum);            // 15
`,
    expectedOutput: ["5", "2", "15"],
    focus: "heap",
    breakpoints: [4, 5, 6],
    tags: ["arrays", "map", "filter", "reduce", "functional"],
  },
  {
    id: "arrays-sort-mutates-in-place",
    title: "Array sort mutates in place",
    category: "Arrays",
    level: "intermediate",
    description: "Array.prototype.sort mutates the original array on the heap rather than creating a copy.",
    whatToWatch: [
      "Before sorting: [30, 10, 20]",
      "After sort(): elements in original array are rearranged in place",
    ],
    code: `// sort() mutates the original array
const scores = [30, 10, 20];

scores.sort((a, b) => a - b);

console.log(scores[0]); // 10
console.log(scores[1]); // 20
console.log(scores[2]); // 30
`,
    expectedOutput: ["10", "20", "30"],
    focus: "heap",
    breakpoints: [4, 7],
    tags: ["arrays", "sort", "mutation"],
  },
];

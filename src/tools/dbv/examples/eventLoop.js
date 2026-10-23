// src/tools/dbv/examples/eventLoop.js
// Category: Event Loop, Promises, Microtasks, and Callback Queues

export const EVENT_LOOP_EXAMPLES = [
  {
    id: "event-loop-sync-vs-timeout",
    title: "setTimeout vs synchronous code",
    category: "Event Loop",
    level: "beginner",
    description: "Synchronous code always executes to completion before any queued callback from the Callback Queue.",
    whatToWatch: [
      "console.log('1 - start') runs synchronously",
      "setTimeout(cb, 0) registers timer in Web APIs and queues to Callback Queue",
      "console.log('2 - end') runs synchronously BEFORE the callback is dequeued",
      "Event loop dequeues callback only after call stack is empty",
    ],
    code: `// Synchronous code finishes before setTimeout(0)
console.log("1 - start");

setTimeout(function() {
  console.log("3 - setTimeout callback");
}, 0);

console.log("2 - end");
`,
    expectedOutput: ['"1 - start"', '"2 - end"', '"3 - setTimeout callback"'],
    focus: "eventLoop",
    breakpoints: [2, 4, 8],
    tags: ["eventLoop", "setTimeout", "callbackQueue", "start-here"],
  },
  {
    id: "event-loop-promise-microtask-order",
    title: "Promise microtasks run before setTimeout macrotasks",
    category: "Event Loop",
    level: "beginner",
    description: "The event loop drains the entire Microtask Queue before picking the next callback from the Callback (Macrotask) Queue.",
    whatToWatch: [
      "setTimeout registers in Web APIs and pushes to Callback Queue (Macrotask)",
      "Promise.resolve().then() pushes to Microtask Queue (High Priority)",
      "When call stack empties, the Microtask runs FIRST, followed by the Macrotask",
    ],
    code: `// Microtasks (Promises) take priority over Macrotasks (setTimeout)
console.log("1 - sync");

setTimeout(() => {
  console.log("4 - setTimeout (macrotask)");
}, 0);

Promise.resolve().then(() => {
  console.log("3 - Promise (microtask)");
});

console.log("2 - sync end");
`,
    expectedOutput: [
      '"1 - sync"',
      '"2 - sync end"',
      '"3 - Promise (microtask)"',
      '"4 - setTimeout (macrotask)"'
    ],
    focus: "eventLoop",
    breakpoints: [2, 4, 8, 12],
    tags: ["eventLoop", "promises", "microtasks", "macrotasks", "start-here"],
  },
  {
    id: "event-loop-queue-microtask",
    title: "queueMicrotask vs Promise vs setTimeout",
    category: "Event Loop",
    level: "intermediate",
    description: "queueMicrotask explicitly enqueues a callback into the microtask queue alongside Promise jobs.",
    whatToWatch: [
      "Synchronous 'A' logs immediately",
      "setTimeout queues to Macrotasks",
      "queueMicrotask and Promise.resolve queue into Microtasks in order of arrival",
      "Both microtasks drain before the setTimeout macrotask runs",
    ],
    code: `// queueMicrotask API demonstration
console.log("A - sync");

setTimeout(() => {
  console.log("D - setTimeout macrotask");
}, 0);

queueMicrotask(() => {
  console.log("B - queueMicrotask");
});

Promise.resolve().then(() => {
  console.log("C - Promise then");
});
`,
    expectedOutput: [
      '"A - sync"',
      '"B - queueMicrotask"',
      '"C - Promise then"',
      '"D - setTimeout macrotask"'
    ],
    focus: "eventLoop",
    breakpoints: [2, 4, 8, 12],
    tags: ["eventLoop", "queueMicrotask", "promises", "microtasks"],
  },
  {
    id: "event-loop-nested-microtasks",
    title: "Nested microtasks drain completely before macrotasks",
    category: "Event Loop",
    level: "intermediate",
    description: "If a microtask schedules another microtask, the new microtask is executed before the event loop advances to macrotasks.",
    whatToWatch: [
      "setTimeout is waiting in the Callback Queue",
      "Microtask 1 runs and immediately enqueues Microtask 2",
      "Microtask 2 executes before setTimeout can get onto the Call Stack",
    ],
    code: `// Microtasks draining completely before any macrotask
setTimeout(() => {
  console.log("3 - macrotask from setTimeout");
}, 0);

Promise.resolve().then(() => {
  console.log("1 - microtask 1");
  queueMicrotask(() => {
    console.log("2 - microtask 2 (nested)");
  });
});
`,
    expectedOutput: [
      '"1 - microtask 1"',
      '"2 - microtask 2 (nested)"',
      '"3 - macrotask from setTimeout"'
    ],
    focus: "eventLoop",
    breakpoints: [2, 6, 8],
    tags: ["eventLoop", "nested", "microtasks"],
  },
  {
    id: "event-loop-promise-chain",
    title: "Promise chaining and resolution flow",
    category: "Event Loop",
    level: "intermediate",
    description: "Each .then() in a Promise chain returns a new Promise and queues its callback when the parent resolves.",
    whatToWatch: [
      "Promise constructor initializes with resolve value 10",
      "First .then transforms 10 -> 20",
      "Second .then receives 20 and logs final result",
    ],
    code: `// Promise chaining step by step
new Promise((resolve) => {
  console.log("1 - inside Promise constructor (sync)");
  resolve(10);
})
  .then((val) => {
    console.log("3 - first then:", val);
    return val * 2;
  })
  .then((val) => {
    console.log("4 - second then:", val);
  });

console.log("2 - after Promise chain (sync)");
`,
    expectedOutput: [
      '"1 - inside Promise constructor (sync)"',
      '"2 - after Promise chain (sync)"',
      '"3 - first then:" 10',
      '"4 - second then:" 20'
    ],
    focus: "eventLoop",
    breakpoints: [2, 6, 10, 14],
    tags: ["eventLoop", "promises", "chaining"],
  },
  {
    id: "event-loop-classic-interview-puzzle",
    title: "Classic Event Loop interview puzzle",
    category: "Event Loop",
    level: "advanced",
    description: "The classic tech interview puzzle testing synchronous execution, multiple microtasks, and macrotasks.",
    whatToWatch: [
      "Sync logs 'Start' and 'End' run first",
      "Promise constructor runs synchronously during initialization",
      "Microtask queue drains: Promise 1, then Promise 2",
      "Finally, the macrotask (Timeout) executes",
    ],
    code: `// The classic Event Loop interview test
console.log("1 - Start");

setTimeout(() => {
  console.log("5 - Timeout");
}, 0);

Promise.resolve()
  .then(() => {
    console.log("3 - Promise 1");
  })
  .then(() => {
    console.log("4 - Promise 2");
  });

console.log("2 - End");
`,
    expectedOutput: [
      '"1 - Start"',
      '"2 - End"',
      '"3 - Promise 1"',
      '"4 - Promise 2"',
      '"5 - Timeout"'
    ],
    focus: "eventLoop",
    breakpoints: [2, 4, 8, 11, 15],
    tags: ["eventLoop", "interview", "puzzle", "promises", "microtasks"],
  },
  {
    id: "event-loop-async-await-microtask-flow",
    title: "async/await execution order and microtasks",
    category: "Event Loop",
    level: "intermediate",
    description: "An async function runs synchronously until the first await; the continuation is queued as a microtask before callback queue macrotasks.",
    whatToWatch: [
      "fetchUser() starts synchronously on the Call Stack immediately when invoked",
      "await pauses fetchUser and queues continuation into Microtask Queue",
      "Sync log '3 - script end' runs before any queued task",
      "Microtask queue drains fetchUser continuation BEFORE the Callback Queue runs",
      "setTimeout callback in the Callback Queue runs last",
    ],
    code: `// async/await desugars to Promise microtasks
async function fetchUser() {
  console.log("2 - inside fetchUser (sync start)");
  await Promise.resolve("user data");
  console.log("4 - inside fetchUser (resumed as microtask)");
}

console.log("1 - script start (sync)");

setTimeout(() => {
  console.log("5 - setTimeout callback (callback/macrotask queue)");
}, 0);

fetchUser();

console.log("3 - script end (sync)");
`,
    expectedOutput: [
      '"1 - script start (sync)"',
      '"2 - inside fetchUser (sync start)"',
      '"3 - script end (sync)"',
      '"4 - inside fetchUser (resumed as microtask)"',
      '"5 - setTimeout callback (callback/macrotask queue)"'
    ],
    focus: "eventLoop",
    breakpoints: [3, 4, 8, 11, 15, 17],
    tags: ["eventLoop", "async", "await", "promises", "microtasks", "callbackQueue"],
  },
  {
    id: "event-loop-async-await-multiple-microtasks",
    title: "Interleaving async/await, Promise.then, and Callback Queue",
    category: "Event Loop",
    level: "advanced",
    description: "Demonstrates how await continuations and explicit Promise.then() share and drain the Microtask Queue ahead of the Callback Queue.",
    whatToWatch: [
      "runSequence() executes up to the first await and yields",
      "Promise.then() queues second microtask behind the await continuation",
      "All synchronous statements finish first",
      "Microtask queue drains: await resumption first, then Promise.then",
      "Finally, Callback Queue executes the setTimeout macrotask",
    ],
    code: `// Interleaving async/await, Promise.then, and setTimeout
async function runSequence() {
  console.log("2 - sequence start");
  await null; // yields to microtask queue
  console.log("4 - after first await (microtask 1)");
}

console.log("1 - main start");

setTimeout(() => {
  console.log("6 - timeout callback (callback queue)");
}, 0);

runSequence();

Promise.resolve().then(() => {
  console.log("5 - Promise.then (microtask 2)");
});

console.log("3 - main end");
`,
    expectedOutput: [
      '"1 - main start"',
      '"2 - sequence start"',
      '"3 - main end"',
      '"4 - after first await (microtask 1)"',
      '"5 - Promise.then (microtask 2)"',
      '"6 - timeout callback (callback queue)"'
    ],
    focus: "eventLoop",
    breakpoints: [3, 4, 8, 11, 15, 18, 20],
    tags: ["eventLoop", "async", "await", "microtasks", "callbackQueue", "interleaving"],
  },
];

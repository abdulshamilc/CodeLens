// src/tools/dbv/editor/editorSnippets.js
// VS Code and CodeLens DBV snippets with tab stops for CodeMirror 6

import { snippetCompletion } from "@codemirror/autocomplete";

export const SNIPPETS = [
  snippetCompletion("console.log(#{1});", {
    label: "log",
    detail: "console.log()",
    info: "Log output to the console",
    type: "snippet",
    boost: 90,
  }),
  snippetCompletion("function #{1:name}(#{2:params}) {\n\t#{3}\n}", {
    label: "fn",
    detail: "function name() {}",
    info: "Function declaration",
    type: "snippet",
    boost: 85,
  }),
  snippetCompletion("const #{1:name} = (#{2:params}) => {\n\t#{3}\n};", {
    label: "afn",
    detail: "const fn = () => {}",
    info: "Arrow function statement",
    type: "snippet",
    boost: 85,
  }),
  snippetCompletion("(#{1:params}) => #{2}", {
    label: "arrow",
    detail: "() => expression",
    info: "Inline arrow function",
    type: "snippet",
    boost: 80,
  }),
  snippetCompletion("for (let #{1:i} = 0; #{1:i} < #{2:array}.length; #{1:i}++) {\n\t#{3}\n}", {
    label: "for",
    detail: "for (let i = 0; ...)",
    info: "Standard for loop",
    type: "snippet",
    boost: 85,
  }),
  snippetCompletion("for (const #{1:item} of #{2:items}) {\n\t#{3}\n}", {
    label: "forof",
    detail: "for (const item of items)",
    info: "Iterate iterable items (for-of)",
    type: "snippet",
    boost: 85,
  }),
  snippetCompletion("for (const #{1:key} in #{2:object}) {\n\t#{3}\n}", {
    label: "forin",
    detail: "for (const key in object)",
    info: "Iterate object properties (for-in)",
    type: "snippet",
    boost: 80,
  }),
  snippetCompletion("#{1:array}.forEach((#{2:item}) => {\n\t#{3}\n});", {
    label: "foreach",
    detail: "array.forEach(item => ...)",
    info: "Execute callback for each array item",
    type: "snippet",
    boost: 80,
  }),
  snippetCompletion("#{1:array}.map((#{2:item}) => #{3})", {
    label: "map",
    detail: "array.map(item => ...)",
    info: "Transform array elements into new array",
    type: "snippet",
    boost: 80,
  }),
  snippetCompletion("if (#{1:condition}) {\n\t#{2}\n}", {
    label: "if",
    detail: "if (condition) {}",
    info: "If branch statement",
    type: "snippet",
    boost: 80,
  }),
  snippetCompletion("if (#{1:condition}) {\n\t#{2}\n} else {\n\t#{3}\n}", {
    label: "ife",
    detail: "if () {} else {}",
    info: "If-else branch statement",
    type: "snippet",
    boost: 80,
  }),
  snippetCompletion("switch (#{1:key}) {\n\tcase #{2:value}:\n\t\t#{3}\n\t\tbreak;\n\tdefault:\n\t\tbreak;\n}", {
    label: "switch",
    detail: "switch (key) { case ... }",
    info: "Switch case statement",
    type: "snippet",
    boost: 75,
  }),
  snippetCompletion("try {\n\t#{1}\n} catch (#{2:error}) {\n\t#{3}\n}", {
    label: "try",
    detail: "try { } catch (error) { }",
    info: "Try-catch block",
    type: "snippet",
    boost: 80,
  }),
  snippetCompletion("class #{1:Name} {\n\tconstructor(#{2:args}) {\n\t\t#{3}\n\t}\n}", {
    label: "class",
    detail: "class Name { constructor() {} }",
    info: "Class declaration with constructor",
    type: "snippet",
    boost: 80,
  }),
  snippetCompletion("setTimeout(() => {\n\t#{2}\n}, #{1:1000});", {
    label: "settimeout",
    detail: "setTimeout(() => {}, ms)",
    info: "Schedule a macrotask callback",
    type: "snippet",
    boost: 85,
  }),
  snippetCompletion("setInterval(() => {\n\t#{2}\n}, #{1:1000});", {
    label: "setinterval",
    detail: "setInterval(() => {}, ms)",
    info: "Schedule a recurring interval callback",
    type: "snippet",
    boost: 80,
  }),
  snippetCompletion("new Promise((resolve, reject) => {\n\t#{1}\n});", {
    label: "promise",
    detail: "new Promise((resolve, reject) => {})",
    info: "Create a new Promise",
    type: "snippet",
    boost: 85,
  }),
  snippetCompletion("async function #{1:name}(#{2:params}) {\n\t#{3}\n}", {
    label: "async",
    detail: "async function name() {}",
    info: "Async function declaration",
    type: "snippet",
    boost: 85,
  }),
  snippetCompletion('fetch("#{1:/api/data}")\n\t.then((res) => res.json())\n\t.then((data) => {\n\t\tconsole.log(data);\n\t});', {
    label: "fetchmock",
    detail: "fetch(url).then(res => res.json())",
    info: "Fetch data and parse JSON response",
    type: "snippet",
    boost: 75,
  }),
  snippetCompletion("(() => {\n\t#{1}\n})();", {
    label: "iife",
    detail: "(() => { ... })()",
    info: "Immediately Invoked Function Expression",
    type: "snippet",
    boost: 75,
  }),
  snippetCompletion("function* #{1:generator}() {\n\t#{2}\n}", {
    label: "gen",
    detail: "function* name() {}",
    info: "Generator function declaration",
    type: "snippet",
    boost: 75,
  }),
  snippetCompletion("const { #{1:prop} } = #{2:object};", {
    label: "destruct",
    detail: "const { prop } = object;",
    info: "Destructure properties from an object",
    type: "snippet",
    boost: 80,
  }),
  snippetCompletion('import { #{1:item} } from "#{2:module}";', {
    label: "import",
    detail: 'import { ... } from "..."',
    info: "ES module import statement",
    type: "snippet",
    boost: 70,
  }),

  // ── CodeLens DBV Interactive Demos ───────────────────────────────────────────
  snippetCompletion(
    `function makeCounter() {\n\tlet count = 0;\n\treturn function() {\n\t\tcount++;\n\t\treturn count;\n\t};\n}\nconst counter = makeCounter();\nconsole.log(counter());\nconsole.log(counter());`,
    {
      label: "closure",
      detail: "CodeLens: Closure Counter Demo",
      info: "Interactive closure demonstration capturing an outer environment",
      type: "snippet",
      boost: 95,
    }
  ),
  snippetCompletion(
    `console.log(a); // undefined (var hoisted)\nvar a = 10;\nconsole.log(a); // 10\n\ngreet(); // works before declaration!\nfunction greet() {\n\tconsole.log("Hello from hoisted function!");\n}`,
    {
      label: "hoisting",
      detail: "CodeLens: Variable & Function Hoisting",
      info: "Demonstrates var and function declaration hoisting",
      type: "snippet",
      boost: 95,
    }
  ),
  snippetCompletion(
    `console.log("1: sync start");\n\nsetTimeout(() => {\n\tconsole.log("4: setTimeout macrotask");\n}, 0);\n\nPromise.resolve().then(() => {\n\tconsole.log("3: Promise microtask");\n});\n\nconsole.log("2: sync end");`,
    {
      label: "eventloop",
      detail: "CodeLens: Microtasks vs Macrotasks",
      info: "Demonstrates event loop execution order: sync -> microtask -> macrotask",
      type: "snippet",
      boost: 95,
    }
  ),
];

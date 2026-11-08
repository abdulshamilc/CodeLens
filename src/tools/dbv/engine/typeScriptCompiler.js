// src/tools/dbv/engine/typeScriptCompiler.js
// TypeScript-to-JavaScript transpiler and syntax validator
// Strips TypeScript type annotations, interfaces, types, generics, and access modifiers
// Preserves line mappings 1:1 so error line numbers match the user's source code.

import * as acorn from "acorn";

/**
 * Transpiles TypeScript source code into executable ECMAScript.
 * Preserves newline positions to maintain line-number parity.
 * @param {string} tsCode
 * @returns {{ code: string, error: null | Object }}
 */
export function transpileTypeScript(tsCode) {
  if (typeof tsCode !== "string") {
    return {
      code: "",
      error: {
        name: "TypeError",
        message: "TypeScript source code must be a string.",
        line: 1,
        column: 1,
        kind: "validation",
      },
    };
  }

  // Pre-check for balanced braces/brackets
  const balanceErr = checkBracketBalance(tsCode);
  if (balanceErr) {
    return { code: "", error: balanceErr };
  }

  let js = tsCode;

  // 1. Remove interfaces: interface Foo { ... }
  js = js.replace(/(?:export\s+)?interface\s+[A-Za-z0-9_$]+(?:\s*<[^>]+>)?(?:\s+extends\s+[^{]+)?\s*\{[\s\S]*?\}/g, (match) => {
    const lineCount = (match.match(/\n/g) || []).length;
    return "\n".repeat(lineCount);
  });

  // 2. Remove type aliases: type Foo = ... ;
  js = js.replace(/(?:export\s+)?type\s+[A-Za-z0-9_$]+(?:\s*<[^>]+>)?\s*=\s*[^;]+;/g, (match) => {
    const lineCount = (match.match(/\n/g) || []).length;
    return "\n".repeat(lineCount);
  });

  // 3. Remove enum declarations: enum Color { Red, Green } -> const Color = { Red: 0, Green: 1 }
  js = js.replace(/(?:export\s+)?enum\s+([A-Za-z0-9_$]+)\s*\{([^}]*)\}/g, (_match, name, body) => {
    const items = body.split(",").map((s) => s.trim()).filter(Boolean);
    const props = items.map((item, idx) => {
      if (item.includes("=")) {
        return item;
      }
      return `${item}: ${idx}`;
    }).join(", ");
    return `const ${name} = { ${props} };`;
  });

  // 4. Remove access modifiers: public, private, protected, readonly
  js = js.replace(/\b(public|private|protected|readonly)\s+/g, "");

  // 5. Remove "as <Type>" assertions: x as string, (x as any)
  js = js.replace(/\s+as\s+[A-Za-z0-9_$<>\[\]|&\s]+(?=[,;\)\}\]]|$)/g, "");

  // 6. Remove generic type arguments from function calls / definitions: fn<T>(x)
  js = js.replace(/<[A-Za-z0-9_$,\s|&<>[\]]+>(?=\s*\()/g, "");

  // 7. Remove variable type annotations: let x: number = 5 -> let x = 5
  // Matches let/const/var followed by identifier, colon, type, and equals or semicolon
  js = js.replace(/\b(let|const|var)\s+([A-Za-z0-9_$]+)\s*:\s*[A-Za-z0-9_$<>\[\]|&\s]+(?=\s*(=|;|,))/g, "$1 $2");

  // 8. Remove function return type annotations: (): void => / ): number {
  js = js.replace(/(\([^)]*\))\s*:\s*[A-Za-z0-9_$<>\[\]|&\s]+(\s*\{|\s*=>)/g, "$1$2");

  // 9. Remove parameter type annotations exclusively inside parameter lists: (a: number, b: string) -> (a, b)
  js = js.replace(/\(([^)]*)\)/g, (fullMatch, params) => {
    // Only strip type annotations inside the parentheses
    const cleanParams = params.replace(/([A-Za-z0-9_$]+)\??\s*:\s*[^,)=]+/g, "$1");
    return `(${cleanParams})`;
  });

  // 10. Remove non-null assertion operator: x!.foo -> x.foo
  js = js.replace(/([A-Za-z0-9_$\]\)])!(\.[A-Za-z0-9_$]|\()/g, "$1$2");

  // Validate resulting JavaScript syntax with Acorn
  try {
    acorn.parse(js, {
      ecmaVersion: 2022,
      sourceType: "script",
      locations: true,
    });
    return { code: js, error: null };
  } catch (err) {
    const line = err.loc?.line ?? 1;
    const column = (err.loc?.column ?? 0) + 1;
    const cleanMsg = (err.message || "TypeScript compilation syntax error").replace(/\s*\(\d+:\d+\)$/, "");
    return {
      code: "",
      error: {
        name: "SyntaxError",
        message: cleanMsg,
        line,
        column,
        kind: "compilation",
        stack: [{ fnName: "(typescript compiler)", line, column }],
        exitCode: 1,
      },
    };
  }
}

/**
 * Validates balanced braces, parentheses, and brackets in source code.
 */
function checkBracketBalance(code) {
  const stack = [];
  const lines = code.split("\n");
  for (let l = 0; l < lines.length; l++) {
    const line = lines[l];
    let inString = false;
    let stringChar = "";
    for (let c = 0; c < line.length; c++) {
      const ch = line[c];
      if (inString) {
        if (ch === stringChar && line[c - 1] !== "\\") {
          inString = false;
        }
        continue;
      }
      if (ch === '"' || ch === "'" || ch === "`") {
        inString = true;
        stringChar = ch;
        continue;
      }
      if (ch === "/" && line[c + 1] === "/") {
        break; // skip comments
      }
      if (ch === "(" || ch === "{" || ch === "[") {
        stack.push({ ch, line: l + 1, col: c + 1 });
      } else if (ch === ")" || ch === "}" || ch === "]") {
        if (stack.length === 0) {
          return {
            name: "SyntaxError",
            message: `Unexpected closing '${ch}'`,
            line: l + 1,
            column: c + 1,
            kind: "compilation",
            exitCode: 1,
          };
        }
        const top = stack.pop();
        const matches = (top.ch === "(" && ch === ")") || (top.ch === "{" && ch === "}") || (top.ch === "[" && ch === "]");
        if (!matches) {
          return {
            name: "SyntaxError",
            message: `Mismatched closing bracket '${ch}', expected match for '${top.ch}' from line ${top.line}`,
            line: l + 1,
            column: c + 1,
            kind: "compilation",
            exitCode: 1,
          };
        }
      }
    }
  }

  if (stack.length > 0) {
    const unclosed = stack[stack.length - 1];
    return {
      name: "SyntaxError",
      message: `Unclosed bracket '${unclosed.ch}' opened at line ${unclosed.line}:${unclosed.col}`,
      line: unclosed.line,
      column: unclosed.col,
      kind: "compilation",
      exitCode: 1,
    };
  }

  return null;
}

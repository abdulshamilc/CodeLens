// src/tools/dbv/editor/editorScope.js
// Scope analyzer and type inference for CodeMirror 6 using tolerant acorn AST

import * as acornLoose from "acorn-loose";
import { BUILTIN_MEMBERS, GLOBAL_IDENTIFIERS } from "./editorBuiltins";

export function inferTypeFromNode(init) {
  if (!init) return "any";
  switch (init.type) {
    case "ArrayExpression":
      return "Array";
    case "Literal":
      if (typeof init.value === "string") return "String";
      if (typeof init.value === "number") return "number";
      if (typeof init.value === "boolean") return "boolean";
      return "any";
    case "ObjectExpression":
      return {
        type: "Object",
        properties: (init.properties || [])
          .filter((p) => p.type === "Property" && p.key)
          .map((p) => p.key.name || String(p.key.value)),
      };
    case "NewExpression":
      if (init.callee?.name) {
        return init.callee.name;
      }
      return "object";
    case "ArrowFunctionExpression":
    case "FunctionExpression":
      return "Function";
    case "CallExpression":
      if (init.callee?.name === "fetch") return "Promise";
      return "any";
    default:
      return "any";
  }
}

export function parseScope(code, pos = 0) {
  let ast;
  try {
    ast = acornLoose.parse(code, { locations: true, ecmaVersion: 2022 });
  } catch {
    return { variables: new Map(), functions: new Map(), classes: new Map() };
  }

  const variables = new Map();
  const functions = new Map();
  const classes = new Map();

  function walk(node, enclosingFn = null) {
    if (!node || typeof node !== "object") return;

    if (node.type === "FunctionDeclaration" && node.id?.name) {
      const params = (node.params || []).map((p) => p.name || "param");
      functions.set(node.id.name, {
        name: node.id.name,
        params,
        loc: node.loc,
        doc: `function ${node.id.name}(${params.join(", ")})`,
      });
      // Inside this function, walk with enclosingFn set
      if (node.body) {
        for (const p of node.params || []) {
          if (p.name && (!pos || (node.start <= pos && pos <= node.end))) {
            variables.set(p.name, {
              name: p.name,
              kind: "param",
              inferred: "any",
              loc: p.loc,
              line: p.loc?.start?.line,
            });
          }
        }
        walk(node.body, node);
      }
      return;
    }

    if (node.type === "ClassDeclaration" && node.id?.name) {
      const methods = [];
      if (node.body?.body) {
        for (const member of node.body.body) {
          if (member.type === "MethodDefinition" && member.key?.name) {
            methods.push(member.key.name);
          }
        }
      }
      classes.set(node.id.name, {
        name: node.id.name,
        methods,
        loc: node.loc,
      });
    }

    if (node.type === "VariableDeclaration") {
      const kind = node.kind || "var";
      for (const decl of node.declarations || []) {
        if (decl.id?.name) {
          const inferred = inferTypeFromNode(decl.init);
          variables.set(decl.id.name, {
            name: decl.id.name,
            kind,
            inferred,
            loc: decl.loc,
            line: decl.loc?.start?.line,
            initNode: decl.init,
          });
        }
      }
    }

    // Recursively walk child nodes
    for (const key of Object.keys(node)) {
      if (key === "loc" || key === "start" || key === "end") continue;
      const child = node[key];
      if (Array.isArray(child)) {
        for (const c of child) walk(c, enclosingFn);
      } else if (child && typeof child === "object") {
        walk(child, enclosingFn);
      }
    }
  }

  walk(ast);
  return { variables, functions, classes };
}

export function getMemberCompletions(code, pos, expr) {
  if (!expr) return [];
  const cleanExpr = expr.trim().replace(/\?$/, "");

  // 1. Direct built-in object check: console, Math, JSON, Promise, Array, etc.
  if (BUILTIN_MEMBERS[cleanExpr]) {
    return BUILTIN_MEMBERS[cleanExpr].map((m) => ({
      label: m.label,
      type: m.type,
      detail: m.detail,
      info: m.info,
      boost: 95,
    }));
  }

  // 2. Check local scope variables
  const { variables, classes } = parseScope(code, pos);
  const variable = variables.get(cleanExpr);

  if (variable) {
    const inferred = variable.inferred;

    if (inferred === "Array" || Array.isArray(inferred)) {
      return (BUILTIN_MEMBERS.Array || []).map((m) => ({
        label: m.label,
        type: m.type,
        detail: m.detail,
        info: m.info,
        boost: 95,
      }));
    }

    if (inferred === "String") {
      return (BUILTIN_MEMBERS.String || []).map((m) => ({
        label: m.label,
        type: m.type,
        detail: m.detail,
        info: m.info,
        boost: 95,
      }));
    }

    if (inferred === "Promise") {
      return (BUILTIN_MEMBERS.Promise || []).map((m) => ({
        label: m.label,
        type: m.type,
        detail: m.detail,
        info: m.info,
        boost: 95,
      }));
    }

    if (inferred === "Map") {
      return (BUILTIN_MEMBERS.Map || []).map((m) => ({
        label: m.label,
        type: m.type,
        detail: m.detail,
        info: m.info,
        boost: 95,
      }));
    }

    if (inferred === "Set") {
      return (BUILTIN_MEMBERS.Set || []).map((m) => ({
        label: m.label,
        type: m.type,
        detail: m.detail,
        info: m.info,
        boost: 95,
      }));
    }

    if (typeof inferred === "object" && inferred.type === "Object") {
      return (inferred.properties || []).map((prop) => ({
        label: prop,
        type: "property",
        detail: "property",
        info: `Property of object ${cleanExpr}`,
        boost: 95,
      }));
    }

    if (typeof inferred === "string" && classes.has(inferred)) {
      const cls = classes.get(inferred);
      return (cls.methods || []).map((m) => ({
        label: m,
        type: "method",
        detail: "method",
        info: `Method of class ${inferred}`,
        boost: 95,
      }));
    }
  }

  // 3. Fallback: Array & Object prototype members
  return (BUILTIN_MEMBERS.Array || []).slice(0, 10).map((m) => ({
    label: m.label,
    type: m.type,
    detail: m.detail,
    info: m.info,
    boost: 70,
  }));
}

export function getHoverInfo(code, pos, word) {
  if (!word) return null;

  // 1. Built-in global check
  const globalItem = GLOBAL_IDENTIFIERS.find((g) => g.label === word);
  if (globalItem) {
    return {
      title: `${word}: ${globalItem.detail}`,
      subtitle: `Built-in global ${globalItem.type}`,
      description: globalItem.info,
    };
  }

  // 2. Math / Console static check
  if (BUILTIN_MEMBERS.console.some((m) => m.label === word)) {
    const m = BUILTIN_MEMBERS.console.find((m) => m.label === word);
    return {
      title: `console.${word}${m.detail}`,
      subtitle: "Built-in Console method",
      description: m.info,
    };
  }
  if (BUILTIN_MEMBERS.Math.some((m) => m.label === word)) {
    const m = BUILTIN_MEMBERS.Math.find((m) => m.label === word);
    return {
      title: `Math.${word}${m.detail}`,
      subtitle: "Built-in Math member",
      description: m.info,
    };
  }

  // 3. Local scope check
  const { variables, functions, classes } = parseScope(code, pos);

  if (functions.has(word)) {
    const fn = functions.get(word);
    return {
      title: `function ${fn.name}(${fn.params.join(", ")})`,
      subtitle: fn.loc?.start?.line ? `Declared on line ${fn.loc.start.line}` : "User function",
      description: `User-defined function with ${fn.params.length} parameter(s).`,
    };
  }

  if (variables.has(word)) {
    const v = variables.get(word);
    const typeLabel = typeof v.inferred === "string" ? v.inferred : "Object";
    return {
      title: `(${v.kind}) ${v.name}: ${typeLabel}`,
      subtitle: v.line ? `Declared on line ${v.line}` : "Local variable",
      description: `Inferred type: ${typeLabel}. Declared with keyword '${v.kind}'.`,
    };
  }

  if (classes.has(word)) {
    const c = classes.get(word);
    return {
      title: `class ${c.name}`,
      subtitle: c.loc?.start?.line ? `Declared on line ${c.loc.start.line}` : "User class",
      description: `Methods: ${(c.methods || []).join(", ") || "(none)"}`,
    };
  }

  return null;
}

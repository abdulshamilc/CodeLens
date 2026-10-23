// src/tools/dbv/editor/editorLinter.js
// VS Code-style linter using Acorn and Acorn-Walk:
// Detects syntax errors, const reassignments, TDZ accesses, unreachable code, and infinite loops.
// Exposes diagnostics to CodeMirror 6 squiggles & gutter and to the DBV Problems tab.

import * as acorn from "acorn";
import * as walk from "acorn-walk";
import { linter, lintGutter } from "@codemirror/lint";

/**
 * Perform static analysis on JavaScript code and return an array of diagnostics.
 * @param {string} code
 * @returns {Array<{ from: number, to: number, line: number, col: number, severity: "error"|"warning"|"info", message: string, id: string }>}
 */
export function lintCode(code) {
  if (!code || typeof code !== "string") return [];

  const diagnostics = [];

  let ast = null;
  // 1. Try parsing with ES2022 module, then script
  try {
    ast = acorn.parse(code, {
      ecmaVersion: 2022,
      sourceType: "module",
      locations: true,
      ranges: true,
    });
  } catch (err1) {
    try {
      ast = acorn.parse(code, {
        ecmaVersion: 2022,
        sourceType: "script",
        locations: true,
        ranges: true,
      });
    } catch (err) {
      // Syntax error encountered
      const pos = typeof err.pos === "number" ? err.pos : 0;
      const cleanMsg = (err.message || "Syntax error").replace(/\s*\(\d+:\d+\)$/, "");
      const from = Math.max(0, Math.min(pos, code.length));
      const to = Math.min(pos + 1, code.length);

      diagnostics.push({
        id: `syntax-${pos}`,
        from: from === to && from > 0 ? from - 1 : from,
        to: Math.max(from + 1, to),
        line: err.loc?.line ?? 1,
        col: (err.loc?.column ?? 0) + 1,
        severity: "error",
        message: cleanMsg,
        source: "Syntax",
      });
      return diagnostics;
    }
  }

  if (!ast) return diagnostics;

  // 2. Semantic Analysis on Valid AST

  // A. Unreachable code detection
  function checkUnreachable(statements) {
    if (!Array.isArray(statements)) return;
    let terminated = false;
    let termNode = null;

    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      if (!stmt) continue;

      if (terminated) {
        // Find line number
        const line = stmt.loc?.start?.line ?? 1;
        const col = (stmt.loc?.start?.column ?? 0) + 1;
        diagnostics.push({
          id: `unreachable-${stmt.start}`,
          from: stmt.start,
          to: stmt.end,
          line,
          col,
          severity: "warning",
          message: `Unreachable code detected following '${termNode?.type || "termination"}'.`,
          source: "Linter",
        });
        // Report first unreachable block/statement only per sequence
        break;
      }

      if (
        stmt.type === "ReturnStatement" ||
        stmt.type === "ThrowStatement" ||
        stmt.type === "BreakStatement" ||
        stmt.type === "ContinueStatement"
      ) {
        terminated = true;
        termNode = stmt;
      }
    }
  }

  // B. Infinite loop detection
  function hasLoopExit(node) {
    let hasExit = false;
    walk.simple(node, {
      BreakStatement(bNode) {
        // Any unlabelled break or exit
        hasExit = true;
      },
      ReturnStatement() {
        hasExit = true;
      },
      ThrowStatement() {
        hasExit = true;
      },
    });
    return hasExit;
  }

  // C. Scope building for TDZ and const reassignment
  // Build a tree of lexical scopes
  class Scope {
    constructor(parent = null, isFunction = false) {
      this.parent = parent;
      this.isFunction = isFunction;
      // Map name -> { kind: "const"|"let"|"var", startPos, line, col }
      this.bindings = new Map();
    }

    add(name, kind, startPos, line, col) {
      this.bindings.set(name, { kind, startPos, line, col });
    }

    find(name) {
      if (this.bindings.has(name)) return this.bindings.get(name);
      if (this.parent) return this.parent.find(name);
      return null;
    }

    findInCurrentBlock(name) {
      return this.bindings.get(name) || null;
    }
  }

  // Traverse and gather diagnostics
  walk.ancestor(ast, {
    BlockStatement(node) {
      checkUnreachable(node.body);
    },
    Program(node) {
      checkUnreachable(node.body);
    },
    SwitchCase(node) {
      checkUnreachable(node.consequent);
    },
    WhileStatement(node) {
      const isAlwaysTrue =
        (node.test.type === "Literal" && (node.test.value === true || node.test.value === 1)) ||
        (node.test.type === "Identifier" && node.test.name === "true");

      if (isAlwaysTrue && !hasLoopExit(node.body)) {
        diagnostics.push({
          id: `infloop-${node.start}`,
          from: node.start,
          to: node.test.end,
          line: node.loc?.start?.line ?? 1,
          col: (node.loc?.start?.column ?? 0) + 1,
          severity: "warning",
          message: "Potential infinite loop: 'while (true)' contains no break, return, or throw.",
          source: "Linter",
        });
      }
    },
    ForStatement(node) {
      const isForever =
        !node.test ||
        (node.test.type === "Literal" && (node.test.value === true || node.test.value === 1));

      if (isForever && !hasLoopExit(node.body)) {
        diagnostics.push({
          id: `infloop-${node.start}`,
          from: node.start,
          to: node.body.start,
          line: node.loc?.start?.line ?? 1,
          col: (node.loc?.start?.column ?? 0) + 1,
          severity: "warning",
          message: "Potential infinite loop: 'for (;;)' contains no break, return, or throw.",
          source: "Linter",
        });
      }
    },
  });

  // Track scopes for Const Reassignment & TDZ
  function analyzeScopeTree(rootNode) {
    // Pass 1: Collect declarations for each BlockStatement/Program/Function
    // Map node -> Scope
    const nodeScopes = new Map();

    function createScopeFor(node, parentScope, isFunction = false) {
      const scope = new Scope(parentScope, isFunction);
      nodeScopes.set(node, scope);

      const bodyList =
        node.type === "BlockStatement" || node.type === "Program"
          ? node.body
          : node.body?.type === "BlockStatement"
          ? node.body.body
          : [];

      // Pre-register declarations in this lexical block
      for (const stmt of bodyList) {
        if (stmt.type === "VariableDeclaration") {
          for (const decl of stmt.declarations) {
            if (decl.id.type === "Identifier") {
              const name = decl.id.name;
              const line = decl.id.loc?.start?.line ?? 1;
              const col = (decl.id.loc?.start?.column ?? 0) + 1;
              scope.add(name, stmt.kind, stmt.start, line, col);
            }
          }
        } else if (stmt.type === "FunctionDeclaration" && stmt.id) {
          scope.add(
            stmt.id.name,
            "function",
            stmt.start,
            stmt.id.loc?.start?.line ?? 1,
            (stmt.id.loc?.start?.column ?? 0) + 1
          );
        }
      }

      // If function, add params
      if (node.params) {
        for (const param of node.params) {
          if (param.type === "Identifier") {
            scope.add(
              param.name,
              "var",
              param.start,
              param.loc?.start?.line ?? 1,
              (param.loc?.start?.column ?? 0) + 1
            );
          }
        }
      }

      return scope;
    }

    const globalScope = createScopeFor(rootNode, null, true);
    const scopeStack = [globalScope];

    function currentScope() {
      return scopeStack[scopeStack.length - 1];
    }

    walk.ancestor(rootNode, {
      BlockStatement(node, ancestors) {
        // Handled via custom visitor
      },
      Function(node) {
        // Handled via custom visitor
      },
    });

    // Walk with proper scope push/pop
    walk.full(rootNode, (node) => {
      if (
        node.type === "FunctionDeclaration" ||
        node.type === "FunctionExpression" ||
        node.type === "ArrowFunctionExpression"
      ) {
        const fnScope = createScopeFor(node, currentScope(), true);
        scopeStack.push(fnScope);
      } else if (node.type === "BlockStatement") {
        const blkScope = createScopeFor(node, currentScope(), false);
        scopeStack.push(blkScope);
      }

      // Assignment / Update expressions (Const reassignment check)
      if (node.type === "AssignmentExpression") {
        const target = node.left;
        if (target.type === "Identifier") {
          const binding = currentScope().find(target.name);
          if (binding && binding.kind === "const") {
            diagnostics.push({
              id: `const-reassign-${target.start}`,
              from: target.start,
              to: target.end,
              line: target.loc?.start?.line ?? 1,
              col: (target.loc?.start?.column ?? 0) + 1,
              severity: "error",
              message: `TypeError: Assignment to constant variable '${target.name}'.`,
              source: "Linter",
            });
          }
        }
      } else if (node.type === "UpdateExpression") {
        const target = node.argument;
        if (target.type === "Identifier") {
          const binding = currentScope().find(target.name);
          if (binding && binding.kind === "const") {
            diagnostics.push({
              id: `const-update-${target.start}`,
              from: target.start,
              to: target.end,
              line: target.loc?.start?.line ?? 1,
              col: (target.loc?.start?.column ?? 0) + 1,
              severity: "error",
              message: `TypeError: Assignment to constant variable '${target.name}'.`,
              source: "Linter",
            });
          }
        }
      }

      // TDZ check: Identifier read within same scope block before declaration position
      if (node.type === "Identifier") {
        const name = node.name;
        const binding = currentScope().findInCurrentBlock(name);
        if (binding && (binding.kind === "let" || binding.kind === "const")) {
          // If referenced before its declaration statement begins
          if (node.start < binding.startPos) {
            diagnostics.push({
              id: `tdz-${node.start}`,
              from: node.start,
              to: node.end,
              line: node.loc?.start?.line ?? 1,
              col: (node.loc?.start?.column ?? 0) + 1,
              severity: "error",
              message: `ReferenceError: Cannot access '${name}' before initialization (TDZ).`,
              source: "Linter",
            });
          }
        }
      }

      // Scope exit
      if (
        node.type === "FunctionDeclaration" ||
        node.type === "FunctionExpression" ||
        node.type === "ArrowFunctionExpression" ||
        node.type === "BlockStatement"
      ) {
        if (scopeStack.length > 1) {
          scopeStack.pop();
        }
      }
    });
  }

  try {
    analyzeScopeTree(ast);
  } catch {
    // Tolerant failure
  }

  // Sort diagnostics by line, then column
  diagnostics.sort((a, b) => a.from - b.from);
  return diagnostics;
}

/**
 * Creates CodeMirror 6 linter extension with lintGutter and diagnostics callback
 * @param {Function} [onDiagnosticsChange] Callback receiving updated diagnostics
 * @returns {Array<import("@codemirror/state").Extension>}
 */
export function createEditorLinter(onDiagnosticsChange) {
  let lastReported = null;

  const lintExtension = linter(
    (view) => {
      const doc = view.state.doc.toString();
      const diags = lintCode(doc);

      // Notify external listeners (e.g. Problems tab) if changed
      const serialized = JSON.stringify(diags.map((d) => d.id));
      if (serialized !== lastReported) {
        lastReported = serialized;
        onDiagnosticsChange?.(diags);
      }

      return diags.map((d) => ({
        from: d.from,
        to: d.to,
        severity: d.severity,
        message: d.message,
      }));
    },
    { delay: 300 }
  );

  return [lintExtension, lintGutter()];
}

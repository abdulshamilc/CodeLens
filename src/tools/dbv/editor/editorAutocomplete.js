// src/tools/dbv/editor/editorAutocomplete.js
// Scope-aware autocomplete, member completions, snippets, and signature help

import { autocompletion } from "@codemirror/autocomplete";
import { parseScope, getMemberCompletions } from "./editorScope";
import { GLOBAL_IDENTIFIERS, JS_KEYWORDS, BUILTIN_MEMBERS } from "./editorBuiltins";
import { SNIPPETS } from "./editorSnippets";

export function editorCompletionSource(context) {
  const { state, pos, explicit } = context;
  const line = state.doc.lineAt(pos);
  const textBefore = line.text.slice(0, pos - line.from);

  // 1. Member completion: after '.' or '?.'
  const dotMatch = textBefore.match(/([a-zA-Z_$][a-zA-Z0-9_$]*)\s*(\??\.)\s*([a-zA-Z0-9_$]*)$/);
  if (dotMatch) {
    const expr = dotMatch[1];
    const memberPrefix = dotMatch[3] || "";
    const from = pos - memberPrefix.length;
    const docText = state.doc.toString();
    const members = getMemberCompletions(docText, pos, expr);

    return {
      from,
      options: members,
      validFor: /^[a-zA-Z0-9_$]*$/,
    };
  }

  // 2. Identifier & Keyword & Snippet completion
  const word = context.matchBefore(/[a-zA-Z_$][a-zA-Z0-9_$]*/);
  if (!word && !explicit) return null;

  const docText = state.doc.toString();
  const { variables, functions, classes } = parseScope(docText, pos);

  const localOptions = [];

  // Local variables
  for (const [name, v] of variables.entries()) {
    const typeLabel = typeof v.inferred === "string" ? v.inferred : "Object";
    localOptions.push({
      label: name,
      type: v.kind === "const" ? "constant" : "variable",
      detail: typeLabel,
      info: `Local ${v.kind} (line ${v.line || "?"})`,
      boost: 100,
    });
  }

  // Local functions
  for (const [name, fn] of functions.entries()) {
    localOptions.push({
      label: name,
      type: "function",
      detail: `(${fn.params.join(", ")}) => any`,
      info: fn.doc,
      boost: 98,
    });
  }

  // Local classes
  for (const [name, cls] of classes.entries()) {
    localOptions.push({
      label: name,
      type: "class",
      detail: "class",
      info: `User class with ${cls.methods.length} method(s)`,
      boost: 97,
    });
  }

  const from = word ? word.from : pos;

  return {
    from,
    options: [
      ...localOptions,
      ...GLOBAL_IDENTIFIERS.map((g) => ({ ...g, boost: 85 })),
      ...JS_KEYWORDS,
      ...SNIPPETS,
    ],
    validFor: /^[a-zA-Z_$][a-zA-Z0-9_$]*$/,
  };
}

export function createAutocompleteExtension() {
  return autocompletion({
    override: [editorCompletionSource],
    defaultKeymap: true,
    icons: true,
    addToOptions: [
      {
        render: (completion) => {
          const dom = document.createElement("div");
          dom.className = "cm-completion-preview";
          return dom;
        },
        position: 80,
      },
    ],
  });
}

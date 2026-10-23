// src/tools/dbv/editor/editorBreakpoints.js
// CodeMirror 6 breakpoint StateField, gutter, and marker extension

import { StateField, StateEffect, RangeSetBuilder } from "@codemirror/state";
import { gutter, GutterMarker } from "@codemirror/view";

export const setBreakpointsEffect = StateEffect.define();

export class BreakpointMarker extends GutterMarker {
  constructor(active = true) {
    super();
    this.active = active;
  }

  toDOM() {
    const el = document.createElement("div");
    el.className = "cm-breakpoint-dot";
    el.setAttribute("role", "button");
    el.setAttribute("aria-label", "Breakpoint");
    el.title = "Click line number or dot to toggle breakpoint";
    el.innerHTML = `
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg" style="display:block;margin:auto">
        <circle cx="6" cy="6" r="5" fill="#ef4444" stroke="#b91c1c" stroke-width="1"/>
      </svg>
    `;
    return el;
  }
}

export const breakpointField = StateField.define({
  create() {
    return new Set();
  },
  update(breakpoints, tr) {
    for (const effect of tr.effects) {
      if (effect.is(setBreakpointsEffect)) {
        return new Set(effect.value);
      }
    }
    if (tr.docChanged && breakpoints.size > 0) {
      // Map line numbers through document changes
      const updated = new Set();
      for (const lineNum of breakpoints) {
        try {
          // If line still exists, keep it
          if (lineNum <= tr.newDoc.lines) {
            updated.add(lineNum);
          }
        } catch {
          // line deleted
        }
      }
      return updated;
    }
    return breakpoints;
  },
});

export function createBreakpointGutter(onToggle) {
  return gutter({
    class: "cm-breakpoint-gutter",
    markers: (view) => {
      const bps = view.state.field(breakpointField, false) || new Set();
      const builder = new RangeSetBuilder();
      const sorted = Array.from(bps).sort((a, b) => a - b);
      for (const lineNum of sorted) {
        if (lineNum >= 1 && lineNum <= view.state.doc.lines) {
          try {
            const line = view.state.doc.line(lineNum);
            builder.add(line.from, line.from, new BreakpointMarker(true));
          } catch {
            // line out of range
          }
        }
      }
      return builder.finish();
    },
    domEventHandlers: {
      mousedown: (view, line, _event) => {
        const lineNum = view.state.doc.lineAt(line.from).number;
        if (onToggle) {
          onToggle(lineNum);
        }
        return true;
      },
    },
  });
}

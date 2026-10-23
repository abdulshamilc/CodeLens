import { hoverTooltip } from "@codemirror/view";
import { getHoverInfo } from "./editorScope";
import { errorLineField } from "./editorTheme";

export function createHoverExtension() {
  return hoverTooltip((view, pos, side) => {
    // Check runtime/parse error on this line first
    const err = view.state.field(errorLineField, false);
    if (err && err.line && err.line >= 1 && err.line <= view.state.doc.lines) {
      const lineObj = view.state.doc.line(err.line);
      if (pos >= lineObj.from && pos <= lineObj.to) {
        const startCol = Math.max(1, err.column || 1);
        const fromPos = Math.min(lineObj.from + (startCol - 1), lineObj.to);
        let toPos = lineObj.to;
        if (err.endLine === err.line && err.endColumn) {
          toPos = Math.min(lineObj.from + (err.endColumn - 1), lineObj.to);
        }
        if (toPos <= fromPos) toPos = Math.min(fromPos + 1, lineObj.to);

        if (pos >= fromPos - 2 && pos <= toPos + 2) {
          const errMsg = typeof err === "object" ? `${err.name}: ${err.message}` : String(err);
          return {
            pos: fromPos,
            end: toPos,
            above: true,
            create() {
              const dom = document.createElement("div");
              dom.className = "cm-vscode-hover-tooltip cm-error-hover-tooltip";
              dom.style.padding = "8px 12px";
              dom.style.fontSize = "12px";
              dom.style.lineHeight = "1.5";
              dom.style.maxWidth = "380px";
              dom.style.background = "#1e1e24";
              dom.style.border = "1px solid #ef4444";
              dom.style.borderRadius = "8px";
              dom.style.boxShadow = "0 10px 25px -5px rgba(239, 68, 68, 0.25)";
              dom.style.color = "#fecaca";
              dom.style.fontFamily = "inherit";

              dom.innerHTML = `
                <div style="font-family: monospace; font-weight: 600; color: #f87171; display: flex; align-items: center; gap: 6px;">
                  <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#ef4444;"></span>
                  ${escapeHtml(err.name || "Error")}
                </div>
                <div style="color: #fca5a5; font-size: 11px; margin-top: 3px;">
                  ${escapeHtml(err.message || errMsg)}
                </div>
              `;
              return { dom };
            },
          };
        }
      }
    }

    const { from, to, text } = view.state.doc.lineAt(pos);
    const lineOffset = pos - from;

    // Find word boundaries around the cursor
    let start = lineOffset;
    let end = lineOffset;
    while (start > 0 && /[a-zA-Z0-9_$]/.test(text[start - 1])) start--;
    while (end < text.length && /[a-zA-Z0-9_$]/.test(text[end])) end++;

    if (start === end) return null;

    const word = text.slice(start, end);
    const docText = view.state.doc.toString();
    const info = getHoverInfo(docText, pos, word);

    if (!info) return null;

    return {
      pos: from + start,
      end: from + end,
      above: true,
      create() {
        const dom = document.createElement("div");
        dom.className = "cm-vscode-hover-tooltip";
        dom.style.padding = "8px 12px";
        dom.style.fontSize = "12px";
        dom.style.lineHeight = "1.5";
        dom.style.maxWidth = "360px";
        dom.style.background = "rgb(var(--color-surface, 30, 41, 59))";
        dom.style.border = "1px solid rgba(var(--color-border, 148, 163, 184), 0.5)";
        dom.style.borderRadius = "8px";
        dom.style.boxShadow = "0 10px 25px -5px rgba(0, 0, 0, 0.4)";
        dom.style.color = "rgb(var(--color-text, 241, 245, 249))";
        dom.style.fontFamily = "inherit";

        dom.innerHTML = `
          <div style="font-family: monospace; font-weight: 600; color: #818cf8; margin-bottom: 2px;">
            ${escapeHtml(info.title)}
          </div>
          <div style="font-size: 10px; color: #94a3b8; text-transform: uppercase; tracking: 0.05em; margin-bottom: 4px;">
            ${escapeHtml(info.subtitle)}
          </div>
          <div style="color: #cbd5e1; font-size: 11px;">
            ${escapeHtml(info.description)}
          </div>
        `;

        return { dom };
      },
    };
  });
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

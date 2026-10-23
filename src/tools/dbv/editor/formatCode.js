// src/tools/dbv/editor/formatCode.js
// Offline standalone Prettier code formatter for JavaScript

export async function formatCode(code, tabWidth = 2) {
  if (!code || typeof code !== "string") return code;
  try {
    const [prettier, babelPlugin, estreePlugin] = await Promise.all([
      import("prettier/standalone"),
      import("prettier/plugins/babel"),
      import("prettier/plugins/estree"),
    ]);

    const formatFn = prettier.format || prettier.default?.format;
    const formatted = await formatFn(code, {
      parser: "babel",
      plugins: [babelPlugin.default || babelPlugin, estreePlugin.default || estreePlugin],
      singleQuote: false,
      tabWidth: tabWidth || 2,
      semi: true,
      bracketSpacing: true,
      arrowParens: "always",
    });

    return formatted;
  } catch (err) {
    console.warn("CodeLens: Prettier format document skipped/failed:", err?.message || err);
    return code;
  }
}

// src/tools/dbv/utils/varColors.js
// Consistent deterministic color assignment for user variable names using the 8-color palette

const BUILT_IN_NAMES = new Set([
  "console",
  "undefined",
  "NaN",
  "Infinity",
  "parseInt",
  "parseFloat",
  "isNaN",
  "isFinite",
  "String",
  "Number",
  "Boolean",
  "Array",
  "Object",
  "Math",
  "JSON",
  "setTimeout",
  "Promise",
  "__fnData",
]);

/**
 * Check if an identifier is user-declared
 * @param {string} name
 * @returns {boolean}
 */
export function isUserVariable(name) {
  return !BUILT_IN_NAMES.has(name) && !name.startsWith("__");
}

/**
 * Deterministically map any variable name to one of the 8 semantic var-palette variables
 * @param {string} name
 * @returns {string}
 */
export function getVarColorVar(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash << 5) - hash + name.charCodeAt(i);
    hash |= 0;
  }
  const index = (Math.abs(hash) % 8) + 1;
  return `rgb(var(--color-var-${index}))`;
}

// src/tools/dbv/engine/nativeSerializer.js
// Safe, circular-reference proof console argument serializer with format specifiers
// Supports Map, Set, Error, Date, RegExp, Class instances, Functions, BigInt, Symbol

/**
 * Format and serialize arguments passed to console methods
 * @param {Array<any>} rawArgs
 * @returns {Array<string>} Formatted string arguments
 */
export function serializeConsoleArgs(rawArgs) {
  if (!rawArgs || rawArgs.length === 0) return [""];

  // Handle printf-style formatting if first arg is a string with specifiers: %s, %d, %i, %f, %o, %O, %%
  const first = rawArgs[0];
  if (typeof first === "string" && /%[sdifoO%]/.test(first)) {
    let argIdx = 1;
    const formatted = first.replace(/%([sdifoO%])/g, (match, specifier) => {
      if (specifier === "%") return "%";
      if (argIdx >= rawArgs.length) return match;
      const val = rawArgs[argIdx++];
      switch (specifier) {
        case "s":
          return String(val);
        case "d":
        case "i":
          return parseInt(val, 10);
        case "f":
          return parseFloat(val);
        case "o":
        case "O":
          return stringifyValue(val, new WeakSet(), 0);
        default:
          return match;
      }
    });

    const remaining = rawArgs.slice(argIdx).map((a) => stringifyValue(a, new WeakSet(), 0));
    return [formatted, ...remaining];
  }

  return rawArgs.map((arg) => stringifyValue(arg, new WeakSet(), 0));
}

/**
 * Recursively stringify a value with cycle protection and depth limit
 * @param {any} val
 * @param {WeakSet} seen
 * @param {number} depth
 * @returns {string}
 */
export function stringifyValue(val, seen = new WeakSet(), depth = 0) {
  if (val === undefined) return "undefined";
  if (val === null) return "null";
  if (typeof val === "boolean" || typeof val === "number") return String(val);
  if (typeof val === "bigint") return `${val}n`;
  if (typeof val === "symbol") return val.toString();
  if (typeof val === "string") return depth === 0 ? val : JSON.stringify(val);

  if (typeof val === "function") {
    const fnName = val.name || "(anonymous)";
    return `[Function: ${fnName}]`;
  }

  if (val instanceof Error) {
    return val.stack ? val.stack.split("\n")[0] : `${val.name}: ${val.message}`;
  }

  if (val instanceof Date) {
    return isNaN(val.getTime()) ? "Invalid Date" : val.toISOString();
  }

  if (val instanceof RegExp) {
    return val.toString();
  }

  if (val instanceof Promise) {
    return "Promise { <pending> }";
  }

  if (typeof val === "object") {
    if (seen.has(val)) {
      return "[Circular]";
    }
    seen.add(val);

    if (depth >= 4) {
      return Array.isArray(val) ? "[Array]" : "[Object]";
    }

    // Handle Map
    if (val instanceof Map) {
      const entries = [];
      let count = 0;
      for (const [k, v] of val.entries()) {
        if (count++ > 50) {
          entries.push("... (more items)");
          break;
        }
        entries.push(`${stringifyValue(k, seen, depth + 1)} => ${stringifyValue(v, seen, depth + 1)}`);
      }
      return `Map(${val.size}) { ${entries.join(", ")} }`;
    }

    // Handle Set
    if (val instanceof Set) {
      const items = [];
      let count = 0;
      for (const v of val.values()) {
        if (count++ > 50) {
          items.push("... (more items)");
          break;
        }
        items.push(stringifyValue(v, seen, depth + 1));
      }
      return `Set(${val.size}) { ${items.join(", ")} }`;
    }

    // Handle Array
    if (Array.isArray(val)) {
      if (val.length === 0) return "[]";
      const items = val
        .slice(0, 100)
        .map((item) => stringifyValue(item, seen, depth + 1));
      if (val.length > 100) items.push(`... ${val.length - 100} more items`);
      return `[ ${items.join(", ")} ]`;
    }

    // Custom class instance or plain object
    const constructorName = val.constructor?.name;
    const prefix = constructorName && constructorName !== "Object" ? `${constructorName} ` : "";
    const keys = Object.keys(val);
    if (keys.length === 0) return `${prefix}{}`;

    const props = keys.slice(0, 50).map((k) => {
      return `${k}: ${stringifyValue(val[k], seen, depth + 1)}`;
    });
    if (keys.length > 50) props.push(`... ${keys.length - 50} more keys`);

    return `${prefix}{ ${props.join(", ")} }`;
  }

  return String(val);
}

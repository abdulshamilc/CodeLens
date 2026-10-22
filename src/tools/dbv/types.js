// src/tools/dbv/types.js
// Complete JSDoc definitions and constants for the DBV execution trace and interpreter

/**
 * @typedef {"var" | "let" | "const" | "function" | "param" | "class" | "import"} BindingKind
 * @typedef {"undefined" | "uninitialized" | "initialized" | "tdz"} BindingState
 * 
 * @typedef {Object} HeapRef
 * @property {"ref"} type
 * @property {string} id
 * 
 * @typedef {number | string | boolean | null | undefined | HeapRef} BindingValue
 * 
 * @typedef {Object} Binding
 * @property {BindingKind} kind
 * @property {BindingState} state
 * @property {BindingValue} value
 * 
 * @typedef {Object} EnvironmentRecord
 * @property {string} id
 * @property {Record<string, Binding>} bindings
 * @property {string | null} outer
 * 
 * @typedef {"Global" | "Function" | "Block" | "Module" | "Eval"} ContextType
 * @typedef {"Creation" | "Execution"} ContextPhase
 * 
 * @typedef {Object} ExecutionContext
 * @property {string} id
 * @property {ContextType} type
 * @property {string} name
 * @property {ContextPhase} phase
 * @property {BindingValue} thisBinding
 * @property {string} variableEnvId
 * @property {string} lexicalEnvId
 * @property {string | null} outerEnvId
 * @property {number} sourceLine
 * 
 * @typedef {"object" | "array" | "function" | "closure" | "class" | "promise" | "generator"} HeapObjectKind
 * 
 * @typedef {Object} HeapObject
 * @property {string} id
 * @property {HeapObjectKind} kind
 * @property {string} label
 * @property {Record<string, BindingValue>} properties
 * @property {string | null} prototype
 * @property {string[]} [capturedEnvIds]
 * @property {[number, number]} [sourceRange]
 * 
 * @typedef {"setTimeout" | "setInterval" | "fetch" | "promise"} WebApiKind
 * 
 * @typedef {Object} WebApiEntry
 * @property {string} id
 * @property {WebApiKind} kind
 * @property {string} label
 * @property {number} [remainingMs]
 * @property {string} [callbackRef]
 * 
 * @typedef {Object} QueuedTask
 * @property {string} id
 * @property {"macrotask" | "microtask"} kind
 * @property {string} label
 * @property {string} [callbackRef]
 * 
 * @typedef {"idle" | "running-sync" | "draining-microtasks" | "pulling-macrotask"} EventLoopState
 * 
 * @typedef {Object} SourceRange
 * @property {number} startLine
 * @property {number} endLine
 * @property {number} startCol
 * @property {number} endCol
 * 
 * @typedef {Object} ConsoleEntry
 * @property {string} id
 * @property {"log" | "warn" | "error" | "info"} method
 * @property {string[]} args
 * @property {number} stepIndex
 * 
 * @typedef {Object} TraceStep
 * @property {number} index
 * @property {SourceRange | null} nodeRange
 * @property {string} eventType
 * @property {string} explanation
 * @property {ExecutionContext[]} callStack
 * @property {Record<string, EnvironmentRecord>} environments
 * @property {Record<string, HeapObject>} heap
 * @property {WebApiEntry[]} webApis
 * @property {QueuedTask[]} microtaskQueue
 * @property {QueuedTask[]} macrotaskQueue
 * @property {EventLoopState} eventLoopState
 * @property {ConsoleEntry[]} consoleOutput
 * @property {string[]} changedBindings
 * @property {string} [lookupBinding]
 * @property {{ name: string, message: string, stack: string[] }} [error]
 */

export const CONTEXT_TYPES = Object.freeze(["Global", "Function", "Block", "Module", "Eval"]);
export const CONTEXT_PHASES = Object.freeze(["Creation", "Execution"]);
export const BINDING_KINDS = Object.freeze(["var", "let", "const", "function", "param", "class", "import"]);
export const BINDING_STATES = Object.freeze(["undefined", "uninitialized", "initialized", "tdz"]);

// src/tools/dsv/topics/recursion/recursionEngine.js
// Pure step-recorder functions for Recursion (Call Stack frames, Factorial, Fibonacci)

export function generateFactorialSteps(n) {
  const steps = [];
  const num = Math.max(1, Math.min(6, Number(n)));
  const frames = [];

  steps.push({
    frames: [],
    result: null,
    message: `Starting calculation for ${num}! (Factorial).`,
  });

  // Winding phase
  function fact(val) {
    const isBase = val <= 1;
    frames.push({ fn: "factorial", arg: val, ret: null, isBase });

    steps.push({
      frames: frames.map((f) => ({ ...f })),
      result: null,
      message: isBase
        ? `Base case hit! factorial(${val}) evaluates condition (n <= 1). Returning 1.`
        : `Calling factorial(${val}). Pushed new stack frame (${val} × factorial(${val - 1})).`,
    });

    if (isBase) {
      frames[frames.length - 1].ret = 1;
      return 1;
    }

    const sub = fact(val - 1);
    const product = val * sub;

    // Unwinding
    frames[frames.length - 1].ret = product;
    steps.push({
      frames: frames.map((f) => ({ ...f })),
      result: product,
      message: `Resolved: factorial(${val}) = ${val} × ${sub} = ${product}. Ready to pop frame.`,
    });

    frames.pop();
    steps.push({
      frames: frames.map((f) => ({ ...f })),
      result: product,
      message: `Popped frame for factorial(${val}). Returned ${product} up to caller.`,
    });

    return product;
  }

  const finalRes = fact(num);
  steps.push({
    frames: [],
    result: finalRes,
    message: `Recursion unwound completely! Final result: ${num}! = ${finalRes}.`,
  });

  return steps;
}

export function generateFibonacciSteps(n) {
  const steps = [];
  const num = Math.max(0, Math.min(5, Number(n)));
  const frames = [];

  steps.push({
    frames: [],
    result: null,
    message: `Calculating fibonacci(${num}) via binary recursive branching.`,
  });

  function fib(val) {
    const isBase = val <= 1;
    frames.push({ fn: "fib", arg: val, ret: null, isBase });

    steps.push({
      frames: frames.map((f) => ({ ...f })),
      result: null,
      message: isBase
        ? `Base case reached at fib(${val}). Returning ${val}.`
        : `Pushed fib(${val}). Calling left branch: fib(${val - 1}).`,
    });

    if (isBase) {
      frames[frames.length - 1].ret = val;
      frames.pop();
      return val;
    }

    const left = fib(val - 1);
    const right = fib(val - 2);
    const total = left + right;

    frames[frames.length - 1].ret = total;
    steps.push({
      frames: frames.map((f) => ({ ...f })),
      result: total,
      message: `Resolved fib(${val}) = ${left} + ${right} = ${total}.`,
    });

    frames.pop();
    return total;
  }

  const finalRes = fib(num);
  steps.push({
    frames: [],
    result: finalRes,
    message: `Completed! fibonacci(${num}) = ${finalRes}.`,
  });

  return steps;
}

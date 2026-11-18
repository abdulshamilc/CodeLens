// src/tools/dsv/topics/stack/stackEngine.js
// Pure step-recorder functions for Array-based and Linked-List-based Stacks

export function generatePushSteps(items, capacity, val, isLinkedList = false) {
  const steps = [];
  const num = Number(val);

  steps.push({
    items: [...items],
    capacity,
    highlights: {},
    message: `Request to PUSH value ${num} onto the stack.`,
  });

  if (!isLinkedList && items.length >= capacity) {
    steps.push({
      items: [...items],
      capacity,
      highlights: { [items.length - 1]: "deleted" },
      message: `Stack Overflow Error! Maximum capacity of ${capacity} reached. Push rejected.`,
    });
    return steps;
  }

  const updated = [...items, num];
  steps.push({
    items: updated,
    capacity,
    highlights: { [updated.length - 1]: "newNode" },
    message: isLinkedList
      ? `Allocated new node (${num}) and updated TOP pointer to this node.`
      : `Incremented TOP pointer to index [${updated.length - 1}] and inserted value ${num}.`,
  });

  return steps;
}

export function generatePopSteps(items, capacity, isLinkedList = false) {
  const steps = [];

  if (items.length === 0) {
    steps.push({
      items: [],
      capacity,
      highlights: {},
      message: "Stack Underflow Error! Cannot pop from an empty stack.",
    });
    return steps;
  }

  const topIdx = items.length - 1;
  const poppedVal = items[topIdx];

  steps.push({
    items: [...items],
    capacity,
    highlights: { [topIdx]: "deleted" },
    message: `Popping top element (${poppedVal}) from index [${topIdx}].`,
  });

  const updated = items.slice(0, -1);
  steps.push({
    items: updated,
    capacity,
    highlights: updated.length > 0 ? { [updated.length - 1]: "active" } : {},
    message: updated.length > 0
      ? `Popped value ${poppedVal}. New TOP is now ${updated[updated.length - 1]}.`
      : `Popped value ${poppedVal}. Stack is now empty.`,
  });

  return steps;
}

export function generatePeekSteps(items, capacity) {
  const steps = [];

  if (items.length === 0) {
    steps.push({
      items: [],
      capacity,
      highlights: {},
      message: "Stack is empty. Peek returned null.",
    });
    return steps;
  }

  const topIdx = items.length - 1;
  steps.push({
    items: [...items],
    capacity,
    highlights: { [topIdx]: "found" },
    message: `Peek O(1): Top element is ${items[topIdx]} at index [${topIdx}].`,
  });

  return steps;
}

// src/tools/dsv/topics/queue/queueEngine.js
// Pure step-recorder functions for Simple Queue, Circular Queue, Deque, and Priority Queue

export function generateEnqueueSteps(items, capacity, val, isCircular = false) {
  const steps = [];
  const num = Number(val);

  steps.push({
    items: [...items],
    capacity,
    highlights: {},
    message: `Request to ENQUEUE value ${num} at the REAR of the queue.`,
  });

  if (items.length >= capacity) {
    steps.push({
      items: [...items],
      capacity,
      highlights: { [items.length - 1]: "deleted" },
      message: `Queue Overflow! Queue is full (${items.length}/${capacity}). Enqueue rejected.`,
    });
    return steps;
  }

  const updated = [...items, num];
  steps.push({
    items: updated,
    capacity,
    highlights: { [updated.length - 1]: "newNode" },
    message: isCircular
      ? `Inserted ${num} at rear index [${(updated.length - 1) % capacity}]. Modulo wrap applied.`
      : `Inserted ${num} at REAR. Queue length is now ${updated.length}.`,
  });

  return steps;
}

export function generateDequeueSteps(items, capacity) {
  const steps = [];

  if (items.length === 0) {
    steps.push({
      items: [],
      capacity,
      highlights: {},
      message: "Queue Underflow! Cannot dequeue from an empty queue.",
    });
    return steps;
  }

  const frontVal = items[0];
  steps.push({
    items: [...items],
    capacity,
    highlights: { 0: "deleted" },
    message: `Dequeuing FRONT element (${frontVal}) from index [0].`,
  });

  const updated = items.slice(1);
  steps.push({
    items: updated,
    capacity,
    highlights: updated.length > 0 ? { 0: "active" } : {},
    message: updated.length > 0
      ? `Dequeued ${frontVal}. New FRONT is ${updated[0]}.`
      : `Dequeued ${frontVal}. Queue is now empty.`,
  });

  return steps;
}

export function generateDequeSteps(items, capacity, action, val = 0) {
  const steps = [];
  const num = Number(val);

  if (action === "pushFront") {
    if (items.length >= capacity) {
      steps.push({ items: [...items], highlights: {}, message: "Deque Overflow! Buffer full." });
      return steps;
    }
    const updated = [num, ...items];
    steps.push({ items: updated, highlights: { 0: "newNode" }, message: `Pushed ${num} to FRONT of deque.` });
    return steps;
  }

  if (action === "pushBack") {
    if (items.length >= capacity) {
      steps.push({ items: [...items], highlights: {}, message: "Deque Overflow! Buffer full." });
      return steps;
    }
    const updated = [...items, num];
    steps.push({ items: updated, highlights: { [updated.length - 1]: "newNode" }, message: `Pushed ${num} to REAR of deque.` });
    return steps;
  }

  if (action === "popFront") {
    if (items.length === 0) {
      steps.push({ items: [], highlights: {}, message: "Deque Underflow! Cannot pop from empty deque." });
      return steps;
    }
    const valPopped = items[0];
    const updated = items.slice(1);
    steps.push({ items: updated, highlights: {}, message: `Popped ${valPopped} from FRONT of deque.` });
    return steps;
  }

  if (action === "popBack") {
    if (items.length === 0) {
      steps.push({ items: [], highlights: {}, message: "Deque Underflow! Cannot pop from empty deque." });
      return steps;
    }
    const valPopped = items[items.length - 1];
    const updated = items.slice(0, -1);
    steps.push({ items: updated, highlights: {}, message: `Popped ${valPopped} from REAR of deque.` });
    return steps;
  }

  return steps;
}

export function generatePriorityQueueSteps(items, val, priority) {
  const steps = [];
  const num = Number(val);
  const prio = Number(priority);
  const newItem = { val: num, priority: prio };

  steps.push({
    items: [...items],
    highlights: {},
    message: `Inserting (${num}, priority ${prio}) into Priority Queue.`,
  });

  const updated = [...items, newItem].sort((a, b) => a.priority - b.priority);
  const newIdx = updated.findIndex((x) => x === newItem);

  steps.push({
    items: updated,
    highlights: { [newIdx]: "newNode" },
    message: `Inserted (${num}, prio ${prio}) at sorted position [${newIdx}] based on priority.`,
  });

  return steps;
}

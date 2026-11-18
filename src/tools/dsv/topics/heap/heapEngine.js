// src/tools/dsv/topics/heap/heapEngine.js
// Pure step-recorder functions for Min-Heap and Max-Heap with Heapify-Up & Heapify-Down

export const INITIAL_HEAP = [10, 20, 15, 30, 40, 25];

// Compute coordinates for any complete binary tree of N elements
export function layoutHeapTree(heap, width = 560) {
  const nodes = [];
  const edges = [];
  const n = heap.length;
  if (n === 0) return { nodes, edges };

  for (let i = 0; i < n; i++) {
    const depth = Math.floor(Math.log2(i + 1));
    const levelStart = Math.pow(2, depth) - 1;
    const indexInLevel = i - levelStart;
    const countInLevel = Math.pow(2, depth);

    const levelWidth = width / countInLevel;
    const x = levelWidth * indexInLevel + levelWidth / 2;
    const y = 35 + depth * 55;

    nodes.push({ id: `heap-n-${i}`, idx: i, index: i, val: heap[i], x, y });

    // Edge from parent
    if (i > 0) {
      const parentIdx = Math.floor((i - 1) / 2);
      const parentNode = nodes[parentIdx];
      if (parentNode) {
        edges.push({
          id: `heap-e-${parentIdx}-${i}`,
          x1: parentNode.x,
          y1: parentNode.y,
          x2: x,
          y2: y,
        });
      }
    }
  }

  return { nodes, edges };
}

export function generateHeapInsertSteps(initialHeap, val, isMinHeap = true) {
  const steps = [];
  const heap = [...initialHeap];
  const num = Number(val);

  steps.push({
    heap: [...heap],
    highlights: {},
    message: `Inserting ${num} into ${isMinHeap ? "Min-Heap" : "Max-Heap"}.`,
  });

  heap.push(num);
  let curr = heap.length - 1;

  steps.push({
    heap: [...heap],
    highlights: { [curr]: "newNode" },
    message: `Appended ${num} as the next available leaf at index [${curr}]. Ready to Heapify-Up.`,
  });

  while (curr > 0) {
    const parent = Math.floor((curr - 1) / 2);
    const shouldSwap = isMinHeap ? heap[curr] < heap[parent] : heap[curr] > heap[parent];

    steps.push({
      heap: [...heap],
      highlights: { [curr]: "comparing", [parent]: "comparing" },
      message: `Comparing child [${curr}] (${heap[curr]}) with parent [${parent}] (${heap[parent]}). Formula: parent = floor((${curr} - 1) / 2) = ${parent}.`,
    });

    if (shouldSwap) {
      const temp = heap[curr];
      heap[curr] = heap[parent];
      heap[parent] = temp;

      steps.push({
        heap: [...heap],
        highlights: { [curr]: "swapping", [parent]: "swapping" },
        message: `Heap property violated! Swapped parent (${temp}) and child (${heap[curr]}).`,
      });

      curr = parent;
    } else {
      steps.push({
        heap: [...heap],
        highlights: { [curr]: "found" },
        message: `Heap property satisfied! No more swaps needed.`,
      });
      break;
    }
  }

  steps.push({
    heap: [...heap],
    highlights: {},
    message: `Insertion of ${num} complete in O(log n) time.`,
  });

  return steps;
}

export function generateHeapExtractSteps(initialHeap, isMinHeap = true) {
  const steps = [];
  const heap = [...initialHeap];

  if (heap.length === 0) {
    steps.push({
      heap: [],
      highlights: {},
      message: "Heap is empty. Nothing to extract.",
    });
    return steps;
  }

  const rootVal = heap[0];
  steps.push({
    heap: [...heap],
    highlights: { 0: "deleted" },
    message: `Extracting ${isMinHeap ? "minimum" : "maximum"} root element (${rootVal}) at index [0].`,
  });

  if (heap.length === 1) {
    heap.pop();
    steps.push({
      heap: [],
      highlights: {},
      message: `Extracted only remaining element ${rootVal}. Heap is now empty.`,
    });
    return steps;
  }

  // Move last element to root
  const lastVal = heap.pop();
  heap[0] = lastVal;

  steps.push({
    heap: [...heap],
    highlights: { 0: "swapping" },
    message: `Moved last element (${lastVal}) to root index [0]. Now starting Heapify-Down.`,
  });

  let curr = 0;
  while (true) {
    const left = 2 * curr + 1;
    const right = 2 * curr + 2;
    let target = curr;

    if (left < heap.length) {
      const leftBetter = isMinHeap ? heap[left] < heap[target] : heap[left] > heap[target];
      if (leftBetter) target = left;
    }

    if (right < heap.length) {
      const rightBetter = isMinHeap ? heap[right] < heap[target] : heap[right] > heap[target];
      if (rightBetter) target = right;
    }

    if (target !== curr) {
      steps.push({
        heap: [...heap],
        highlights: { [curr]: "comparing", [target]: "comparing" },
        message: `Comparing parent [${curr}] (${heap[curr]}) with child [${target}] (${heap[target]}).`,
      });

      const temp = heap[curr];
      heap[curr] = heap[target];
      heap[target] = temp;

      steps.push({
        heap: [...heap],
        highlights: { [curr]: "swapping", [target]: "swapping" },
        message: `Swapped parent (${temp}) with child (${heap[curr]}).`,
      });

      curr = target;
    } else {
      break;
    }
  }

  steps.push({
    heap: [...heap],
    highlights: {},
    message: `Extraction of root (${rootVal}) complete in O(log n) time.`,
  });

  return steps;
}

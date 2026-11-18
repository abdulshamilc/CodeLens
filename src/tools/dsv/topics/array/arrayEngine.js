// src/tools/dsv/topics/array/arrayEngine.js
// Pure step-recorder functions for 1D Array, 2D Grid, and Dynamic Array Doubling

export function generateAccessSteps(array, index) {
  const steps = [];
  const idx = Number(index);

  steps.push({
    array: [...array],
    highlights: {},
    pointers: {},
    message: `Attempting O(1) direct access at index [${idx}].`,
  });

  if (idx < 0 || idx >= array.length) {
    steps.push({
      array: [...array],
      highlights: {},
      pointers: { error: idx },
      message: `IndexOutOfBoundsException! Index [${idx}] is outside array bounds [0..${array.length - 1}].`,
    });
    return steps;
  }

  steps.push({
    array: [...array],
    highlights: { [idx]: "active" },
    pointers: { target: idx },
    message: `Calculated memory address = baseAddress + ${idx} × elementSize. Retrieved value ${array[idx]} in O(1) time.`,
  });

  return steps;
}

export function generateInsertSteps(array, index, value) {
  const steps = [];
  const idx = Number(index);
  const val = Number(value);

  if (idx < 0 || idx > array.length) {
    steps.push({
      array: [...array],
      highlights: {},
      pointers: {},
      message: `Cannot insert at index [${idx}]. Valid range is [0..${array.length}].`,
    });
    return steps;
  }

  let curr = [...array];

  steps.push({
    array: [...curr],
    highlights: {},
    pointers: { target: idx },
    message: `Preparing to insert value ${val} at index [${idx}].`,
  });

  // Make room by shifting from end down to index
  curr.push(null); // expand by 1 slot
  for (let i = curr.length - 2; i >= idx; i--) {
    steps.push({
      array: [...curr],
      highlights: { [i]: "swapping", [i + 1]: "swapping" },
      pointers: { shift: i },
      message: `Shifting element ${curr[i]} from index [${i}] to index [${i + 1}] to open space.`,
    });
    curr[i + 1] = curr[i];
    curr[i] = null;
  }

  // Insert the value
  curr[idx] = val;
  steps.push({
    array: [...curr],
    highlights: { [idx]: "newNode" },
    pointers: { inserted: idx },
    message: `Inserted new value ${val} at vacant index [${idx}]. Array size is now ${curr.length}.`,
  });

  return steps;
}

export function generateDeleteSteps(array, index) {
  const steps = [];
  const idx = Number(index);

  if (array.length === 0) {
    steps.push({
      array: [],
      highlights: {},
      pointers: {},
      message: "Array is empty. Nothing to delete.",
    });
    return steps;
  }

  if (idx < 0 || idx >= array.length) {
    steps.push({
      array: [...array],
      highlights: {},
      pointers: {},
      message: `Cannot delete at index [${idx}]. Valid range is [0..${array.length - 1}].`,
    });
    return steps;
  }

  let curr = [...array];

  steps.push({
    array: [...curr],
    highlights: { [idx]: "deleted" },
    pointers: { target: idx },
    message: `Removing element ${curr[idx]} at index [${idx}].`,
  });

  // Shift left to fill gap
  for (let i = idx; i < curr.length - 1; i++) {
    steps.push({
      array: [...curr],
      highlights: { [i]: "swapping", [i + 1]: "swapping" },
      pointers: { shift: i + 1 },
      message: `Shifting element ${curr[i + 1]} from index [${i + 1}] to index [${i}].`,
    });
    curr[i] = curr[i + 1];
  }

  curr.pop();

  steps.push({
    array: [...curr],
    highlights: {},
    pointers: {},
    message: `Deletion complete. Array size shrunk to ${curr.length}.`,
  });

  return steps;
}

export function generateLinearSearchSteps(array, target) {
  const steps = [];
  const tgt = Number(target);

  steps.push({
    array: [...array],
    highlights: {},
    pointers: {},
    message: `Starting Linear Search for target ${tgt} from index [0].`,
  });

  for (let i = 0; i < array.length; i++) {
    steps.push({
      array: [...array],
      highlights: { [i]: "comparing" },
      pointers: { i },
      message: `Comparing array[${i}] (${array[i]}) with target ${tgt}...`,
    });

    if (array[i] === tgt) {
      steps.push({
        array: [...array],
        highlights: { [i]: "found" },
        pointers: { found: i },
        message: `Found target ${tgt} at index [${i}] after ${i + 1} comparison(s)!`,
      });
      return steps;
    }
  }

  steps.push({
    array: [...array],
    highlights: {},
    pointers: {},
    message: `Target ${tgt} not found after checking all ${array.length} elements (O(n) time).`,
  });

  return steps;
}

export function generateBinarySearchSteps(array, target) {
  const steps = [];
  const tgt = Number(target);

  steps.push({
    array: [...array],
    highlights: {},
    pointers: {},
    message: `Starting Binary Search for ${tgt}. (Requires sorted array).`,
  });

  let low = 0;
  let high = array.length - 1;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);

    steps.push({
      array: [...array],
      highlights: { [mid]: "comparing" },
      pointers: { low, mid, high },
      message: `Search window [${low}..${high}]. Midpoint [${mid}] is ${array[mid]}.`,
    });

    if (array[mid] === tgt) {
      steps.push({
        array: [...array],
        highlights: { [mid]: "found" },
        pointers: { found: mid },
        message: `Found target ${tgt} at mid index [${mid}]! Search terminates in O(log n).`,
      });
      return steps;
    } else if (array[mid] < tgt) {
      steps.push({
        array: [...array],
        highlights: { [mid]: "default" },
        pointers: { low, mid, high },
        message: `${array[mid]} < ${tgt}: Target must be in the right half. Moving low = mid + 1.`,
      });
      low = mid + 1;
    } else {
      steps.push({
        array: [...array],
        highlights: { [mid]: "default" },
        pointers: { low, mid, high },
        message: `${array[mid]} > ${tgt}: Target must be in the left half. Moving high = mid - 1.`,
      });
      high = mid - 1;
    }
  }

  steps.push({
    array: [...array],
    highlights: {},
    pointers: {},
    message: `Target ${tgt} not found in array. Low crossed high.`,
  });

  return steps;
}

export function generate2DGridSteps(grid, row, col) {
  const steps = [];
  const r = Number(row);
  const c = Number(col);
  const numRows = grid.length;
  const numCols = grid[0]?.length || 0;

  steps.push({
    grid: grid.map((row) => [...row]),
    activeCell: null,
    message: `Calculating 2D Row-Major Offset for grid[${r}][${c}].`,
  });

  if (r < 0 || r >= numRows || c < 0 || c >= numCols) {
    steps.push({
      grid: grid.map((row) => [...row]),
      activeCell: null,
      message: `Cell [${r}][${c}] is out of bounds for ${numRows}×${numCols} grid!`,
    });
    return steps;
  }

  const offset = r * numCols + c;
  steps.push({
    grid: grid.map((row) => [...row]),
    activeCell: { r, c },
    message: `Address formula: base + (${r} × ${numCols} + ${c}) × size = offset ${offset}. Value is ${grid[r][c]}.`,
  });

  return steps;
}

export function generateDynamicArrayPushSteps(elements, capacity, newValue) {
  const steps = [];
  const val = Number(newValue);

  steps.push({
    array: [...elements],
    capacity,
    highlights: {},
    message: `Current dynamic array: Size ${elements.length} / Capacity ${capacity}.`,
  });

  if (elements.length < capacity) {
    const updated = [...elements, val];
    steps.push({
      array: updated,
      capacity,
      highlights: { [elements.length]: "newNode" },
      message: `Space available! Placed ${val} at index [${elements.length}] in O(1) amortized time.`,
    });
    return steps;
  }

  // Capacity full! Doubling required
  const newCap = capacity * 2;
  steps.push({
    array: [...elements],
    capacity,
    highlights: {},
    message: `Buffer FULL (${elements.length}/${capacity})! Allocating a new memory buffer of capacity ${newCap} (2×).`,
  });

  const copied = [];
  for (let i = 0; i < elements.length; i++) {
    copied.push(elements[i]);
    steps.push({
      array: [...copied],
      capacity: newCap,
      highlights: { [i]: "swapping" },
      message: `Copied element ${elements[i]} to new memory block at index [${i}].`,
    });
  }

  copied.push(val);
  steps.push({
    array: [...copied],
    capacity: newCap,
    highlights: { [elements.length]: "newNode" },
    message: `Inserted new value ${val} at index [${elements.length}]. Size is now ${copied.length}, capacity is ${newCap}.`,
  });

  return steps;
}

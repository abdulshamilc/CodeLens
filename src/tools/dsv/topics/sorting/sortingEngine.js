// src/tools/dsv/topics/sorting/sortingEngine.js
// Pure step-recorder algorithms for Bubble, Selection, Insertion, Merge, and Quick Sort
// Supports both primitive numbers and objects with { id, val } for Framer Motion layout animations.

function getVal(item) {
  return typeof item === "object" && item !== null && "val" in item ? item.val : item;
}

export function generateBubbleSortSteps(initial) {
  const steps = [];
  const arr = [...initial];
  const n = arr.length;
  let comparisons = 0;
  let swaps = 0;

  steps.push({
    array: [...arr],
    highlights: {},
    comparisons,
    swaps,
    swapIndices: null,
    message: "Starting Bubble Sort. We will scan from left to right, comparing adjacent pairs and swapping them if the left element is greater than the right.",
  });

  for (let i = 0; i < n - 1; i++) {
    let swappedAny = false;
    for (let j = 0; j < n - i - 1; j++) {
      comparisons++;
      const valA = getVal(arr[j]);
      const valB = getVal(arr[j + 1]);

      steps.push({
        array: [...arr],
        highlights: { [j]: "comparing", [j + 1]: "comparing" },
        comparisons,
        swaps,
        swapIndices: null,
        message: `Comparing pair: ${valA} (index ${j}) and ${valB} (index ${j + 1}). Is ${valA} > ${valB}?`,
      });

      if (valA > valB) {
        swaps++;
        swappedAny = true;
        const temp = arr[j];
        arr[j] = arr[j + 1];
        arr[j + 1] = temp;

        steps.push({
          array: [...arr],
          highlights: { [j]: "swapping", [j + 1]: "swapping" },
          comparisons,
          swaps,
          swapIndices: [j, j + 1],
          message: `Yes! ${valA} > ${valB}. Swapping their positions so smaller value (${valB}) moves left!`,
        });
      }
    }

    // After pass i, element at n - 1 - i is sorted
    const sortedIdx = n - 1 - i;
    steps.push({
      array: [...arr],
      highlights: { [sortedIdx]: "found" },
      comparisons,
      swaps,
      swapIndices: null,
      message: `Pass ${i + 1} complete! Largest element (${getVal(arr[sortedIdx])}) bubbled to final position [${sortedIdx}].`,
    });

    if (!swappedAny) break;
  }

  const allSorted = {};
  arr.forEach((_, i) => (allSorted[i] = "found"));

  steps.push({
    array: [...arr],
    highlights: allSorted,
    comparisons,
    swaps,
    swapIndices: null,
    message: `Bubble Sort finished! The entire array is sorted. Total comparisons: ${comparisons}, swaps: ${swaps}.`,
  });

  return steps;
}

export function generateSelectionSortSteps(initial) {
  const steps = [];
  const arr = [...initial];
  const n = arr.length;
  let comparisons = 0;
  let swaps = 0;

  steps.push({
    array: [...arr],
    highlights: {},
    comparisons,
    swaps,
    swapIndices: null,
    message: "Starting Selection Sort. In each pass, we scan the unsorted portion, find the minimum value, and swap it into the current front position.",
  });

  for (let i = 0; i < n - 1; i++) {
    let minIdx = i;

    steps.push({
      array: [...arr],
      highlights: { [i]: "active" },
      comparisons,
      swaps,
      swapIndices: null,
      message: `Starting pass ${i + 1}. Current target slot is [${i}]. Assuming minimum value is ${getVal(arr[minIdx])}.`,
    });

    for (let j = i + 1; j < n; j++) {
      comparisons++;
      const minVal = getVal(arr[minIdx]);
      const currVal = getVal(arr[j]);

      steps.push({
        array: [...arr],
        highlights: { [minIdx]: "comparing", [j]: "active" },
        comparisons,
        swaps,
        swapIndices: null,
        message: `Inspecting ${currVal} at index [${j}]. Comparing with current minimum ${minVal}.`,
      });

      if (currVal < minVal) {
        minIdx = j;
        steps.push({
          array: [...arr],
          highlights: { [minIdx]: "swapping" },
          comparisons,
          swaps,
          swapIndices: null,
          message: `New minimum found! ${currVal} at index [${minIdx}] is smaller than previous minimum.`,
        });
      }
    }

    if (minIdx !== i) {
      swaps++;
      const valI = getVal(arr[i]);
      const valMin = getVal(arr[minIdx]);
      const temp = arr[i];
      arr[i] = arr[minIdx];
      arr[minIdx] = temp;

      steps.push({
        array: [...arr],
        highlights: { [i]: "swapping", [minIdx]: "swapping" },
        comparisons,
        swaps,
        swapIndices: [i, minIdx],
        message: `Swapping minimum element ${valMin} from [${minIdx}] into sorted position [${i}].`,
      });
    }

    steps.push({
      array: [...arr],
      highlights: { [i]: "found" },
      comparisons,
      swaps,
      swapIndices: null,
      message: `Slot [${i}] now safely holds its final sorted element (${getVal(arr[i])}).`,
    });
  }

  const allSorted = {};
  arr.forEach((_, i) => (allSorted[i] = "found"));

  steps.push({
    array: [...arr],
    highlights: allSorted,
    comparisons,
    swaps,
    swapIndices: null,
    message: `Selection Sort complete! Total comparisons: ${comparisons}, swaps: ${swaps}.`,
  });

  return steps;
}

export function generateInsertionSortSteps(initial) {
  const steps = [];
  const arr = [...initial];
  const n = arr.length;
  let comparisons = 0;
  let shifts = 0;

  steps.push({
    array: [...arr],
    highlights: { 0: "found" },
    comparisons,
    swaps: 0,
    swapIndices: null,
    message: "Starting Insertion Sort. Left element [0] is trivially sorted. We take each next element and insert it into its correct sorted position.",
  });

  for (let i = 1; i < n; i++) {
    const key = arr[i];
    const keyVal = getVal(key);
    let j = i - 1;

    steps.push({
      array: [...arr],
      highlights: { [i]: "active" },
      comparisons,
      swaps: shifts,
      swapIndices: null,
      message: `Selected key element ${keyVal} at index [${i}]. Finding where it fits among sorted elements to the left.`,
    });

    while (j >= 0) {
      comparisons++;
      const compVal = getVal(arr[j]);

      if (compVal > keyVal) {
        shifts++;
        arr[j + 1] = arr[j];

        steps.push({
          array: [...arr],
          highlights: { [j]: "swapping", [j + 1]: "swapping" },
          comparisons,
          swaps: shifts,
          swapIndices: [j, j + 1],
          message: `Since ${compVal} > ${keyVal}, sliding ${compVal} one position right to slot [${j + 1}].`,
        });
        j--;
      } else {
        steps.push({
          array: [...arr],
          highlights: { [j]: "comparing" },
          comparisons,
          swaps: shifts,
          swapIndices: null,
          message: `${compVal} ≤ ${keyVal}. Correct insertion spot found at index [${j + 1}].`,
        });
        break;
      }
    }

    arr[j + 1] = key;
    steps.push({
      array: [...arr],
      highlights: { [j + 1]: "found" },
      comparisons,
      swaps: shifts,
      swapIndices: null,
      message: `Inserted key ${keyVal} into slot [${j + 1}]. Subarray [0..${i}] is now sorted!`,
    });
  }

  const allSorted = {};
  arr.forEach((_, i) => (allSorted[i] = "found"));

  steps.push({
    array: [...arr],
    highlights: allSorted,
    comparisons,
    swaps: shifts,
    swapIndices: null,
    message: `Insertion Sort finished! All elements are in sorted order. Total comparisons: ${comparisons}, shifts: ${shifts}.`,
  });

  return steps;
}

export function generateMergeSortSteps(initial) {
  const steps = [];
  const arr = [...initial];
  let comparisons = 0;

  steps.push({
    array: [...arr],
    highlights: {},
    comparisons,
    swaps: 0,
    swapIndices: null,
    message: "Starting Merge Sort. Divide-and-conquer algorithm: recursively splits the array into single elements, then merges sorted halves.",
  });

  function mergeSortHelper(start, end) {
    if (start >= end) return;
    const mid = Math.floor((start + end) / 2);

    mergeSortHelper(start, mid);
    mergeSortHelper(mid + 1, end);

    const left = arr.slice(start, mid + 1);
    const right = arr.slice(mid + 1, end + 1);
    let i = 0, j = 0, k = start;

    while (i < left.length && j < right.length) {
      comparisons++;
      const valL = getVal(left[i]);
      const valR = getVal(right[j]);

      if (valL <= valR) {
        arr[k] = left[i];
        i++;
      } else {
        arr[k] = right[j];
        j++;
      }
      steps.push({
        array: [...arr],
        highlights: { [k]: "swapping" },
        comparisons,
        swaps: 0,
        swapIndices: null,
        message: `Merging: Comparing ${valL} vs ${valR}. Placed smaller value ${getVal(arr[k])} into position [${k}].`,
      });
      k++;
    }

    while (i < left.length) {
      arr[k] = left[i];
      steps.push({
        array: [...arr],
        highlights: { [k]: "swapping" },
        comparisons,
        swaps: 0,
        swapIndices: null,
        message: `Copied remaining left element ${getVal(arr[k])} into index [${k}].`,
      });
      i++;
      k++;
    }

    while (j < right.length) {
      arr[k] = right[j];
      steps.push({
        array: [...arr],
        highlights: { [k]: "swapping" },
        comparisons,
        swaps: 0,
        swapIndices: null,
        message: `Copied remaining right element ${getVal(arr[k])} into index [${k}].`,
      });
      j++;
      k++;
    }
  }

  mergeSortHelper(0, arr.length - 1);

  const allSorted = {};
  arr.forEach((_, i) => (allSorted[i] = "found"));

  steps.push({
    array: [...arr],
    highlights: allSorted,
    comparisons,
    swaps: 0,
    swapIndices: null,
    message: `Merge Sort complete in guaranteed O(n log n) time! Total comparisons: ${comparisons}.`,
  });

  return steps;
}

export function generateQuickSortSteps(initial) {
  const steps = [];
  const arr = [...initial];
  let comparisons = 0;
  let swaps = 0;

  steps.push({
    array: [...arr],
    highlights: {},
    comparisons,
    swaps,
    swapIndices: null,
    message: "Starting Quick Sort. Chooses a pivot element and partitions the array so smaller elements go left and larger elements go right.",
  });

  function quickSortHelper(low, high) {
    if (low >= high) {
      if (low >= 0 && low < arr.length) {
        steps.push({
          array: [...arr],
          highlights: { [low]: "found" },
          comparisons,
          swaps,
          swapIndices: null,
          message: `Single element [${low}] (${getVal(arr[low])}) is already in sorted position.`,
        });
      }
      return;
    }

    const pivotVal = getVal(arr[high]);
    steps.push({
      array: [...arr],
      highlights: { [high]: "active" },
      comparisons,
      swaps,
      swapIndices: null,
      message: `Selected pivot = ${pivotVal} at index [${high}]. Partitioning range [${low}..${high}].`,
    });

    let i = low - 1;

    for (let j = low; j < high; j++) {
      comparisons++;
      const currVal = getVal(arr[j]);

      steps.push({
        array: [...arr],
        highlights: { [j]: "comparing", [high]: "active" },
        comparisons,
        swaps,
        swapIndices: null,
        message: `Comparing ${currVal} with pivot ${pivotVal}. Is ${currVal} < ${pivotVal}?`,
      });

      if (currVal < pivotVal) {
        i++;
        if (i !== j) {
          swaps++;
          const temp = arr[i];
          arr[i] = arr[j];
          arr[j] = temp;

          steps.push({
            array: [...arr],
            highlights: { [i]: "swapping", [j]: "swapping", [high]: "active" },
            comparisons,
            swaps,
            swapIndices: [i, j],
            message: `Yes! ${currVal} < pivot (${pivotVal}). Swapping arr[${i}] and arr[${j}] into left partition.`,
          });
        }
      }
    }

    swaps++;
    const temp = arr[i + 1];
    arr[i + 1] = arr[high];
    arr[high] = temp;
    const pivotIdx = i + 1;

    steps.push({
      array: [...arr],
      highlights: { [pivotIdx]: "found" },
      comparisons,
      swaps,
      swapIndices: [pivotIdx, high],
      message: `Pivot ${pivotVal} placed at its final sorted position [${pivotIdx}].`,
    });

    quickSortHelper(low, pivotIdx - 1);
    quickSortHelper(pivotIdx + 1, high);
  }

  quickSortHelper(0, arr.length - 1);

  const allSorted = {};
  arr.forEach((_, i) => (allSorted[i] = "found"));

  steps.push({
    array: [...arr],
    highlights: allSorted,
    comparisons,
    swaps,
    swapIndices: null,
    message: `Quick Sort complete! Total comparisons: ${comparisons}, partition swaps: ${swaps}.`,
  });

  return steps;
}

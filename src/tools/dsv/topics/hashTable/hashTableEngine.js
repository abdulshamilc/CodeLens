// src/tools/dsv/topics/hashTable/hashTableEngine.js
// Pure step-recorder functions for Hash Table (Chaining, Linear Probing, Quadratic Probing)

export function simpleHash(str, capacity) {
  let hash = 0;
  const s = String(str);
  for (let i = 0; i < s.length; i++) {
    hash = (hash * 31 + s.charCodeAt(i)) >>> 0;
  }
  return { rawHash: hash, index: hash % capacity };
}

export function generateChainingInsertSteps(buckets, capacity, key, val) {
  const steps = [];
  const { rawHash, index } = simpleHash(key, capacity);

  steps.push({
    buckets: buckets.map((b) => [...b]),
    activeBucket: index,
    message: `Hashing key "${key}": hash("${key}") = ${rawHash} % ${capacity} = bucket [${index}].`,
  });

  const nextBuckets = buckets.map((b) => [...b]);
  const bucket = nextBuckets[index];
  const existingIdx = bucket.findIndex((item) => item.key === key);

  if (existingIdx !== -1) {
    bucket[existingIdx] = { key, val };
    steps.push({
      buckets: nextBuckets,
      activeBucket: index,
      message: `Key "${key}" already present in bucket [${index}]. Updated its value to "${val}".`,
    });
  } else {
    bucket.push({ key, val });
    const isCol = bucket.length > 1;
    steps.push({
      buckets: nextBuckets,
      activeBucket: index,
      message: isCol
        ? `Collision! Bucket [${index}] already had items. Appended "${key}": ${val} to chain (chain length: ${bucket.length}).`
        : `Bucket [${index}] was empty. Stored ("${key}", ${val}) directly.`,
    });
  }

  return steps;
}

export function generateProbingInsertSteps(slots, capacity, key, val, isQuadratic = false) {
  const steps = [];
  const { rawHash, index: baseIdx } = simpleHash(key, capacity);

  steps.push({
    slots: [...slots],
    activeSlot: baseIdx,
    message: `Hashing "${key}": Base index = ${rawHash} % ${capacity} = [${baseIdx}].`,
  });

  const nextSlots = [...slots];
  for (let i = 0; i < capacity; i++) {
    const slotIdx = isQuadratic
      ? (baseIdx + i * i) % capacity
      : (baseIdx + i) % capacity;

    const probeFormula = isQuadratic ? `(${baseIdx} + ${i}²) % ${capacity}` : `(${baseIdx} + ${i}) % ${capacity}`;

    steps.push({
      slots: [...nextSlots],
      activeSlot: slotIdx,
      message: `Probe #${i}: Checking slot [${slotIdx}] using ${probeFormula}...`,
    });

    if (nextSlots[slotIdx] === null || nextSlots[slotIdx].key === key) {
      nextSlots[slotIdx] = { key, val };
      steps.push({
        slots: nextSlots,
        activeSlot: slotIdx,
        message: `Found open slot at [${slotIdx}]! Stored ("${key}", ${val}) after ${i + 1} probe(s).`,
      });
      return steps;
    }

    steps.push({
      slots: [...nextSlots],
      activeSlot: slotIdx,
      message: `Collision at slot [${slotIdx}]! Slot occupied by ("${nextSlots[slotIdx].key}"). Probing next...`,
    });
  }

  steps.push({
    slots: nextSlots,
    activeSlot: null,
    message: "Hash Table is Full! Could not find an empty slot.",
  });

  return steps;
}

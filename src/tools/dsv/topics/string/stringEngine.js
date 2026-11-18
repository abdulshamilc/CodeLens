// src/tools/dsv/topics/string/stringEngine.js
// Pure step-recorder functions for String operations

export function generateCharArraySteps(str, targetIndex) {
  const chars = str.split("");
  const steps = [];
  const idx = Number(targetIndex);

  steps.push({
    chars,
    highlights: {},
    pointers: {},
    message: `String "${str}" length: ${chars.length}. Accessing index [${idx}].`,
  });

  if (idx < 0 || idx >= chars.length) {
    steps.push({
      chars,
      highlights: {},
      pointers: {},
      message: `IndexOutOfBounds! Index [${idx}] is not in range [0..${chars.length - 1}].`,
    });
    return steps;
  }

  steps.push({
    chars,
    highlights: { [idx]: "active" },
    pointers: { [idx]: "target" },
    message: `Character at index [${idx}] is '${chars[idx]}' (ASCII ${chars[idx].charCodeAt(0)}).`,
  });

  return steps;
}

export function generatePalindromeSteps(str) {
  const chars = str.split("");
  const steps = [];

  steps.push({
    chars,
    highlights: {},
    pointers: {},
    message: `Checking if "${str}" is a palindrome using two pointers (left & right).`,
  });

  let left = 0;
  let right = chars.length - 1;

  while (left < right) {
    steps.push({
      chars,
      highlights: { [left]: "comparing", [right]: "comparing" },
      pointers: { left, right },
      message: `Comparing left [${left}] '${chars[left]}' with right [${right}] '${chars[right]}'.`,
    });

    if (chars[left].toLowerCase() !== chars[right].toLowerCase()) {
      steps.push({
        chars,
        highlights: { [left]: "deleted", [right]: "deleted" },
        pointers: { left, right },
        message: `Mismatch! '${chars[left]}' !== '${chars[right]}'. "${str}" is NOT a palindrome.`,
      });
      return steps;
    }

    steps.push({
      chars,
      highlights: { [left]: "found", [right]: "found" },
      pointers: { left, right },
      message: `Match! Both characters are '${chars[left]}'. Moving pointers inward.`,
    });

    left++;
    right--;
  }

  const allFound = {};
  chars.forEach((_, i) => (allFound[i] = "found"));

  steps.push({
    chars,
    highlights: allFound,
    pointers: {},
    message: `All characters matched symmetrically! "${str}" IS a valid palindrome.`,
  });

  return steps;
}

export function generateFrequencySteps(str) {
  const chars = str.split("");
  const steps = [];
  const freq = {};

  steps.push({
    chars,
    freq: {},
    highlights: {},
    message: `Counting character frequencies in "${str}".`,
  });

  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    freq[ch] = (freq[ch] || 0) + 1;

    steps.push({
      chars,
      freq: { ...freq },
      highlights: { [i]: "active" },
      pointers: { [i]: "curr" },
      message: `Inspecting '${ch}' at index [${i}]. Updated count of '${ch}' to ${freq[ch]}.`,
    });
  }

  steps.push({
    chars,
    freq: { ...freq },
    highlights: {},
    pointers: {},
    message: `Finished! Distinct characters: ${Object.keys(freq).length}.`,
  });

  return steps;
}

export function generatePatternSearchSteps(text, pattern) {
  const tChars = text.split("");
  const pChars = pattern.split("");
  const steps = [];

  steps.push({
    chars: tChars,
    pattern: pChars,
    highlights: {},
    message: `Sliding window search for pattern "${pattern}" inside text "${text}".`,
  });

  const n = tChars.length;
  const m = pChars.length;

  if (m === 0 || m > n) {
    steps.push({
      chars: tChars,
      pattern: pChars,
      highlights: {},
      message: "Pattern length is invalid or longer than text.",
    });
    return steps;
  }

  for (let i = 0; i <= n - m; i++) {
    const windowHl = {};
    for (let w = 0; w < m; w++) windowHl[i + w] = "active";

    steps.push({
      chars: tChars,
      pattern: pChars,
      windowStart: i,
      highlights: windowHl,
      message: `Sliding window to index [${i}]. Testing substring "${text.substring(i, i + m)}" vs "${pattern}".`,
    });

    let match = true;
    for (let j = 0; j < m; j++) {
      if (tChars[i + j] !== pChars[j]) {
        match = false;
        steps.push({
          chars: tChars,
          pattern: pChars,
          windowStart: i,
          highlights: { ...windowHl, [i + j]: "deleted" },
          message: `Mismatch at offset ${j}: text '${tChars[i + j]}' !== pattern '${pChars[j]}'. Shifting window.`,
        });
        break;
      }
    }

    if (match) {
      const matchHl = {};
      for (let w = 0; w < m; w++) matchHl[i + w] = "found";

      steps.push({
        chars: tChars,
        pattern: pChars,
        windowStart: i,
        highlights: matchHl,
        message: `Exact match found for pattern "${pattern}" starting at index [${i}]!`,
      });
      return steps;
    }
  }

  steps.push({
    chars: tChars,
    pattern: pChars,
    highlights: {},
    message: `Pattern "${pattern}" was not found in "${text}".`,
  });

  return steps;
}

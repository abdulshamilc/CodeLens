// src/tools/dsv/topics/trie/trieEngine.js
// Pure step-recorder functions for Trie (Word Insert, Word Search, Prefix Search)

let nodeIdCounter = 0;
function createTrieNode(char = "", isWord = false) {
  return {
    id: `tn_${++nodeIdCounter}`,
    char,
    isWord,
    children: {},
  };
}

export function cloneTrie(node) {
  if (!node) return null;
  const copy = {
    id: node.id,
    char: node.char,
    isWord: node.isWord,
    children: {},
  };
  for (const [k, child] of Object.entries(node.children)) {
    copy.children[k] = cloneTrie(child);
  }
  return copy;
}

export function createInitialTrie(words = ["cat", "car", "dog"]) {
  nodeIdCounter = 0;
  const root = createTrieNode("*", false);
  for (const word of words) {
    let curr = root;
    for (const ch of word.toLowerCase()) {
      if (!curr.children[ch]) {
        curr.children[ch] = createTrieNode(ch, false);
      }
      curr = curr.children[ch];
    }
    curr.isWord = true;
  }
  return root;
}

export function generateTrieInsertSteps(root, wordToInsert) {
  const steps = [];
  const word = wordToInsert.trim().toLowerCase();
  if (!word) return steps;

  const currentRoot = cloneTrie(root);
  const msg1 = `Starting insertion of "${word}" into Trie from root (*).`;

  steps.push({
    root: cloneTrie(currentRoot),
    activeNodeId: currentRoot.id,
    activeChar: "",
    status: "idle",
    message: msg1,
    explanation: msg1,
    highlightedNodes: [currentRoot.id],
  });

  let curr = currentRoot;
  for (let i = 0; i < word.length; i++) {
    const ch = word[i];
    const exists = !!curr.children[ch];

    const msgComp = `Checking child for '${ch}' under node '${curr.char}' (${i + 1}/${word.length}).`;
    steps.push({
      root: cloneTrie(currentRoot),
      activeNodeId: curr.id,
      activeChar: ch,
      status: "comparing",
      message: msgComp,
      explanation: msgComp,
      highlightedNodes: [curr.id],
    });

    if (!exists) {
      curr.children[ch] = createTrieNode(ch, false);
      const msgNew = `Child '${ch}' not found. Allocated new node '${ch}'.`;
      steps.push({
        root: cloneTrie(currentRoot),
        activeNodeId: curr.children[ch].id,
        activeChar: ch,
        status: "inserted",
        message: msgNew,
        explanation: msgNew,
        highlightedNodes: [curr.children[ch].id],
      });
    }

    curr = curr.children[ch];
  }

  curr.isWord = true;
  const msgEnd = `Marked node '${curr.char}' as isWord = true. Successfully inserted "${word}"!`;
  steps.push({
    root: cloneTrie(currentRoot),
    activeNodeId: curr.id,
    status: "success",
    message: msgEnd,
    explanation: msgEnd,
    highlightedNodes: [curr.id],
  });

  return { steps, updatedRoot: currentRoot };
}

export function generateTrieSearchSteps(root, wordToSearch, isPrefixOnly = false) {
  const steps = [];
  const word = wordToSearch.trim().toLowerCase();
  if (!word) return steps;

  const msg1 = `Searching for ${isPrefixOnly ? "prefix" : "word"} "${word}" from root.`;
  steps.push({
    root: cloneTrie(root),
    activeNodeId: root.id,
    status: "idle",
    message: msg1,
    explanation: msg1,
    highlightedNodes: [root.id],
  });

  let curr = root;
  const path = [root.id];

  for (let i = 0; i < word.length; i++) {
    const ch = word[i];

    if (!curr.children[ch]) {
      const msgFail = `Character '${ch}' not found under '${curr.char}'. Search failed!`;
      steps.push({
        root: cloneTrie(root),
        activeNodeId: curr.id,
        status: "fail",
        message: msgFail,
        explanation: msgFail,
        highlightedNodes: [...path],
      });
      return steps;
    }

    curr = curr.children[ch];
    path.push(curr.id);

    const msgFound = `Found '${ch}'! Advancing to next character.`;
    steps.push({
      root: cloneTrie(root),
      activeNodeId: curr.id,
      status: "found",
      message: msgFound,
      explanation: msgFound,
      highlightedNodes: [...path],
    });
  }

  if (isPrefixOnly) {
    const msgOk = `Prefix "${word}" exists in Trie!`;
    steps.push({
      root: cloneTrie(root),
      activeNodeId: curr.id,
      status: "success",
      message: msgOk,
      explanation: msgOk,
      highlightedNodes: [...path],
    });
  } else {
    const isExact = curr.isWord;
    const msgResult = isExact
      ? `Word "${word}" found and confirmed (isWord = true)!`
      : `All letters of "${word}" matched, but node is NOT marked as isWord (only a prefix).`;
    steps.push({
      root: cloneTrie(root),
      activeNodeId: curr.id,
      status: isExact ? "success" : "fail",
      message: msgResult,
      explanation: msgResult,
      highlightedNodes: [...path],
    });
  }

  return steps;
}

export function getAllWords(node, prefix = "") {
  const words = [];
  if (!node) return words;
  const currentPrefix = node.char === "*" ? "" : prefix + node.char;
  if (node.isWord) words.push(currentPrefix);
  for (const child of Object.values(node.children)) {
    words.push(...getAllWords(child, currentPrefix));
  }
  return words;
}

export function layoutTrie(root, width = 640) {
  const nodes = [];
  const edges = [];

  function getTreeWidth(node) {
    const keys = Object.keys(node.children);
    if (keys.length === 0) return 1;
    return keys.reduce((acc, k) => acc + getTreeWidth(node.children[k]), 0);
  }

  function assignPositions(node, xStart, xEnd, depth) {
    const y = 35 + depth * 55;
    const x = (xStart + xEnd) / 2;
    nodes.push({ id: node.id, char: node.char, isWord: node.isWord, x, y });

    const childrenKeys = Object.keys(node.children).sort();
    if (childrenKeys.length === 0) return;

    const totalWidth = childrenKeys.reduce((acc, k) => acc + getTreeWidth(node.children[k]), 0);
    let currentX = xStart;

    for (const key of childrenKeys) {
      const child = node.children[key];
      const childWeight = getTreeWidth(child);
      const childSpan = (xEnd - xStart) * (childWeight / totalWidth);
      const nextXStart = currentX;
      const nextXEnd = currentX + childSpan;
      const childX = (nextXStart + nextXEnd) / 2;
      const childY = 35 + (depth + 1) * 55;

      edges.push({
        id: `${node.id}-${child.id}`,
        x1: x,
        y1: y,
        x2: childX,
        y2: childY,
        label: key,
      });

      assignPositions(child, nextXStart, nextXEnd, depth + 1);
      currentX = nextXEnd;
    }
  }

  assignPositions(root, 20, width - 20, 0);
  return { nodes, edges };
}

// src/tools/whiteboard/utils/dataStructureTemplates.js
// High quality developer whiteboard templates for core Data Structures

export const DATA_STRUCTURE_OPTIONS = [
  {
    id: "linked-list",
    title: "Linked List",
    description: "Singly Linked List with HEAD pointer, node data/next slots, and NULL terminator.",
    icon: "🔗",
    tag: "Linear",
    color: "#6366f1",
  },
  {
    id: "array",
    title: "Array",
    description: "Contiguous indexed memory cells with indices [0] through [5] and element values.",
    icon: "📊",
    tag: "Linear",
    color: "#0ea5e9",
  },
  {
    id: "stack",
    title: "Stack",
    description: "LIFO vertical stack container with TOP pointer, push/pop boundaries.",
    icon: "📚",
    tag: "Linear",
    color: "#ec4899",
  },
  {
    id: "queue",
    title: "Queue",
    description: "FIFO horizontal queue with FRONT (dequeue) and REAR (enqueue) pointers.",
    icon: "🚶",
    tag: "Linear",
    color: "#10b981",
  },
  {
    id: "bst",
    title: "Binary Search Tree",
    description: "Ordered binary tree (Left < Root < Right) with multi-level branches.",
    icon: "🌳",
    tag: "Tree",
    color: "#f59e0b",
  },
  {
    id: "trie",
    title: "Trie (Prefix Tree)",
    description: "Prefix tree for dictionary words with character edges and End-of-Word markers.",
    icon: "🌿",
    tag: "Tree",
    color: "#14b8a6",
  },
  {
    id: "heap",
    title: "Binary Heap",
    description: "Complete binary Min-Heap tree with synchronized 1D array mapping.",
    icon: "⛰️",
    tag: "Tree",
    color: "#8b5cf6",
  },
  {
    id: "graph",
    title: "Graph",
    description: "Network of interconnected vertices with weighted and labeled edges.",
    icon: "🕸️",
    tag: "Graph",
    color: "#f43f5e",
  },
];

let dsCounter = 1;
function genId(prefix) {
  return `ds-${prefix}-${Date.now()}-${dsCounter++}`;
}

export function generateDataStructureTemplate(type, originX = 120, originY = 120) {
  switch (type) {
    case "linked-list":
      return generateLinkedList(originX, originY);
    case "array":
      return generateArray(originX, originY);
    case "stack":
      return generateStack(originX, originY);
    case "queue":
      return generateQueue(originX, originY);
    case "bst":
      return generateBST(originX, originY);
    case "trie":
      return generateTrie(originX, originY);
    case "heap":
      return generateHeap(originX, originY);
    case "graph":
      return generateGraph(originX, originY);
    default:
      return generateLinkedList(originX, originY);
  }
}

// ── 1. LINKED LIST ──────────────────────────────────────────────────────────
function generateLinkedList(ox, oy) {
  const elements = [];
  const nodes = [
    { val: "12", sub: "node 0" },
    { val: "99", sub: "node 1" },
    { val: "37", sub: "node 2" },
    { val: "84", sub: "node 3" },
  ];

  // Title
  elements.push({
    id: genId("txt-title"),
    type: "text",
    x: ox,
    y: oy - 65,
    width: 440,
    height: 28,
    text: "Singly Linked List: [ Data | Next ● ] ➔ ... ➔ null",
    fontSize: 16,
    fontWeight: "bold",
    strokeColor: "#38bdf8",
    fillColor: "transparent",
  });

  // HEAD pointer badge
  elements.push({
    id: genId("head-badge"),
    type: "rounded-rect",
    x: ox + 15,
    y: oy - 25,
    width: 60,
    height: 24,
    strokeColor: "#10b981",
    fillColor: "rgba(16, 185, 129, 0.2)",
    strokeWidth: 1.5,
    strokeStyle: "solid",
    text: "HEAD ↓",
    fontSize: 11,
    fontWeight: "bold",
  });

  // Nodes & Connectors
  let curX = ox;
  const nodeWidth = 96;
  const nodeHeight = 50;
  const dividerOffset = 56; // line in the center of the rectangle
  const gap = 44;

  nodes.forEach((n, idx) => {
    // 1. Node outer rectangle
    elements.push({
      id: genId(`node-box-${idx}`),
      type: "rounded-rect",
      x: curX,
      y: oy + 10,
      width: nodeWidth,
      height: nodeHeight,
      strokeColor: "#6366f1",
      fillColor: "rgba(99, 102, 241, 0.14)",
      strokeWidth: 2,
      strokeStyle: "solid",
    });

    // 2. Vertical line down the center of the rectangle
    elements.push({
      id: genId(`node-divider-${idx}`),
      type: "line",
      x: curX + dividerOffset,
      y: oy + 10,
      width: 0,
      height: nodeHeight,
      strokeColor: "#6366f1",
      strokeWidth: 2,
      strokeStyle: "solid",
    });

    // 3. Left side: Data / Value
    elements.push({
      id: genId(`node-val-${idx}`),
      type: "text",
      x: curX + 14,
      y: oy + 23,
      width: 30,
      height: 24,
      text: String(n.val),
      fontSize: 16,
      fontWeight: "bold",
      strokeColor: "#ffffff",
    });

    // 4. Right side: Next pointer
    elements.push({
      id: genId(`node-next-${idx}`),
      type: "text",
      x: curX + dividerOffset + 12,
      y: oy + 25,
      width: 22,
      height: 22,
      text: "●",
      fontSize: 14,
      fontWeight: "bold",
      strokeColor: "#38bdf8",
    });

    // Arrow to next node
    if (idx < nodes.length - 1) {
      elements.push({
        id: genId(`conn-${idx}`),
        type: "connector-straight",
        x: curX + dividerOffset + 18,
        y: oy + 10 + nodeHeight / 2,
        width: nodeWidth - dividerOffset - 18 + gap,
        height: 0,
        strokeColor: "#38bdf8",
        fillColor: "transparent",
        strokeWidth: 2,
        strokeStyle: "solid",
        endArrow: true,
      });
    }

    curX += nodeWidth + gap;
  });

  // Arrow from last node's next pointer to NULL
  elements.push({
    id: genId("conn-null"),
    type: "connector-straight",
    x: curX - gap - (nodeWidth - dividerOffset) + 18,
    y: oy + 10 + nodeHeight / 2,
    width: nodeWidth - dividerOffset - 18 + gap - 10,
    height: 0,
    strokeColor: "#f43f5e",
    fillColor: "transparent",
    strokeWidth: 2,
    strokeStyle: "dashed",
    endArrow: true,
  });

  // NULL box
  elements.push({
    id: genId("null-box"),
    type: "rounded-rect",
    x: curX,
    y: oy + 17,
    width: 55,
    height: 36,
    strokeColor: "#f43f5e",
    fillColor: "rgba(244, 63, 94, 0.18)",
    strokeWidth: 1.5,
    strokeStyle: "solid",
    text: "NULL",
    fontSize: 12,
    fontWeight: "bold",
  });

  return elements;
}

// ── 2. ARRAY ────────────────────────────────────────────────────────────────
function generateArray(ox, oy) {
  const elements = [];
  const items = [14, 28, 42, 56, 70, 84];

  // Title
  elements.push({
    id: genId("txt-title"),
    type: "text",
    x: ox,
    y: oy - 55,
    width: 340,
    height: 26,
    text: "Array: nums = [14, 28, 42, 56, 70, 84] (Length: 6)",
    fontSize: 15,
    fontWeight: "bold",
    strokeColor: "#38bdf8",
    fillColor: "transparent",
  });

  const cellW = 62;
  const cellH = 58;

  items.forEach((val, i) => {
    const x = ox + i * cellW;
    // Value cell
    elements.push({
      id: genId(`arr-cell-${i}`),
      type: "rectangle",
      x,
      y: oy,
      width: cellW,
      height: cellH,
      strokeColor: "#38bdf8",
      fillColor: i % 2 === 0 ? "rgba(56, 189, 248, 0.14)" : "rgba(99, 102, 241, 0.14)",
      strokeWidth: 2,
      strokeStyle: "solid",
      text: String(val),
      fontSize: 15,
      fontWeight: "bold",
    });

    // Index label below
    elements.push({
      id: genId(`arr-idx-${i}`),
      type: "text",
      x: x + 16,
      y: oy + cellH + 8,
      width: 32,
      height: 20,
      text: `[${i}]`,
      fontSize: 12,
      fontWeight: "bold",
      strokeColor: "#94a3b8",
      fillColor: "transparent",
    });
  });

  // Memory footnote
  elements.push({
    id: genId("arr-note"),
    type: "text",
    x: ox,
    y: oy + cellH + 36,
    width: 370,
    height: 22,
    text: "• O(1) Random Access: address = base_address + (index × element_size)",
    fontSize: 11,
    strokeColor: "#64748b",
    fillColor: "transparent",
  });

  return elements;
}

// ── 3. STACK (LIFO) ─────────────────────────────────────────────────────────
function generateStack(ox, oy) {
  const elements = [];
  const frames = [
    { val: "88", label: "TOP (Next Pop)", isTop: true },
    { val: "64", label: "Frame 2" },
    { val: "32", label: "Frame 1" },
    { val: "16", label: "BOTTOM", isBottom: true },
  ];

  // Title
  elements.push({
    id: genId("txt-title"),
    type: "text",
    x: ox,
    y: oy - 55,
    width: 320,
    height: 26,
    text: "Stack (LIFO: Last-In, First-Out)",
    fontSize: 16,
    fontWeight: "bold",
    strokeColor: "#ec4899",
    fillColor: "transparent",
  });

  const slotW = 140;
  const slotH = 44;

  frames.forEach((f, i) => {
    const y = oy + i * (slotH + 4);
    elements.push({
      id: genId(`stack-slot-${i}`),
      type: "rounded-rect",
      x: ox + 40,
      y,
      width: slotW,
      height: slotH,
      strokeColor: f.isTop ? "#ec4899" : "#6366f1",
      fillColor: f.isTop ? "rgba(236, 72, 153, 0.22)" : "rgba(99, 102, 241, 0.14)",
      strokeWidth: f.isTop ? 2.5 : 1.5,
      strokeStyle: "solid",
      text: `[ ${f.val} ]`,
      fontSize: 14,
      fontWeight: "bold",
    });

    if (f.isTop) {
      // TOP Indicator arrow
      elements.push({
        id: genId("stack-top-ptr"),
        type: "arrow",
        x: ox + 40 + slotW + 55,
        y: y + slotH / 2,
        width: -45,
        height: 0,
        strokeColor: "#ec4899",
        fillColor: "transparent",
        strokeWidth: 2,
        endArrow: true,
      });

      elements.push({
        id: genId("stack-top-label"),
        type: "text",
        x: ox + 40 + slotW + 65,
        y: y + 10,
        width: 140,
        height: 24,
        text: "TOP (Peek / Pop)",
        fontSize: 12,
        fontWeight: "bold",
        strokeColor: "#ec4899",
      });
    }

    if (f.isBottom) {
      elements.push({
        id: genId("stack-bot-label"),
        type: "text",
        x: ox + 40 + slotW + 20,
        y: y + 12,
        width: 110,
        height: 22,
        text: "BOTTOM (Base)",
        fontSize: 11,
        strokeColor: "#94a3b8",
      });
    }
  });

  return elements;
}

// ── 4. QUEUE (FIFO) ─────────────────────────────────────────────────────────
function generateQueue(ox, oy) {
  const elements = [];
  const items = ["10", "25", "50", "75"];

  // Title
  elements.push({
    id: genId("txt-title"),
    type: "text",
    x: ox,
    y: oy - 55,
    width: 340,
    height: 26,
    text: "Queue (FIFO: First-In, First-Out)",
    fontSize: 16,
    fontWeight: "bold",
    strokeColor: "#10b981",
    fillColor: "transparent",
  });

  // Dequeue arrow on left
  elements.push({
    id: genId("q-deq-arr"),
    type: "arrow",
    x: ox + 70,
    y: oy + 26,
    width: -65,
    height: 0,
    strokeColor: "#f43f5e",
    strokeWidth: 2,
    endArrow: true,
  });

  elements.push({
    id: genId("q-deq-txt"),
    type: "text",
    x: ox - 65,
    y: oy - 22,
    width: 130,
    height: 22,
    text: "DEQUEUE ➔\n(FRONT leaves)",
    fontSize: 11,
    fontWeight: "bold",
    strokeColor: "#f43f5e",
  });

  // Queue cells
  const cellW = 68;
  const cellH = 52;
  const startX = ox + 80;

  items.forEach((val, i) => {
    const isFront = i === 0;
    const isRear = i === items.length - 1;

    elements.push({
      id: genId(`q-cell-${i}`),
      type: "rectangle",
      x: startX + i * cellW,
      y: oy,
      width: cellW,
      height: cellH,
      strokeColor: isFront ? "#f43f5e" : isRear ? "#10b981" : "#0ea5e9",
      fillColor: isFront
        ? "rgba(244, 63, 94, 0.16)"
        : isRear
        ? "rgba(16, 185, 129, 0.16)"
        : "rgba(14, 165, 233, 0.14)",
      strokeWidth: 2,
      strokeStyle: "solid",
      text: val,
      fontSize: 15,
      fontWeight: "bold",
    });
  });

  // Enqueue arrow on right
  const endX = startX + items.length * cellW;
  elements.push({
    id: genId("q-enq-arr"),
    type: "arrow",
    x: endX + 65,
    y: oy + 26,
    width: -55,
    height: 0,
    strokeColor: "#10b981",
    strokeWidth: 2,
    endArrow: true,
  });

  elements.push({
    id: genId("q-enq-txt"),
    type: "text",
    x: endX + 15,
    y: oy - 22,
    width: 130,
    height: 22,
    text: "➔ ENQUEUE\n(REAR joins)",
    fontSize: 11,
    fontWeight: "bold",
    strokeColor: "#10b981",
  });

  return elements;
}

// ── 5. BINARY SEARCH TREE (BST) ─────────────────────────────────────────────
function generateBST(ox, oy) {
  const elements = [];

  // Title
  elements.push({
    id: genId("txt-title"),
    type: "text",
    x: ox,
    y: oy - 55,
    width: 380,
    height: 26,
    text: "Binary Search Tree (BST: Left < Parent < Right)",
    fontSize: 16,
    fontWeight: "bold",
    strokeColor: "#f59e0b",
    fillColor: "transparent",
  });

  // Nodes definition
  const treeNodes = [
    { id: "root", val: "50", x: ox + 180, y: oy + 10, isRoot: true },
    { id: "l1", val: "30", x: ox + 90, y: oy + 85 },
    { id: "r1", val: "70", x: ox + 270, y: oy + 85 },
    { id: "l2_1", val: "20", x: ox + 45, y: oy + 160 },
    { id: "l2_2", val: "40", x: ox + 135, y: oy + 160 },
    { id: "r2_1", val: "60", x: ox + 225, y: oy + 160 },
    { id: "r2_2", val: "80", x: ox + 315, y: oy + 160 },
  ];

  // Edges connecting parent -> child
  const treeEdges = [
    { from: "root", to: "l1" },
    { from: "root", to: "r1" },
    { from: "l1", to: "l2_1" },
    { from: "l1", to: "l2_2" },
    { from: "r1", to: "r2_1" },
    { from: "r1", to: "r2_2" },
  ];

  const nodeMap = {};
  const r = 20;

  // Add Edges first so nodes draw on top
  treeEdges.forEach((e) => {
    const fromNode = treeNodes.find((n) => n.id === e.from);
    const toNode = treeNodes.find((n) => n.id === e.to);
    if (fromNode && toNode) {
      elements.push({
        id: genId(`bst-e-${e.from}-${e.to}`),
        type: "line",
        x: fromNode.x + r,
        y: fromNode.y + r,
        width: toNode.x - fromNode.x,
        height: toNode.y - fromNode.y,
        strokeColor: "#64748b",
        strokeWidth: 2,
        strokeStyle: "solid",
      });
    }
  });

  // Add Nodes
  treeNodes.forEach((n) => {
    elements.push({
      id: genId(`bst-node-${n.id}`),
      type: "circle",
      x: n.x,
      y: n.y,
      width: r * 2,
      height: r * 2,
      strokeColor: n.isRoot ? "#f59e0b" : "#38bdf8",
      fillColor: n.isRoot ? "rgba(245, 158, 11, 0.25)" : "rgba(56, 189, 248, 0.18)",
      strokeWidth: 2,
      strokeStyle: "solid",
      text: n.val,
      fontSize: 13,
      fontWeight: "bold",
    });
  });

  return elements;
}

// ── 6. TRIE (PREFIX TREE) ───────────────────────────────────────────────────
function generateTrie(ox, oy) {
  const elements = [];

  // Title
  elements.push({
    id: genId("txt-title"),
    type: "text",
    x: ox,
    y: oy - 55,
    width: 380,
    height: 26,
    text: 'Trie (Prefix Tree) storing: "cat", "car", "dog"',
    fontSize: 16,
    fontWeight: "bold",
    strokeColor: "#14b8a6",
    fillColor: "transparent",
  });

  const r = 18;
  const trieNodes = [
    { id: "root", char: "root", x: ox + 160, y: oy + 10, isRoot: true },
    // "c" branch
    { id: "c", char: "c", x: ox + 80, y: oy + 80 },
    { id: "ca", char: "a", x: ox + 80, y: oy + 145 },
    { id: "cat", char: "t", x: ox + 40, y: oy + 215, isEnd: true, word: "cat" },
    { id: "car", char: "r", x: ox + 120, y: oy + 215, isEnd: true, word: "car" },
    // "d" branch
    { id: "d", char: "d", x: ox + 240, y: oy + 80 },
    { id: "do", char: "o", x: ox + 240, y: oy + 145 },
    { id: "dog", char: "g", x: ox + 240, y: oy + 215, isEnd: true, word: "dog" },
  ];

  const trieEdges = [
    { from: "root", to: "c" },
    { from: "c", to: "ca" },
    { from: "ca", to: "cat" },
    { from: "ca", to: "car" },
    { from: "root", to: "d" },
    { from: "d", to: "do" },
    { from: "do", to: "dog" },
  ];

  trieEdges.forEach((e) => {
    const fn = trieNodes.find((n) => n.id === e.from);
    const tn = trieNodes.find((n) => n.id === e.to);
    if (fn && tn) {
      elements.push({
        id: genId(`trie-e-${e.from}-${e.to}`),
        type: "arrow",
        x: fn.x + r,
        y: fn.y + r,
        width: tn.x - fn.x,
        height: tn.y - fn.y,
        strokeColor: "#14b8a6",
        strokeWidth: 2,
        endArrow: true,
      });
    }
  });

  trieNodes.forEach((n) => {
    elements.push({
      id: genId(`trie-n-${n.id}`),
      type: "circle",
      x: n.x,
      y: n.y,
      width: r * 2,
      height: r * 2,
      strokeColor: n.isEnd ? "#10b981" : n.isRoot ? "#94a3b8" : "#14b8a6",
      fillColor: n.isEnd ? "rgba(16, 185, 129, 0.3)" : "rgba(20, 184, 166, 0.15)",
      strokeWidth: n.isEnd ? 2.5 : 1.5,
      strokeStyle: "solid",
      text: n.char,
      fontSize: 12,
      fontWeight: "bold",
    });

    if (n.isEnd) {
      elements.push({
        id: genId(`trie-end-${n.id}`),
        type: "text",
        x: n.x - 12,
        y: n.y + r * 2 + 3,
        width: 60,
        height: 18,
        text: `★ "${n.word}"`,
        fontSize: 10,
        fontWeight: "bold",
        strokeColor: "#10b981",
      });
    }
  });

  return elements;
}

// ── 7. BINARY HEAP (MIN-HEAP) ───────────────────────────────────────────────
function generateHeap(ox, oy) {
  const elements = [];
  const heapArray = [10, 20, 15, 30, 40, 25];

  // Title
  elements.push({
    id: genId("txt-title"),
    type: "text",
    x: ox,
    y: oy - 55,
    width: 360,
    height: 26,
    text: "Binary Min-Heap (Parent ≤ Children)",
    fontSize: 16,
    fontWeight: "bold",
    strokeColor: "#8b5cf6",
    fillColor: "transparent",
  });

  const r = 18;
  const heapNodes = [
    { id: 0, val: "10", x: ox + 140, y: oy + 10 },
    { id: 1, val: "20", x: ox + 70, y: oy + 75 },
    { id: 2, val: "15", x: ox + 210, y: oy + 75 },
    { id: 3, val: "30", x: ox + 35, y: oy + 140 },
    { id: 4, val: "40", x: ox + 105, y: oy + 140 },
    { id: 5, val: "25", x: ox + 175, y: oy + 140 },
  ];

  const heapEdges = [
    { from: 0, to: 1 },
    { from: 0, to: 2 },
    { from: 1, to: 3 },
    { from: 1, to: 4 },
    { from: 2, to: 5 },
  ];

  heapEdges.forEach((e) => {
    const fn = heapNodes.find((n) => n.id === e.from);
    const tn = heapNodes.find((n) => n.id === e.to);
    if (fn && tn) {
      elements.push({
        id: genId(`heap-e-${e.from}-${e.to}`),
        type: "line",
        x: fn.x + r,
        y: fn.y + r,
        width: tn.x - fn.x,
        height: tn.y - fn.y,
        strokeColor: "#475569",
        strokeWidth: 2,
      });
    }
  });

  heapNodes.forEach((n) => {
    elements.push({
      id: genId(`heap-n-${n.id}`),
      type: "circle",
      x: n.x,
      y: n.y,
      width: r * 2,
      height: r * 2,
      strokeColor: "#8b5cf6",
      fillColor: "rgba(139, 92, 246, 0.22)",
      strokeWidth: 2,
      text: n.val,
      fontSize: 12,
      fontWeight: "bold",
    });
  });

  // Array view below
  const arrY = oy + 200;
  const cellW = 46;
  const cellH = 40;

  elements.push({
    id: genId("heap-arr-label"),
    type: "text",
    x: ox,
    y: arrY - 24,
    width: 280,
    height: 20,
    text: "Array: [Left: 2i+1, Right: 2i+2]",
    fontSize: 11,
    strokeColor: "#94a3b8",
  });

  heapArray.forEach((val, i) => {
    elements.push({
      id: genId(`heap-cell-${i}`),
      type: "rectangle",
      x: ox + i * cellW,
      y: arrY,
      width: cellW,
      height: cellH,
      strokeColor: "#8b5cf6",
      fillColor: "rgba(139, 92, 246, 0.15)",
      strokeWidth: 1.5,
      text: String(val),
      fontSize: 13,
      fontWeight: "bold",
    });

    elements.push({
      id: genId(`heap-idx-${i}`),
      type: "text",
      x: ox + i * cellW + 12,
      y: arrY + cellH + 4,
      width: 25,
      height: 16,
      text: `[${i}]`,
      fontSize: 10,
      strokeColor: "#64748b",
    });
  });

  return elements;
}

// ── 8. GRAPH ────────────────────────────────────────────────────────────────
function generateGraph(ox, oy) {
  const elements = [];

  // Title
  elements.push({
    id: genId("txt-title"),
    type: "text",
    x: ox,
    y: oy - 55,
    width: 380,
    height: 26,
    text: "Graph (Vertices & Weighted Edges)",
    fontSize: 16,
    fontWeight: "bold",
    strokeColor: "#f43f5e",
    fillColor: "transparent",
  });

  const r = 20;
  const vertices = [
    { id: "A", x: ox + 70, y: oy + 40, color: "#38bdf8" },
    { id: "B", x: ox + 220, y: oy + 10, color: "#6366f1" },
    { id: "C", x: ox + 330, y: oy + 100, color: "#10b981" },
    { id: "D", x: ox + 200, y: oy + 190, color: "#f59e0b" },
    { id: "E", x: ox + 50, y: oy + 160, color: "#ec4899" },
  ];

  const graphEdges = [
    { u: "A", v: "B", weight: "4" },
    { u: "B", v: "C", weight: "2" },
    { u: "C", v: "D", weight: "7" },
    { u: "D", v: "E", weight: "3" },
    { u: "E", v: "A", weight: "5" },
    { u: "B", v: "D", weight: "1" },
  ];

  graphEdges.forEach((e) => {
    const uNode = vertices.find((v) => v.id === e.u);
    const vNode = vertices.find((v) => v.id === e.v);
    if (uNode && vNode) {
      elements.push({
        id: genId(`graph-e-${e.u}-${e.v}`),
        type: "line",
        x: uNode.x + r,
        y: uNode.y + r,
        width: vNode.x - uNode.x,
        height: vNode.y - uNode.y,
        strokeColor: "#475569",
        strokeWidth: 2,
        strokeStyle: "solid",
      });

      // Midpoint weight badge
      const midX = (uNode.x + vNode.x) / 2 + 10;
      const midY = (uNode.y + vNode.y) / 2 + 10;
      elements.push({
        id: genId(`graph-w-${e.u}-${e.v}`),
        type: "text",
        x: midX,
        y: midY,
        width: 25,
        height: 18,
        text: e.weight,
        fontSize: 11,
        fontWeight: "bold",
        strokeColor: "#fbbf24",
      });
    }
  });

  vertices.forEach((v) => {
    elements.push({
      id: genId(`graph-v-${v.id}`),
      type: "circle",
      x: v.x,
      y: v.y,
      width: r * 2,
      height: r * 2,
      strokeColor: v.color,
      fillColor: "rgba(15, 23, 42, 0.9)",
      strokeWidth: 2.5,
      text: v.id,
      fontSize: 14,
      fontWeight: "bold",
    });
  });

  return elements;
}

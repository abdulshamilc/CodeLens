// src/tools/dsv/topics/tree/treeEngine.js
// Pure step-recorder functions for Binary Tree types and traversals
// Records traveling paths, active edge traversals, and visited order.

export function getTreePreset(type) {
  if (type === "full") {
    return {
      id: "1", val: 50,
      left: { id: "2", val: 25, left: { id: "4", val: 10, left: null, right: null }, right: { id: "5", val: 35, left: null, right: null } },
      right: { id: "3", val: 75, left: null, right: null },
    };
  }
  if (type === "complete") {
    return {
      id: "1", val: 50,
      left: { id: "2", val: 30, left: { id: "4", val: 20, left: null, right: null }, right: { id: "5", val: 40, left: null, right: null } },
      right: { id: "3", val: 70, left: { id: "6", val: 60, left: null, right: null }, right: null },
    };
  }
  if (type === "perfect") {
    return {
      id: "1", val: 50,
      left: { id: "2", val: 25, left: { id: "4", val: 12, left: null, right: null }, right: { id: "5", val: 37, left: null, right: null } },
      right: { id: "3", val: 75, left: { id: "6", val: 62, left: null, right: null }, right: { id: "7", val: 87, left: null, right: null } },
    };
  }
  if (type === "skewed") {
    return {
      id: "1", val: 10,
      left: null,
      right: { id: "2", val: 20, left: null, right: { id: "3", val: 30, left: null, right: { id: "4", val: 40, left: null, right: null } } },
    };
  }
  // Default: Balanced
  return {
    id: "1", val: 50,
    left: { id: "2", val: 25, left: { id: "4", val: 15, left: null, right: null }, right: { id: "5", val: 35, left: null, right: null } },
    right: { id: "3", val: 75, left: { id: "6", val: 65, left: null, right: null }, right: { id: "7", val: 85, left: null, right: null } },
  };
}

export function layoutBinaryTree(root, width = 600) {
  const nodes = [];
  const edges = [];

  function assignCoords(node, leftBound, rightBound, depth) {
    if (!node) return;
    const x = (leftBound + rightBound) / 2;
    const y = 35 + depth * 55;

    nodes.push({ id: node.id, val: node.val, x, y });

    if (node.left) {
      const childX = (leftBound + x) / 2;
      const childY = 35 + (depth + 1) * 55;
      edges.push({ id: `${node.id}-${node.left.id}`, from: node.id, to: node.left.id, x1: x, y1: y, x2: childX, y2: childY });
      assignCoords(node.left, leftBound, x, depth + 1);
    }
    if (node.right) {
      const childX = (x + rightBound) / 2;
      const childY = 35 + (depth + 1) * 55;
      edges.push({ id: `${node.id}-${node.right.id}`, from: node.id, to: node.right.id, x1: x, y1: y, x2: childX, y2: childY });
      assignCoords(node.right, x, rightBound, depth + 1);
    }
  }

  assignCoords(root, 20, width - 20, 0);
  return { nodes, edges };
}

export function generateInorderSteps(root) {
  const steps = [];
  const visited = [];
  const visitedIds = [];

  steps.push({
    activeId: null,
    activeEdgeId: null,
    visited: [],
    visitedIds: [],
    message: "Starting In-Order Traversal (Left ➔ Root ➔ Right). Starting journey from ROOT.",
  });

  function traverse(node, parentId = null) {
    if (!node) return;

    // Step: Travel to node
    steps.push({
      activeId: node.id,
      activeEdgeId: parentId ? `${parentId}-${node.id}` : null,
      visited: [...visited],
      visitedIds: [...visitedIds],
      message: `At node (${node.val}). Exploring its LEFT subtree first.`,
    });

    traverse(node.left, node.id);

    // Step: Visit node itself
    visited.push(node.val);
    visitedIds.push(node.id);

    steps.push({
      activeId: node.id,
      activeEdgeId: null,
      visited: [...visited],
      visitedIds: [...visitedIds],
      message: `VISITING node (${node.val})! Left subtree finished. Added ${node.val} to traversal order.`,
    });

    // Step: Explore right subtree
    if (node.right) {
      steps.push({
        activeId: node.id,
        activeEdgeId: `${node.id}-${node.right.id}`,
        visited: [...visited],
        visitedIds: [...visitedIds],
        message: `Node (${node.val}) visited. Now exploring its RIGHT subtree (node ${node.right.val}).`,
      });
    }

    traverse(node.right, node.id);
  }

  traverse(root);

  steps.push({
    activeId: null,
    activeEdgeId: null,
    visited: [...visited],
    visitedIds: [...visitedIds],
    message: `In-Order Traversal complete! Visited order: [${visited.join(", ")}].`,
  });

  return steps;
}

export function generatePreorderSteps(root) {
  const steps = [];
  const visited = [];
  const visitedIds = [];

  steps.push({
    activeId: null,
    activeEdgeId: null,
    visited: [],
    visitedIds: [],
    message: "Starting Pre-Order Traversal (Root ➔ Left ➔ Right). Node is visited immediately when encountered.",
  });

  function traverse(node, parentId = null) {
    if (!node) return;

    // Visit Root first
    visited.push(node.val);
    visitedIds.push(node.id);

    steps.push({
      activeId: node.id,
      activeEdgeId: parentId ? `${parentId}-${node.id}` : null,
      visited: [...visited],
      visitedIds: [...visitedIds],
      message: `VISITING node (${node.val}) immediately. Added ${node.val} to traversal order.`,
    });

    if (node.left) {
      steps.push({
        activeId: node.id,
        activeEdgeId: `${node.id}-${node.left.id}`,
        visited: [...visited],
        visitedIds: [...visitedIds],
        message: `Moving down edge to LEFT child (${node.left.val}).`,
      });
    }
    traverse(node.left, node.id);

    if (node.right) {
      steps.push({
        activeId: node.id,
        activeEdgeId: `${node.id}-${node.right.id}`,
        visited: [...visited],
        visitedIds: [...visitedIds],
        message: `Moving down edge to RIGHT child (${node.right.val}).`,
      });
    }
    traverse(node.right, node.id);
  }

  traverse(root);

  steps.push({
    activeId: null,
    activeEdgeId: null,
    visited: [...visited],
    visitedIds: [...visitedIds],
    message: `Pre-Order Traversal complete! Visited order: [${visited.join(", ")}].`,
  });

  return steps;
}

export function generatePostorderSteps(root) {
  const steps = [];
  const visited = [];
  const visitedIds = [];

  steps.push({
    activeId: null,
    activeEdgeId: null,
    visited: [],
    visitedIds: [],
    message: "Starting Post-Order Traversal (Left ➔ Right ➔ Root). Node is visited after both its subtrees.",
  });

  function traverse(node, parentId = null) {
    if (!node) return;

    steps.push({
      activeId: node.id,
      activeEdgeId: parentId ? `${parentId}-${node.id}` : null,
      visited: [...visited],
      visitedIds: [...visitedIds],
      message: `Encountered node (${node.val}). Visiting left child first.`,
    });

    traverse(node.left, node.id);
    traverse(node.right, node.id);

    visited.push(node.val);
    visitedIds.push(node.id);

    steps.push({
      activeId: node.id,
      activeEdgeId: null,
      visited: [...visited],
      visitedIds: [...visitedIds],
      message: `Both subtrees of (${node.val}) are processed. VISITING node (${node.val}) now!`,
    });
  }

  traverse(root);

  steps.push({
    activeId: null,
    activeEdgeId: null,
    visited: [...visited],
    visitedIds: [...visitedIds],
    message: `Post-Order Traversal complete! Visited order: [${visited.join(", ")}].`,
  });

  return steps;
}

export function generateLevelOrderSteps(root) {
  const steps = [];
  const visited = [];
  const visitedIds = [];

  if (!root) return steps;

  steps.push({
    activeId: null,
    activeEdgeId: null,
    visited: [],
    visitedIds: [],
    message: "Starting Level-Order Traversal (BFS). Traverses the tree level-by-level using a FIFO queue.",
  });

  const queue = [root];

  while (queue.length > 0) {
    const curr = queue.shift();
    visited.push(curr.val);
    visitedIds.push(curr.id);

    steps.push({
      activeId: curr.id,
      activeEdgeId: null,
      visited: [...visited],
      visitedIds: [...visitedIds],
      message: `Dequeued and VISITED node (${curr.val}) on current level.`,
    });

    if (curr.left) {
      queue.push(curr.left);
      steps.push({
        activeId: curr.id,
        activeEdgeId: `${curr.id}-${curr.left.id}`,
        visited: [...visited],
        visitedIds: [...visitedIds],
        message: `Enqueued LEFT child (${curr.left.val}) for the next level.`,
      });
    }

    if (curr.right) {
      queue.push(curr.right);
      steps.push({
        activeId: curr.id,
        activeEdgeId: `${curr.id}-${curr.right.id}`,
        visited: [...visited],
        visitedIds: [...visitedIds],
        message: `Enqueued RIGHT child (${curr.right.val}) for the next level.`,
      });
    }
  }

  steps.push({
    activeId: null,
    activeEdgeId: null,
    visited: [...visited],
    visitedIds: [...visitedIds],
    message: `Level-Order Traversal complete! Order: [${visited.join(", ")}].`,
  });

  return steps;
}

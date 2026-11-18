// src/tools/dsv/topics/bst/bstEngine.js
// Pure step-recorder functions for BST Insert, Search, and 3-case Deletion

let bstNodeId = 100;
export function createBSTNode(val) {
  return {
    id: `bst-${++bstNodeId}`,
    val: Number(val),
    left: null,
    right: null,
  };
}

export function cloneBST(node) {
  if (!node) return null;
  return {
    id: node.id,
    val: node.val,
    left: cloneBST(node.left),
    right: cloneBST(node.right),
  };
}

export function createInitialBST() {
  const root = createBSTNode(50);
  root.left = createBSTNode(30);
  root.right = createBSTNode(70);
  root.left.left = createBSTNode(20);
  root.left.right = createBSTNode(40);
  root.right.left = createBSTNode(60);
  root.right.right = createBSTNode(80);
  return root;
}

// Compute dynamic coordinates
export function layoutBST(root, width = 600) {
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
      edges.push({ id: `${node.id}-${node.left.id}`, x1: x, y1: y, x2: childX, y2: childY });
      assignCoords(node.left, leftBound, x, depth + 1);
    }
    if (node.right) {
      const childX = (x + rightBound) / 2;
      const childY = 35 + (depth + 1) * 55;
      edges.push({ id: `${node.id}-${node.right.id}`, x1: x, y1: y, x2: childX, y2: childY });
      assignCoords(node.right, x, rightBound, depth + 1);
    }
  }

  assignCoords(root, 20, width - 20, 0);
  return { nodes, edges };
}

export function generateBSTSearchSteps(root, target) {
  const steps = [];
  const tgt = Number(target);

  steps.push({
    root: cloneBST(root),
    activeId: null,
    found: false,
    message: `Searching for target ${tgt} starting from ROOT (${root?.val}).`,
  });

  let curr = root;
  while (curr) {
    steps.push({
      root: cloneBST(root),
      activeId: curr.id,
      found: false,
      message: `Comparing target ${tgt} with node (${curr.val}).`,
    });

    if (curr.val === tgt) {
      steps.push({
        root: cloneBST(root),
        activeId: curr.id,
        found: true,
        message: `Found target ${tgt} at node (${curr.val}) in O(log n) average time!`,
      });
      return steps;
    } else if (tgt < curr.val) {
      steps.push({
        root: cloneBST(root),
        activeId: curr.id,
        found: false,
        message: `${tgt} < ${curr.val}: Moving to LEFT subtree.`,
      });
      curr = curr.left;
    } else {
      steps.push({
        root: cloneBST(root),
        activeId: curr.id,
        found: false,
        message: `${tgt} > ${curr.val}: Moving to RIGHT subtree.`,
      });
      curr = curr.right;
    }
  }

  steps.push({
    root: cloneBST(root),
    activeId: null,
    found: false,
    message: `Reached null branch. Target ${tgt} does not exist in this BST.`,
  });

  return steps;
}

export function generateBSTInsertSteps(root, value) {
  const steps = [];
  const val = Number(value);
  const updatedRoot = cloneBST(root);

  steps.push({
    root: cloneBST(updatedRoot),
    activeId: null,
    message: `Preparing to insert value ${val} into BST.`,
  });

  if (!updatedRoot) {
    const newRoot = createBSTNode(val);
    steps.push({
      root: newRoot,
      activeId: newRoot.id,
      message: `BST was empty. Set ROOT to new node (${val}).`,
    });
    return { steps, updatedRoot: newRoot };
  }

  let curr = updatedRoot;
  while (curr) {
    steps.push({
      root: cloneBST(updatedRoot),
      activeId: curr.id,
      message: `Comparing ${val} with node (${curr.val}).`,
    });

    if (val === curr.val) {
      steps.push({
        root: cloneBST(updatedRoot),
        activeId: curr.id,
        message: `Duplicate value ${val} already exists! BST maintains unique keys.`,
      });
      return { steps, updatedRoot };
    } else if (val < curr.val) {
      if (!curr.left) {
        curr.left = createBSTNode(val);
        steps.push({
          root: cloneBST(updatedRoot),
          activeId: curr.left.id,
          message: `${val} < ${curr.val} and left is empty. Attached new node (${val}) as LEFT child.`,
        });
        break;
      }
      curr = curr.left;
    } else {
      if (!curr.right) {
        curr.right = createBSTNode(val);
        steps.push({
          root: cloneBST(updatedRoot),
          activeId: curr.right.id,
          message: `${val} > ${curr.val} and right is empty. Attached new node (${val}) as RIGHT child.`,
        });
        break;
      }
      curr = curr.right;
    }
  }

  return { steps, updatedRoot };
}

export function generateBSTDeleteSteps(root, value) {
  const steps = [];
  const val = Number(value);
  const updatedRoot = cloneBST(root);

  steps.push({
    root: cloneBST(updatedRoot),
    activeId: null,
    message: `Searching for value ${val} to delete from BST.`,
  });

  function deleteNode(node, target) {
    if (!node) return null;

    steps.push({
      root: cloneBST(updatedRoot),
      activeId: node.id,
      message: `Inspecting node (${node.val}). Comparing with target ${target}.`,
    });

    if (target < node.val) {
      node.left = deleteNode(node.left, target);
      return node;
    } else if (target > node.val) {
      node.right = deleteNode(node.right, target);
      return node;
    } else {
      // Node found! Handle the 3 cases
      // Case 1: Leaf node (no children)
      if (!node.left && !node.right) {
        steps.push({
          root: cloneBST(updatedRoot),
          activeId: node.id,
          message: `Case 1: Node (${node.val}) is a leaf with no children. Removing directly.`,
        });
        return null;
      }

      // Case 2: One child
      if (!node.left) {
        steps.push({
          root: cloneBST(updatedRoot),
          activeId: node.id,
          message: `Case 2: Node (${node.val}) has only right child (${node.right.val}). Bypassing node to its right child.`,
        });
        return node.right;
      }
      if (!node.right) {
        steps.push({
          root: cloneBST(updatedRoot),
          activeId: node.id,
          message: `Case 2: Node (${node.val}) has only left child (${node.left.val}). Bypassing node to its left child.`,
        });
        return node.left;
      }

      // Case 3: Two children
      // Find inorder successor (smallest value in right subtree)
      let successor = node.right;
      while (successor.left) {
        successor = successor.left;
      }

      steps.push({
        root: cloneBST(updatedRoot),
        activeId: successor.id,
        message: `Case 3: Node (${node.val}) has two children. Found Inorder Successor (${successor.val}) in right subtree.`,
      });

      node.val = successor.val;
      steps.push({
        root: cloneBST(updatedRoot),
        activeId: node.id,
        message: `Replaced value with successor (${successor.val}). Now deleting successor from right subtree.`,
      });

      node.right = deleteNode(node.right, successor.val);
      return node;
    }
  }

  const finalTree = deleteNode(updatedRoot, val);
  steps.push({
    root: cloneBST(finalTree),
    activeId: null,
    message: `Deletion of ${val} complete. BST property maintained.`,
  });

  return { steps, updatedRoot: finalTree };
}

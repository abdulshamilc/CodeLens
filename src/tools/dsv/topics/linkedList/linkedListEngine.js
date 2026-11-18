// src/tools/dsv/topics/linkedList/linkedListEngine.js
// Rich step-recorder for Linked Lists with explicit pointer movements (HEAD, TAIL, CURR, PREV, NEXT)
// and arrow state transitions (normal, breaking, flipping, newly linked).

let nextNodeId = 100;

function createNode(val) {
  return {
    id: `node-${++nextNodeId}`,
    data: Number(val),
  };
}

export function generateInsertHeadSteps(nodes, value, isDoubly = false, isCircular = false) {
  const steps = [];
  const val = Number(value);
  const newNode = createNode(val);

  // Step 1: Allocate new node in memory (unlinked)
  steps.push({
    nodes: [...nodes],
    pendingNode: newNode,
    pointers: { head: nodes.length > 0 ? 0 : null, tail: nodes.length > 0 ? nodes.length - 1 : null, newNode: "pending" },
    arrowDirections: nodes.map(() => "forward"),
    message: `Step 1: Allocated new node with value ${val} in heap memory. Its 'next' pointer is currently null.`,
  });

  if (nodes.length === 0) {
    steps.push({
      nodes: [newNode],
      pendingNode: null,
      pointers: { head: 0, tail: 0 },
      arrowDirections: ["forward"],
      message: `Step 2: List was empty. Pointed HEAD and TAIL directly to node (${val}).`,
    });
    return steps;
  }

  // Step 2: Link newNode.next = head
  steps.push({
    nodes: [...nodes],
    pendingNode: newNode,
    pendingNextTo: nodes[0].id,
    pointers: { head: 0, tail: nodes.length - 1, newNode: "linking" },
    arrowDirections: nodes.map(() => "forward"),
    message: `Step 2: Linking pointer: newNode.next = HEAD. Pointed new node's next arrow to current head node (${nodes[0].data}).`,
  });

  // Step 3 (Doubly): oldHead.prev = newNode
  if (isDoubly) {
    steps.push({
      nodes: [...nodes],
      pendingNode: newNode,
      pendingNextTo: nodes[0].id,
      pointers: { head: 0, tail: nodes.length - 1, newNode: "linking" },
      arrowDirections: nodes.map(() => "forward"),
      message: `Step 3 (Doubly): Set old HEAD's prev pointer back to point to newNode (${val}).`,
    });
  }

  // Step 4: Advance HEAD pointer to newNode
  const updated = [newNode, ...nodes];
  steps.push({
    nodes: updated,
    pendingNode: null,
    pointers: { head: 0, tail: updated.length - 1 },
    arrowDirections: updated.map(() => "forward"),
    message: `Step ${isDoubly ? 4 : 3}: Updated HEAD = newNode. HEAD pointer now points to (${val}). Insert Head complete in O(1) time!`,
  });

  return steps;
}

export function generateInsertTailSteps(nodes, value, isDoubly = false, isCircular = false) {
  const steps = [];
  const val = Number(value);
  const newNode = createNode(val);

  // Step 1: Allocate new node
  steps.push({
    nodes: [...nodes],
    pendingNode: newNode,
    pointers: { head: nodes.length > 0 ? 0 : null, tail: nodes.length > 0 ? nodes.length - 1 : null },
    arrowDirections: nodes.map(() => "forward"),
    message: `Step 1: Allocated new node (${val}) to append at TAIL.`,
  });

  if (nodes.length === 0) {
    steps.push({
      nodes: [newNode],
      pendingNode: null,
      pointers: { head: 0, tail: 0 },
      arrowDirections: ["forward"],
      message: `List was empty. Set HEAD and TAIL to node (${val}).`,
    });
    return steps;
  }

  // Step 2: Traverse along the list to reach TAIL with a visible CURR pointer
  for (let i = 0; i < nodes.length; i++) {
    steps.push({
      nodes: [...nodes],
      pendingNode: newNode,
      pointers: { head: 0, curr: i, tail: nodes.length - 1 },
      arrowDirections: nodes.map(() => "forward"),
      message: `Traversing: Pointer 'curr' advances to node[${i}] (${nodes[i].data}).`,
    });
  }

  const lastIdx = nodes.length - 1;

  // Step 3: Link tail.next = newNode
  steps.push({
    nodes: [...nodes],
    pendingNode: newNode,
    pointers: { head: 0, tail: lastIdx, curr: lastIdx },
    arrowDirections: nodes.map(() => "forward"),
    linkingTailToNew: true,
    message: `Found TAIL node (${nodes[lastIdx].data}). Setting tail.next = newNode (${val}).`,
  });

  // Step 4: Advance TAIL pointer
  const updated = [...nodes, newNode];
  steps.push({
    nodes: updated,
    pendingNode: null,
    pointers: { head: 0, tail: updated.length - 1 },
    arrowDirections: updated.map(() => "forward"),
    message: `Updated TAIL pointer to point to newly appended node (${val}). Insert Tail complete!`,
  });

  return steps;
}

export function generateDeleteHeadSteps(nodes, isDoubly = false, isCircular = false) {
  const steps = [];

  if (nodes.length === 0) {
    steps.push({
      nodes: [],
      pointers: {},
      message: "List is empty (HEAD = NULL). Cannot delete.",
    });
    return steps;
  }

  if (nodes.length === 1) {
    steps.push({
      nodes: [...nodes],
      pointers: { head: 0, curr: 0 },
      deletingIdx: 0,
      message: `Targeting single node (${nodes[0].data}). Removing it clears HEAD and TAIL.`,
    });
    steps.push({
      nodes: [],
      pointers: {},
      message: "Deleted node. List is now empty (HEAD = NULL).",
    });
    return steps;
  }

  // Step 1: Identify node to delete with CURR pointer
  steps.push({
    nodes: [...nodes],
    pointers: { head: 0, curr: 0, tail: nodes.length - 1 },
    deletingIdx: 0,
    message: `Step 1: 'curr' points to HEAD node (${nodes[0].data}) marked for deletion.`,
  });

  // Step 2: Advance HEAD pointer to head.next
  steps.push({
    nodes: [...nodes],
    pointers: { head: 1, curr: 0, tail: nodes.length - 1 },
    deletingIdx: 0,
    message: `Step 2: HEAD advances to head.next (${nodes[1].data}). Old head (${nodes[0].data}) is bypassed.`,
  });

  // Step 3: Sever pointer and free memory
  const updated = nodes.slice(1);
  steps.push({
    nodes: updated,
    pointers: { head: 0, tail: updated.length - 1 },
    message: `Step 3: Memory for node (${nodes[0].data}) freed. New HEAD is (${updated[0].data}). Deletion complete!`,
  });

  return steps;
}

export function generateDeleteTailSteps(nodes, isDoubly = false, isCircular = false) {
  const steps = [];

  if (nodes.length <= 1) {
    return generateDeleteHeadSteps(nodes, isDoubly, isCircular);
  }

  const lastIdx = nodes.length - 1;
  const secondLast = lastIdx - 1;

  // Step 1: Traverse to find second-to-last node
  for (let i = 0; i <= secondLast; i++) {
    steps.push({
      nodes: [...nodes],
      pointers: { head: 0, curr: i, tail: lastIdx },
      message: `Traversing: 'curr' at node[${i}] (${nodes[i].data}) searching for second-to-last node.`,
    });
  }

  // Step 2: Sever connection from secondLast to tail
  steps.push({
    nodes: [...nodes],
    pointers: { head: 0, curr: secondLast, tail: lastIdx },
    severingEdge: secondLast,
    message: `Severing pointer: curr.next = null. Node (${nodes[lastIdx].data}) is disconnected from the chain.`,
  });

  // Step 3: Advance TAIL pointer
  const updated = nodes.slice(0, -1);
  steps.push({
    nodes: updated,
    pointers: { head: 0, tail: updated.length - 1 },
    message: `Updated TAIL pointer to node[${secondLast}] (${updated[updated.length - 1].data}). Delete Tail complete!`,
  });

  return steps;
}

export function generateReverseSteps(nodes) {
  const steps = [];

  if (nodes.length <= 1) {
    steps.push({
      nodes: [...nodes],
      pointers: { head: 0 },
      arrowDirections: nodes.map(() => "forward"),
      message: "List has 0 or 1 node. Reversal complete.",
    });
    return steps;
  }

  // Initial state with 3 pointers: prev = null, curr = 0, next = 1
  steps.push({
    nodes: [...nodes],
    pointers: { prev: null, curr: 0, next: 1, head: 0, tail: nodes.length - 1 },
    arrowDirections: nodes.map(() => "forward"),
    message: "Starting In-Place Reversal. We maintain 3 pointers: prev = NULL, curr = HEAD, next = HEAD.next.",
  });

  const arrowDirections = nodes.map(() => "forward");
  let prevIdx = null;

  for (let currIdx = 0; currIdx < nodes.length; currIdx++) {
    const nextIdx = currIdx + 1 < nodes.length ? currIdx + 1 : null;

    // Step A: save next pointer
    steps.push({
      nodes: [...nodes],
      pointers: { prev: prevIdx, curr: currIdx, next: nextIdx, head: 0 },
      arrowDirections: [...arrowDirections],
      message: `Pointer state: 'curr' is at node (${nodes[currIdx].data}). 'next' tracks remaining list (${nextIdx !== null ? nodes[nextIdx].data : "NULL"}).`,
    });

    // Step B: flip curr's arrow backwards to prev
    if (currIdx > 0) {
      arrowDirections[currIdx - 1] = "backward";
    }

    steps.push({
      nodes: [...nodes],
      pointers: { prev: prevIdx, curr: currIdx, next: nextIdx, head: 0 },
      arrowDirections: [...arrowDirections],
      flippingIdx: currIdx,
      message: `FLIPPING ARROW: curr.next = prev. Node (${nodes[currIdx].data}) now points backward to ${prevIdx !== null ? `node (${nodes[prevIdx].data})` : "NULL"}!`,
    });

    // Step C: slide pointers forward
    prevIdx = currIdx;
    steps.push({
      nodes: [...nodes],
      pointers: { prev: prevIdx, curr: nextIdx, next: nextIdx !== null && nextIdx + 1 < nodes.length ? nextIdx + 1 : null, head: 0 },
      arrowDirections: [...arrowDirections],
      message: `Advancing pointers: 'prev' moves to (${nodes[prevIdx].data}), 'curr' moves to ${nextIdx !== null ? `(${nodes[nextIdx].data})` : "NULL"}.`,
    });
  }

  // Final step: update HEAD to old TAIL
  const reversed = [...nodes].reverse();
  steps.push({
    nodes: reversed,
    pointers: { head: 0, tail: reversed.length - 1 },
    arrowDirections: reversed.map(() => "forward"),
    message: `Reversal complete! Old TAIL (${reversed[0].data}) is now the new HEAD. All links successfully reversed!`,
  });

  return steps;
}

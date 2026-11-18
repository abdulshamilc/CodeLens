// src/tools/dsv/topics/graph/graphEngine.js
// Pure step-recorder functions for Graph algorithms (BFS, DFS, Directed, Undirected, Weighted)

export const DEFAULT_GRAPH_NODES = [
  { id: "A", label: "A", x: 100, y: 55 },
  { id: "B", label: "B", x: 260, y: 55 },
  { id: "C", label: "C", x: 420, y: 55 },
  { id: "D", label: "D", x: 100, y: 175 },
  { id: "E", label: "E", x: 260, y: 175 },
  { id: "F", label: "F", x: 420, y: 175 },
];

export const DEFAULT_GRAPH_EDGES = [
  { from: "A", to: "B", weight: 4 },
  { from: "A", to: "D", weight: 2 },
  { from: "B", to: "C", weight: 5 },
  { from: "B", to: "E", weight: 10 },
  { from: "C", to: "F", weight: 3 },
  { from: "D", to: "E", weight: 7 },
  { from: "E", to: "F", weight: 1 },
];

export function buildAdjacencyList(nodes, edges, isDirected = false) {
  const adj = {};
  nodes.forEach((n) => {
    adj[n.id] = [];
  });
  edges.forEach((e) => {
    if (adj[e.from]) adj[e.from].push({ to: e.to, weight: e.weight });
    if (!isDirected && adj[e.to]) {
      adj[e.to].push({ to: e.from, weight: e.weight });
    }
  });
  return adj;
}

export function generateBFSSteps(nodes, edges, startId = "A", isDirected = false) {
  const adj = buildAdjacencyList(nodes, edges, isDirected);
  const steps = [];

  const visited = new Set();
  const queue = [startId];
  const visitOrder = [];

  const msg1 = `Starting Breadth-First Search (BFS) from node ${startId}. Enqueued ${startId}.`;
  steps.push({
    activeNode: startId,
    visited: [],
    queue: [...queue],
    currentEdge: null,
    message: msg1,
    explanation: msg1,
  });

  visited.add(startId);

  while (queue.length > 0) {
    const curr = queue.shift();
    visitOrder.push(curr);

    const msgDeq = `Dequeued node ${curr}. Processing its adjacent neighbors.`;
    steps.push({
      activeNode: curr,
      visited: [...visitOrder],
      queue: [...queue],
      currentEdge: null,
      message: msgDeq,
      explanation: msgDeq,
    });

    const neighbors = adj[curr] || [];
    for (const neighbor of neighbors) {
      const neighborId = neighbor.to;
      const isUnvisited = !visited.has(neighborId);

      const msgCheck = `Checking edge (${curr} -> ${neighborId}). Visited? ${!isUnvisited ? "Yes (skip)" : "No (enqueue)"}`;
      steps.push({
        activeNode: curr,
        visited: [...visitOrder],
        queue: [...queue],
        currentEdge: { from: curr, to: neighborId },
        message: msgCheck,
        explanation: msgCheck,
      });

      if (isUnvisited) {
        visited.add(neighborId);
        queue.push(neighborId);

        const msgEnq = `Discovered node ${neighborId}! Enqueued into BFS Queue.`;
        steps.push({
          activeNode: curr,
          visited: [...visitOrder],
          queue: [...queue],
          currentEdge: { from: curr, to: neighborId },
          message: msgEnq,
          explanation: msgEnq,
        });
      }
    }
  }

  const msgEnd = `BFS complete! All reachable vertices visited: [${visitOrder.join(", ")}].`;
  steps.push({
    activeNode: null,
    visited: [...visitOrder],
    queue: [],
    currentEdge: null,
    message: msgEnd,
    explanation: msgEnd,
  });

  return steps;
}

export function generateDFSSteps(nodes, edges, startId = "A", isDirected = false) {
  const adj = buildAdjacencyList(nodes, edges, isDirected);
  const steps = [];

  const visited = new Set();
  const visitOrder = [];
  const stack = [startId];

  const msg1 = `Starting Depth-First Search (DFS) from node ${startId}. Pushed ${startId} onto Stack.`;
  steps.push({
    activeNode: startId,
    visited: [],
    stack: [...stack],
    currentEdge: null,
    message: msg1,
    explanation: msg1,
  });

  function dfs(curr, parent = null) {
    visited.add(curr);
    visitOrder.push(curr);

    const msgVisit = `Visiting node ${curr}. Exploring its branch deeply before backtracking.`;
    steps.push({
      activeNode: curr,
      visited: [...visitOrder],
      stack: [...stack],
      currentEdge: parent ? { from: parent, to: curr } : null,
      message: msgVisit,
      explanation: msgVisit,
    });

    const neighbors = adj[curr] || [];
    for (const neighbor of neighbors) {
      const neighborId = neighbor.to;

      if (!visited.has(neighborId)) {
        stack.push(neighborId);
        const msgDive = `Advancing down edge (${curr} -> ${neighborId}).`;
        steps.push({
          activeNode: curr,
          visited: [...visitOrder],
          stack: [...stack],
          currentEdge: { from: curr, to: neighborId },
          message: msgDive,
          explanation: msgDive,
        });

        dfs(neighborId, curr);

        stack.pop();
        const msgBack = `Backtracked to node ${curr}. Continuing with next branch.`;
        steps.push({
          activeNode: curr,
          visited: [...visitOrder],
          stack: [...stack],
          currentEdge: null,
          message: msgBack,
          explanation: msgBack,
        });
      }
    }
  }

  dfs(startId);

  const msgEnd = `DFS complete! Visited sequence: [${visitOrder.join(", ")}].`;
  steps.push({
    activeNode: null,
    visited: [...visitOrder],
    stack: [],
    currentEdge: null,
    message: msgEnd,
    explanation: msgEnd,
  });

  return steps;
}

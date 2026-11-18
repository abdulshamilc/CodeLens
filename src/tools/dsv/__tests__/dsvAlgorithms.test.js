// Unit tests for DSV Algorithm Engines
import { describe, it, expect } from "vitest";

// Array
import {
  generateAccessSteps,
  generateInsertSteps,
  generateDeleteSteps,
  generateLinearSearchSteps,
  generateBinarySearchSteps,
  generateDynamicArrayPushSteps,
} from "../topics/array/arrayEngine";

// String
import {
  generatePalindromeSteps,
  generateFrequencySteps,
  generatePatternSearchSteps,
} from "../topics/string/stringEngine";

// Linked List
import {
  generateInsertHeadSteps,
  generateInsertTailSteps,
  generateDeleteHeadSteps,
  generateReverseSteps,
} from "../topics/linkedList/linkedListEngine";

// Stack
import {
  generatePushSteps,
  generatePopSteps,
  generatePeekSteps,
} from "../topics/stack/stackEngine";

// Queue
import {
  generateEnqueueSteps,
  generateDequeueSteps,
} from "../topics/queue/queueEngine";

// Hash Table
import {
  generateChainingInsertSteps,
  generateProbingInsertSteps,
} from "../topics/hashTable/hashTableEngine";

// Recursion
import {
  generateFactorialSteps,
  generateFibonacciSteps,
} from "../topics/recursion/recursionEngine";

// Sorting
import {
  generateBubbleSortSteps,
  generateSelectionSortSteps,
  generateInsertionSortSteps,
  generateMergeSortSteps,
  generateQuickSortSteps,
} from "../topics/sorting/sortingEngine";

// Tree & BST
import {
  generateInorderSteps,
  generatePreorderSteps,
  generateLevelOrderSteps,
} from "../topics/tree/treeEngine";
import {
  generateBSTSearchSteps,
  generateBSTInsertSteps,
  generateBSTDeleteSteps,
} from "../topics/bst/bstEngine";

// Heap
import {
  generateHeapInsertSteps,
  generateHeapExtractSteps,
} from "../topics/heap/heapEngine";

// Trie
import {
  createInitialTrie,
  generateTrieInsertSteps,
  generateTrieSearchSteps,
} from "../topics/trie/trieEngine";

// Graph
import {
  DEFAULT_GRAPH_NODES,
  DEFAULT_GRAPH_EDGES,
  generateBFSSteps,
  generateDFSSteps,
} from "../topics/graph/graphEngine";

describe("DSV Algorithm Step Generators", () => {
  describe("Array Engine", () => {
    it("generates steps for array access, insert, and delete", () => {
      const arr = [10, 20, 30];
      const accessSteps = generateAccessSteps(arr, 1);
      expect(accessSteps.length).toBeGreaterThan(0);
      expect(accessSteps[accessSteps.length - 1].message).toContain("Retrieved value 20 in O(1) time");

      const insertSteps = generateInsertSteps(arr, 1, 99);
      expect(insertSteps.length).toBeGreaterThan(1);
      expect(insertSteps[insertSteps.length - 1].array).toEqual([10, 99, 20, 30]);

      const deleteSteps = generateDeleteSteps(arr, 1);
      expect(deleteSteps[deleteSteps.length - 1].array).toEqual([10, 30]);
    });

    it("generates linear and binary search steps", () => {
      const arr = [10, 20, 30, 40, 50];
      const linSteps = generateLinearSearchSteps(arr, 30);
      expect(linSteps[linSteps.length - 1].message).toContain("Found target 30 at index [2]");

      const binSteps = generateBinarySearchSteps(arr, 40);
      expect(binSteps[binSteps.length - 1].message).toContain("Found target 40 at mid index [3]");
    });

    it("simulates dynamic array capacity doubling", () => {
      const dynamicSteps = generateDynamicArrayPushSteps([1, 2, 3, 4], 4, 99);
      expect(dynamicSteps.length).toBeGreaterThan(2);
      const last = dynamicSteps[dynamicSteps.length - 1];
      expect(last.capacity).toBe(8);
      expect(last.array.length).toBe(5);
    });
  });

  describe("String Engine", () => {
    it("checks palindrome correctly", () => {
      const stepsRacecar = generatePalindromeSteps("racecar");
      expect(stepsRacecar[stepsRacecar.length - 1].message).toContain("IS a valid palindrome");

      const stepsHello = generatePalindromeSteps("hello");
      expect(stepsHello[stepsHello.length - 1].message).toContain("is NOT a palindrome");
    });

    it("counts character frequencies", () => {
      const steps = generateFrequencySteps("aba");
      const last = steps[steps.length - 1];
      expect(last.freq["a"]).toBe(2);
      expect(last.freq["b"]).toBe(1);
    });

    it("finds pattern using sliding window", () => {
      const steps = generatePatternSearchSteps("abcdef", "cde");
      expect(steps[steps.length - 1].message).toContain('Exact match found for pattern "cde"');
    });
  });

  describe("Linked List Engine", () => {
    it("generates steps for Singly Linked List insert and delete", () => {
      const initialNodes = [
        { id: "1", data: 10, next: "2", prev: null },
        { id: "2", data: 20, next: null, prev: null },
      ];
      const insertHead = generateInsertHeadSteps(initialNodes, 5);
      expect(insertHead.length).toBeGreaterThan(1);
      const finalInsert = insertHead[insertHead.length - 1];
      expect(finalInsert.nodes[0].data).toBe(5);

      const deleteHead = generateDeleteHeadSteps(initialNodes);
      expect(deleteHead.length).toBeGreaterThan(0);
      const finalDelete = deleteHead[deleteHead.length - 1];
      expect(finalDelete.nodes.length).toBe(1);
      expect(finalDelete.nodes[0].data).toBe(20);
    });

    it("generates steps for reversing a linked list", () => {
      const initialNodes = [
        { id: "1", data: 1, next: "2", prev: null },
        { id: "2", data: 2, next: null, prev: null },
      ];
      const rev = generateReverseSteps(initialNodes);
      expect(rev.length).toBeGreaterThan(1);
      expect(rev[rev.length - 1].message).toContain("Reversal complete");
    });
  });

  describe("Stack Engine", () => {
    it("pushes and pops on array-based stack", () => {
      const pushSteps = generatePushSteps([10], 5, 20);
      expect(pushSteps[pushSteps.length - 1].items).toEqual([10, 20]);

      const popSteps = generatePopSteps([10, 20], 5);
      expect(popSteps[popSteps.length - 1].items).toEqual([10]);
    });

    it("handles peek and stack overflow", () => {
      const peekSteps = generatePeekSteps([10, 20], 5);
      expect(peekSteps[peekSteps.length - 1].message).toContain("Top element is 20");

      const overflowSteps = generatePushSteps([1, 2, 3], 3, 99);
      expect(overflowSteps[overflowSteps.length - 1].message).toContain("Stack Overflow");
    });
  });

  describe("Queue Engine", () => {
    it("enqueues and dequeues FIFO items", () => {
      const enq = generateEnqueueSteps([10], 3, 20);
      expect(enq[enq.length - 1].items).toEqual([10, 20]);

      const deq = generateDequeueSteps([10, 20], 3);
      expect(deq[deq.length - 1].items).toEqual([20]);
    });

    it("handles queue overflow", () => {
      const overflow = generateEnqueueSteps([1, 2, 3], 3, 4);
      expect(overflow[overflow.length - 1].message).toContain("Queue Overflow");
    });
  });

  describe("Hash Table Engine", () => {
    it("handles collisions via separate chaining", () => {
      const buckets = [[], [], [], []];
      const steps = generateChainingInsertSteps(buckets, 4, "cat", 100);
      expect(steps.length).toBeGreaterThan(0);
      const last = steps[steps.length - 1];
      expect(last.buckets.flat().some((item) => item.key === "cat")).toBe(true);
    });

    it("handles linear probing insert", () => {
      const slots = [null, null, null, null];
      const steps = generateProbingInsertSteps(slots, 4, "key1", 55, false);
      expect(steps.length).toBeGreaterThan(0);
      const last = steps[steps.length - 1];
      expect(last.slots.some((entry) => entry && entry.key === "key1")).toBe(true);
    });
  });

  describe("Recursion Engine", () => {
    it("traces factorial call stack frames", () => {
      const steps = generateFactorialSteps(3);
      expect(steps.length).toBeGreaterThan(3);
      expect(steps[steps.length - 1].result).toBe(6);
    });

    it("computes fibonacci sequence steps", () => {
      const steps = generateFibonacciSteps(4);
      expect(steps[steps.length - 1].result).toBe(3);
    });
  });

  describe("Sorting Algorithms", () => {
    const unsorted = [5, 2, 8, 1, 9];

    it("sorts with Bubble Sort", () => {
      const steps = generateBubbleSortSteps(unsorted);
      expect(steps[steps.length - 1].array).toEqual([1, 2, 5, 8, 9]);
    });

    it("sorts with Selection Sort", () => {
      const steps = generateSelectionSortSteps(unsorted);
      expect(steps[steps.length - 1].array).toEqual([1, 2, 5, 8, 9]);
    });

    it("sorts with Insertion Sort", () => {
      const steps = generateInsertionSortSteps(unsorted);
      expect(steps[steps.length - 1].array).toEqual([1, 2, 5, 8, 9]);
    });

    it("sorts with Merge Sort", () => {
      const steps = generateMergeSortSteps(unsorted);
      expect(steps[steps.length - 1].array).toEqual([1, 2, 5, 8, 9]);
    });

    it("sorts with Quick Sort", () => {
      const steps = generateQuickSortSteps(unsorted);
      expect(steps[steps.length - 1].array).toEqual([1, 2, 5, 8, 9]);
    });
  });

  describe("Trees & BST", () => {
    const sampleTree = {
      id: "n-root",
      val: 50,
      left: { id: "n-l", val: 25, left: null, right: null },
      right: { id: "n-r", val: 75, left: null, right: null },
    };

    it("traverses binary tree in-order, pre-order, and level-order", () => {
      const inOrderSteps = generateInorderSteps(sampleTree);
      expect(inOrderSteps[inOrderSteps.length - 1].visited).toEqual([25, 50, 75]);

      const preOrderSteps = generatePreorderSteps(sampleTree);
      expect(preOrderSteps[preOrderSteps.length - 1].visited).toEqual([50, 25, 75]);

      const levelSteps = generateLevelOrderSteps(sampleTree);
      expect(levelSteps[levelSteps.length - 1].visited).toEqual([50, 25, 75]);
    });

    it("inserts, searches, and deletes in BST", () => {
      const bst = {
        id: "b-50",
        val: 50,
        left: { id: "b-25", val: 25, left: null, right: null },
        right: { id: "b-75", val: 75, left: null, right: null },
      };

      const searchSteps = generateBSTSearchSteps(bst, 25);
      expect(searchSteps[searchSteps.length - 1].found).toBe(true);

      const { steps: insertSteps } = generateBSTInsertSteps(bst, 60);
      expect(insertSteps.length).toBeGreaterThan(1);

      const { steps: deleteSteps } = generateBSTDeleteSteps(bst, 25);
      expect(deleteSteps.length).toBeGreaterThan(1);
    });
  });

  describe("Binary Heap Engine", () => {
    it("inserts into Min-Heap and maintains heap property", () => {
      const initial = [10, 20, 30];
      const steps = generateHeapInsertSteps(initial, 5, true);
      expect(steps.length).toBeGreaterThan(1);
      const finalHeap = steps[steps.length - 1].heap;
      expect(finalHeap[0]).toBe(5); // 5 should bubble to top of min-heap
    });

    it("extracts root from Max-Heap", () => {
      const initial = [50, 30, 40, 10];
      const steps = generateHeapExtractSteps(initial, false);
      expect(steps.length).toBeGreaterThan(1);
      const finalHeap = steps[steps.length - 1].heap;
      expect(finalHeap.length).toBe(3);
    });
  });

  describe("Trie Engine", () => {
    it("inserts words and searches prefix", () => {
      const root = createInitialTrie(["cat", "car"]);
      const { steps: insertSteps, updatedRoot } = generateTrieInsertSteps(root, "cart");
      expect(insertSteps[insertSteps.length - 1].status).toBe("success");

      const searchWord = generateTrieSearchSteps(updatedRoot, "cart", false);
      expect(searchWord[searchWord.length - 1].status).toBe("success");

      const searchPrefix = generateTrieSearchSteps(updatedRoot, "ca", true);
      expect(searchPrefix[searchPrefix.length - 1].status).toBe("success");
    });
  });

  describe("Graph Engine", () => {
    it("traverses graph using BFS", () => {
      const bfsSteps = generateBFSSteps(DEFAULT_GRAPH_NODES, DEFAULT_GRAPH_EDGES, "A", false);
      const last = bfsSteps[bfsSteps.length - 1];
      expect(last.visited.length).toBe(6);
      expect(last.visited[0]).toBe("A");
    });

    it("traverses graph using DFS", () => {
      const dfsSteps = generateDFSSteps(DEFAULT_GRAPH_NODES, DEFAULT_GRAPH_EDGES, "A", false);
      const last = dfsSteps[dfsSteps.length - 1];
      expect(last.visited.length).toBe(6);
      expect(last.visited[0]).toBe("A");
    });
  });
});

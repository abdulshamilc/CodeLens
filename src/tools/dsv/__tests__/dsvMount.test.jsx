import React, { act } from "react";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createRoot } from "react-dom/client";

import { DSVPage } from "../DSVPage";
import { ArrayVisualizer } from "../topics/array/ArrayVisualizer";
import { StringVisualizer } from "../topics/string/StringVisualizer";
import { LinkedListVisualizer } from "../topics/linkedList/LinkedListVisualizer";
import { StackVisualizer } from "../topics/stack/StackVisualizer";
import { QueueVisualizer } from "../topics/queue/QueueVisualizer";
import { HashTableVisualizer } from "../topics/hashTable/HashTableVisualizer";
import { RecursionVisualizer } from "../topics/recursion/RecursionVisualizer";
import { SortingVisualizer } from "../topics/sorting/SortingVisualizer";
import { TreeVisualizer } from "../topics/tree/TreeVisualizer";
import { BSTVisualizer } from "../topics/bst/BSTVisualizer";
import { HeapVisualizer } from "../topics/heap/HeapVisualizer";
import { TrieVisualizer } from "../topics/trie/TrieVisualizer";
import { GraphVisualizer } from "../topics/graph/GraphVisualizer";
import { DSVHome } from "../components/DSVHome";

describe("DSV Component Smoke Tests", () => {
  let container = null;
  let root = null;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    container = null;
  });

  it("renders DSVHome and DSVPage without throwing", () => {
    act(() => {
      root.render(<DSVHome onSelectTopic={() => {}} />);
    });
    act(() => {
      root.render(<DSVPage />);
    });
  });

  it("renders all topic visualizers safely even when type is null or undefined", () => {
    const visualizers = [
      <ArrayVisualizer type={null} />,
      <ArrayVisualizer type="1d" />,
      <ArrayVisualizer type="2d" />,
      <ArrayVisualizer type="dynamic" />,
      <StringVisualizer type={null} />,
      <StringVisualizer type="palindrome" />,
      <LinkedListVisualizer type={null} />,
      <LinkedListVisualizer type="singly" />,
      <LinkedListVisualizer type="doubly" />,
      <StackVisualizer type={null} />,
      <QueueVisualizer type={null} />,
      <HashTableVisualizer type={null} />,
      <RecursionVisualizer type={null} />,
      <SortingVisualizer type={null} />,
      <TreeVisualizer type={null} />,
      <BSTVisualizer />,
      <HeapVisualizer type={null} />,
      <TrieVisualizer />,
      <GraphVisualizer type={null} />,
    ];

    for (const v of visualizers) {
      act(() => {
        root.render(v);
      });
    }
  });
});

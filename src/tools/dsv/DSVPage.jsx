// src/tools/dsv/DSVPage.jsx
// Minimal, clean DSV Page Shell (dsabrototype style: 7 elements max, zero clutter, no sidebar)

import React, { useMemo } from "react";
import { useDSVStore } from "./store/useDSVStore";
import { DSV_TOPICS } from "./types";
import { DSVHome } from "./components/DSVHome";

// Minimal Topic Visualizers
import { ArrayVisualizer } from "./topics/array/ArrayVisualizer";
import { StringVisualizer } from "./topics/string/StringVisualizer";
import { LinkedListVisualizer } from "./topics/linkedList/LinkedListVisualizer";
import { StackVisualizer } from "./topics/stack/StackVisualizer";
import { QueueVisualizer } from "./topics/queue/QueueVisualizer";
import { HashTableVisualizer } from "./topics/hashTable/HashTableVisualizer";
import { RecursionVisualizer } from "./topics/recursion/RecursionVisualizer";
import { SortingVisualizer } from "./topics/sorting/SortingVisualizer";
import { TreeVisualizer } from "./topics/tree/TreeVisualizer";
import { BSTVisualizer } from "./topics/bst/BSTVisualizer";
import { HeapVisualizer } from "./topics/heap/HeapVisualizer";
import { TrieVisualizer } from "./topics/trie/TrieVisualizer";
import { GraphVisualizer } from "./topics/graph/GraphVisualizer";

const TOPIC_COMPONENTS = {
  array: ArrayVisualizer,
  string: StringVisualizer,
  "linked-list": LinkedListVisualizer,
  stack: StackVisualizer,
  queue: QueueVisualizer,
  "hash-table": HashTableVisualizer,
  recursion: RecursionVisualizer,
  sorting: SortingVisualizer,
  "binary-tree": TreeVisualizer,
  bst: BSTVisualizer,
  heap: HeapVisualizer,
  trie: TrieVisualizer,
  graph: GraphVisualizer,
};

export function DSVPage() {
  const { selectedTopicId, selectedTypeId, setTopic, setType } = useDSVStore();

  const currentTopic = useMemo(
    () => DSV_TOPICS.find((t) => t.id === selectedTopicId) || null,
    [selectedTopicId]
  );

  const effectiveTypeId =
    selectedTypeId || currentTopic?.types?.[0]?.id || undefined;

  const ActiveComponent = selectedTopicId ? TOPIC_COMPONENTS[selectedTopicId] : null;

  // ── HOME SCREEN ──
  if (!currentTopic || !ActiveComponent) {
    return (
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-950 text-slate-100 font-sans">
        <DSVHome onSelectTopic={setTopic} />
      </div>
    );
  }

  // ── FOCUSED TOPIC SCREEN (≤ 7 elements) ──
  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto bg-slate-950 text-slate-100 font-sans select-none px-4 py-6 sm:px-6">
      <div className="max-w-4xl mx-auto w-full space-y-4">
        {/* Back Link */}
        <div>
          <button
            onClick={() => setTopic(null)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-indigo-400 transition cursor-pointer"
          >
            ← Back to all data structures
          </button>
        </div>

        {/* 1. Title + One-Sentence Definition */}
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">{currentTopic.icon}</span>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-100 font-display">
              {currentTopic.name}
            </h1>
            <span className="text-[10px] font-mono text-indigo-400 font-medium px-2 py-0.5 rounded-full bg-indigo-950/60 border border-indigo-800/60">
              {currentTopic.badge}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
            {currentTopic.definition}
          </p>
        </div>

        {/* 2. Type Switcher (only where types exist) */}
        {currentTopic.types && currentTopic.types.length > 1 && (
          <div className="flex items-center gap-1.5 flex-wrap pt-1">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mr-1">
              Type:
            </span>
            {currentTopic.types.map((type) => {
              const isSelected = selectedTypeId === type.id;
              return (
                <button
                  key={type.id}
                  onClick={() => setType(type.id)}
                  className={`px-3 py-1 text-xs rounded-lg font-medium transition cursor-pointer ${
                    isSelected
                      ? "bg-indigo-600 text-white shadow-xs font-bold"
                      : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {type.label}
                </button>
              );
            })}
          </div>
        )}

        {/* Visualization Component */}
        <div className="pt-1">
          <ActiveComponent type={effectiveTypeId} />
        </div>
      </div>
    </div>
  );
}

export default DSVPage;

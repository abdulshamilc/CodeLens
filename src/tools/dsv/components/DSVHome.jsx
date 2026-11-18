// src/tools/dsv/components/DSVHome.jsx
// Minimal, clean DSV Home page: Category groups with clean topic cards (dsabrototype style)

import React from "react";
import { DSV_CATEGORIES, DSV_TOPICS } from "../types";

export function DSVHome({ onSelectTopic }) {
  return (
    <div className="flex-1 overflow-y-auto px-4 py-8 sm:px-8 max-w-5xl mx-auto w-full select-none">
      {/* Page Title */}
      <div className="mb-8 text-center sm:text-left">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-100 font-display">
          Data Structure Visualization
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Interactive step-by-step visualizer for data structures and algorithms. Choose a topic to begin.
        </p>
      </div>

      {/* Category Groups */}
      <div className="space-y-8">
        {DSV_CATEGORIES.map((category) => {
          const categoryTopics = DSV_TOPICS.filter((t) => t.category === category.id);
          if (categoryTopics.length === 0) return null;

          return (
            <section key={category.id} className="space-y-3">
              <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
                <span className="text-lg">{category.icon}</span>
                <h2 className="text-sm sm:text-base font-bold text-slate-200 tracking-wide">
                  {category.name}
                </h2>
              </div>

              {/* Grid of clean topic cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
                {categoryTopics.map((topic) => (
                  <button
                    key={topic.id}
                    onClick={() => onSelectTopic(topic.id)}
                    className="group p-4 rounded-xl border border-slate-800 bg-slate-900/50 hover:bg-slate-800/80 hover:border-indigo-500/50 transition-all text-left flex flex-col justify-between gap-2.5 cursor-pointer shadow-xs hover:shadow-md"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-2xl group-hover:scale-110 transition-transform">
                        {topic.icon}
                      </span>
                      <div>
                        <h3 className="text-sm font-bold text-slate-100 group-hover:text-indigo-300 transition-colors">
                          {topic.name}
                        </h3>
                        <span className="text-[10px] font-mono text-indigo-400 font-medium">
                          {topic.badge}
                        </span>
                      </div>
                    </div>

                    <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                      {topic.shortDesc}
                    </p>
                  </button>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

export default DSVHome;

import React from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { CodeLensLogo } from "./CodeLensLogo";

interface ToolCard {
  id: string;
  path: string;
  icon: string;
  title: string;
  subtitle: string;
  description: string;
  tags: string[];
  gradient: string;
  accentColor: string;
}

const TOOLS: ToolCard[] = [
  {
    id: "dbv",
    path: "/dbv",
    icon: "⚡",
    title: "CodeLens DBV",
    subtitle: "Developer Background View",
    description:
      "Step through JavaScript execution and visualize the call stack, event loop, and scopes in real time.",
    tags: ["Hoisting", "Closures", "Event Loop", "Async/Await", "Scope Chain"],
    gradient: "linear-gradient(135deg, rgba(99,102,241,0.2) 0%, rgba(217,70,239,0.2) 100%)",
    accentColor: "99 102 241",
  },
  {
    id: "whiteboard",
    path: "/whiteboard",
    icon: "✏️",
    title: "CodeLens Board",
    subtitle: "Infinite Canvas Whiteboard",
    description:
      "Sketch diagrams, take visual notes, and brainstorm on an infinite canvas with offline vector storage.",
    tags: ["Infinite Canvas", "Vector Storage", "Pressure Sensitive", "Multi-Board"],
    gradient: "linear-gradient(135deg, rgba(34,197,94,0.2) 0%, rgba(6,182,212,0.2) 100%)",
    accentColor: "34 197 94",
  },
];

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 200, damping: 20 } },
};

export function HomePage() {
  const navigate = useNavigate();

  React.useEffect(() => {
    document.title = "CodeLens – See inside your code";
  }, []);

  return (
    <div
      className="flex-1 overflow-auto flex flex-col items-center justify-center p-6 gap-12"
      style={{ background: "rgb(var(--color-bg))" }}
    >
      {/* Hero */}
      <motion.div
        className="text-center"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1
          className="font-display text-5xl sm:text-6xl font-extrabold mb-3 flex items-center justify-center gap-3.5"
          style={{
            background: "linear-gradient(135deg, rgb(var(--color-text)) 40%, rgb(var(--color-accent)))",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          <span className="text-accent inline-flex items-center" style={{ color: "rgb(var(--color-accent))", WebkitTextFillColor: "initial" }}>
            <CodeLensLogo size={52} />
          </span>
          <span>CodeLens</span>
        </h1>
        <p className="text-lg max-w-lg font-medium" style={{ color: "rgb(var(--color-text-muted))" }}>
          See inside your code.
        </p>
      </motion.div>

      {/* Tool Cards */}
      <motion.div
        className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {TOOLS.map((tool) => (
          <motion.article
            key={tool.id}
            id={`tool-card-${tool.id}`}
            variants={cardVariants}
            whileHover={{ scale: 1.02, y: -4 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate(tool.path)}
            className="cursor-pointer rounded-2xl p-6 flex flex-col gap-4 transition-shadow"
            style={{
              background: tool.gradient,
              border: `1px solid rgba(${tool.accentColor}, 0.3)`,
              boxShadow: `0 4px 32px rgba(${tool.accentColor}, 0.1)`,
            }}
            role="button"
            aria-label={`Open ${tool.subtitle}`}
            tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && navigate(tool.path)}
          >
            {/* Card header */}
            <div className="flex items-start gap-4">
              <div
                className="w-14 h-14 rounded-xl flex items-center justify-center text-3xl shrink-0"
                style={{
                  background: `rgba(${tool.accentColor}, 0.15)`,
                  border: `1px solid rgba(${tool.accentColor}, 0.3)`,
                }}
              >
                {tool.icon}
              </div>
              <div>
                <h2
                  className="font-display text-2xl font-bold"
                  style={{ color: "rgb(var(--color-text))" }}
                >
                  {tool.title}
                </h2>
                <p
                  className="text-sm font-medium"
                  style={{ color: `rgba(${tool.accentColor}, 1)` }}
                >
                  {tool.subtitle}
                </p>
              </div>
            </div>

            {/* Description */}
            <p className="text-sm leading-relaxed" style={{ color: "rgb(var(--color-text-muted))" }}>
              {tool.description}
            </p>

            {/* Tags */}
            <div className="flex flex-wrap gap-2">
              {tool.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-0.5 rounded-md text-xs font-medium"
                  style={{
                    background: `rgba(${tool.accentColor}, 0.15)`,
                    color: `rgba(${tool.accentColor}, 1)`,
                    border: `1px solid rgba(${tool.accentColor}, 0.2)`,
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>

            {/* Open button */}
            <div className="flex justify-end mt-auto">
              <span
                className="text-sm font-semibold flex items-center gap-1"
                style={{ color: `rgba(${tool.accentColor}, 1)` }}
              >
                Open tool →
              </span>
            </div>
          </motion.article>
        ))}
      </motion.div>

      {/* Footer */}
      <motion.footer
        className="text-xs flex flex-wrap items-center justify-center gap-2"
        style={{ color: "rgb(var(--color-text-muted))" }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        <span>
          Press <kbd className="font-code px-1 py-0.5 rounded text-xs"
            style={{ background: "rgb(var(--color-surface2))", border: "1px solid rgb(var(--color-border))" }}>?</kbd> for keyboard shortcuts
        </span>
        <span>•</span>
        <a
          href="https://www.linkedin.com/in/abdul-shamil-85b7681a8"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 hover:underline font-medium"
          style={{ color: "rgb(var(--color-accent))" }}
          title="Visit Abdul Shamil's LinkedIn Profile"
        >
          <span>Created by Abdul Shamil</span>
          <span className="text-[10px] text-white bg-[#0a66c2] px-1 rounded-sm leading-none py-0.5">in</span>
        </a>
      </motion.footer>
    </div>
  );
}

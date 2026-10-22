// src/tools/dbv/components/panels/ScopeChainPanel.tsx
// Visualizes the scope chain from the current context up to global,
// with animated lookup highlighting showing where a variable was found.

import React from "react";
import { motion } from "framer-motion";
import { useDBVStore } from "../../store/useDBVStore";
import { PanelWrapper } from "./PanelWrapper";
import type { EnvironmentRecord } from "../../types";

interface ScopeNodeProps {
  env: EnvironmentRecord;
  label: string;
  depth: number;
  isLookup: boolean;
  changedBindings: string[];
}

function ScopeNode({ env, label, depth, isLookup, changedBindings }: ScopeNodeProps) {
  const scopeColors = ["#6366f1", "#8b5cf6", "#a855f7", "#d946ef", "#ec4899"];
  const color = scopeColors[Math.min(depth, scopeColors.length - 1)];

  const bindings = Object.entries(env.bindings).filter(([k]) => !k.startsWith("__"));

  return (
    <div className="flex flex-col gap-1">
      {/* Scope label + connector */}
      {depth > 0 && (
        <div className="flex items-center gap-1 ml-4 mb-0.5">
          <div className="w-3 h-px" style={{ background: "rgb(var(--color-border))" }} />
          <div className="w-px h-4" style={{ background: "rgb(var(--color-border))" }} />
          <span className="text-[9px]" style={{ color: "rgb(var(--color-text-muted))" }}>outer</span>
        </div>
      )}

      {/* Scope box */}
      <motion.div
        animate={isLookup ? { boxShadow: [`0 0 0 0 ${color}00`, `0 0 12px 3px ${color}55`, `0 0 0 0 ${color}00`] } : { boxShadow: "none" }}
        transition={{ duration: 0.5 }}
        className="rounded-lg overflow-hidden"
        style={{ border: `1px solid ${color}44`, marginLeft: depth * 12 }}
      >
        {/* Header */}
        <div
          className="px-2 py-1 flex items-center gap-2"
          style={{ background: `${color}18` }}
        >
          <span className="text-[10px] font-bold font-code" style={{ color }}>{label}</span>
          <span className="text-[9px]" style={{ color: "rgb(var(--color-text-muted))" }}>
            {bindings.length} binding{bindings.length !== 1 ? "s" : ""}
          </span>
          {isLookup && (
            <span
              className="ml-auto text-[9px] px-1 py-0.5 rounded font-bold"
              style={{ background: `${color}33`, color }}
            >
              ← found here
            </span>
          )}
        </div>

        {/* Bindings */}
        {bindings.length > 0 && (
          <div className="px-2 py-1 flex flex-wrap gap-x-3 gap-y-0.5">
            {bindings.map(([name, binding]) => {
              const key = `${env.id}/${name}`;
              const isChanged = changedBindings.includes(key);
              const isTDZ = binding.state === "uninitialized";
              return (
                <motion.span
                  key={name}
                  animate={isChanged ? { color: ["#6366f1", "#e2e8f0"] } : undefined}
                  transition={{ duration: 0.5 }}
                  className="font-code text-[10px]"
                  style={{ color: isTDZ ? "#ef4444" : "rgb(var(--color-text))" }}
                >
                  {name}{isTDZ ? " (TDZ)" : ""}
                </motion.span>
              );
            })}
          </div>
        )}
      </motion.div>
    </div>
  );
}

export function ScopeChainPanel() {
  const { trace, currentStep } = useDBVStore();
  const step = trace[currentStep];

  if (!step || step.callStack.length === 0) {
    return (
      <PanelWrapper id="scopechain" title="🔗 Scope Chain">
        <div className="p-3 text-xs text-center" style={{ color: "rgb(var(--color-text-muted))" }}>
          Scope chain will appear when code runs
        </div>
      </PanelWrapper>
    );
  }

  // Build scope chain from current lexical env upward
  const currentCtx = step.callStack[step.callStack.length - 1];
  const chain: Array<{ env: EnvironmentRecord; label: string }> = [];

  let envId: string | null = currentCtx.lexicalEnvId;
  let depth = 0;
  while (envId !== null && depth < 10) {
    const env: EnvironmentRecord | undefined = step.environments[envId];
    if (!env) break;
    const ctxForEnv = step.callStack.find(
      (c) => c.lexicalEnvId === envId || c.variableEnvId === envId
    );
    const label =
      depth === 0
        ? `Local (${currentCtx.name})`
        : envId === step.callStack[0]?.lexicalEnvId
        ? "Global"
        : `Outer (${ctxForEnv?.name ?? "closure"})`;
    chain.push({ env, label });
    envId = env.outer;
    depth++;
  }

  // Find the scope where the lookup binding lives
  const lookupEnvId = step.lookupBinding?.split("/")[0];

  return (
    <PanelWrapper id="scopechain" title="🔗 Scope Chain">
      <div className="p-3 flex flex-col gap-1 overflow-auto" style={{ maxHeight: "300px" }}>
        {chain.map((item, idx) => (
          <ScopeNode
            key={item.env.id}
            env={item.env}
            label={item.label}
            depth={idx}
            isLookup={item.env.id === lookupEnvId}
            changedBindings={step.changedBindings}
          />
        ))}
      </div>
    </PanelWrapper>
  );
}

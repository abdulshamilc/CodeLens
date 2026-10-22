// src/app/TopBar.tsx
// Persistent top navigation bar with tool switcher (NavLink), theme toggle and shortcuts button
import React from "react";
import { Link, NavLink } from "react-router-dom";
import { useAppStore } from "./useAppStore";
import { motion } from "framer-motion";
import { CodeLensLogo } from "./CodeLensLogo";
const TOOLS = [
    { path: "/dbv", label: "DBV", icon: "⚡", subtitle: "CodeLens DBV" },
    { path: "/whiteboard", label: "Board", icon: "✏️", subtitle: "CodeLens Board" },
];
export function TopBar() {
    const { theme, toggleTheme, setShortcutModalOpen } = useAppStore();
    return (<header className="flex items-center gap-3 px-4 h-12 shrink-0 z-40 select-none" style={{
            background: "rgba(var(--color-surface), 0.9)",
            borderBottom: "1px solid rgb(var(--color-border))",
            backdropFilter: "blur(12px)",
        }}>
      {/* Logo Link to Home */}
      <Link to="/" className="flex items-center gap-2 font-display font-bold text-lg cursor-pointer transition-transform hover:scale-105" style={{ color: "rgb(var(--color-text))" }}>
        <span className="text-accent flex items-center" style={{ color: "rgb(var(--color-accent))" }}>
          <CodeLensLogo size={22}/>
        </span>
        <span className="hidden sm:block">CodeLens</span>
      </Link>

      {/* Tool switcher with NavLink */}
      <nav className="flex items-center gap-1.5 ml-4" aria-label="Tool navigation">
        {TOOLS.map((tool) => (<NavLink key={tool.path} to={tool.path} id={`nav-${tool.label.toLowerCase()}`} className={({ isActive }) => `relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${isActive ? "font-semibold shadow-sm" : "opacity-80 hover:opacity-100"}`} style={({ isActive }) => ({
                color: isActive ? "rgb(var(--color-accent))" : "rgb(var(--color-text-muted))",
                background: isActive ? "rgba(var(--color-accent), 0.14)" : "transparent",
            })} aria-label={`Switch to ${tool.subtitle}`}>
            {({ isActive }) => (<>
                <span>{tool.icon}</span>
                <span>{tool.label}</span>
                {isActive && (<motion.span layoutId="nav-indicator" className="absolute inset-0 rounded-lg pointer-events-none" style={{
                        border: "1px solid rgba(var(--color-accent), 0.35)",
                    }} transition={{ type: "spring", stiffness: 400, damping: 30 }}/>)}
              </>)}
          </NavLink>))}
      </nav>

      {/* Spacer */}
      <div className="flex-1"/>

      {/* Theme toggle */}
      <motion.button id="theme-toggle" onClick={toggleTheme} whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.92, rotate: 20 }} className="w-8 h-8 rounded-lg flex items-center justify-center text-base transition-colors cursor-pointer" style={{
            background: "rgb(var(--color-surface2))",
            color: "rgb(var(--color-text-muted))",
            border: "1px solid rgb(var(--color-border))",
        }} aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`} title={`Toggle theme (current: ${theme})`}>
        {theme === "dark" ? "🌙" : "☀️"}
      </motion.button>

      {/* Shortcut help */}
      <motion.button id="shortcut-help-btn" onClick={() => setShortcutModalOpen(true)} whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.92 }} className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold transition-colors cursor-pointer" style={{
            background: "rgb(var(--color-surface2))",
            color: "rgb(var(--color-text-muted))",
            border: "1px solid rgb(var(--color-border))",
        }} aria-label="Keyboard shortcuts help" title="Keyboard shortcuts (?)">
        ?
      </motion.button>
    </header>);
}

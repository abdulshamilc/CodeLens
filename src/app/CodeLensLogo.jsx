// src/app/CodeLensLogo.tsx
// Crisp inline SVG lens/magnifier-on-code icon using currentColor and theme tokens
import React from "react";
export function CodeLensLogo({ size = 24, className = "", ariaHidden = true, }) {
    return (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden={ariaHidden} style={{ verticalAlign: "middle" }}>
      {/* Magnifier lens rim */}
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2"/>
      {/* Magnifier handle */}
      <path d="M16 16L21 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      {/* Code bracket inside the lens: < */}
      <path d="M9.5 8.5L7.5 11L9.5 13.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
      {/* Code bracket inside the lens: > */}
      <path d="M12.5 8.5L14.5 11L12.5 13.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>);
}

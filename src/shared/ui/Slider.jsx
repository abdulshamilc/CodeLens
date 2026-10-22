// src/shared/ui/Slider.jsx
// Unified Slider component for timeline scrubbing and speed adjustments

import React from "react";

/**
 * @param {Object} props
 * @param {number} props.value
 * @param {number} props.min
 * @param {number} props.max
 * @param {number} [props.step=1]
 * @param {(value: number) => void} props.onChange
 * @param {string} [props.className='']
 * @param {boolean} [props.disabled=false]
 * @param {string} [props.ariaLabel='Slider']
 */
export function Slider({
  value,
  min,
  max,
  step = 1,
  onChange,
  className = "",
  disabled = false,
  ariaLabel = "Slider",
}) {
  const percentage = max > min ? ((value - min) / (max - min)) * 100 : 0;

  return (
    <div className={`relative flex items-center w-full select-none ${className}`}>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        aria-label={ariaLabel}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-2 rounded-full appearance-none cursor-pointer bg-transparent disabled:cursor-not-allowed focus:outline-none"
        style={{
          background: `linear-gradient(to right, rgb(var(--color-accent)) ${percentage}%, rgb(var(--color-surface2)) ${percentage}%)`,
        }}
      />
    </div>
  );
}

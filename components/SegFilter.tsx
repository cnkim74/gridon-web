"use client";

import type { CSSProperties } from "react";
import { useState } from "react";

/**
 * Segmented filter control (the `.seg` pill group). Tracks the active segment
 * in local state. In production, wire `onChange` to real query state + fetching.
 */
export default function SegFilter({
  options,
  defaultIndex = 0,
  className,
  style,
  onChange,
}: {
  options: string[];
  defaultIndex?: number;
  className?: string;
  style?: CSSProperties;
  onChange?: (index: number, label: string) => void;
}) {
  const [active, setActive] = useState(defaultIndex);
  return (
    <div className={`seg${className ? ` ${className}` : ""}`} style={style}>
      {options.map((o, i) => (
        <button
          key={o}
          className={i === active ? "active" : ""}
          onClick={() => {
            setActive(i);
            onChange?.(i, o);
          }}
        >
          {o}
        </button>
      ))}
    </div>
  );
}

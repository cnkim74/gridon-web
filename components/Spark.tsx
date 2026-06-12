import type { CSSProperties } from "react";

/**
 * SPARK logo — a power-button ring with the vertical stroke replaced by a
 * lightning bolt. Single-color via `currentColor`, so it inherits text color.
 */
export function Spark({
  className,
  style,
}: {
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      aria-hidden="true"
      className={className}
      style={style}
    >
      <path
        d="M40.45 13.87 A20 20 0 1 1 23.55 13.87"
        stroke="currentColor"
        strokeWidth="5"
        strokeLinecap="round"
      />
      <path d="M33 4 L21 28 L30 28 L27 46 L43 22 L34 22 Z" fill="currentColor" />
    </svg>
  );
}

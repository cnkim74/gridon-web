import type { CSSProperties } from "react";
import Link from "next/link";
import { Spark } from "./Spark";

/** Wordmark = GRID + SPARK (the "O") + N, in Archivo 800. Links to home. */
export function Wordmark({
  href = "/",
  style,
  className,
  ariaLabel = "GRIDON 홈",
}: {
  href?: string;
  style?: CSSProperties;
  className?: string;
  ariaLabel?: string;
}) {
  return (
    <Link
      href={href}
      className={`wordmark${className ? ` ${className}` : ""}`}
      style={style}
      aria-label={ariaLabel}
    >
      GRID
      <Spark />N
    </Link>
  );
}

"use client";

import type { ReactNode } from "react";

/** Shared admin modal: dim backdrop, centered card, header with close button. */
export default function ModalShell({
  title,
  subtitle,
  onClose,
  children,
  maxWidth = 560,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
  maxWidth?: number;
}) {
  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(0,0,0,.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, overflow: "auto" }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: "var(--paper, #fff)", width: "100%", maxWidth, borderRadius: 6, padding: 26, boxShadow: "0 20px 60px rgba(0,0,0,.3)", margin: "auto" }}
      >
        <div className="flex jcb aic" style={{ marginBottom: 16 }}>
          <div>
            <h3 className="kr-d3" style={{ fontSize: 20 }}>{title}</h3>
            {subtitle && <p className="muted" style={{ fontSize: 13, marginTop: 4 }}>{subtitle}</p>}
          </div>
          <button className="icon-btn" aria-label="닫기" onClick={onClose}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

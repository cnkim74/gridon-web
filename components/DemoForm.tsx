"use client";

import { useRef, useState } from "react";

/**
 * Demo form wrapper. Native `required` validation gates submission; on a valid
 * submit it shows an inline (non-alert) confirmation and resets — replacing the
 * prototype's `gridForm()` alert. Wire to a real submit handler in production.
 */
export default function DemoForm({
  successMessage,
  className = "form",
  children,
}: {
  successMessage: string;
  className?: string;
  children: React.ReactNode;
}) {
  const [done, setDone] = useState(false);
  const ref = useRef<HTMLFormElement>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setDone(true);
    ref.current?.reset();
    window.setTimeout(() => setDone(false), 5000);
  }

  return (
    <form ref={ref} className={className} onSubmit={handleSubmit} noValidate={false}>
      {children}
      {done && (
        <div
          role="status"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            border: "1px solid var(--line-2)",
            color: "var(--fg)",
            padding: "12px 14px",
            fontSize: 14,
            fontWeight: 600,
          }}
        >
          <span
            style={{
              width: 7,
              height: 7,
              borderRadius: "50%",
              background: "#1f7a3d",
              flex: "none",
            }}
          />
          {successMessage}
        </div>
      )}
    </form>
  );
}

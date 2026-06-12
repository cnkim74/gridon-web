"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Global site behavior, ported from the prototype's site.js:
 *  - Scroll reveal: [data-reveal] elements animate transform only (translateY
 *    14px → 0). Opacity is never animated, so content stays visible without JS.
 *    Honors prefers-reduced-motion via CSS (the transition only applies under
 *    `@media (prefers-reduced-motion: no-preference)`).
 *  - Count-up: [data-count] (+ data-pre/data-suf) animates 0 → value on first
 *    view. The final value is present in markup as a fallback.
 *
 * Re-binds on route change so client-side navigations pick up new elements.
 */
export default function SiteScripts() {
  const pathname = usePathname();

  useEffect(() => {
    // --- scroll reveal ---
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" },
    );
    document
      .querySelectorAll<HTMLElement>("[data-reveal]:not(.in)")
      .forEach((el) => {
        if (el.dataset.delay) el.style.transitionDelay = el.dataset.delay;
        io.observe(el);
      });

    // --- count-up ---
    const counterObs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          const el = e.target as HTMLElement;
          counterObs.unobserve(el);
          const raw = el.dataset.count ?? "0";
          const to = parseFloat(raw);
          const dec = (raw.split(".")[1] || "").length;
          const dur = 1300;
          const t0 = performance.now();
          const pre = el.dataset.pre || "";
          const suf = el.dataset.suf || "";
          const tick = (t: number) => {
            const p = Math.min(1, (t - t0) / dur);
            const eased = 1 - Math.pow(1 - p, 3);
            el.textContent =
              pre +
              (to * eased)
                .toFixed(dec)
                .replace(/\B(?=(\d{3})+(?!\d))/g, ",") +
              suf;
            if (p < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        });
      },
      { threshold: 0.5 },
    );
    document
      .querySelectorAll<HTMLElement>("[data-count]")
      .forEach((el) => counterObs.observe(el));

    return () => {
      io.disconnect();
      counterObs.disconnect();
    };
  }, [pathname]);

  return null;
}

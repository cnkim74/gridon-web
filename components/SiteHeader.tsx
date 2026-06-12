"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Wordmark } from "./Wordmark";
import { MENU } from "@/lib/nav";

function SearchIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.2-3.2" />
    </svg>
  );
}

export default function SiteHeader() {
  const pathname = usePathname();
  const active = MENU.find(
    (m) => pathname === m.href || pathname.startsWith(`${m.href}/`),
  )?.key;
  const [open, setOpen] = useState(false);

  const openDrawer = () => {
    setOpen(true);
    document.body.style.overflow = "hidden";
  };
  const closeDrawer = () => {
    setOpen(false);
    document.body.style.overflow = "";
  };

  return (
    <>
      <header className="nav" data-screen-label="GNB">
        <div className="nav-in">
          <Wordmark />

          <nav className="nav-menu" aria-label="주 메뉴">
            {MENU.map((m) => (
              <div
                key={m.key}
                className={`nav-item${active === m.key ? " is-active" : ""}`}
              >
                <Link className="nav-link" href={m.href}>
                  {m.label}
                </Link>
                {m.sub && (
                  <div className="mega">
                    {m.sub.map((s) => (
                      <Link key={s[2]} href={s[2]}>
                        <span className="mt">{s[0]}</span>
                        <span className="md">{s[1]}</span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </nav>

          <div className="nav-cta">
            <Link className="icon-btn desk" href="/support#contact" aria-label="검색">
              <SearchIcon />
            </Link>
            <Link className="btn btn--sm btn--ghost desk" href="/login">
              로그인
            </Link>
            <Link className="btn btn--sm desk" href="/admin/dashboard">
              관리자
            </Link>
            <button
              className="icon-btn menu-toggle"
              aria-label="메뉴 열기"
              onClick={openDrawer}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                <path d="M3 6h18M3 12h18M3 18h18" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* mobile drawer */}
      <div className={`drawer${open ? " open" : ""}`}>
        <div className="drawer-scrim" onClick={closeDrawer} />
        <aside className="drawer-panel">
          <div className="flex jcb aic" style={{ marginBottom: 18 }}>
            <Wordmark style={{ fontSize: 24 }} />
            <button className="icon-btn" aria-label="닫기" onClick={closeDrawer}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>
          {MENU.map((m) => (
            <Link
              key={m.key}
              className="drawer-link"
              href={m.href}
              onClick={closeDrawer}
            >
              {m.label}
            </Link>
          ))}
          <div className="flex gap-s" style={{ marginTop: 24 }}>
            <Link
              className="btn btn--ghost btn--block"
              href="/login"
              onClick={closeDrawer}
            >
              로그인
            </Link>
            <Link
              className="btn btn--block"
              href="/admin/dashboard"
              onClick={closeDrawer}
            >
              관리자
            </Link>
          </div>
        </aside>
      </div>
    </>
  );
}

"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Wordmark } from "@/components/Wordmark";

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  );
}

const ICONS: Record<string, ReactNode> = {
  dashboard: (<><rect x="3" y="3" width="7" height="9" /><rect x="14" y="3" width="7" height="5" /><rect x="14" y="12" width="7" height="9" /><rect x="3" y="16" width="7" height="5" /></>),
  content: (<><rect x="4" y="3" width="16" height="18" rx="1.5" /><path d="M8 8h8M8 12h8M8 16h5" /></>),
  members: (<><circle cx="9" cy="8" r="3.2" /><path d="M3.5 20a5.5 5.5 0 0 1 11 0" /><path d="M16 7.5a3 3 0 0 1 0 5.8M17 20a5 5 0 0 0-3-4.6" /></>),
  apps: (<path d="M13 3L5 13h6l-1 8 8-10h-6z" />),
  inquiries: (<><path d="M4 5h16v12H8l-4 4z" /><path d="M9 10h6M9 13h4" /></>),
  usage: (<><path d="M3 3v18h18" /><path d="M7 14l4-4 3 3 5-6" /></>),
};

type Link3 = [key: string, label: string, href: string];
const NAV: [string, Link3[]][] = [
  ["개요", [["dashboard", "대시보드", "/admin/dashboard"]]],
  ["운영", [
    ["content", "콘텐츠 관리", "/admin/content"],
    ["members", "회원 관리", "/admin/members"],
    ["apps", "전기 신청 처리", "/admin/applications"],
    ["inquiries", "문의·민원", "/admin/inquiries"],
  ]],
  ["데이터", [["usage", "요금·사용량", "/admin/usage"]]],
];

export default function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const allLinks = NAV.flatMap(([, links]) => links);
  const activeLink = allLinks.find(([, , href]) => pathname === href);
  const title = activeLink?.[1] ?? "";
  const [navOpen, setNavOpen] = useState(false);

  return (
    <div className={`admin${navOpen ? " nav-open" : ""}`} id="admin">
      <aside className="side">
        <div className="brand">
          <Wordmark href="/" style={{ color: "var(--paper)" }} />
          <span className="badge-admin">ADMIN</span>
        </div>
        {NAV.map(([section, links]) => (
          <div key={section}>
            <div className="side-sec">{section}</div>
            {links.map(([key, label, href]) => (
              <Link
                key={key}
                className={`side-link${activeLink?.[0] === key ? " active" : ""}`}
                href={href}
                onClick={() => setNavOpen(false)}
              >
                <Icon>{ICONS[key]}</Icon>
                <span>{label}</span>
              </Link>
            ))}
          </div>
        ))}
        <div className="side-foot">
          <Link className="side-link" href="/" style={{ paddingLeft: 0 }}>
            <Icon><path d="M9 18l-6-6 6-6M3 12h13" /></Icon>
            <span>사이트로 돌아가기</span>
          </Link>
          <Link className="side-link" href="/login" style={{ paddingLeft: 0 }}>
            <Icon><path d="M16 17l5-5-5-5M21 12H9M9 4H5v16h4" /></Icon>
            <span>로그아웃</span>
          </Link>
        </div>
      </aside>

      <main className="amain">
        <div className="atop">
          <div className="flex aic gap-s">
            <button className="icon-btn menu-toggle" aria-label="메뉴" onClick={() => setNavOpen((v) => !v)}>
              <Icon><path d="M3 6h18M3 12h18M3 18h18" /></Icon>
            </button>
            <div className="crumb">
              <Link href="/admin/dashboard">관리자</Link>
              <span className="sep">/</span>
              <span>{title}</span>
            </div>
          </div>
          <div className="atop-right">
            <div className="asearch desk">
              <Icon><circle cx="11" cy="11" r="7" /><path d="m20 20-3.2-3.2" /></Icon>
              <span>검색…</span>
            </div>
            <button className="icon-btn" aria-label="알림" style={{ position: "relative" }}>
              <Icon><path d="M6 8a6 6 0 0 1 12 0c0 7 3 7 3 7H3s3 0 3-7" /><path d="M10.5 21a1.5 1.5 0 0 0 3 0" /></Icon>
              <span style={{ position: "absolute", top: 7, right: 8, width: 6, height: 6, borderRadius: "50%", background: "var(--ink)" }} />
            </button>
            <div className="flex aic gap-s">
              <span className="avatar">관</span>
              <div className="desk" style={{ lineHeight: 1.2 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>운영관리자</div>
                <div style={{ fontSize: 11, color: "var(--muted)" }}>admin@gridon.co.kr</div>
              </div>
            </div>
          </div>
        </div>
        <div className="abody">{children}</div>
      </main>

      {navOpen && (
        <div
          onClick={() => setNavOpen(false)}
          aria-hidden="true"
          style={{ position: "fixed", inset: 0, zIndex: 79 }}
        />
      )}
    </div>
  );
}

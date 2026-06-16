"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Wordmark } from "@/components/Wordmark";
import { useAuth } from "@/components/AuthProvider";

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
  inquiries: (<><path d="M4 5h16v12H8l-4 4z" /><path d="M9 10h6M9 13h4" /></>),
  usage: (<><path d="M3 3v18h18" /><path d="M7 14l4-4 3 3 5-6" /></>),
  employees: (<><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="9" cy="10" r="2" /><path d="M5.5 17a3.5 3.5 0 0 1 7 0" /><path d="M15 9h4M15 13h3" /></>),
  attendance: (<><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M3 9h18M8 2v4M16 2v4" /><path d="m9 15 2 2 4-4" /></>),
  hrreport: (<><path d="M14 3v4a1 1 0 0 0 1 1h4" /><path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2z" /><path d="M9 13h6M9 17h4" /></>),
  payslip: (<><rect x="4" y="3" width="16" height="18" rx="1.5" /><path d="M8 8h8M8 12h8M8 16h5" /></>),
  cert: (<><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M7 8h10M7 12h7" /><circle cx="15" cy="15" r="3" /><path d="m17.1 17.1 2 2" /></>),
  stamp: (<><circle cx="12" cy="12" r="4" /><circle cx="12" cy="12" r="9" fill="none" /><line x1="3" y1="3" x2="6" y2="6" /><line x1="21" y1="3" x2="18" y2="6" /><line x1="3" y1="21" x2="6" y2="18" /><line x1="21" y1="21" x2="18" y2="18" /></>),
  logo: (<><rect x="3" y="6" width="18" height="12" rx="2" /><path d="M3 10h18" /><path d="M7 14h2M12 14h5" /></>),
  insurance: (<><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><path d="m9 12 2 2 4-4" /></>),
  quotes: (<><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M8 8h8M8 12h8M8 16h5" /></>),
  finance: (<><path d="M3 3v18h18" /><path d="M7 14l4-4 3 3 5-6" /><path d="M18 8h3M21 8v3" /></>),
  expenses: (<><rect x="4" y="2" width="16" height="20" rx="1.5" /><path d="M4 6l2-2 2 2 2-2 2 2 2-2 2 2V22l-2-2-2 2-2-2-2 2-2-2-2 2V6z" /><path d="M8 10h8M8 13h8M8 16h5" /></>),
  notices: (<><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></>),
  qna: (<><path d="M4 5h16v12H8l-4 4z" /><path d="M9 10.5a2.5 2.5 0 0 1 5 0c0 1.5-2.5 2.5-2.5 2.5" /><circle cx="11.5" cy="15" r=".6" fill="currentColor" /></>),
  gallery: (<><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" fill="currentColor" stroke="none" /><path d="M21 15l-5-5L5 21" /></>),
  manhole: (<><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="4" /><path d="M12 3v2M12 19v2M3 12h2M19 12h2" /></>),
  equipment: (<><rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" /><path d="M12 12v3M9.5 13.5h5" /></>),
  report: (<><path d="M14 3v4a1 1 0 0 0 1 1h4" /><path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2z" /><rect x="8" y="12" width="3.5" height="3.5" rx=".4" /><rect x="12.5" y="12" width="3.5" height="3.5" rx=".4" /></>),
};

// ── Nav types ──────────────────────────────────────────────────────────────

type Link3 = [key: string, label: string, href: string];
type NavGroup = { type: "group"; key: string; label: string; icon: string; children: Link3[] };
type NavEntry = Link3 | NavGroup;

function isGroup(e: NavEntry): e is NavGroup {
  return !Array.isArray(e);
}

const NAV: [string, NavEntry[]][] = [
  ["개요", [["dashboard", "대시보드", "/admin/dashboard"]]],
  ["운영", [
    ["content", "콘텐츠 관리", "/admin/content"],
    ["members", "회원 관리", "/admin/members"],
    ["inquiries", "문의·민원", "/admin/inquiries"],
  ]],
  ["현장 업무", [
    {
      type: "group",
      key: "manhole",
      label: "한전 맨홀 점검",
      icon: "manhole",
      children: [
        ["manhole-gn", "경남지사", "/admin/manhole/gyeongnam"],
        ["manhole-wb", "서부산지사", "/admin/manhole/west-busan"],
        ["manhole-eb", "동부산지사", "/admin/manhole/east-busan"],
        ["manhole-dg", "대구지사", "/admin/manhole/daegu"],
      ],
    },
    ["report", "공가조사표 · 사진대지", "/admin/photo-report"],
    ["equipment", "장비 관리현황", "/admin/equipment"],
  ]],
  ["인사", [
    ["employees", "직원 현황", "/admin/employees"],
    ["attendance", "출근부", "/admin/attendance"],
    ["payslip", "급여명세서", "/admin/payslip"],
    ["hrreport", "직원 종합현황", "/admin/hr-report"],
    ["cert", "증명서 관리", "/admin/cert"],
    ["insurance", "4대보험 납부현황", "/admin/insurance"],
    ["stamp", "직인 관리", "/admin/stamp"],
    ["logo", "로고 관리", "/admin/logo"],
  ]],
  ["재무", [
    ["quotes", "견적서", "/admin/quotes"],
    ["finance", "수입·지출", "/admin/finance"],
    ["expenses", "지출 관리", "/admin/expenses"],
  ]],
  ["데이터", [["usage", "요금·사용량", "/admin/usage"]]],
];

// Flatten all leaf links (including group children) for active detection
const allLeafLinks: Link3[] = NAV.flatMap(([, entries]) =>
  entries.flatMap((e) => (isGroup(e) ? e.children : [e]))
);

const ROLE_LABEL: Record<string, string> = {
  superadmin: "슈퍼관리자",
  admin: "관리자",
  member: "회원",
};

function Gate({ title, desc, action }: { title: string; desc?: string; action?: ReactNode }) {
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ textAlign: "center", maxWidth: 380 }}>
        <div className="kr-d3" style={{ fontSize: 22, fontWeight: 800 }}>{title}</div>
        {desc && <p className="muted" style={{ marginTop: 10, fontSize: 14 }}>{desc}</p>}
        {action && <div style={{ marginTop: 20 }}>{action}</div>}
      </div>
    </div>
  );
}

export default function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { loading, user, profile, signOut } = useAuth();
  const isAdmin = profile?.role === "admin" || profile?.role === "superadmin";

  const activeLink = allLeafLinks.find(([, , href]) => pathname === href);
  const title = activeLink?.[1] ?? "";
  const [navOpen, setNavOpen] = useState(false);

  // Groups whose children contain the current path start expanded
  const [openGroups, setOpenGroups] = useState<Set<string>>(() => {
    const s = new Set<string>();
    NAV.forEach(([, entries]) => {
      entries.forEach((e) => {
        if (isGroup(e) && e.children.some(([, , href]) => href === pathname)) s.add(e.key);
      });
    });
    return s;
  });

  function toggleGroup(key: string) {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  // Auto-expand the group that contains the active path when pathname changes
  useEffect(() => {
    NAV.forEach(([, entries]) => {
      entries.forEach((e) => {
        if (isGroup(e) && e.children.some(([, , href]) => href === pathname)) {
          setOpenGroups((prev) => new Set([...prev, e.key]));
        }
      });
    });
  }, [pathname]);

  const handleLogout = async () => {
    await signOut();
    router.replace("/login");
  };

  if (loading) return <Gate title="확인 중…" />;
  if (!user) return <Gate title="로그인이 필요합니다" desc="관리자 콘솔은 로그인 후 이용할 수 있습니다." action={<Link className="btn btn--sm" href="/login">로그인으로 이동</Link>} />;
  if (!isAdmin) return (
    <Gate
      title="접근 권한이 없습니다"
      desc={`이 계정(${profile?.email ?? user.email})은 관리자 권한이 없습니다. 관리자에게 권한을 요청하세요.`}
      action={<Link className="btn btn--sm btn--ghost" href="/">사이트로 돌아가기</Link>}
    />
  );

  const adminName = profile?.name || profile?.email?.split("@")[0] || "관리자";
  const roleLabel = ROLE_LABEL[profile?.role ?? "admin"] ?? "관리자";

  return (
    <div className={`admin${navOpen ? " nav-open" : ""}`} id="admin">
      <aside className="side">
        <div className="brand">
          <Wordmark href="/" style={{ color: "var(--paper)" }} />
          <span className="badge-admin">ADMIN</span>
        </div>

        {NAV.map(([section, entries]) => (
          <div key={section}>
            <div className="side-sec">{section}</div>
            {entries.map((entry) => {
              if (isGroup(entry)) {
                const childActive = entry.children.some(([, , href]) => href === pathname);
                const open = openGroups.has(entry.key);
                return (
                  <div key={entry.key}>
                    {/* Group parent button */}
                    <button
                      type="button"
                      className={`side-link${childActive ? " active" : ""}`}
                      onClick={() => toggleGroup(entry.key)}
                      style={{ width: "100%", textAlign: "left", background: "none", border: 0, cursor: "pointer", font: "inherit" }}
                    >
                      <Icon>{ICONS[entry.icon]}</Icon>
                      <span style={{ flex: 1 }}>{entry.label}</span>
                      <svg
                        viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                        strokeLinecap="round" strokeLinejoin="round"
                        style={{ width: 14, height: 14, flexShrink: 0, opacity: .5, transition: "transform .2s", transform: open ? "rotate(180deg)" : "none" }}
                      >
                        <path d="M6 9l6 6 6-6" />
                      </svg>
                    </button>
                    {/* Group children */}
                    {open && entry.children.map(([key, label, href]) => (
                      <Link
                        key={key}
                        className={`side-link${activeLink?.[0] === key ? " active" : ""}`}
                        href={href}
                        onClick={() => setNavOpen(false)}
                        style={{ paddingLeft: 42, fontSize: 13 }}
                      >
                        <span
                          style={{
                            width: 5, height: 5, borderRadius: "50%", flexShrink: 0,
                            background: activeLink?.[0] === key ? "var(--paper)" : "var(--muted)",
                            opacity: activeLink?.[0] === key ? 1 : .5,
                          }}
                        />
                        <span>{label}</span>
                      </Link>
                    ))}
                  </div>
                );
              }

              // Regular link
              const [key, label, href] = entry;
              return (
                <Link
                  key={key}
                  className={`side-link${activeLink?.[0] === key ? " active" : ""}`}
                  href={href}
                  onClick={() => setNavOpen(false)}
                >
                  <Icon>{ICONS[key]}</Icon>
                  <span>{label}</span>
                </Link>
              );
            })}
          </div>
        ))}

        <div className="side-foot">
          <Link className="side-link" href="/" style={{ paddingLeft: 0 }}>
            <Icon><path d="M9 18l-6-6 6-6M3 12h13" /></Icon>
            <span>사이트로 돌아가기</span>
          </Link>
          <button
            className="side-link"
            type="button"
            onClick={handleLogout}
            style={{ paddingLeft: 0, background: "none", border: 0, cursor: "pointer", width: "100%", textAlign: "left", font: "inherit" }}
          >
            <Icon><path d="M16 17l5-5-5-5M21 12H9M9 4H5v16h4" /></Icon>
            <span>로그아웃</span>
          </button>
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
              <span className="avatar">{adminName.slice(0, 1)}</span>
              <div className="desk" style={{ lineHeight: 1.2 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{adminName} · {roleLabel}</div>
                <div style={{ fontSize: 11, color: "var(--muted)" }}>{profile?.email ?? user.email}</div>
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

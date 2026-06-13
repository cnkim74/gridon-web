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
  apps: (<path d="M13 3L5 13h6l-1 8 8-10h-6z" />),
  inquiries: (<><path d="M4 5h16v12H8l-4 4z" /><path d="M9 10h6M9 13h4" /></>),
  usage: (<><path d="M3 3v18h18" /><path d="M7 14l4-4 3 3 5-6" /></>),
  employees: (<><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="9" cy="10" r="2" /><path d="M5.5 17a3.5 3.5 0 0 1 7 0" /><path d="M15 9h4M15 13h3" /></>),
  attendance: (<><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M3 9h18M8 2v4M16 2v4" /><path d="m9 15 2 2 4-4" /></>),
  hrreport: (<><path d="M14 3v4a1 1 0 0 0 1 1h4" /><path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2z" /><path d="M9 13h6M9 17h4" /></>),
  payslip: (<><rect x="4" y="3" width="16" height="18" rx="1.5" /><path d="M8 8h8M8 12h8M8 16h5" /><circle cx="16.5" cy="16.5" r="0" /></>),
  cert: (<><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M7 8h10M7 12h7" /><circle cx="15" cy="15" r="3" /><path d="m17.1 17.1 2 2" /></>),
  stamp: (<><circle cx="12" cy="12" r="4" /><circle cx="12" cy="12" r="9" fill="none" /><line x1="3" y1="3" x2="6" y2="6" /><line x1="21" y1="3" x2="18" y2="6" /><line x1="3" y1="21" x2="6" y2="18" /><line x1="21" y1="21" x2="18" y2="18" /></>),
  logo: (<><rect x="3" y="6" width="18" height="12" rx="2" /><path d="M3 10h18" /><path d="M7 14h2M12 14h5" /></>),
  insurance: (<><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><path d="m9 12 2 2 4-4" /></>),
  quotes: (<><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M8 8h8M8 12h8M8 16h5" /><circle cx="16" cy="16" r="0" /></>),
  finance: (<><path d="M3 3v18h18" /><path d="M7 14l4-4 3 3 5-6" /><path d="M18 8h3M21 8v3" /></>),
  notices: (<><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></>),
  qna: (<><path d="M4 5h16v12H8l-4 4z" /><path d="M9 10.5a2.5 2.5 0 0 1 5 0c0 1.5-2.5 2.5-2.5 2.5" /><circle cx="11.5" cy="15" r=".6" fill="currentColor" /></>),
  gallery: (<><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" fill="currentColor" stroke="none" /><path d="M21 15l-5-5L5 21" /></>),
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
  ]],
  ["게시판", [
    ["notices", "공지사항", "/admin/notices"],
    ["qna", "질의응답", "/admin/qna"],
    ["gallery", "실적·갤러리", "/admin/gallery"],
  ]],
  ["데이터", [["usage", "요금·사용량", "/admin/usage"]]],
];

const ROLE_LABEL: Record<string, string> = {
  superadmin: "슈퍼관리자",
  admin: "관리자",
  member: "회원",
};

/** Centered full-area message used while gating access. */
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

  const allLinks = NAV.flatMap(([, links]) => links);
  const activeLink = allLinks.find(([, , href]) => pathname === href);
  const title = activeLink?.[1] ?? "";
  const [navOpen, setNavOpen] = useState(false);

  // Not signed in → send to login. (Data is also protected by RLS; this is UX.)
  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  const handleLogout = async () => {
    await signOut();
    router.replace("/login");
  };

  // --- Access gating ---------------------------------------------------------
  if (loading) {
    return <Gate title="확인 중…" />;
  }
  if (!user) {
    return <Gate title="로그인이 필요합니다" desc="관리자 콘솔은 로그인 후 이용할 수 있습니다." action={<Link className="btn btn--sm" href="/login">로그인으로 이동</Link>} />;
  }
  if (!isAdmin) {
    return (
      <Gate
        title="접근 권한이 없습니다"
        desc={`이 계정(${profile?.email ?? user.email})은 관리자 권한이 없습니다. 관리자에게 권한을 요청하세요.`}
        action={<Link className="btn btn--sm btn--ghost" href="/">사이트로 돌아가기</Link>}
      />
    );
  }

  const adminName = profile?.name || profile?.email?.split("@")[0] || "관리자";
  const roleLabel = ROLE_LABEL[profile?.role ?? "admin"] ?? "관리자";

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

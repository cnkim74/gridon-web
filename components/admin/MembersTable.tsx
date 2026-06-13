"use client";

import { useEffect, useMemo, useState } from "react";
import SegFilter from "@/components/SegFilter";
import { supabase } from "@/lib/supabase";
import type { MemberType, UserRole } from "@/lib/database.types";

type Row = {
  id: string;
  email: string | null;
  name: string | null;
  member_type: MemberType;
  role: UserRole;
  created_at: string;
};

const ROLE_LABEL: Record<UserRole, string> = {
  superadmin: "슈퍼관리자",
  admin: "관리자",
  member: "회원",
};

function pad(n: number) {
  return String(n).padStart(2, "0");
}
function fmtDate(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())}`;
}
// Stable display number derived from the UUID (real customer numbers TBD).
function memberNo(id: string) {
  return "GO-" + id.replace(/-/g, "").slice(0, 8).toUpperCase();
}

function SearchIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.2-3.2" />
    </svg>
  );
}

function RoleBadge({ role }: { role: UserRole }) {
  if (role === "member") return <span className="badge off">회원</span>;
  return <span className="badge ok dotok">{ROLE_LABEL[role]}</span>;
}

export default function MembersTable() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cat, setCat] = useState<"전체" | "개인" | "기업" | "관리자">("전체");
  const [q, setQ] = useState("");

  useEffect(() => {
    let active = true;
    supabase
      .from("profiles")
      .select("id, email, name, member_type, role, created_at")
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (!active) return;
        if (error) setError(error.message);
        else setRows((data as Row[]) ?? []);
      });
    return () => {
      active = false;
    };
  }, []);

  const filtered = useMemo(() => {
    if (!rows) return [];
    const s = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (cat === "개인" && r.member_type !== "개인") return false;
      if (cat === "기업" && r.member_type !== "기업") return false;
      if (cat === "관리자" && r.role === "member") return false;
      if (s) {
        const hay = `${r.name ?? ""} ${r.email ?? ""} ${memberNo(r.id)}`.toLowerCase();
        if (!hay.includes(s)) return false;
      }
      return true;
    });
  }, [rows, cat, q]);

  const kpi = useMemo(() => {
    const all = rows ?? [];
    const now = new Date();
    const thisMonth = all.filter((r) => {
      const d = new Date(r.created_at);
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    }).length;
    return {
      total: all.length,
      personal: all.filter((r) => r.member_type === "개인").length,
      biz: all.filter((r) => r.member_type === "기업").length,
      thisMonth,
    };
  }, [rows]);

  function exportCsv() {
    const header = ["회원번호", "이름", "구분", "이메일", "권한", "가입일"];
    const body = filtered.map((r) => [
      memberNo(r.id),
      r.name ?? "",
      r.member_type,
      r.email ?? "",
      ROLE_LABEL[r.role],
      fmtDate(r.created_at),
    ]);
    const csv = [header, ...body]
      .map((cols) => cols.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    // BOM so Excel reads UTF-8 (한글) correctly.
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `gridon-members-${fmtDate(new Date().toISOString())}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const loading = rows === null;

  return (
    <>
      <div className="apage-head">
        <div>
          <h1>회원 관리</h1>
          <p>개인·기업 회원 계정을 조회하고 관리합니다.</p>
        </div>
        <div className="flex gap-s wrap">
          <button className="btn btn--sm btn--ghost" onClick={exportCsv} disabled={loading || filtered.length === 0}>
            내보내기 (CSV)
          </button>
        </div>
      </div>

      <div className="kpis">
        <div className="kpi"><div className="kl">총 회원</div><div className="kv">{loading ? "—" : kpi.total.toLocaleString()}</div></div>
        <div className="kpi"><div className="kl">개인 회원</div><div className="kv">{loading ? "—" : kpi.personal.toLocaleString()}</div></div>
        <div className="kpi"><div className="kl">기업 회원</div><div className="kv">{loading ? "—" : kpi.biz.toLocaleString()}</div></div>
        <div className="kpi"><div className="kl">신규 (이번 달)</div><div className="kv">{loading ? "—" : kpi.thisMonth.toLocaleString()}</div></div>
      </div>

      <div className="panel">
        <div className="panel-body">
          <div className="atable-tools">
            <SegFilter
              options={["전체", "개인", "기업", "관리자"]}
              onChange={(_, label) => setCat(label as typeof cat)}
            />
            <div className="search-mini">
              <SearchIcon />
              <input
                placeholder="이름·이메일·회원번호 검색"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
          </div>
        </div>
        <table className="dtable">
          <thead>
            <tr>
              <th style={{ width: 150 }}>회원번호</th>
              <th>이름</th>
              <th style={{ width: 90 }}>구분</th>
              <th>이메일</th>
              <th style={{ width: 120 }}>권한</th>
              <th style={{ width: 120 }}>가입일</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={6} className="cellsub" style={{ textAlign: "center", padding: 28 }}>불러오는 중…</td></tr>
            )}
            {!loading && error && (
              <tr><td colSpan={6} style={{ textAlign: "center", padding: 28, color: "#b3261e" }}>불러오기 오류: {error}</td></tr>
            )}
            {!loading && !error && filtered.length === 0 && (
              <tr><td colSpan={6} className="cellsub" style={{ textAlign: "center", padding: 28 }}>표시할 회원이 없습니다.</td></tr>
            )}
            {!loading && !error && filtered.map((r) => (
              <tr key={r.id}>
                <td className="cellsub">{memberNo(r.id)}</td>
                <td className="strong">{r.name || "—"}</td>
                <td><span className="badge off">{r.member_type}</span></td>
                <td className="cellsub">{r.email}</td>
                <td><RoleBadge role={r.role} /></td>
                <td className="cellsub">{fmtDate(r.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ padding: "0 22px 22px", color: "var(--muted)", fontSize: 13 }}>
          {!loading && !error && `총 ${filtered.length}명 표시${cat !== "전체" || q ? ` (필터 적용, 전체 ${kpi.total}명)` : ""}`}
        </div>
      </div>
    </>
  );
}

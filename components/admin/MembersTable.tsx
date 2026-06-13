"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import SegFilter from "@/components/SegFilter";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/AuthProvider";
import type { MemberType, UserRole } from "@/lib/database.types";

type Row = {
  id: string;
  email: string | null;
  name: string | null;
  member_type: MemberType;
  role: UserRole;
  phone: string | null;
  avatar_url: string | null;
  created_at: string;
};

type EmpOpt = { id: string; name: string; position: string | null; department: string | null };

const COLS = "id, email, name, member_type, role, phone, avatar_url, created_at";
const ROLE_LABEL: Record<UserRole, string> = { superadmin: "슈퍼관리자", admin: "관리자", member: "회원" };

function pad(n: number) { return String(n).padStart(2, "0"); }
function fmtDate(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())}`;
}

function SearchIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <circle cx="11" cy="11" r="7" /><path d="m20 20-3.2-3.2" />
    </svg>
  );
}

function Avatar({ url, name }: { url: string | null; name: string | null }) {
  return (
    <span style={{ width: 30, height: 30, borderRadius: "50%", overflow: "hidden", flex: "none", background: "var(--ink)", color: "var(--paper)", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800 }}>
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      ) : (
        (name || "회").slice(0, 1)
      )}
    </span>
  );
}

function RoleBadge({ role }: { role: UserRole }) {
  if (role === "member") return <span className="badge off">회원</span>;
  return <span className="badge ok dotok">{ROLE_LABEL[role]}</span>;
}

type CatType = "전체" | "개인" | "기업" | "직원" | "관리자";

export default function MembersTable() {
  const { profile } = useAuth();
  const canEdit = profile?.role === "admin" || profile?.role === "superadmin";

  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cat, setCat] = useState<CatType>("전체");
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<Row | null>(null);

  const load = useCallback(async () => {
    const { data, error } = await supabase.from("profiles").select(COLS).order("created_at", { ascending: false });
    if (error) setError(error.message);
    else setRows((data as Row[]) ?? []);
  }, []);

  useEffect(() => {
    let active = true;
    supabase.from("profiles").select(COLS).order("created_at", { ascending: false }).then(({ data, error }) => {
      if (!active) return;
      if (error) setError(error.message);
      else setRows((data as Row[]) ?? []);
    });
    return () => { active = false; };
  }, []);

  const filtered = useMemo(() => {
    if (!rows) return [];
    const s = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (cat === "개인" && r.member_type !== "개인") return false;
      if (cat === "기업" && r.member_type !== "기업") return false;
      if (cat === "직원" && r.member_type !== "직원") return false;
      if (cat === "관리자" && r.role === "member") return false;
      if (s) {
        const hay = `${r.name ?? ""} ${r.email ?? ""} ${r.phone ?? ""}`.toLowerCase();
        if (!hay.includes(s)) return false;
      }
      return true;
    });
  }, [rows, cat, q]);

  const kpi = useMemo(() => {
    const all = rows ?? [];
    const now = new Date();
    return {
      total: all.length,
      personal: all.filter((r) => r.member_type === "개인").length,
      biz: all.filter((r) => r.member_type === "기업").length,
      staff: all.filter((r) => r.member_type === "직원").length,
      thisMonth: all.filter((r) => {
        const d = new Date(r.created_at);
        return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
      }).length,
    };
  }, [rows]);

  function exportCsv() {
    const header = ["이름", "구분", "이메일", "휴대전화", "권한", "가입일"];
    const body = filtered.map((r) => [r.name ?? "", r.member_type, r.email ?? "", r.phone ?? "", ROLE_LABEL[r.role], fmtDate(r.created_at)]);
    const csv = [header, ...body].map((c) => c.map((x) => `"${String(x).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `gridon-members-${fmtDate(new Date().toISOString())}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  const loading = rows === null;

  return (
    <>
      <div className="apage-head">
        <div><h1>회원 관리</h1><p>개인·기업·직원 회원 계정을 조회하고 관리합니다.</p></div>
        <div className="flex gap-s wrap">
          <button className="btn btn--sm btn--ghost" onClick={exportCsv} disabled={loading || filtered.length === 0}>내보내기 (CSV)</button>
        </div>
      </div>

      <div className="kpis">
        <div className="kpi"><div className="kl">총 회원</div><div className="kv">{loading ? "—" : kpi.total.toLocaleString()}</div></div>
        <div className="kpi"><div className="kl">개인 회원</div><div className="kv">{loading ? "—" : kpi.personal.toLocaleString()}</div></div>
        <div className="kpi"><div className="kl">기업 회원</div><div className="kv">{loading ? "—" : kpi.biz.toLocaleString()}</div></div>
        <div className="kpi"><div className="kl">직원</div><div className="kv">{loading ? "—" : kpi.staff.toLocaleString()}</div></div>
        <div className="kpi"><div className="kl">신규 (이번 달)</div><div className="kv">{loading ? "—" : kpi.thisMonth.toLocaleString()}</div></div>
      </div>

      <div className="panel">
        <div className="panel-body">
          <div className="atable-tools">
            <SegFilter options={["전체", "개인", "기업", "직원", "관리자"]} onChange={(_, label) => setCat(label as CatType)} />
            <div className="search-mini">
              <SearchIcon />
              <input placeholder="이름·이메일·전화 검색" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
          </div>
        </div>
        <table className="dtable">
          <thead>
            <tr>
              <th>회원</th>
              <th>이메일</th>
              <th style={{ width: 130 }}>휴대전화</th>
              <th style={{ width: 80 }}>구분</th>
              <th style={{ width: 110 }}>권한</th>
              <th style={{ width: 110 }}>가입일</th>
              {canEdit && <th style={{ width: 70 }}>관리</th>}
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={canEdit ? 7 : 6} className="cellsub" style={{ textAlign: "center", padding: 28 }}>불러오는 중…</td></tr>}
            {!loading && error && <tr><td colSpan={canEdit ? 7 : 6} style={{ textAlign: "center", padding: 28, color: "#b3261e" }}>불러오기 오류: {error}</td></tr>}
            {!loading && !error && filtered.length === 0 && <tr><td colSpan={canEdit ? 7 : 6} className="cellsub" style={{ textAlign: "center", padding: 28 }}>표시할 회원이 없습니다.</td></tr>}
            {!loading && !error && filtered.map((r) => (
              <tr key={r.id}>
                <td>
                  <span className="flex aic gap-s">
                    <Avatar url={r.avatar_url} name={r.name} />
                    <span className="strong">{r.name || "—"}</span>
                  </span>
                </td>
                <td className="cellsub">{r.email}</td>
                <td className="cellsub">{r.phone || "—"}</td>
                <td>
                  <span className={`badge ${r.member_type === "직원" ? "warn" : "off"}`}>{r.member_type}</span>
                </td>
                <td><RoleBadge role={r.role} /></td>
                <td className="cellsub">{fmtDate(r.created_at)}</td>
                {canEdit && (
                  <td><button className="btn btn--sm btn--ghost" onClick={() => setEditing(r)}>편집</button></td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ padding: "0 22px 22px", color: "var(--muted)", fontSize: 13 }}>
          {!loading && !error && `총 ${filtered.length}명 표시${cat !== "전체" || q ? ` (필터 적용, 전체 ${kpi.total}명)` : ""}`}
        </div>
      </div>

      {editing && (
        <EditModal
          member={editing}
          onClose={() => setEditing(null)}
          onSaved={async () => { setEditing(null); await load(); }}
        />
      )}
    </>
  );
}

function EditModal({ member, onClose, onSaved }: { member: Row; onClose: () => void; onSaved: () => Promise<void> }) {
  const [name, setName] = useState(member.name ?? "");
  const [phone, setPhone] = useState(member.phone ?? "");
  const [memberType, setMemberType] = useState<MemberType>(member.member_type);
  const [role, setRole] = useState<UserRole>(member.role);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // 직원 연결용
  const [linkedEmpId, setLinkedEmpId] = useState("");
  const [empList, setEmpList] = useState<EmpOpt[]>([]);

  // 기존 연결된 직원 로드 (모달 오픈 시, 이미 직원인 경우)
  useEffect(() => {
    if (member.member_type !== "직원") return;
    let active = true;
    supabase.from("employees").select("id").eq("profile_id", member.id).maybeSingle().then(({ data }) => {
      if (!active) return;
      if (data) setLinkedEmpId((data as { id: string }).id);
    });
    return () => { active = false; };
  }, [member.id, member.member_type]);

  // memberType이 직원일 때 연결 가능한 직원 목록 로드
  useEffect(() => {
    if (memberType !== "직원") return;
    let active = true;
    supabase.from("employees")
      .select("id, name, position, department")
      .or(`profile_id.is.null,profile_id.eq.${member.id}`)
      .order("name")
      .then(({ data }) => {
        if (!active) return;
        setEmpList((data as EmpOpt[]) ?? []);
      });
    return () => { active = false; };
  }, [memberType, member.id]);

  async function save() {
    setErr(null);
    setSaving(true);

    // 프로필 업데이트
    const { error: profErr } = await supabase
      .from("profiles")
      .update({ name: name.trim(), phone: phone.trim() || null, member_type: memberType, role })
      .eq("id", member.id);
    if (profErr) { setErr(profErr.message); setSaving(false); return; }

    // 직원 연결/해제 처리
    if (member.member_type === "직원" && memberType !== "직원") {
      // 직원 → 다른 구분: 기존 연결 해제
      await supabase.from("employees").update({ profile_id: null }).eq("profile_id", member.id);
    } else if (memberType === "직원" && linkedEmpId) {
      // 기존 직원 레코드에 연결
      if (member.member_type === "직원") {
        await supabase.from("employees").update({ profile_id: null }).eq("profile_id", member.id);
      }
      const { error: empErr } = await supabase.from("employees").update({ profile_id: member.id }).eq("id", linkedEmpId);
      if (empErr) { setErr(empErr.message); setSaving(false); return; }
    } else if (memberType === "직원" && !linkedEmpId) {
      // 직원 선택 없이 저장 → 직원 현황에 자동 등록 + 연결
      const { error: createErr } = await supabase.from("employees").insert({
        name: name.trim() || member.email?.split("@")[0] || "이름 없음",
        phone: phone.trim() || null,
        email: member.email || null,
        profile_id: member.id,
        employment_type: "정규직",
        status: "재직",
        pay_type: "월급",
        ins_pension: false,
        ins_health: false,
        ins_employment: false,
        ins_industrial: false,
      });
      if (createErr) { setErr(createErr.message); setSaving(false); return; }
    }

    await onSaved();
  }

  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(0,0,0,.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
    >
      <div onClick={(e) => e.stopPropagation()} style={{ background: "var(--paper, #fff)", width: "100%", maxWidth: 440, borderRadius: 6, padding: 26, boxShadow: "0 20px 60px rgba(0,0,0,.3)" }}>
        <h3 className="kr-d3" style={{ fontSize: 20 }}>회원 편집</h3>
        <p className="muted" style={{ fontSize: 13, marginTop: 4, marginBottom: 18 }}>{member.email}</p>

        <div className="form">
          <div className="field"><label>이름 / 회사명</label><input className="input" value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div className="field"><label>휴대전화</label><input className="input" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="010-1234-5678" /></div>
          <div className="field">
            <label>구분</label>
            <select className="input" value={memberType} onChange={(e) => {
              const v = e.target.value as MemberType;
              setMemberType(v);
              if (v !== "직원") setLinkedEmpId("");
            }}>
              <option value="개인">개인</option>
              <option value="기업">기업</option>
              <option value="직원">직원</option>
            </select>
          </div>

          {memberType === "직원" && (
            <div className="field">
              <label>연결 직원 (직원 현황)</label>
              <select className="input" value={linkedEmpId} onChange={(e) => setLinkedEmpId(e.target.value)}>
                <option value="">— 선택 안 함 (자동 등록) —</option>
                {empList.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name}{e.position ? ` · ${e.position}` : ""}{e.department ? ` · ${e.department}` : ""}
                  </option>
                ))}
              </select>
              <p className="muted" style={{ fontSize: 11.5, marginTop: 4 }}>
                기존 직원 레코드가 있으면 선택하고, 없으면 선택 안 함으로 저장하면 직원 현황에 자동 등록됩니다.
              </p>
            </div>
          )}

          <div className="field">
            <label>권한</label>
            <select className="input" value={role} onChange={(e) => setRole(e.target.value as UserRole)}>
              <option value="member">회원</option>
              <option value="admin">관리자</option>
              <option value="superadmin">슈퍼관리자</option>
            </select>
          </div>
          {err && (
            <div role="alert" style={{ border: "1px solid var(--line-2)", color: "#b3261e", padding: "10px 12px", fontSize: 13.5, fontWeight: 600 }}>{err}</div>
          )}
          <div className="flex gap-s" style={{ marginTop: 6 }}>
            <button className="btn btn--ghost" type="button" onClick={onClose} disabled={saving} style={{ flex: 1 }}>취소</button>
            <button className="btn" type="button" onClick={save} disabled={saving} style={{ flex: 1 }}>{saving ? "저장 중…" : "저장"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

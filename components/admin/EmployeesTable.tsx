"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import SegFilter from "@/components/SegFilter";
import ModalShell from "@/components/admin/ModalShell";
import { supabase } from "@/lib/supabase";
import type { EmployeeStatus, EmploymentType } from "@/lib/database.types";

type Employee = {
  id: string;
  name: string;
  position: string | null;
  department: string | null;
  phone: string | null;
  email: string | null;
  hire_date: string | null;
  employment_type: EmploymentType;
  status: EmployeeStatus;
  memo: string | null;
};

const COLS = "id, name, position, department, phone, email, hire_date, employment_type, status, memo";
const EMP_TYPES: EmploymentType[] = ["정규직", "계약직", "일용직", "파견"];
const STATUSES: EmployeeStatus[] = ["재직", "휴직", "퇴사"];

function StatusBadge({ s }: { s: EmployeeStatus }) {
  if (s === "재직") return <span className="badge ok dotok">재직</span>;
  if (s === "휴직") return <span className="badge warn dotwarn">휴직</span>;
  return <span className="badge off">퇴사</span>;
}

const blank = (): Omit<Employee, "id"> => ({
  name: "", position: "", department: "", phone: "", email: "",
  hire_date: "", employment_type: "정규직", status: "재직", memo: "",
});

export default function EmployeesTable() {
  const [rows, setRows] = useState<Employee[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cat, setCat] = useState<"전체" | EmployeeStatus>("전체");
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<Employee | "new" | null>(null);
  const [contractsFor, setContractsFor] = useState<Employee | null>(null);

  const load = useCallback(async () => {
    const { data, error } = await supabase.from("employees").select(COLS).order("hire_date", { ascending: false, nullsFirst: false });
    if (error) setError(error.message);
    else setRows((data as Employee[]) ?? []);
  }, []);

  useEffect(() => {
    let active = true;
    supabase.from("employees").select(COLS).order("hire_date", { ascending: false, nullsFirst: false }).then(({ data, error }) => {
      if (!active) return;
      if (error) setError(error.message);
      else setRows((data as Employee[]) ?? []);
    });
    return () => { active = false; };
  }, []);

  const filtered = useMemo(() => {
    if (!rows) return [];
    const s = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (cat !== "전체" && r.status !== cat) return false;
      if (s) {
        const hay = `${r.name} ${r.position ?? ""} ${r.department ?? ""} ${r.phone ?? ""} ${r.email ?? ""}`.toLowerCase();
        if (!hay.includes(s)) return false;
      }
      return true;
    });
  }, [rows, cat, q]);

  const kpi = useMemo(() => {
    const all = rows ?? [];
    return {
      total: all.length,
      active: all.filter((r) => r.status === "재직").length,
      leave: all.filter((r) => r.status === "휴직").length,
      left: all.filter((r) => r.status === "퇴사").length,
    };
  }, [rows]);

  const loading = rows === null;

  return (
    <>
      <div className="apage-head">
        <div><h1>직원 현황</h1><p>임직원 정보를 등록·관리하고 계약서를 보관합니다.</p></div>
        <div className="flex gap-s wrap">
          <button className="btn btn--sm" onClick={() => setEditing("new")}>＋ 직원 등록</button>
        </div>
      </div>

      <div className="kpis">
        <div className="kpi"><div className="kl">총 직원</div><div className="kv">{loading ? "—" : kpi.total}</div></div>
        <div className="kpi"><div className="kl">재직</div><div className="kv">{loading ? "—" : kpi.active}</div></div>
        <div className="kpi"><div className="kl">휴직</div><div className="kv">{loading ? "—" : kpi.leave}</div></div>
        <div className="kpi"><div className="kl">퇴사</div><div className="kv">{loading ? "—" : kpi.left}</div></div>
      </div>

      <div className="panel">
        <div className="panel-body">
          <div className="atable-tools">
            <SegFilter options={["전체", "재직", "휴직", "퇴사"]} onChange={(_, label) => setCat(label as typeof cat)} />
            <div className="search-mini">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.2-3.2" /></svg>
              <input placeholder="이름·부서·직급·연락처 검색" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
          </div>
        </div>
        <table className="dtable">
          <thead>
            <tr>
              <th>이름</th>
              <th style={{ width: 110 }}>직급</th>
              <th style={{ width: 120 }}>부서</th>
              <th style={{ width: 130 }}>연락처</th>
              <th style={{ width: 110 }}>입사일</th>
              <th style={{ width: 90 }}>고용형태</th>
              <th style={{ width: 80 }}>상태</th>
              <th style={{ width: 150 }}>관리</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={8} className="cellsub" style={{ textAlign: "center", padding: 28 }}>불러오는 중…</td></tr>}
            {!loading && error && <tr><td colSpan={8} style={{ textAlign: "center", padding: 28, color: "#b3261e" }}>오류: {error}</td></tr>}
            {!loading && !error && filtered.length === 0 && <tr><td colSpan={8} className="cellsub" style={{ textAlign: "center", padding: 28 }}>등록된 직원이 없습니다. “직원 등록”으로 추가하세요.</td></tr>}
            {!loading && !error && filtered.map((r) => (
              <tr key={r.id}>
                <td className="strong">{r.name}</td>
                <td>{r.position || "—"}</td>
                <td>{r.department || "—"}</td>
                <td className="cellsub">{r.phone || "—"}</td>
                <td className="cellsub">{r.hire_date || "—"}</td>
                <td><span className="badge off">{r.employment_type}</span></td>
                <td><StatusBadge s={r.status} /></td>
                <td>
                  <span className="flex gap-s">
                    <button className="btn btn--sm btn--ghost" onClick={() => setEditing(r)}>편집</button>
                    <button className="btn btn--sm btn--ghost" onClick={() => setContractsFor(r)}>계약서</button>
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ padding: "0 22px 22px", color: "var(--muted)", fontSize: 13 }}>
          {!loading && !error && `총 ${filtered.length}명 표시${cat !== "전체" || q ? ` (전체 ${kpi.total}명)` : ""}`}
        </div>
      </div>

      {editing && (
        <EmployeeModal
          employee={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={async () => { setEditing(null); await load(); }}
        />
      )}
      {contractsFor && (
        <ContractsModal employee={contractsFor} onClose={() => setContractsFor(null)} />
      )}
    </>
  );
}

function EmployeeModal({ employee, onClose, onSaved }: { employee: Employee | null; onClose: () => void; onSaved: () => Promise<void> }) {
  const init = employee ?? blank();
  const [f, setF] = useState({
    name: init.name, position: init.position ?? "", department: init.department ?? "",
    phone: init.phone ?? "", email: init.email ?? "", hire_date: init.hire_date ?? "",
    employment_type: init.employment_type, status: init.status, memo: init.memo ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const set = (k: keyof typeof f, v: string) => setF((p) => ({ ...p, [k]: v }));

  async function save() {
    if (!f.name.trim()) { setErr("이름은 필수입니다."); return; }
    setErr(null);
    setSaving(true);
    const payload = {
      name: f.name.trim(),
      position: f.position.trim() || null,
      department: f.department.trim() || null,
      phone: f.phone.trim() || null,
      email: f.email.trim() || null,
      hire_date: f.hire_date || null,
      employment_type: f.employment_type,
      status: f.status,
      memo: f.memo.trim() || null,
    };
    const res = employee
      ? await supabase.from("employees").update(payload).eq("id", employee.id)
      : await supabase.from("employees").insert(payload);
    if (res.error) { setErr(res.error.message); setSaving(false); return; }
    await onSaved();
  }

  async function remove() {
    if (!employee) return;
    if (!window.confirm(`'${employee.name}' 직원을 삭제할까요? 출근·계약서 기록도 함께 삭제됩니다.`)) return;
    setDeleting(true);
    const { error } = await supabase.from("employees").delete().eq("id", employee.id);
    if (error) { setErr(error.message); setDeleting(false); return; }
    await onSaved();
  }

  return (
    <ModalShell title={employee ? "직원 편집" : "직원 등록"} subtitle={employee?.name} onClose={onClose}>
      <div className="form">
        <div className="flex gap-s">
          <div className="field" style={{ flex: 1 }}><label>이름 *</label><input className="input" value={f.name} onChange={(e) => set("name", e.target.value)} /></div>
          <div className="field" style={{ flex: 1 }}><label>직급/직책</label><input className="input" value={f.position} onChange={(e) => set("position", e.target.value)} placeholder="대리·팀장…" /></div>
        </div>
        <div className="flex gap-s">
          <div className="field" style={{ flex: 1 }}><label>부서</label><input className="input" value={f.department} onChange={(e) => set("department", e.target.value)} placeholder="운영팀…" /></div>
          <div className="field" style={{ flex: 1 }}><label>입사일</label><input className="input" type="date" value={f.hire_date} onChange={(e) => set("hire_date", e.target.value)} /></div>
        </div>
        <div className="flex gap-s">
          <div className="field" style={{ flex: 1 }}><label>휴대전화</label><input className="input" type="tel" value={f.phone} onChange={(e) => set("phone", e.target.value)} placeholder="010-…" /></div>
          <div className="field" style={{ flex: 1 }}><label>이메일</label><input className="input" type="email" value={f.email} onChange={(e) => set("email", e.target.value)} /></div>
        </div>
        <div className="flex gap-s">
          <div className="field" style={{ flex: 1 }}>
            <label>고용형태</label>
            <select className="input" value={f.employment_type} onChange={(e) => set("employment_type", e.target.value)}>
              {EMP_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="field" style={{ flex: 1 }}>
            <label>상태</label>
            <select className="input" value={f.status} onChange={(e) => set("status", e.target.value)}>
              {STATUSES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>
        <div className="field"><label>메모</label><textarea className="input" rows={2} value={f.memo} onChange={(e) => set("memo", e.target.value)} /></div>

        {err && <div role="alert" style={{ border: "1px solid var(--line-2)", color: "#b3261e", padding: "10px 12px", fontSize: 13.5, fontWeight: 600 }}>{err}</div>}

        <div className="flex jcb aic" style={{ marginTop: 6 }}>
          {employee ? (
            <button className="btn btn--sm btn--ghost" type="button" onClick={remove} disabled={deleting || saving} style={{ color: "#b3261e" }}>
              {deleting ? "삭제 중…" : "삭제"}
            </button>
          ) : <span />}
          <span className="flex gap-s">
            <button className="btn btn--ghost" type="button" onClick={onClose} disabled={saving || deleting}>취소</button>
            <button className="btn" type="button" onClick={save} disabled={saving || deleting}>{saving ? "저장 중…" : "저장"}</button>
          </span>
        </div>
      </div>
    </ModalShell>
  );
}

type Contract = { id: string; title: string; file_path: string; mime_type: string | null; size_bytes: number | null; uploaded_at: string };

function ContractsModal({ employee, onClose }: { employee: Employee; onClose: () => void }) {
  const [list, setList] = useState<Contract[] | null>(null);
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data, error } = await supabase.from("contracts").select("id, title, file_path, mime_type, size_bytes, uploaded_at").eq("employee_id", employee.id).order("uploaded_at", { ascending: false });
    if (error) setErr(error.message);
    else setList((data as Contract[]) ?? []);
  }, [employee.id]);

  useEffect(() => {
    let active = true;
    supabase.from("contracts").select("id, title, file_path, mime_type, size_bytes, uploaded_at").eq("employee_id", employee.id).order("uploaded_at", { ascending: false }).then(({ data, error }) => {
      if (!active) return;
      if (error) setErr(error.message);
      else setList((data as Contract[]) ?? []);
    });
    return () => { active = false; };
  }, [employee.id]);

  async function upload() {
    if (!file) { setErr("파일을 선택하세요."); return; }
    if (file.size > 20 * 1024 * 1024) { setErr("파일이 너무 큽니다 (20MB 이하)."); return; }
    setErr(null);
    setBusy(true);
    const safe = file.name.replace(/[^\w.\-가-힣]/g, "_");
    const path = `${employee.id}/${Date.now()}_${safe}`;
    const up = await supabase.storage.from("contracts").upload(path, file, { contentType: file.type, upsert: false });
    if (up.error) { setErr(`업로드 오류: ${up.error.message}`); setBusy(false); return; }
    const ins = await supabase.from("contracts").insert({
      employee_id: employee.id,
      title: title.trim() || file.name,
      file_path: path,
      mime_type: file.type || null,
      size_bytes: file.size,
    });
    if (ins.error) { setErr(`저장 오류: ${ins.error.message}`); setBusy(false); return; }
    setTitle("");
    setFile(null);
    await load();
    setBusy(false);
  }

  async function view(c: Contract) {
    const { data, error } = await supabase.storage.from("contracts").createSignedUrl(c.file_path, 120);
    if (error) { setErr(error.message); return; }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  async function remove(c: Contract) {
    if (!window.confirm(`'${c.title}' 을(를) 삭제할까요?`)) return;
    setBusy(true);
    await supabase.storage.from("contracts").remove([c.file_path]);
    const { error } = await supabase.from("contracts").delete().eq("id", c.id);
    if (error) setErr(error.message);
    await load();
    setBusy(false);
  }

  return (
    <ModalShell title="계약서 관리" subtitle={`${employee.name} · 이미지/PDF`} onClose={onClose}>
      <div style={{ border: "1px solid var(--line-2)", padding: 14, marginBottom: 16 }}>
        <div className="field"><label>제목</label><input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="근로계약서 2026 (비우면 파일명)" /></div>
        <div className="field"><label>파일 (이미지·PDF, 20MB 이하)</label><input className="input" type="file" accept="image/*,application/pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} /></div>
        <button className="btn btn--block" type="button" onClick={upload} disabled={busy}>{busy ? "처리 중…" : "업로드"}</button>
      </div>

      {err && <div role="alert" style={{ border: "1px solid var(--line-2)", color: "#b3261e", padding: "10px 12px", fontSize: 13.5, fontWeight: 600, marginBottom: 12 }}>{err}</div>}

      {list === null ? (
        <p className="cellsub" style={{ textAlign: "center", padding: 16 }}>불러오는 중…</p>
      ) : list.length === 0 ? (
        <p className="cellsub" style={{ textAlign: "center", padding: 16 }}>저장된 계약서가 없습니다.</p>
      ) : (
        <table className="dtable">
          <thead><tr><th>제목</th><th style={{ width: 90 }}>형식</th><th style={{ width: 130 }}>관리</th></tr></thead>
          <tbody>
            {list.map((c) => (
              <tr key={c.id}>
                <td className="strong">{c.title}<div className="cellsub" style={{ fontWeight: 400 }}>{(c.size_bytes ? Math.round(c.size_bytes / 1024) : 0).toLocaleString()} KB</div></td>
                <td className="cellsub">{c.mime_type?.includes("pdf") ? "PDF" : "이미지"}</td>
                <td>
                  <span className="flex gap-s">
                    <button className="btn btn--sm btn--ghost" type="button" onClick={() => view(c)}>보기</button>
                    <button className="btn btn--sm btn--ghost" type="button" onClick={() => remove(c)} disabled={busy} style={{ color: "#b3261e" }}>삭제</button>
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </ModalShell>
  );
}

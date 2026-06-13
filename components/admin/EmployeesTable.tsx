"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import SegFilter from "@/components/SegFilter";
import ModalShell from "@/components/admin/ModalShell";
import { supabase } from "@/lib/supabase";
import type { EmployeeStatus, EmploymentType, PayType } from "@/lib/database.types";

export type Employee = {
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
  photo_url: string | null;
  rrn_masked: string | null;
  salary: number | null;
  pay_type: PayType;
  ins_pension: boolean;
  ins_health: boolean;
  ins_employment: boolean;
  ins_industrial: boolean;
};

export const EMP_COLS =
  "id, name, position, department, phone, email, hire_date, employment_type, status, memo, photo_url, rrn_masked, salary, pay_type, ins_pension, ins_health, ins_employment, ins_industrial";
const EMP_TYPES: EmploymentType[] = ["정규직", "계약직", "일용직", "파견"];
const STATUSES: EmployeeStatus[] = ["재직", "휴직", "퇴사"];
const PAY_TYPES: PayType[] = ["월급", "일급", "시급"];

function won(n: number | null) { return n == null ? "—" : `${n.toLocaleString()}원`; }

function InsCheckbox({ label, checked, onChange }: { label: string; checked: boolean; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void }) {
  return (
    <label className="flex aic gap-s" style={{ fontSize: 13.5, cursor: "pointer" }}>
      <input type="checkbox" checked={checked} onChange={onChange} style={{ width: 16, height: 16, accentColor: "var(--ink)" }} />
      {label}
    </label>
  );
}

function StatusBadge({ s }: { s: EmployeeStatus }) {
  if (s === "재직") return <span className="badge ok dotok">재직</span>;
  if (s === "휴직") return <span className="badge warn dotwarn">휴직</span>;
  return <span className="badge off">퇴사</span>;
}

function Photo({ url, name, size = 30 }: { url: string | null; name: string; size?: number }) {
  return (
    <span style={{ width: size, height: size, borderRadius: "50%", overflow: "hidden", flex: "none", background: "var(--ink)", color: "var(--paper)", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.42, fontWeight: 800 }}>
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      ) : (name || "직").slice(0, 1)}
    </span>
  );
}

export default function EmployeesTable() {
  const [rows, setRows] = useState<Employee[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cat, setCat] = useState<"전체" | EmployeeStatus>("전체");
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<Employee | "new" | null>(null);
  const [contractsFor, setContractsFor] = useState<Employee | null>(null);

  const load = useCallback(async () => {
    const { data, error } = await supabase.from("employees").select(EMP_COLS).order("hire_date", { ascending: false, nullsFirst: false });
    if (error) setError(error.message);
    else setRows((data as Employee[]) ?? []);
  }, []);

  useEffect(() => {
    let active = true;
    supabase.from("employees").select(EMP_COLS).order("hire_date", { ascending: false, nullsFirst: false }).then(({ data, error }) => {
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
      if (s && !`${r.name} ${r.position ?? ""} ${r.department ?? ""} ${r.phone ?? ""}`.toLowerCase().includes(s)) return false;
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
        <div><h1>직원 현황</h1><p>임직원 정보·급여·4대보험·계약서를 관리합니다.</p></div>
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
              <th style={{ width: 100 }}>직급</th>
              <th style={{ width: 110 }}>부서</th>
              <th style={{ width: 110 }}>입사일</th>
              <th style={{ width: 130 }}>급여</th>
              <th style={{ width: 80 }}>상태</th>
              <th style={{ width: 150 }}>관리</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={7} className="cellsub" style={{ textAlign: "center", padding: 28 }}>불러오는 중…</td></tr>}
            {!loading && error && <tr><td colSpan={7} style={{ textAlign: "center", padding: 28, color: "#b3261e" }}>오류: {error}</td></tr>}
            {!loading && !error && filtered.length === 0 && <tr><td colSpan={7} className="cellsub" style={{ textAlign: "center", padding: 28 }}>등록된 직원이 없습니다. “직원 등록”으로 추가하세요.</td></tr>}
            {!loading && !error && filtered.map((r) => (
              <tr key={r.id}>
                <td><span className="flex aic gap-s"><Photo url={r.photo_url} name={r.name} /><span className="strong">{r.name}</span></span></td>
                <td>{r.position || "—"}</td>
                <td>{r.department || "—"}</td>
                <td className="cellsub">{r.hire_date || "—"}</td>
                <td className="cellsub">{won(r.salary)}<span style={{ fontSize: 11, opacity: 0.7 }}> /{r.pay_type}</span></td>
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
        <EmployeeModal employee={editing === "new" ? null : editing} onClose={() => setEditing(null)} onSaved={async () => { setEditing(null); await load(); }} />
      )}
      {contractsFor && <ContractsModal employee={contractsFor} onClose={() => setContractsFor(null)} />}
    </>
  );
}

function EmployeeModal({ employee, onClose, onSaved }: { employee: Employee | null; onClose: () => void; onSaved: () => Promise<void> }) {
  const e = employee;
  const [f, setF] = useState({
    name: e?.name ?? "", position: e?.position ?? "", department: e?.department ?? "",
    phone: e?.phone ?? "", email: e?.email ?? "", hire_date: e?.hire_date ?? "",
    employment_type: e?.employment_type ?? "정규직", status: e?.status ?? "재직",
    salary: e?.salary != null ? String(e.salary) : "", pay_type: e?.pay_type ?? "월급",
    memo: e?.memo ?? "",
  });
  const [ins, setIns] = useState({
    pension: e?.ins_pension ?? false, health: e?.ins_health ?? false,
    employment: e?.ins_employment ?? false, industrial: e?.ins_industrial ?? false,
  });
  const [rrn, setRrn] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(e?.photo_url ?? null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const set = (k: keyof typeof f, v: string) => setF((p) => ({ ...p, [k]: v }));

  function pickPhoto(file: File | null) {
    setPhotoFile(file);
    setPhotoPreview(file ? URL.createObjectURL(file) : (e?.photo_url ?? null));
  }

  async function revealRrn() {
    if (!e) return;
    setErr(null);
    const { data, error } = await supabase.rpc("get_employee_rrn", { p_emp: e.id });
    if (error) { setErr(error.message); return; }
    setRrn((data as string) ?? "");
  }

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
      employment_type: f.employment_type as EmploymentType,
      status: f.status as EmployeeStatus,
      salary: f.salary.replace(/[^\d]/g, "") ? Number(f.salary.replace(/[^\d]/g, "")) : null,
      pay_type: f.pay_type as PayType,
      ins_pension: ins.pension, ins_health: ins.health, ins_employment: ins.employment, ins_industrial: ins.industrial,
      memo: f.memo.trim() || null,
    };

    let empId = e?.id;
    if (e) {
      const { error } = await supabase.from("employees").update(payload).eq("id", e.id);
      if (error) { setErr(error.message); setSaving(false); return; }
    } else {
      const { data, error } = await supabase.from("employees").insert(payload).select("id").single();
      if (error || !data) { setErr(error?.message ?? "저장 실패"); setSaving(false); return; }
      empId = (data as { id: string }).id;
    }

    // 사진 업로드 (있을 때)
    if (photoFile && empId) {
      const ext = (photoFile.name.split(".").pop() || "jpg").toLowerCase();
      const path = `${empId}/photo.${ext}`;
      const up = await supabase.storage.from("employee-photos").upload(path, photoFile, { upsert: true, contentType: photoFile.type });
      if (up.error) { setErr(`사진 업로드 오류: ${up.error.message}`); setSaving(false); return; }
      const { data } = supabase.storage.from("employee-photos").getPublicUrl(path);
      await supabase.from("employees").update({ photo_url: `${data.publicUrl}?v=${Date.now()}` }).eq("id", empId);
    }

    // 주민번호 (입력했을 때만 암호화 저장)
    if (rrn.trim() && empId) {
      const { error } = await supabase.rpc("save_employee_rrn", { p_emp: empId, p_rrn: rrn.trim() });
      if (error) { setErr(`주민번호 저장 오류: ${error.message}`); setSaving(false); return; }
    }

    await onSaved();
  }

  async function remove() {
    if (!e) return;
    if (!window.confirm(`'${e.name}' 직원을 삭제할까요? 출근·계약서·급여 기록도 함께 삭제됩니다.`)) return;
    setDeleting(true);
    const { error } = await supabase.from("employees").delete().eq("id", e.id);
    if (error) { setErr(error.message); setDeleting(false); return; }
    await onSaved();
  }

  const toggleIns = (k: keyof typeof ins) => (ev: React.ChangeEvent<HTMLInputElement>) =>
    setIns((p) => ({ ...p, [k]: ev.target.checked }));

  return (
    <ModalShell title={e ? "직원 편집" : "직원 등록"} subtitle={e?.name} onClose={onClose}>
      <div className="form">
        <div className="flex aic gap-s" style={{ marginBottom: 4 }}>
          <Photo url={photoPreview} name={f.name} size={56} />
          <div>
            <label className="btn btn--sm btn--ghost" style={{ cursor: "pointer", display: "inline-block" }}>
              사진 선택
              <input type="file" accept="image/*" onChange={(ev) => pickPhoto(ev.target.files?.[0] ?? null)} style={{ display: "none" }} />
            </label>
            <p className="muted" style={{ fontSize: 11.5, marginTop: 4 }}>저장 시 업로드됩니다</p>
          </div>
        </div>

        <div className="flex gap-s">
          <div className="field" style={{ flex: 1 }}><label>이름 *</label><input className="input" value={f.name} onChange={(ev) => set("name", ev.target.value)} /></div>
          <div className="field" style={{ flex: 1 }}><label>직급/직책</label><input className="input" value={f.position} onChange={(ev) => set("position", ev.target.value)} /></div>
        </div>
        <div className="flex gap-s">
          <div className="field" style={{ flex: 1 }}><label>부서</label><input className="input" value={f.department} onChange={(ev) => set("department", ev.target.value)} /></div>
          <div className="field" style={{ flex: 1 }}><label>입사일</label><input className="input" type="date" value={f.hire_date} onChange={(ev) => set("hire_date", ev.target.value)} /></div>
        </div>
        <div className="flex gap-s">
          <div className="field" style={{ flex: 1 }}><label>휴대전화</label><input className="input" type="tel" value={f.phone} onChange={(ev) => set("phone", ev.target.value)} /></div>
          <div className="field" style={{ flex: 1 }}><label>이메일</label><input className="input" type="email" value={f.email} onChange={(ev) => set("email", ev.target.value)} /></div>
        </div>

        <div className="field">
          <label>주민등록번호 {e?.rrn_masked && <span className="muted" style={{ fontWeight: 400 }}>· 현재: {e.rrn_masked}</span>}</label>
          <div className="flex gap-s">
            <input className="input" value={rrn} onChange={(ev) => setRrn(ev.target.value)} placeholder={e?.rrn_masked ? "변경 시에만 입력" : "901010-1234567"} style={{ flex: 1 }} />
            {e?.rrn_masked && <button type="button" className="btn btn--sm btn--ghost" onClick={revealRrn}>전체 보기</button>}
          </div>
          <p className="muted" style={{ fontSize: 11.5, marginTop: 4 }}>🔒 암호화 저장 (관리자만 복호화)</p>
        </div>

        <div className="flex gap-s">
          <div className="field" style={{ flex: 1.4 }}><label>급여 (원)</label><input className="input" inputMode="numeric" value={f.salary} onChange={(ev) => set("salary", ev.target.value)} placeholder="3000000" /></div>
          <div className="field" style={{ flex: 1 }}>
            <label>급여 유형</label>
            <select className="input" value={f.pay_type} onChange={(ev) => set("pay_type", ev.target.value)}>{PAY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}</select>
          </div>
        </div>

        <div className="field">
          <label>4대보험</label>
          <div className="flex gap-s wrap" style={{ gap: 16, paddingTop: 4 }}>
            <InsCheckbox label="국민연금" checked={ins.pension} onChange={toggleIns("pension")} />
            <InsCheckbox label="건강보험" checked={ins.health} onChange={toggleIns("health")} />
            <InsCheckbox label="고용보험" checked={ins.employment} onChange={toggleIns("employment")} />
            <InsCheckbox label="산재보험" checked={ins.industrial} onChange={toggleIns("industrial")} />
          </div>
        </div>

        <div className="flex gap-s">
          <div className="field" style={{ flex: 1 }}>
            <label>고용형태</label>
            <select className="input" value={f.employment_type} onChange={(ev) => set("employment_type", ev.target.value)}>{EMP_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}</select>
          </div>
          <div className="field" style={{ flex: 1 }}>
            <label>재직여부</label>
            <select className="input" value={f.status} onChange={(ev) => set("status", ev.target.value)}>{STATUSES.map((t) => <option key={t} value={t}>{t}</option>)}</select>
          </div>
        </div>
        <div className="field"><label>메모</label><textarea className="input" rows={2} value={f.memo} onChange={(ev) => set("memo", ev.target.value)} /></div>

        {err && <div role="alert" style={{ border: "1px solid var(--line-2)", color: "#b3261e", padding: "10px 12px", fontSize: 13.5, fontWeight: 600 }}>{err}</div>}

        <div className="flex jcb aic" style={{ marginTop: 6 }}>
          {e ? <button className="btn btn--sm btn--ghost" type="button" onClick={remove} disabled={deleting || saving} style={{ color: "#b3261e" }}>{deleting ? "삭제 중…" : "삭제"}</button> : <span />}
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
    const ins = await supabase.from("contracts").insert({ employee_id: employee.id, title: title.trim() || file.name, file_path: path, mime_type: file.type || null, size_bytes: file.size });
    if (ins.error) { setErr(`저장 오류: ${ins.error.message}`); setBusy(false); return; }
    setTitle(""); setFile(null); await load(); setBusy(false);
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
    await load(); setBusy(false);
  }

  return (
    <ModalShell title="계약서 관리" subtitle={`${employee.name} · 이미지/PDF`} onClose={onClose}>
      <div style={{ border: "1px solid var(--line-2)", padding: 14, marginBottom: 16 }}>
        <div className="field"><label>제목</label><input className="input" value={title} onChange={(ev) => setTitle(ev.target.value)} placeholder="근로계약서 2026 (비우면 파일명)" /></div>
        <div className="field"><label>파일 (이미지·PDF, 20MB 이하)</label><input className="input" type="file" accept="image/*,application/pdf" onChange={(ev) => setFile(ev.target.files?.[0] ?? null)} /></div>
        <button className="btn btn--block" type="button" onClick={upload} disabled={busy}>{busy ? "처리 중…" : "업로드"}</button>
      </div>
      {err && <div role="alert" style={{ border: "1px solid var(--line-2)", color: "#b3261e", padding: "10px 12px", fontSize: 13.5, fontWeight: 600, marginBottom: 12 }}>{err}</div>}
      {list === null ? <p className="cellsub" style={{ textAlign: "center", padding: 16 }}>불러오는 중…</p>
        : list.length === 0 ? <p className="cellsub" style={{ textAlign: "center", padding: 16 }}>저장된 계약서가 없습니다.</p>
        : (
          <table className="dtable">
            <thead><tr><th>제목</th><th style={{ width: 90 }}>형식</th><th style={{ width: 130 }}>관리</th></tr></thead>
            <tbody>
              {list.map((c) => (
                <tr key={c.id}>
                  <td className="strong">{c.title}<div className="cellsub" style={{ fontWeight: 400 }}>{(c.size_bytes ? Math.round(c.size_bytes / 1024) : 0).toLocaleString()} KB</div></td>
                  <td className="cellsub">{c.mime_type?.includes("pdf") ? "PDF" : "이미지"}</td>
                  <td><span className="flex gap-s">
                    <button className="btn btn--sm btn--ghost" type="button" onClick={() => view(c)}>보기</button>
                    <button className="btn btn--sm btn--ghost" type="button" onClick={() => remove(c)} disabled={busy} style={{ color: "#b3261e" }}>삭제</button>
                  </span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
    </ModalShell>
  );
}

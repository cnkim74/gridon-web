"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import ModalShell from "@/components/admin/ModalShell";
import { supabase } from "@/lib/supabase";
import type { AttendanceStatus } from "@/lib/database.types";

type Emp = { id: string; name: string; department: string | null };
type Rec = {
  id: string;
  employee_id: string;
  work_date: string;
  check_in: string | null;
  check_out: string | null;
  status: AttendanceStatus;
  note: string | null;
};

const STATUSES: AttendanceStatus[] = ["정상", "지각", "조퇴", "결근", "휴가", "출장"];

function pad(n: number) { return String(n).padStart(2, "0"); }
function thisMonth() { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`; }
function today() { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
function nextMonthStart(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  return m === 12 ? `${y + 1}-01-01` : `${y}-${pad(m + 1)}-01`;
}
function hhmm(t: string | null) { return t ? t.slice(0, 5) : "—"; }

function StatusBadge({ s }: { s: AttendanceStatus }) {
  const cls = s === "정상" ? "badge ok dotok" : s === "결근" ? "badge off" : "badge warn dotwarn";
  return <span className={cls}>{s}</span>;
}

function statusColor(s: AttendanceStatus) {
  return s === "정상" ? "#1f7a3d" : s === "결근" ? "#b3261e" : s === "휴가" || s === "출장" ? "#3457d5" : "#b8860b";
}

const DOW = ["일", "월", "화", "수", "목", "금", "토"];

function MonthCalendar({ month, recs, onPick }: { month: string; recs: Rec[]; onPick: (date: string, rec: Rec | null) => void }) {
  const [y, m] = month.split("-").map(Number);
  const startDow = new Date(y, m - 1, 1).getDay();
  const days = new Date(y, m, 0).getDate();
  const byDate = new Map(recs.map((r) => [r.work_date, r]));
  const cells: (number | null)[] = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= days; d++) cells.push(d);
  while (cells.length % 7) cells.push(null);
  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 6 }}>
        {DOW.map((d, i) => (
          <div key={d} style={{ textAlign: "center", fontSize: 12, fontWeight: 700, color: i === 0 ? "#b3261e" : i === 6 ? "#3457d5" : "var(--muted)", padding: "4px 0" }}>{d}</div>
        ))}
        {cells.map((d, i) => {
          if (d == null) return <div key={i} />;
          const ds = `${month}-${pad(d)}`;
          const rec = byDate.get(ds) ?? null;
          const dow = i % 7;
          return (
            <button key={i} type="button" onClick={() => onPick(ds, rec)} style={{ minHeight: 66, border: "1px solid var(--line-2)", background: "transparent", textAlign: "left", padding: 6, cursor: "pointer", borderRadius: 4, font: "inherit" }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: dow === 0 ? "#b3261e" : dow === 6 ? "#3457d5" : "inherit" }}>{d}</div>
              {rec && <div style={{ marginTop: 4, fontSize: 11, color: "#fff", background: statusColor(rec.status), borderRadius: 3, padding: "1px 5px", display: "inline-block", fontWeight: 700 }}>{rec.status}</div>}
              {rec && (rec.check_in || rec.check_out) && <div style={{ fontSize: 10.5, color: "var(--muted)", marginTop: 2 }}>{hhmm(rec.check_in)}~{hhmm(rec.check_out)}</div>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function AttendanceTable() {
  const [emps, setEmps] = useState<Emp[]>([]);
  const [empId, setEmpId] = useState<string>("");
  const [month, setMonth] = useState<string>(thisMonth());
  const [recs, setRecs] = useState<Rec[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [editing, setEditing] = useState<Rec | "new" | null>(null);
  const [view, setView] = useState<"calendar" | "list">("calendar");
  const [newDate, setNewDate] = useState(today());

  // Load employees once (default-select the first inside the callback).
  useEffect(() => {
    let active = true;
    supabase.from("employees").select("id, name, department").order("name").then(({ data, error }) => {
      if (!active) return;
      if (error) { setErr(error.message); return; }
      const list = (data as Emp[]) ?? [];
      setEmps(list);
      if (list.length) setEmpId((cur) => cur || list[0].id);
    });
    return () => { active = false; };
  }, []);

  const fetchRecs = useCallback((eid: string, ym: string) => {
    if (!eid) { setRecs([]); return; }
    return supabase
      .from("attendance")
      .select("id, employee_id, work_date, check_in, check_out, status, note")
      .eq("employee_id", eid)
      .gte("work_date", `${ym}-01`)
      .lt("work_date", nextMonthStart(ym))
      .order("work_date")
      .then(({ data, error }) => {
        if (error) setErr(error.message);
        else setRecs((data as Rec[]) ?? []);
      });
  }, []);

  // Reload records when employee/month changes (setState inside the .then callback).
  useEffect(() => {
    let active = true;
    if (!empId) return; // render handles the "no employee" case
    supabase
      .from("attendance")
      .select("id, employee_id, work_date, check_in, check_out, status, note")
      .eq("employee_id", empId)
      .gte("work_date", `${month}-01`)
      .lt("work_date", nextMonthStart(month))
      .order("work_date")
      .then(({ data, error }) => {
        if (!active) return;
        if (error) setErr(error.message);
        else setRecs((data as Rec[]) ?? []);
      });
    return () => { active = false; };
  }, [empId, month]);

  const kpi = useMemo(() => {
    const r = recs ?? [];
    return {
      normal: r.filter((x) => x.status === "정상").length,
      late: r.filter((x) => x.status === "지각" || x.status === "조퇴").length,
      absent: r.filter((x) => x.status === "결근").length,
      off: r.filter((x) => x.status === "휴가" || x.status === "출장").length,
    };
  }, [recs]);

  const loading = recs === null;
  const empName = emps.find((e) => e.id === empId)?.name ?? "";

  return (
    <>
      <div className="apage-head">
        <div><h1>출근부</h1><p>직원별 출·퇴근과 근태 상태를 기록합니다.</p></div>
        <div className="flex gap-s wrap">
          <button className="btn btn--sm" onClick={() => { setNewDate(today()); setEditing("new"); }} disabled={!empId}>＋ 기록 추가</button>
        </div>
      </div>

      <div className="panel" style={{ marginBottom: 18 }}>
        <div className="panel-body">
          <div className="flex gap-s wrap aic">
            <div className="field" style={{ margin: 0, minWidth: 220 }}>
              <label>직원</label>
              <select className="input" value={empId} onChange={(e) => setEmpId(e.target.value)}>
                {emps.length === 0 && <option value="">등록된 직원 없음</option>}
                {emps.map((e) => <option key={e.id} value={e.id}>{e.name}{e.department ? ` · ${e.department}` : ""}</option>)}
              </select>
            </div>
            <div className="field" style={{ margin: 0, minWidth: 160 }}>
              <label>월</label>
              <input className="input" type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
            </div>
            <div className="field" style={{ margin: 0 }}>
              <label>보기</label>
              <div className="seg">
                <button type="button" className={view === "calendar" ? "active" : ""} onClick={() => setView("calendar")}>달력</button>
                <button type="button" className={view === "list" ? "active" : ""} onClick={() => setView("list")}>목록</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="kpis">
        <div className="kpi"><div className="kl">정상</div><div className="kv">{loading ? "—" : kpi.normal}</div></div>
        <div className="kpi"><div className="kl">지각·조퇴</div><div className="kv">{loading ? "—" : kpi.late}</div></div>
        <div className="kpi"><div className="kl">결근</div><div className="kv">{loading ? "—" : kpi.absent}</div></div>
        <div className="kpi"><div className="kl">휴가·출장</div><div className="kv">{loading ? "—" : kpi.off}</div></div>
      </div>

      {!empId ? (
        <div className="panel"><p className="cellsub" style={{ textAlign: "center", padding: 28 }}>직원을 먼저 등록하세요 (직원 현황).</p></div>
      ) : loading ? (
        <div className="panel"><p className="cellsub" style={{ textAlign: "center", padding: 28 }}>불러오는 중…</p></div>
      ) : err ? (
        <div className="panel"><p style={{ textAlign: "center", padding: 28, color: "#b3261e" }}>오류: {err}</p></div>
      ) : view === "calendar" ? (
        <div className="panel">
          <MonthCalendar
            month={month}
            recs={recs!}
            onPick={(ds, rec) => { if (rec) setEditing(rec); else { setNewDate(ds); setEditing("new"); } }}
          />
          <div style={{ padding: "0 16px 16px", color: "var(--muted)", fontSize: 12 }}>날짜 칸을 클릭해 근태를 추가·편집하세요. (색: 녹색=정상, 호박=지각·조퇴, 빨강=결근, 파랑=휴가·출장)</div>
        </div>
      ) : (
        <div className="panel">
          <table className="dtable">
            <thead>
              <tr>
                <th style={{ width: 140 }}>날짜</th>
                <th style={{ width: 100 }}>출근</th>
                <th style={{ width: 100 }}>퇴근</th>
                <th style={{ width: 90 }}>상태</th>
                <th>비고</th>
                <th style={{ width: 80 }}>관리</th>
              </tr>
            </thead>
            <tbody>
              {recs!.length === 0 && <tr><td colSpan={6} className="cellsub" style={{ textAlign: "center", padding: 28 }}>{month} 기록이 없습니다. “기록 추가”로 입력하세요.</td></tr>}
              {recs!.map((r) => (
                <tr key={r.id}>
                  <td className="strong">{r.work_date}</td>
                  <td className="cellsub">{hhmm(r.check_in)}</td>
                  <td className="cellsub">{hhmm(r.check_out)}</td>
                  <td><StatusBadge s={r.status} /></td>
                  <td className="cellsub">{r.note || "—"}</td>
                  <td><button className="btn btn--sm btn--ghost" onClick={() => setEditing(r)}>편집</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && empId && (
        <AttendanceModal
          employeeId={empId}
          employeeName={empName}
          record={editing === "new" ? null : editing}
          initialDate={newDate}
          onClose={() => setEditing(null)}
          onSaved={async () => { setEditing(null); await fetchRecs(empId, month); }}
        />
      )}
    </>
  );
}

function AttendanceModal({
  employeeId, employeeName, record, initialDate, onClose, onSaved,
}: {
  employeeId: string;
  employeeName: string;
  record: Rec | null;
  initialDate: string;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [date, setDate] = useState(record?.work_date ?? initialDate);
  const [checkIn, setCheckIn] = useState(record?.check_in?.slice(0, 5) ?? "09:00");
  const [checkOut, setCheckOut] = useState(record?.check_out?.slice(0, 5) ?? "18:00");
  const [status, setStatus] = useState<AttendanceStatus>(record?.status ?? "정상");
  const [note, setNote] = useState(record?.note ?? "");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function save() {
    setErr(null);
    setSaving(true);
    const payload = {
      employee_id: employeeId,
      work_date: date,
      check_in: checkIn || null,
      check_out: checkOut || null,
      status,
      note: note.trim() || null,
    };
    const res = record
      ? await supabase.from("attendance").update(payload).eq("id", record.id)
      : await supabase.from("attendance").insert(payload);
    if (res.error) {
      setErr(res.error.code === "23505" ? "이미 해당 날짜의 기록이 있습니다. 기존 기록을 편집하세요." : res.error.message);
      setSaving(false);
      return;
    }
    await onSaved();
  }

  async function remove() {
    if (!record) return;
    if (!window.confirm(`${record.work_date} 기록을 삭제할까요?`)) return;
    setDeleting(true);
    const { error } = await supabase.from("attendance").delete().eq("id", record.id);
    if (error) { setErr(error.message); setDeleting(false); return; }
    await onSaved();
  }

  return (
    <ModalShell title={record ? "근태 편집" : "근태 기록 추가"} subtitle={employeeName} onClose={onClose} maxWidth={440}>
      <div className="form">
        <div className="field"><label>날짜</label><input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} disabled={!!record} /></div>
        <div className="flex gap-s">
          <div className="field" style={{ flex: 1 }}><label>출근</label><input className="input" type="time" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} /></div>
          <div className="field" style={{ flex: 1 }}><label>퇴근</label><input className="input" type="time" value={checkOut} onChange={(e) => setCheckOut(e.target.value)} /></div>
        </div>
        <div className="field">
          <label>상태</label>
          <select className="input" value={status} onChange={(e) => setStatus(e.target.value as AttendanceStatus)}>
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="field"><label>비고</label><input className="input" value={note} onChange={(e) => setNote(e.target.value)} /></div>

        {err && <div role="alert" style={{ border: "1px solid var(--line-2)", color: "#b3261e", padding: "10px 12px", fontSize: 13.5, fontWeight: 600 }}>{err}</div>}

        <div className="flex jcb aic" style={{ marginTop: 6 }}>
          {record ? (
            <button className="btn btn--sm btn--ghost" type="button" onClick={remove} disabled={saving || deleting} style={{ color: "#b3261e" }}>{deleting ? "삭제 중…" : "삭제"}</button>
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

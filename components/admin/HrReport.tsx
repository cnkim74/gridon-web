"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { EMP_COLS, type Employee } from "@/components/admin/EmployeesTable";
import type { AttendanceStatus } from "@/lib/database.types";

type Att = { employee_id: string; work_date: string; check_in: string | null; check_out: string | null; status: AttendanceStatus };

function pad(n: number) { return String(n).padStart(2, "0"); }
function thisMonth() { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`; }
function nextMonthStart(ym: string) { const [y, m] = ym.split("-").map(Number); return m === 12 ? `${y + 1}-01-01` : `${y}-${pad(m + 1)}-01`; }
function won(n: number | null) { return n == null ? "—" : `${n.toLocaleString()}원`; }

function weekdaysInMonth(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  const last = new Date(y, m, 0).getDate();
  let c = 0;
  for (let d = 1; d <= last; d++) { const dow = new Date(y, m - 1, d).getDay(); if (dow !== 0 && dow !== 6) c++; }
  return c;
}
function minutes(t: string | null) { if (!t) return null; const [h, mi] = t.split(":").map(Number); return h * 60 + mi; }

const WORKED: AttendanceStatus[] = ["정상", "지각", "조퇴", "출장"];

function computePay(emp: Employee, recs: Att[], scheduled: number) {
  const cnt: Record<AttendanceStatus, number> = { 정상: 0, 지각: 0, 조퇴: 0, 결근: 0, 휴가: 0, 출장: 0 };
  let workedHours = 0;
  recs.forEach((r) => {
    cnt[r.status]++;
    if (WORKED.includes(r.status)) {
      const a = minutes(r.check_in), b = minutes(r.check_out);
      if (a != null && b != null && b > a) workedHours += (b - a) / 60;
    }
  });
  const worked = cnt.정상 + cnt.지각 + cnt.조퇴 + cnt.출장;
  const credited = worked + cnt.휴가; // 유급 인정일(휴가 포함)
  let pay = 0;
  if (emp.salary) {
    if (emp.pay_type === "월급") pay = scheduled > 0 ? Math.round((emp.salary * credited) / scheduled) : 0;
    else if (emp.pay_type === "일급") pay = worked * emp.salary;
    else pay = Math.round(workedHours * emp.salary); // 시급
  }
  return { cnt, worked, credited, workedHours, pay };
}

function Ins({ on, label }: { on: boolean; label: string }) {
  return <span style={{ fontSize: 11.5, color: on ? "var(--ink)" : "var(--line-2)", fontWeight: on ? 700 : 400 }}>{on ? "■" : "□"}{label}</span>;
}

export default function HrReport() {
  const [month, setMonth] = useState(thisMonth());
  const [emps, setEmps] = useState<Employee[] | null>(null);
  const [att, setAtt] = useState<Att[]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([
      supabase.from("employees").select(EMP_COLS).order("name"),
      supabase.from("attendance").select("employee_id, work_date, check_in, check_out, status").gte("work_date", `${month}-01`).lt("work_date", nextMonthStart(month)),
    ]).then(([e, a]) => {
      if (!active) return;
      if (e.error) { setErr(e.error.message); return; }
      if (a.error) { setErr(a.error.message); return; }
      setEmps((e.data as Employee[]) ?? []);
      setAtt((a.data as Att[]) ?? []);
    });
    return () => { active = false; };
  }, [month]);

  const scheduled = useMemo(() => weekdaysInMonth(month), [month]);
  const byEmp = useMemo(() => {
    const map = new Map<string, Att[]>();
    att.forEach((r) => { const l = map.get(r.employee_id) ?? []; l.push(r); map.set(r.employee_id, l); });
    return map;
  }, [att]);

  const loading = emps === null;
  const totalPay = useMemo(() => (emps ?? []).reduce((s, e) => s + computePay(e, byEmp.get(e.id) ?? [], scheduled).pay, 0), [emps, byEmp, scheduled]);

  const printCss = `@media print {
    body * { visibility: hidden !important; }
    #hr-report, #hr-report * { visibility: visible !important; }
    #hr-report { position: absolute; left: 0; top: 0; width: 100%; padding: 8mm; }
    .no-print { display: none !important; }
    @page { size: A4 landscape; margin: 8mm; }
  }`;

  return (
    <>
      <style>{printCss}</style>

      <div className="apage-head no-print">
        <div><h1>직원 종합현황</h1><p>이번달 출근·급여(근무일수 비례 추정)를 한 눈에 보고 PDF로 인쇄합니다.</p></div>
        <div className="flex gap-s wrap aic">
          <input className="input" type="month" value={month} onChange={(e) => setMonth(e.target.value)} style={{ width: 150 }} />
          <button className="btn btn--sm" onClick={() => window.print()} disabled={loading}>PDF 인쇄</button>
        </div>
      </div>

      {err && <div role="alert" className="no-print" style={{ border: "1px solid var(--line-2)", color: "#b3261e", padding: "10px 12px", marginBottom: 12 }}>{err}</div>}

      <div id="hr-report" className="panel" style={{ padding: 22 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 14 }}>
          <div>
            <div className="kr-d3" style={{ fontSize: 22, fontWeight: 800 }}>그리드온 직원 종합현황</div>
            <div className="muted" style={{ fontSize: 13, marginTop: 2 }}>대상 월: {month} · 소정근무일 {scheduled}일</div>
          </div>
          <div style={{ textAlign: "right", fontSize: 13 }}>
            <div className="muted">총 인원 {(emps ?? []).length}명 · 재직 {(emps ?? []).filter((e) => e.status === "재직").length}명</div>
            <div style={{ fontWeight: 800, fontSize: 16 }}>급여 합계 {won(totalPay)}</div>
          </div>
        </div>

        <table className="dtable">
          <thead>
            <tr>
              <th style={{ width: 46 }}></th>
              <th>이름 / 직급</th>
              <th style={{ width: 90 }}>부서</th>
              <th style={{ width: 64 }}>재직</th>
              <th style={{ width: 150 }}>4대보험</th>
              <th style={{ width: 120 }}>계약급여</th>
              <th style={{ width: 180 }}>이번달 출근</th>
              <th style={{ width: 120 }}>계산급여</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={8} className="cellsub" style={{ textAlign: "center", padding: 28 }}>불러오는 중…</td></tr>}
            {!loading && (emps ?? []).length === 0 && <tr><td colSpan={8} className="cellsub" style={{ textAlign: "center", padding: 28 }}>등록된 직원이 없습니다.</td></tr>}
            {!loading && (emps ?? []).map((e) => {
              const c = computePay(e, byEmp.get(e.id) ?? [], scheduled);
              return (
                <tr key={e.id}>
                  <td>
                    <span style={{ width: 36, height: 36, borderRadius: "50%", overflow: "hidden", display: "inline-flex", alignItems: "center", justifyContent: "center", background: "var(--ink)", color: "var(--paper)", fontWeight: 800, fontSize: 14 }}>
                      {e.photo_url
                        // eslint-disable-next-line @next/next/no-img-element
                        ? <img src={e.photo_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        : e.name.slice(0, 1)}
                    </span>
                  </td>
                  <td className="strong">{e.name}<div className="cellsub" style={{ fontWeight: 400 }}>{e.position || "—"} · {e.employment_type}</div></td>
                  <td className="cellsub">{e.department || "—"}</td>
                  <td>{e.status === "재직" ? <span className="badge ok dotok">재직</span> : e.status === "휴직" ? <span className="badge warn dotwarn">휴직</span> : <span className="badge off">퇴사</span>}</td>
                  <td>
                    <span className="flex gap-s wrap" style={{ gap: 8 }}>
                      <Ins on={e.ins_pension} label="연금" /><Ins on={e.ins_health} label="건강" /><Ins on={e.ins_employment} label="고용" /><Ins on={e.ins_industrial} label="산재" />
                    </span>
                  </td>
                  <td className="cellsub">{won(e.salary)}<div style={{ fontSize: 11, opacity: 0.7 }}>{e.pay_type}</div></td>
                  <td className="cellsub" style={{ fontSize: 12.5 }}>
                    근무 {c.worked} · 지각 {c.cnt.지각} · 결근 <b style={{ color: c.cnt.결근 ? "#b3261e" : "inherit" }}>{c.cnt.결근}</b> · 휴가 {c.cnt.휴가}
                    {e.pay_type === "시급" && <div style={{ opacity: 0.7 }}>총 {c.workedHours.toFixed(1)}h</div>}
                  </td>
                  <td className="strong">{won(c.pay)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <p className="muted" style={{ fontSize: 11.5, marginTop: 12 }}>
          ※ 계산급여는 <b>공제(4대보험·세금) 전 추정액</b>입니다. 월급=계약급여×(인정일/소정근무일, 휴가 포함·결근 제외), 일급=실근무일×급여, 시급=총근무시간×급여 기준.
        </p>
      </div>
    </>
  );
}

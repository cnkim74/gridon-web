"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { EMP_COLS, type Employee } from "@/components/admin/EmployeesTable";
import { summarize, weekdaysInMonth, won, ym, type AttRec } from "@/lib/payroll";

type Att = AttRec & { employee_id: string };
type PayEntry = { employee_id: string; base_salary: number };

function Ins({ on, label }: { on: boolean; label: string }) {
  return <span style={{ fontSize: 11.5, color: on ? "var(--ink)" : "var(--line-2)", fontWeight: on ? 700 : 400 }}>{on ? "■" : "□"}{label}</span>;
}

export default function HrReport() {
  const [month, setMonth] = useState(ym.now());
  const [emps, setEmps] = useState<Employee[] | null>(null);
  const [att, setAtt] = useState<Att[]>([]);
  const [entryMap, setEntryMap] = useState<Map<string, number>>(new Map());
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([
      supabase.from("employees").select(EMP_COLS).order("name"),
      supabase.from("attendance").select("employee_id, status, check_in, check_out").gte("work_date", `${month}-01`).lt("work_date", ym.nextStart(month)),
      supabase.from("payroll_entries").select("employee_id, base_salary").eq("year_month", month),
    ]).then(([e, a, pe]) => {
      if (!active) return;
      if (e.error) { setErr(e.error.message); return; }
      if (a.error) { setErr(a.error.message); return; }
      setEmps((e.data as Employee[]) ?? []);
      setAtt((a.data as Att[]) ?? []);
      const entries = (pe.data as PayEntry[]) ?? [];
      setEntryMap(new Map(entries.map((x) => [x.employee_id, Number(x.base_salary)])));
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
  const rows = useMemo(() => (emps ?? []).map((e) => {
    const salary = entryMap.has(e.id) ? entryMap.get(e.id)! : e.salary;
    return { e, s: summarize(byEmp.get(e.id) ?? [], scheduled, salary, e.pay_type), hasOverride: entryMap.has(e.id) };
  }), [emps, byEmp, scheduled, entryMap]);
  const totalPay = useMemo(() => rows.reduce((s, r) => s + r.s.gross, 0), [rows]);

  function exportCsv() {
    const header = ["이름", "직급", "부서", "재직여부", "고용형태", "국민연금", "건강보험", "고용보험", "산재보험", "계약급여", "급여유형", "근무일", "지각", "결근", "휴가", "계산급여"];
    const body = rows.map(({ e, s }) => [
      e.name, e.position ?? "", e.department ?? "", e.status, e.employment_type,
      e.ins_pension ? "Y" : "N", e.ins_health ? "Y" : "N", e.ins_employment ? "Y" : "N", e.ins_industrial ? "Y" : "N",
      e.salary ?? "", e.pay_type, s.worked, s.cnt.지각, s.cnt.결근, s.cnt.휴가, s.gross,
    ]);
    const csv = [header, ...body].map((c) => c.map((x) => `"${String(x).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `gridon-hr-${month}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

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
        <div><h1>직원 종합현황</h1><p>이번달 출근·급여(근무일수 비례, 공제 전 추정)를 한 눈에 보고 인쇄/내보냅니다.</p></div>
        <div className="flex gap-s wrap aic">
          <input className="input" type="month" value={month} onChange={(e) => setMonth(e.target.value)} style={{ width: 150 }} />
          <button className="btn btn--sm btn--ghost" onClick={exportCsv} disabled={loading}>CSV</button>
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
            {!loading && rows.length === 0 && <tr><td colSpan={8} className="cellsub" style={{ textAlign: "center", padding: 28 }}>등록된 직원이 없습니다.</td></tr>}
            {!loading && rows.map(({ e, s, hasOverride }) => (
              <tr key={e.id}>
                <td>
                  <span style={{ width: 36, height: 36, borderRadius: "50%", overflow: "hidden", display: "inline-flex", alignItems: "center", justifyContent: "center", background: "var(--ink)", color: "var(--paper)", fontWeight: 800, fontSize: 14 }}>
                    {e.photo_url
                      // eslint-disable-next-line @next/next/no-img-element
                      ? <img src={e.photo_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      : e.name.slice(0, 1)}
                  </span>
                </td>
                <td className="strong"><Link href={`/admin/employee/?id=${e.id}`} style={{ color: "var(--ink)" }}>{e.name}</Link><div className="cellsub" style={{ fontWeight: 400 }}>{e.position || "—"} · {e.employment_type}</div></td>
                <td className="cellsub">{e.department || "—"}</td>
                <td>{e.status === "재직" ? <span className="badge ok dotok">재직</span> : e.status === "휴직" ? <span className="badge warn dotwarn">휴직</span> : <span className="badge off">퇴사</span>}</td>
                <td><span className="flex gap-s wrap" style={{ gap: 8 }}><Ins on={e.ins_pension} label="연금" /><Ins on={e.ins_health} label="건강" /><Ins on={e.ins_employment} label="고용" /><Ins on={e.ins_industrial} label="산재" /></span></td>
                <td className="cellsub">
                  {won(hasOverride ? entryMap.get(e.id)! : e.salary)}
                  {hasOverride && <span style={{ fontSize: 10, background: "var(--ink)", color: "var(--paper)", padding: "1px 4px", borderRadius: 3, marginLeft: 4 }}>월별</span>}
                  <div style={{ fontSize: 11, opacity: 0.7 }}>{e.pay_type}</div>
                </td>
                <td className="cellsub" style={{ fontSize: 12.5 }}>
                  근무 {s.worked} · 지각 {s.cnt.지각} · 결근 <b style={{ color: s.cnt.결근 ? "#b3261e" : "inherit" }}>{s.cnt.결근}</b> · 휴가 {s.cnt.휴가}
                  {e.pay_type === "시급" && <div style={{ opacity: 0.7 }}>총 {s.workedHours.toFixed(1)}h</div>}
                </td>
                <td className="strong">{won(s.gross)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <p className="muted" style={{ fontSize: 11.5, marginTop: 12 }}>
          ※ 계산급여는 <b>공제(4대보험·세금) 전 추정액</b>입니다 (정식 명세서는 “급여명세서” 메뉴). 월급=계약급여×(인정일/소정근무일, 휴가 포함·결근 제외), 일급=실근무일×급여, 시급=총근무시간×급여.
        </p>
      </div>
    </>
  );
}

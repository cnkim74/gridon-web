"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { EMP_COLS, type Employee } from "@/components/admin/EmployeesTable";
import {
  summarize, weekdaysInMonth, deductions, isFreelance, FREELANCE_RATES,
  won, ym, INS_RATES, type AttRec,
} from "@/lib/payroll";

function Line({ label, value, strong, danger }: { label: string; value: string; strong?: boolean; danger?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: "1px solid var(--line-2)", fontSize: 13.5, fontWeight: strong ? 800 : 500, color: danger ? "#b3261e" : "inherit" }}>
      <span>{label}</span><span>{value}</span>
    </div>
  );
}

export default function PayslipView() {
  const [month, setMonth] = useState(ym.now());
  const [emps, setEmps] = useState<Employee[]>([]);
  const [empId, setEmpId] = useState("");
  const [recs, setRecs] = useState<AttRec[]>([]);
  const [err, setErr] = useState<string | null>(null);

  const [gross, setGross] = useState(0);
  const [base, setBase] = useState(0);
  const [tax, setTax] = useState(0);

  // 월별 기준 급여 override
  const [entrySalary, setEntrySalary] = useState(0);
  const [hasEntry, setHasEntry] = useState(false);
  const [savingEntry, setSavingEntry] = useState(false);

  // 직원 목록
  useEffect(() => {
    let active = true;
    supabase.from("employees").select(EMP_COLS).order("name").then(({ data, error }) => {
      if (!active) return;
      if (error) { setErr(error.message); return; }
      const list = (data as Employee[]) ?? [];
      setEmps(list);
      if (list.length) setEmpId((c) => c || list[0].id);
    });
    return () => { active = false; };
  }, []);

  const emp = emps.find((e) => e.id === empId) ?? null;

  // 선택 직원/월의 출근 + 월별 기준 급여
  useEffect(() => {
    let active = true;
    if (!empId) return;
    const e = emps.find((x) => x.id === empId) ?? null;
    Promise.all([
      supabase.from("attendance").select("status, check_in, check_out").eq("employee_id", empId).gte("work_date", `${month}-01`).lt("work_date", ym.nextStart(month)),
      supabase.from("payroll_entries").select("base_salary").eq("employee_id", empId).eq("year_month", month).maybeSingle(),
    ]).then(([att, entry]) => {
      if (!active) return;
      if (att.error) { setErr(att.error.message); return; }
      const list = (att.data as AttRec[]) ?? [];
      setRecs(list);
      const override = entry.data?.base_salary != null ? Number(entry.data.base_salary) : null;
      const salaryForCalc = override ?? e?.salary ?? null;
      setEntrySalary(salaryForCalc ?? 0);
      setHasEntry(override != null);
      const s = summarize(list, weekdaysInMonth(month), salaryForCalc, e?.pay_type ?? "월급");
      setGross(s.gross);
      setBase(salaryForCalc ?? s.gross);
      setTax(0);
    });
    return () => { active = false; };
  }, [empId, month, emps]);

  const summary = useMemo(() => summarize(recs, weekdaysInMonth(month), emp?.salary ?? null, emp?.pay_type ?? "월급"), [recs, month, emp]);

  const freelance = emp ? isFreelance(emp.pay_type) : false;
  const fRate = emp?.pay_type ? FREELANCE_RATES[emp.pay_type] : undefined;
  const deductBase = freelance ? gross : base;

  const d = useMemo(() => deductions({
    gross: deductBase,
    insPension: !!emp?.ins_pension,
    insHealth: !!emp?.ins_health,
    insEmployment: !!emp?.ins_employment,
    incomeTax: freelance ? 0 : tax,
    payType: emp?.pay_type,
  }), [deductBase, emp, tax, freelance]);

  const net = gross - d.total;

  async function saveMonthEntry() {
    if (!empId || !emp) return;
    setSavingEntry(true);
    const { error } = await supabase.from("payroll_entries").upsert(
      { employee_id: empId, year_month: month, base_salary: entrySalary },
      { onConflict: "employee_id,year_month" }
    );
    setSavingEntry(false);
    if (error) { setErr(error.message); return; }
    setHasEntry(true);
    const s = summarize(recs, weekdaysInMonth(month), entrySalary, emp.pay_type);
    setGross(s.gross);
    setBase(entrySalary);
  }

  async function clearMonthEntry() {
    if (!empId || !emp || !hasEntry) return;
    const { error } = await supabase.from("payroll_entries").delete().eq("employee_id", empId).eq("year_month", month);
    if (error) { setErr(error.message); return; }
    setHasEntry(false);
    setEntrySalary(emp.salary ?? 0);
    const s = summarize(recs, weekdaysInMonth(month), emp.salary ?? null, emp.pay_type);
    setGross(s.gross);
    setBase(emp.salary ?? s.gross);
  }

  const printCss = `@media print {
    body * { visibility: hidden !important; }
    #payslip, #payslip * { visibility: visible !important; }
    #payslip { position: absolute; left: 0; top: 0; width: 100%; padding: 10mm; }
    .no-print { display: none !important; }
    @page { size: A4 portrait; margin: 12mm; }
  }`;

  const numInput = (v: number, set: (n: number) => void, style?: React.CSSProperties) => (
    <input
      className="input" inputMode="numeric"
      value={v ? v.toLocaleString() : ""}
      onChange={(e) => set(Number(e.target.value.replace(/[^\d]/g, "")) || 0)}
      style={{ width: 140, textAlign: "right", ...style }}
    />
  );

  return (
    <>
      <style>{printCss}</style>

      <div className="apage-head no-print">
        <div><h1>급여명세서</h1><p>출근 대조 지급액에 공제를 반영합니다.</p></div>
        <button className="btn btn--sm" onClick={() => window.print()} disabled={!emp}>PDF 인쇄</button>
      </div>

      {err && <div role="alert" className="no-print" style={{ border: "1px solid var(--line-2)", color: "#b3261e", padding: "10px 12px", marginBottom: 12 }}>{err}</div>}

      {/* 입력 컨트롤 */}
      <div className="panel no-print" style={{ marginBottom: 18 }}>
        <div className="panel-body">
          <div className="flex gap-s wrap aic" style={{ rowGap: 10 }}>
            <div className="field" style={{ margin: 0, minWidth: 200 }}>
              <label>직원</label>
              <select className="input" value={empId} onChange={(e) => setEmpId(e.target.value)}>
                {emps.length === 0 && <option value="">직원 없음</option>}
                {emps.map((e) => <option key={e.id} value={e.id}>{e.name}{e.department ? ` · ${e.department}` : ""}</option>)}
              </select>
            </div>
            <div className="field" style={{ margin: 0, width: 150 }}>
              <label>대상 월</label>
              <input className="input" type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
            </div>
            <div className="field" style={{ margin: 0 }}>
              <label>
                이번달 기준 급여
                {hasEntry && <span style={{ marginLeft: 6, background: "var(--ink)", color: "var(--paper)", fontSize: 10, padding: "1px 6px", borderRadius: 4, verticalAlign: "middle" }}>월별설정</span>}
              </label>
              <div className="flex gap-s aic">
                {numInput(entrySalary, setEntrySalary)}
                <button className="btn btn--sm" type="button" onClick={saveMonthEntry} disabled={savingEntry || !emp}>{savingEntry ? "…" : "저장"}</button>
                {hasEntry && <button className="btn btn--sm btn--ghost" type="button" onClick={clearMonthEntry}>초기화</button>}
              </div>
            </div>
            <div className="field" style={{ margin: 0 }}>
              <label>지급액(실지급)</label>
              {numInput(gross, setGross)}
            </div>
            {!freelance && (
              <>
                <div className="field" style={{ margin: 0 }}><label>보수월액(보험료 기준)</label>{numInput(base, setBase)}</div>
                <div className="field" style={{ margin: 0 }}><label>소득세</label>{numInput(tax, setTax)}</div>
              </>
            )}
          </div>
          <p className="muted" style={{ fontSize: 11.5, marginTop: 8 }}>
            {freelance
              ? `${emp?.pay_type} 원천징수 ${fRate ? ((fRate.income + fRate.local) * 100).toFixed(1) : 0}% (소득세 ${fRate ? (fRate.income * 100).toFixed(0) : 0}% + 지방소득세 ${fRate ? (fRate.local * 100).toFixed(1) : 0}%) — 4대보험 없음.`
              : "기준 급여 = 이번달 계약 금액(월마다 다를 경우 입력 후 저장, 초기화 시 등록 계약급여로 복귀). 지급액 = 출근 대조 계산액. 보수월액 = 보험료 산정 기준. 소득세는 간이세액표 값 입력(지방소득세 자동 10%)."}
          </p>
        </div>
      </div>

      {/* 명세서 문서 */}
      <div id="payslip" className="panel" style={{ padding: 28, maxWidth: 640, margin: "0 auto" }}>
        {!emp ? <p className="cellsub" style={{ textAlign: "center", padding: 28 }}>직원을 선택하세요.</p> : (
          <>
            <div style={{ textAlign: "center", marginBottom: 18 }}>
              <div className="kr-d3" style={{ fontSize: 24, fontWeight: 800 }}>급여명세서</div>
              <div className="muted" style={{ fontSize: 13, marginTop: 2 }}>그리드온 · {month}</div>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5, marginBottom: 18, gap: 16 }}>
              <div>
                <b>{emp.name}</b> · {emp.position || "—"} · {emp.department || "—"}
                {freelance && <span className="muted" style={{ fontSize: 12, marginLeft: 6 }}>({emp.pay_type})</span>}
              </div>
              <div className="muted">근무 {summary.worked}일 · 결근 {summary.cnt.결근} · 휴가 {summary.cnt.휴가} / 소정 {weekdaysInMonth(month)}일</div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 28 }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 4 }}>지급 내역</div>
                <Line label="지급액" value={won(gross)} />
                <Line label="지급 합계" value={won(gross)} strong />
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 4 }}>{freelance ? "원천징수" : "공제 내역"}</div>
                {freelance ? (
                  <>
                    <Line label={`소득세 (${fRate ? (fRate.income * 100).toFixed(0) : 0}%)`} value={won(d.incomeTax)} />
                    <Line label={`지방소득세 (${fRate ? (fRate.local * 100).toFixed(1) : 0}%)`} value={won(d.localTax)} />
                    <Line label={`원천징수 합계 (${fRate ? ((fRate.income + fRate.local) * 100).toFixed(1) : 0}%)`} value={won(d.total)} strong danger />
                  </>
                ) : (
                  <>
                    <Line label={`국민연금 (${(INS_RATES.pension * 100).toFixed(1)}%)`} value={won(d.pension)} />
                    <Line label={`건강보험 (${(INS_RATES.health * 100).toFixed(3)}%)`} value={won(d.health)} />
                    <Line label={`장기요양 (건보×${(INS_RATES.care * 100).toFixed(2)}%)`} value={won(d.care)} />
                    <Line label={`고용보험 (${(INS_RATES.employment * 100).toFixed(1)}%)`} value={won(d.employment)} />
                    <Line label="소득세" value={won(d.incomeTax)} />
                    <Line label="지방소득세" value={won(d.localTax)} />
                    <Line label="공제 합계" value={won(d.total)} strong danger />
                  </>
                )}
              </div>
            </div>

            <div style={{ marginTop: 22, padding: "16px 18px", border: "2px solid var(--ink)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontWeight: 800, fontSize: 16 }}>실수령액</span>
              <span style={{ fontWeight: 900, fontSize: 22 }}>{won(net)}</span>
            </div>

            <p className="muted" style={{ fontSize: 11, marginTop: 16 }}>
              {freelance
                ? `※ ${emp.pay_type} 원천징수율 ${fRate ? ((fRate.income + fRate.local) * 100).toFixed(1) : 0}% 적용 (소득세 ${fRate ? (fRate.income * 100).toFixed(0) : 0}% + 지방소득세 ${fRate ? (fRate.local * 100).toFixed(1) : 0}%). 4대보험은 공제에 포함되지 않습니다.`
                : "※ 본 명세서는 입력값 기준 산출액입니다. 4대보험료는 보수월액×요율(2024 기준, 상·하한 미반영), 소득세는 입력값, 지방소득세는 소득세의 10%로 계산했습니다. 산재보험은 사업주 부담으로 공제에 포함되지 않습니다."}
            </p>
          </>
        )}
      </div>
    </>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { EMP_COLS, type Employee } from "@/components/admin/EmployeesTable";
import { summarize, weekdaysInMonth, deductions, won, ym, INS_RATES, type AttRec } from "@/lib/payroll";

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

  const [gross, setGross] = useState(0);    // 지급액(실지급)
  const [base, setBase] = useState(0);       // 보수월액(보험료 산정 기준)
  const [tax, setTax] = useState(0);         // 소득세

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

  // 선택 직원/월의 출근 + 기본값 세팅
  useEffect(() => {
    let active = true;
    if (!empId) return;
    supabase.from("attendance").select("status, check_in, check_out").eq("employee_id", empId).gte("work_date", `${month}-01`).lt("work_date", ym.nextStart(month)).then(({ data, error }) => {
      if (!active) return;
      if (error) { setErr(error.message); return; }
      const list = (data as AttRec[]) ?? [];
      setRecs(list);
      const e = emps.find((x) => x.id === empId) ?? null;
      const s = summarize(list, weekdaysInMonth(month), e?.salary ?? null, e?.pay_type ?? "월급");
      setGross(s.gross);
      setBase(e?.salary ?? s.gross);
      setTax(0);
    });
    return () => { active = false; };
  }, [empId, month, emps]);

  const summary = useMemo(() => summarize(recs, weekdaysInMonth(month), emp?.salary ?? null, emp?.pay_type ?? "월급"), [recs, month, emp]);
  const d = useMemo(() => deductions({ gross: base, insPension: !!emp?.ins_pension, insHealth: !!emp?.ins_health, insEmployment: !!emp?.ins_employment, incomeTax: tax }), [base, emp, tax]);
  const net = gross - d.total;

  const printCss = `@media print {
    body * { visibility: hidden !important; }
    #payslip, #payslip * { visibility: visible !important; }
    #payslip { position: absolute; left: 0; top: 0; width: 100%; padding: 10mm; }
    .no-print { display: none !important; }
    @page { size: A4 portrait; margin: 12mm; }
  }`;

  const numInput = (v: number, set: (n: number) => void) => (
    <input className="input" inputMode="numeric" value={v ? v.toLocaleString() : ""} onChange={(e) => set(Number(e.target.value.replace(/[^\d]/g, "")) || 0)} style={{ width: 140, textAlign: "right" }} />
  );

  return (
    <>
      <style>{printCss}</style>

      <div className="apage-head no-print">
        <div><h1>급여명세서</h1><p>출근 대조 지급액에 4대보험·소득세 공제를 반영합니다.</p></div>
        <button className="btn btn--sm" onClick={() => window.print()} disabled={!emp}>PDF 인쇄</button>
      </div>

      {err && <div role="alert" className="no-print" style={{ border: "1px solid var(--line-2)", color: "#b3261e", padding: "10px 12px", marginBottom: 12 }}>{err}</div>}

      {/* 입력 컨트롤 (인쇄 제외) */}
      <div className="panel no-print" style={{ marginBottom: 18 }}>
        <div className="panel-body">
          <div className="flex gap-s wrap aic">
            <div className="field" style={{ margin: 0, minWidth: 200 }}>
              <label>직원</label>
              <select className="input" value={empId} onChange={(e) => setEmpId(e.target.value)}>
                {emps.length === 0 && <option value="">직원 없음</option>}
                {emps.map((e) => <option key={e.id} value={e.id}>{e.name}{e.department ? ` · ${e.department}` : ""}</option>)}
              </select>
            </div>
            <div className="field" style={{ margin: 0, width: 150 }}><label>대상 월</label><input className="input" type="month" value={month} onChange={(e) => setMonth(e.target.value)} /></div>
            <div className="field" style={{ margin: 0 }}><label>지급액(실지급)</label>{numInput(gross, setGross)}</div>
            <div className="field" style={{ margin: 0 }}><label>보수월액(보험료 기준)</label>{numInput(base, setBase)}</div>
            <div className="field" style={{ margin: 0 }}><label>소득세</label>{numInput(tax, setTax)}</div>
          </div>
          <p className="muted" style={{ fontSize: 11.5, marginTop: 6 }}>
            지급액 기본값 = 출근 대조 계산급여, 보수월액 기본값 = 계약급여. 소득세는 근로소득 간이세액표 값을 입력하세요(지방소득세 자동 10%). 보험료율은 2024 기준.
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
              <div><b>{emp.name}</b> · {emp.position || "—"} · {emp.department || "—"}</div>
              <div className="muted">근무 {summary.worked}일 · 결근 {summary.cnt.결근} · 휴가 {summary.cnt.휴가} / 소정 {weekdaysInMonth(month)}일</div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 28 }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 4 }}>지급 내역</div>
                <Line label="기본급(지급액)" value={won(gross)} />
                <Line label="지급 합계" value={won(gross)} strong />
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 4 }}>공제 내역</div>
                <Line label={`국민연금 (${(INS_RATES.pension * 100).toFixed(1)}%)`} value={won(d.pension)} />
                <Line label={`건강보험 (${(INS_RATES.health * 100).toFixed(3)}%)`} value={won(d.health)} />
                <Line label={`장기요양 (건보×${(INS_RATES.care * 100).toFixed(2)}%)`} value={won(d.care)} />
                <Line label={`고용보험 (${(INS_RATES.employment * 100).toFixed(1)}%)`} value={won(d.employment)} />
                <Line label="소득세" value={won(d.incomeTax)} />
                <Line label="지방소득세" value={won(d.localTax)} />
                <Line label="공제 합계" value={won(d.total)} strong danger />
              </div>
            </div>

            <div style={{ marginTop: 22, padding: "16px 18px", border: "2px solid var(--ink)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontWeight: 800, fontSize: 16 }}>실수령액</span>
              <span style={{ fontWeight: 900, fontSize: 22 }}>{won(net)}</span>
            </div>

            <p className="muted" style={{ fontSize: 11, marginTop: 16 }}>
              ※ 본 명세서는 입력값 기준 산출액입니다. 4대보험료는 보수월액×요율(2024 기준, 상·하한 미반영), 소득세는 입력값, 지방소득세는 소득세의 10%로 계산했습니다. 산재보험은 사업주 부담으로 공제에 포함되지 않습니다.
            </p>
          </>
        )}
      </div>
    </>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { EMP_COLS, type Employee } from "@/components/admin/EmployeesTable";
import {
  EMPLOYER_RATES, INS_RATES, isFreelance, won, ym,
  calcEmployeeIns, calcEmployerIns, addIns,
  type InsResult,
} from "@/lib/payroll";

type PayEntry = { employee_id: string; base_salary: number };
type EmpRow   = { emp: Employee; salary: number | null; empIns: InsResult; erIns: InsResult };

const ZERO: InsResult = { pension: 0, health: 0, care: 0, employment: 0, industrial: 0, total: 0 };

function nextMonthDl(s: string, day: number) {
  const [y, m] = s.split("-").map(Number);
  const nm = m === 12 ? 1 : m + 1;
  const ny = m === 12 ? y + 1 : y;
  return `${ny}.${String(nm).padStart(2, "0")}.${String(day).padStart(2, "0")}`;
}

const INS_COLORS = { pension: "#4a90d9", health: "#2ecc71", employment: "#f39c12", industrial: "#e74c3c" };

export default function InsuranceDashboard() {
  const [month, setMonth] = useState(ym.now());
  const [emps, setEmps]     = useState<Employee[]>([]);
  const [entries, setEntries] = useState<PayEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.all([
      supabase.from("employees").select(EMP_COLS).in("status", ["재직", "휴직"]).order("name"),
      supabase.from("payroll_entries").select("employee_id, base_salary").eq("year_month", month),
    ]).then(([eRes, pRes]) => {
      if (!active) return;
      setLoading(false);
      if (eRes.error) { setErr(eRes.error.message); return; }
      if (pRes.error) { setErr(pRes.error.message); return; }
      setEmps((eRes.data as Employee[]) ?? []);
      setEntries((pRes.data as PayEntry[]) ?? []);
    });
    return () => { active = false; };
  }, [month]);

  const rows = useMemo<EmpRow[]>(() => {
    const entMap = new Map(entries.map((e) => [e.employee_id, e.base_salary]));
    return emps.map((emp) => {
      const override = entMap.get(emp.id);
      const salary = override != null ? override : emp.salary;
      if (!salary || isFreelance(emp.pay_type))
        return { emp, salary, empIns: { ...ZERO }, erIns: { ...ZERO } };
      return { emp, salary, empIns: calcEmployeeIns(salary, emp), erIns: calcEmployerIns(salary, emp) };
    });
  }, [emps, entries]);

  const totEr  = useMemo(() => rows.reduce((a, r) => addIns(a, r.erIns),  { ...ZERO }), [rows]);
  const totEmp = useMemo(() => rows.reduce((a, r) => addIns(a, r.empIns), { ...ZERO }), [rows]);

  const insCount = rows.filter((r) => !isFreelance(r.emp.pay_type) && r.salary != null).length;

  const byType = {
    pension:    totEr.pension    + totEmp.pension,
    health:     totEr.health     + totEr.care + totEmp.health + totEmp.care,
    employment: totEr.employment + totEmp.employment,
    industrial: totEr.industrial,
  };

  const pensionDue = nextMonthDl(month, 10);
  const emplDue    = nextMonthDl(month, 15);

  const insCards = [
    {
      key: "pension", title: "국민연금", color: INS_COLORS.pension,
      deadline: `국민건강보험공단 · ${pensionDue}`,
      rows: [
        { label: `사업주 ${(EMPLOYER_RATES.pension * 100).toFixed(1)}%`, val: totEr.pension },
        { label: `근로자 ${(INS_RATES.pension * 100).toFixed(1)}%`,      val: totEmp.pension },
      ],
      total: byType.pension,
    },
    {
      key: "health", title: "건강보험", color: INS_COLORS.health,
      deadline: `국민건강보험공단 · ${pensionDue}`,
      rows: [
        { label: `사업주 건강 ${(EMPLOYER_RATES.health * 100).toFixed(3)}%`, val: totEr.health },
        { label: "사업주 장기요양",                                            val: totEr.care },
        { label: `근로자 건강 ${(INS_RATES.health * 100).toFixed(3)}%`,      val: totEmp.health },
        { label: "근로자 장기요양",                                            val: totEmp.care },
      ],
      total: byType.health,
    },
    {
      key: "employment", title: "고용보험", color: INS_COLORS.employment,
      deadline: `근로복지공단 · ${emplDue}`,
      rows: [
        { label: "사업주 실업급여 0.9% + 고용안정 0.25%", val: totEr.employment },
        { label: `근로자 실업급여 ${(INS_RATES.employment * 100).toFixed(1)}%`, val: totEmp.employment },
      ],
      total: byType.employment,
    },
    {
      key: "industrial", title: "산재보험", color: INS_COLORS.industrial,
      deadline: `근로복지공단 · ${emplDue}`,
      rows: [
        { label: `사업주 전액 ${(EMPLOYER_RATES.industrial * 100).toFixed(1)}% (전기공사업)`, val: totEr.industrial },
        { label: "근로자 부담", val: 0 },
      ],
      total: byType.industrial,
    },
  ];

  return (
    <div style={{ padding: "32px 36px" }}>
      <div style={{ marginBottom: 24 }}>
        <h1 className="kr-d3" style={{ fontSize: 24, fontWeight: 800 }}>4대보험 납부현황</h1>
        <p className="muted" style={{ fontSize: 13.5, marginTop: 4 }}>월별 사업주 부담 보험료 및 공단 납부액을 확인합니다.</p>
      </div>

      {/* Month selector */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <label style={{ fontWeight: 600, fontSize: 13.5 }}>기준 월</label>
        <input type="month" className="input" value={month}
          onChange={(e) => setMonth(e.target.value)} style={{ width: 160 }} />
        {loading && <span className="muted" style={{ fontSize: 13 }}>계산 중…</span>}
      </div>

      {err && <div role="alert" style={{ color: "#b3261e", marginBottom: 16, fontSize: 13.5 }}>{err}</div>}

      {/* Summary cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 20 }}>
        {[
          { label: "사업주 납부 총액", value: won(totEr.total),                   sub: "이번달 합계", hi: true },
          { label: "근로자 공제 합계", value: won(totEmp.total),                  sub: "급여에서 공제" },
          { label: "공단 납부 합산",   value: won(totEr.total + totEmp.total),    sub: "사업주 + 근로자" },
          { label: "4대보험 가입 인원", value: `${insCount}명`,                    sub: `재직·휴직 ${emps.length}명 중` },
        ].map(({ label, value, sub, hi }) => (
          <div key={label} className="panel" style={{
            padding: "16px 18px",
            background: hi ? "var(--ink)" : undefined,
            color:      hi ? "var(--paper)" : undefined,
          }}>
            <div style={{ fontSize: 11.5, marginBottom: 6, color: hi ? "#bbb" : "var(--muted)" }}>{label}</div>
            <div style={{ fontSize: 20, fontWeight: 800 }}>{value}</div>
            <div style={{ fontSize: 11.5, marginTop: 4, color: hi ? "#bbb" : "var(--muted)" }}>{sub}</div>
          </div>
        ))}
      </div>

      {/* Per-insurance breakdown cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 24 }}>
        {insCards.map(({ key, title, color, deadline, rows: iRows, total }) => (
          <div key={key} className="panel" style={{ padding: "14px 16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7, fontWeight: 700, fontSize: 13, marginBottom: 10 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: color, display: "inline-block", flexShrink: 0 }} />
              {title}
            </div>
            {iRows.map(({ label, val }) => (
              <div key={label} style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, padding: "3px 0", color: val === 0 ? "var(--muted)" : "inherit" }}>
                <span style={{ color: "var(--muted)" }}>{label}</span>
                <span>{val === 0 ? "없음" : val.toLocaleString()}</span>
              </div>
            ))}
            <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 800, fontSize: 13.5, marginTop: 8, paddingTop: 8, borderTop: "1px solid var(--line-2)" }}>
              <span>납부 합계</span>
              <span>{total.toLocaleString()}원</span>
            </div>
            <div style={{ fontSize: 10.5, color: "var(--muted)", marginTop: 6, lineHeight: 1.5 }}>{deadline}</div>
          </div>
        ))}
      </div>

      {/* Employee detail table */}
      <div className="panel" style={{ padding: 0, overflow: "auto", marginBottom: 16 }}>
        <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--line-2)", fontWeight: 700, fontSize: 13 }}>
          직원별 사업주 부담 상세 — {ym.label(month)}
        </div>
        <table className="table" style={{ minWidth: 860 }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left" }}>직원</th>
              <th style={{ textAlign: "right" }}>기준 급여</th>
              <th style={{ textAlign: "right" }}>국민연금</th>
              <th style={{ textAlign: "right" }}>건강+장기요양</th>
              <th style={{ textAlign: "right" }}>고용보험</th>
              <th style={{ textAlign: "right" }}>산재보험</th>
              <th style={{ textAlign: "right", color: "var(--ink)" }}>사업주 합계</th>
              <th style={{ textAlign: "right" }}>근로자 공제</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ emp, salary, erIns, empIns }) => {
              const fl = isFreelance(emp.pay_type);
              const noSalary = !fl && !salary;
              return (
                <tr key={emp.id}>
                  <td>
                    <span style={{ fontWeight: 600 }}>{emp.name}</span>
                    {emp.department && <span className="muted" style={{ fontSize: 11, marginLeft: 6 }}>{emp.department}</span>}
                    {fl && <span className="badge warn" style={{ marginLeft: 6, fontSize: 10 }}>{emp.pay_type}</span>}
                  </td>
                  <td style={{ textAlign: "right" }} className="cellsub">
                    {salary != null ? `${Number(salary).toLocaleString()}원` : <span className="muted">미설정</span>}
                  </td>
                  {fl || noSalary ? (
                    <>
                      <td colSpan={5} style={{ textAlign: "center" }} className="muted">
                        {fl ? "원천징수만 적용 (4대보험 해당없음)" : "기준 급여 미설정"}
                      </td>
                      <td />
                    </>
                  ) : (
                    <>
                      <td style={{ textAlign: "right" }}>{erIns.pension  > 0 ? erIns.pension.toLocaleString()               : <span className="muted">—</span>}</td>
                      <td style={{ textAlign: "right" }}>{erIns.health   > 0 ? (erIns.health + erIns.care).toLocaleString() : <span className="muted">—</span>}</td>
                      <td style={{ textAlign: "right" }}>{erIns.employment > 0 ? erIns.employment.toLocaleString()          : <span className="muted">—</span>}</td>
                      <td style={{ textAlign: "right" }}>{erIns.industrial > 0 ? erIns.industrial.toLocaleString()          : <span className="muted">—</span>}</td>
                      <td style={{ textAlign: "right", fontWeight: 700 }}>{erIns.total.toLocaleString()}원</td>
                      <td style={{ textAlign: "right" }} className="muted">
                        {empIns.total > 0 ? empIns.total.toLocaleString() : "—"}
                      </td>
                    </>
                  )}
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr style={{ fontWeight: 800 }}>
              <td>합계</td>
              <td />
              <td style={{ textAlign: "right" }}>{totEr.pension.toLocaleString()}</td>
              <td style={{ textAlign: "right" }}>{(totEr.health + totEr.care).toLocaleString()}</td>
              <td style={{ textAlign: "right" }}>{totEr.employment.toLocaleString()}</td>
              <td style={{ textAlign: "right" }}>{totEr.industrial.toLocaleString()}</td>
              <td style={{ textAlign: "right" }}>{totEr.total.toLocaleString()}원</td>
              <td style={{ textAlign: "right" }}>{totEmp.total.toLocaleString()}원</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Info bar */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div style={{ background: "var(--surface-2)", border: "1px solid var(--line-2)", borderRadius: 4, padding: "12px 16px", fontSize: 12.5, lineHeight: 2 }}>
          <strong style={{ display: "block", marginBottom: 2 }}>납부처 및 기한</strong>
          <span className="muted">국민연금 · 건강보험</span> → 국민건강보험공단 · <strong>{pensionDue}</strong><br />
          <span className="muted">고용보험 · 산재보험</span> → 근로복지공단 · <strong>{emplDue}</strong>
        </div>
        <div style={{ background: "#fffbeb", border: "1px solid #f5c842", borderRadius: 4, padding: "12px 16px", fontSize: 12.5, lineHeight: 2 }}>
          <strong style={{ display: "block", marginBottom: 2, color: "#b8860b" }}>산재보험률 확인 필요</strong>
          현재 <strong>전기공사업 추정 2.5%</strong> 적용 중입니다.<br />
          근로복지공단 고지서의 실제 요율과 대조 후 <code style={{ fontSize: 11 }}>lib/payroll.ts</code> 를 수정하세요.
        </div>
      </div>
    </div>
  );
}

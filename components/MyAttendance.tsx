"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/lib/supabase";
import { weekdaysInMonth, ym } from "@/lib/payroll";
import type { AttendanceStatus } from "@/lib/database.types";

type EmpBasic = { id: string; name: string; position: string | null; department: string | null };
type DayRec = { work_date: string; status: AttendanceStatus; check_in: string | null; check_out: string | null };

const STATUS_COLOR: Record<AttendanceStatus, string> = {
  정상: "#22c55e",
  지각: "#f59e0b",
  조퇴: "#f59e0b",
  결근: "#ef4444",
  휴가: "#3b82f6",
  출장: "#6b7280",
};

function pad2(n: number) { return String(n).padStart(2, "0"); }

export default function MyAttendance() {
  const { user, profile } = useAuth();
  const [month, setMonth] = useState(ym.now());
  const [emp, setEmp] = useState<EmpBasic | null>(null);
  const [recs, setRecs] = useState<DayRec[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // 연결된 직원 레코드 로드
  useEffect(() => {
    if (!user?.id) return;
    let active = true;
    supabase.from("employees").select("id, name, position, department").eq("profile_id", user.id).maybeSingle().then(({ data, error }) => {
      if (!active) return;
      if (error) { setErr(error.message); setLoading(false); return; }
      setEmp((data as EmpBasic) ?? null);
      if (!data) setLoading(false);
    });
    return () => { active = false; };
  }, [user?.id]);

  // 선택 월 출근 기록 로드
  useEffect(() => {
    if (!emp?.id) return;
    let active = true;
    setLoading(true);
    supabase.from("attendance").select("work_date, status, check_in, check_out")
      .eq("employee_id", emp.id)
      .gte("work_date", `${month}-01`)
      .lt("work_date", ym.nextStart(month))
      .then(({ data, error }) => {
        if (!active) return;
        setLoading(false);
        if (error) { setErr(error.message); return; }
        setRecs((data as DayRec[]) ?? []);
      });
    return () => { active = false; };
  }, [emp?.id, month]);

  // 달력 셀 생성
  const calendarCells = useMemo(() => {
    const [y, m] = month.split("-").map(Number);
    const firstDow = new Date(y, m - 1, 1).getDay();
    const lastDate = new Date(y, m, 0).getDate();
    const recMap = new Map(recs.map((r) => [r.work_date, r]));
    const cells: Array<{ date: number | null; rec: DayRec | null }> = [];
    for (let i = 0; i < firstDow; i++) cells.push({ date: null, rec: null });
    for (let d = 1; d <= lastDate; d++) {
      const dateStr = `${month}-${pad2(d)}`;
      cells.push({ date: d, rec: recMap.get(dateStr) ?? null });
    }
    return cells;
  }, [month, recs]);

  const cnt = useMemo(() => {
    const c: Record<AttendanceStatus, number> = { 정상: 0, 지각: 0, 조퇴: 0, 결근: 0, 휴가: 0, 출장: 0 };
    recs.forEach((r) => { c[r.status] = (c[r.status] ?? 0) + 1; });
    return c;
  }, [recs]);

  if (!user) return <div className="cellsub" style={{ padding: 40 }}>로그인이 필요합니다.</div>;
  if (profile && profile.member_type !== "직원") return <div className="cellsub" style={{ padding: 40 }}>직원으로 등록된 계정만 접근할 수 있습니다.</div>;
  if (!loading && emp === null) return <div className="cellsub" style={{ padding: 40 }}>직원 정보가 연결되지 않았습니다. 관리자에게 연결을 요청하세요.</div>;

  return (
    <div style={{ maxWidth: 680, margin: "0 auto", padding: "28px 16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
        <div>
          <h1 className="kr-d3" style={{ fontSize: 22, fontWeight: 800 }}>내 출근부</h1>
          {emp && <p className="muted" style={{ fontSize: 13, marginTop: 4 }}>{emp.name} · {emp.position || "—"} · {emp.department || "—"}</p>}
        </div>
        <input className="input" type="month" value={month} onChange={(e) => setMonth(e.target.value)} style={{ width: 150 }} />
      </div>

      {err && <div role="alert" style={{ border: "1px solid var(--line-2)", color: "#b3261e", padding: "10px 12px", marginBottom: 12, fontSize: 13.5 }}>{err}</div>}

      <div className="kpis" style={{ marginBottom: 18 }}>
        {(["정상", "지각", "결근", "휴가"] as AttendanceStatus[]).map((s) => (
          <div key={s} className="kpi" style={{ padding: 12 }}>
            <div className="kl">{s}</div>
            <div className="kv" style={{ fontSize: 22, color: STATUS_COLOR[s] }}>{cnt[s]}</div>
          </div>
        ))}
      </div>

      <div className="panel" style={{ padding: 18 }}>
        {loading ? (
          <div className="cellsub" style={{ textAlign: "center", padding: 28 }}>불러오는 중…</div>
        ) : (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 3, marginBottom: 6 }}>
              {["일", "월", "화", "수", "목", "금", "토"].map((d, i) => (
                <div key={d} style={{ textAlign: "center", fontSize: 11.5, fontWeight: 700, color: i === 0 ? "#ef4444" : i === 6 ? "#3b82f6" : "var(--muted)", padding: "4px 0" }}>{d}</div>
              ))}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 3 }}>
              {calendarCells.map((cell, i) => {
                const dow = i % 7;
                return (
                  <div
                    key={i}
                    style={{
                      minHeight: 56, padding: "4px 5px", borderRadius: 4,
                      background: cell.date ? (cell.rec ? `${STATUS_COLOR[cell.rec.status]}18` : "var(--surface, #f8f8f8)") : "transparent",
                      border: `1px solid ${cell.rec ? STATUS_COLOR[cell.rec.status] : cell.date ? "var(--line-2, #e5e5e5)" : "transparent"}`,
                    }}
                  >
                    {cell.date && (
                      <>
                        <div style={{ fontSize: 11.5, fontWeight: 600, color: dow === 0 ? "#ef4444" : dow === 6 ? "#3b82f6" : "var(--muted)" }}>{cell.date}</div>
                        {cell.rec ? (
                          <>
                            <div style={{ fontSize: 11, fontWeight: 700, color: STATUS_COLOR[cell.rec.status], marginTop: 2 }}>{cell.rec.status}</div>
                            {cell.rec.check_in && (
                              <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 1 }}>
                                {cell.rec.check_in.slice(0, 5)}{cell.rec.check_out ? `~${cell.rec.check_out.slice(0, 5)}` : ""}
                              </div>
                            )}
                          </>
                        ) : null}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
            <p className="muted" style={{ fontSize: 11.5, marginTop: 14 }}>
              소정근무일 {weekdaysInMonth(month)}일 · 기록 {recs.length}일 (출장 {cnt.출장}포함)
            </p>
          </>
        )}
      </div>
    </div>
  );
}

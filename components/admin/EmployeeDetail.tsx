"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { EMP_COLS, type Employee } from "@/components/admin/EmployeesTable";
import { summarize, weekdaysInMonth, won, ym, type AttRec } from "@/lib/payroll";

type Contract = { id: string; title: string; file_path: string; mime_type: string | null; uploaded_at: string };

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="muted" style={{ fontSize: 11.5 }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 600, marginTop: 2 }}>{value || "—"}</div>
    </div>
  );
}

function Ins({ on, label }: { on: boolean; label: string }) {
  return <span style={{ fontSize: 13, color: on ? "var(--ink)" : "var(--line-2)", fontWeight: on ? 700 : 400 }}>{on ? "■ " : "□ "}{label}</span>;
}

export default function EmployeeDetail() {
  const id = useSearchParams().get("id");
  const [month, setMonth] = useState(ym.now());
  const [emp, setEmp] = useState<Employee | null>(null);
  const [recs, setRecs] = useState<AttRec[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [rrn, setRrn] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // 직원 + 계약서
  useEffect(() => {
    let active = true;
    if (!id) return;
    Promise.all([
      supabase.from("employees").select(EMP_COLS).eq("id", id).maybeSingle(),
      supabase.from("contracts").select("id, title, file_path, mime_type, uploaded_at").eq("employee_id", id).order("uploaded_at", { ascending: false }),
    ]).then(([e, c]) => {
      if (!active) return;
      if (e.error) { setErr(e.error.message); return; }
      if (!e.data) { setNotFound(true); return; }
      setEmp(e.data as Employee);
      setContracts((c.data as Contract[]) ?? []);
    });
    return () => { active = false; };
  }, [id]);

  // 선택월 근태
  useEffect(() => {
    let active = true;
    if (!id) return;
    supabase.from("attendance").select("status, check_in, check_out").eq("employee_id", id).gte("work_date", `${month}-01`).lt("work_date", ym.nextStart(month)).then(({ data, error }) => {
      if (!active) return;
      if (error) { setErr(error.message); return; }
      setRecs((data as AttRec[]) ?? []);
    });
    return () => { active = false; };
  }, [id, month]);

  const s = useMemo(() => summarize(recs, weekdaysInMonth(month), emp?.salary ?? null, emp?.pay_type ?? "월급"), [recs, month, emp]);

  async function revealRrn() {
    if (!id) return;
    const { data, error } = await supabase.rpc("get_employee_rrn", { p_emp: id });
    if (error) { setErr(error.message); return; }
    setRrn((data as string) ?? "(없음)");
  }
  async function viewContract(c: Contract) {
    const { data, error } = await supabase.storage.from("contracts").createSignedUrl(c.file_path, 120);
    if (error) { setErr(error.message); return; }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  const printCss = `@media print {
    body * { visibility: hidden !important; }
    #emp-detail, #emp-detail * { visibility: visible !important; }
    #emp-detail { position: absolute; left: 0; top: 0; width: 100%; padding: 10mm; }
    .no-print { display: none !important; }
    @page { size: A4 portrait; margin: 12mm; }
  }`;

  if (!id) return <div style={{ padding: 40 }} className="cellsub">직원 ID가 없습니다. <Link href="/admin/employees">직원 현황으로</Link></div>;
  if (notFound) return <div style={{ padding: 40 }} className="cellsub">직원을 찾을 수 없습니다. <Link href="/admin/employees">직원 현황으로</Link></div>;

  return (
    <>
      <style>{printCss}</style>

      <div className="apage-head no-print">
        <div className="flex aic gap-s">
          <Link href="/admin/employees" className="btn btn--sm btn--ghost">← 목록</Link>
          <div><h1>직원 상세</h1></div>
        </div>
        <div className="flex gap-s wrap aic">
          <input className="input" type="month" value={month} onChange={(e) => setMonth(e.target.value)} style={{ width: 150 }} />
          <button className="btn btn--sm" onClick={() => window.print()} disabled={!emp}>PDF 인쇄</button>
        </div>
      </div>

      {err && <div role="alert" className="no-print" style={{ border: "1px solid var(--line-2)", color: "#b3261e", padding: "10px 12px", marginBottom: 12 }}>{err}</div>}

      {!emp ? <div className="panel"><p className="cellsub" style={{ textAlign: "center", padding: 28 }}>불러오는 중…</p></div> : (
        <div id="emp-detail" className="panel" style={{ padding: 28, maxWidth: 760, margin: "0 auto" }}>
          {/* 헤더 */}
          <div style={{ display: "flex", gap: 18, alignItems: "center", borderBottom: "2px solid var(--ink)", paddingBottom: 16, marginBottom: 18 }}>
            <span style={{ width: 84, height: 84, borderRadius: "50%", overflow: "hidden", flex: "none", background: "var(--ink)", color: "var(--paper)", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 34, fontWeight: 800 }}>
              {emp.photo_url
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={emp.photo_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                : emp.name.slice(0, 1)}
            </span>
            <div style={{ flex: 1 }}>
              <div className="kr-d3" style={{ fontSize: 26, fontWeight: 800 }}>{emp.name}</div>
              <div className="muted" style={{ fontSize: 14, marginTop: 2 }}>{emp.position || "—"} · {emp.department || "—"} · {emp.employment_type}</div>
            </div>
            <div>{emp.status === "재직" ? <span className="badge ok dotok">재직</span> : emp.status === "휴직" ? <span className="badge warn dotwarn">휴직</span> : <span className="badge off">퇴사</span>}</div>
          </div>

          {/* 기본 정보 */}
          <div style={{ fontWeight: 800, fontSize: 15, margin: "4px 0 10px" }}>기본 정보</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16, marginBottom: 20 }}>
            <Field label="입사일" value={emp.hire_date} />
            <Field label="휴대전화" value={emp.phone} />
            <Field label="이메일" value={emp.email} />
            <Field label="주민등록번호" value={
              <span className="flex aic gap-s">
                {rrn ?? emp.rrn_masked ?? "—"}
                {emp.rrn_masked && !rrn && <button className="btn btn--sm btn--ghost no-print" type="button" onClick={revealRrn} style={{ padding: "2px 8px" }}>전체</button>}
              </span>
            } />
            <Field label="메모" value={emp.memo} />
          </div>

          {/* 급여 · 4대보험 */}
          <div style={{ fontWeight: 800, fontSize: 15, margin: "4px 0 10px" }}>급여 · 4대보험</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16, marginBottom: 8 }}>
            <Field label="계약급여" value={won(emp.salary)} />
            <Field label="급여유형" value={emp.pay_type} />
            <Field label="4대보험" value={<span className="flex gap-s wrap" style={{ gap: 10 }}><Ins on={emp.ins_pension} label="국민연금" /><Ins on={emp.ins_health} label="건강" /><Ins on={emp.ins_employment} label="고용" /><Ins on={emp.ins_industrial} label="산재" /></span>} />
          </div>

          {/* 근태 (선택월) */}
          <div style={{ fontWeight: 800, fontSize: 15, margin: "16px 0 10px" }}>근태 · 급여 산정 ({month})</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 8 }}>
            {([["근무", s.worked], ["지각", s.cnt.지각], ["결근", s.cnt.결근], ["휴가", s.cnt.휴가]] as const).map(([l, v]) => (
              <div key={l} className="kpi" style={{ padding: 12 }}><div className="kl">{l}</div><div className="kv" style={{ fontSize: 22 }}>{v}</div></div>
            ))}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", border: "1px solid var(--line-2)" }}>
            <span className="muted" style={{ fontSize: 12.5 }}>소정근무일 {weekdaysInMonth(month)}일 · 인정일 {s.credited}일 (공제 전 추정)</span>
            <span style={{ fontWeight: 800, fontSize: 18 }}>{won(s.gross)}</span>
          </div>

          {/* 계약서 */}
          <div style={{ fontWeight: 800, fontSize: 15, margin: "20px 0 10px" }}>계약서 ({contracts.length})</div>
          {contracts.length === 0 ? <p className="cellsub" style={{ fontSize: 13 }}>등록된 계약서가 없습니다.</p> : (
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {contracts.map((c) => (
                <li key={c.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid var(--line-2)", fontSize: 13.5 }}>
                  <span>{c.title} <span className="cellsub">· {c.mime_type?.includes("pdf") ? "PDF" : "이미지"}</span></span>
                  <button className="btn btn--sm btn--ghost no-print" type="button" onClick={() => viewContract(c)}>보기</button>
                </li>
              ))}
            </ul>
          )}

          <p className="muted" style={{ fontSize: 11, marginTop: 18 }}>※ 계산급여는 공제(4대보험·세금) 전 추정액입니다. 정식 명세서는 “급여명세서” 메뉴를 이용하세요.</p>
        </div>
      )}
    </>
  );
}

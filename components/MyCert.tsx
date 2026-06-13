"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/lib/supabase";
import CertDoc, { type CertData } from "@/components/CertDoc";
import type { CertStatus, CertType, EmployeeStatus } from "@/lib/database.types";

type Emp = {
  id: string; name: string; department: string | null; position: string | null;
  hire_date: string | null; status: EmployeeStatus;
};
type CertReq = {
  id: string; cert_type: CertType; purpose: string | null; status: CertStatus;
  reject_reason: string | null; exit_date: string | null; issued_at: string | null;
  approved_by: string | null; created_at: string;
  profiles: { name: string | null } | null;
};

const STATUS_LABEL: Record<CertStatus, string> = { pending: "검토중", approved: "발급완료", rejected: "반려" };
const STATUS_CLS: Record<CertStatus, string> = { pending: "badge warn", approved: "badge ok", rejected: "badge off" };

const printCss = `
  .cert-print-only { display: none !important; }
  @media print {
    body > * { display: none !important; }
    #cert-doc-wrap { display: block !important; position: fixed; inset: 0; z-index: 9999; background: #fff; }
    #cert-doc-wrap #cert-doc { width: 100% !important; padding: 14mm 16mm !important; }
  }
`;

export default function MyCert() {
  const { user, profile } = useAuth();
  const searchParams = useSearchParams();
  const [emp, setEmp] = useState<Emp | null>(null);
  const [reqs, setReqs] = useState<CertReq[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // Form state
  const [purpose, setPurpose] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // Certificate viewer
  const [viewId, setViewId] = useState<string | null>(searchParams.get("view"));

  useEffect(() => {
    if (!user?.id) return;
    let active = true;
    supabase.from("employees").select("id, name, department, position, hire_date, status")
      .eq("profile_id", user.id).maybeSingle()
      .then(({ data, error }) => {
        if (!active) return;
        if (error) { setErr(error.message); setLoading(false); return; }
        setEmp((data as Emp) ?? null);
        if (!data) { setLoading(false); return; }
        supabase.from("cert_requests")
          .select("id, cert_type, purpose, status, reject_reason, exit_date, issued_at, approved_by, created_at, profiles(name)")
          .eq("employee_id", (data as Emp).id)
          .order("created_at", { ascending: false })
          .then(({ data: reqs, error: e2 }) => {
            if (!active) return;
            setLoading(false);
            if (e2) { setErr(e2.message); return; }
            setReqs((reqs as unknown as CertReq[]) ?? []);
          });
      });
    return () => { active = false; };
  }, [user?.id]);

  async function submit() {
    if (!emp) return;
    setErr(null); setMsg(null); setSubmitting(true);
    const cert_type: CertType = emp.status === "퇴사" ? "경력증명서" : "재직증명서";
    const { data, error } = await supabase.from("cert_requests")
      .insert({ employee_id: emp.id, cert_type, purpose: purpose.trim() || null })
      .select("id, cert_type, purpose, status, reject_reason, exit_date, issued_at, created_at")
      .single();
    setSubmitting(false);
    if (error) { setErr(error.message); return; }
    setReqs((prev) => [data as CertReq, ...prev]);
    setPurpose("");
    setMsg("신청이 완료되었습니다. 관리자 승인 후 발급됩니다.");
  }

  // Certificate view
  const viewReq = viewId ? reqs.find((r) => r.id === viewId) : null;
  const certData: CertData | null = viewReq && viewReq.status === "approved" && emp ? {
    certType: viewReq.cert_type,
    employeeName: emp.name,
    department: emp.department,
    position: emp.position,
    hireDate: emp.hire_date,
    exitDate: viewReq.exit_date,
    purpose: viewReq.purpose,
    issuedAt: viewReq.issued_at!,
    approverName: viewReq.profiles?.name ?? null,
  } : null;

  if (!user) return <div className="cellsub" style={{ padding: 40 }}>로그인이 필요합니다.</div>;
  if (profile?.member_type !== "직원") return <div className="cellsub" style={{ padding: 40 }}>직원만 접근할 수 있습니다.</div>;
  if (!loading && !emp) return <div className="cellsub" style={{ padding: 40 }}>직원 정보가 연결되지 않았습니다. 관리자에게 연결을 요청하세요.</div>;

  const certType: CertType = emp?.status === "퇴사" ? "경력증명서" : "재직증명서";

  return (
    <>
      <style>{printCss}</style>

      {/* Certificate print overlay */}
      {certData && (
        <div id="cert-doc-wrap" style={{
          position: "fixed", inset: 0, zIndex: 200, background: "rgba(0,0,0,.5)",
          display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
          overflowY: "auto",
        }}>
          <div style={{ background: "#fff", borderRadius: 4, boxShadow: "0 24px 64px rgba(0,0,0,.35)", overflow: "hidden", maxWidth: 760, width: "100%" }}>
            <div className="cert-print-only" style={{ display: "flex", gap: 10, padding: "12px 16px", borderBottom: "1px solid var(--line-2)", justifyContent: "flex-end" }}>
              <button className="btn btn--sm" onClick={() => window.print()}>인쇄 / PDF 저장</button>
              <button className="btn btn--sm btn--ghost" onClick={() => setViewId(null)}>닫기</button>
            </div>
            <CertDoc data={certData} />
          </div>
        </div>
      )}

      <div style={{ maxWidth: 680, margin: "0 auto", padding: "28px 16px 60px" }}>
        <h1 className="kr-d3" style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>증명서 발급 신청</h1>
        <p className="muted" style={{ fontSize: 13 }}>재직 상태에 따라 재직증명서 또는 경력증명서가 발급됩니다.</p>

        {err && <div role="alert" style={{ marginTop: 12, color: "#b3261e", fontSize: 13.5, border: "1px solid var(--line-2)", padding: "10px 12px" }}>{err}</div>}

        {/* New request form */}
        <div className="panel" style={{ marginTop: 24, padding: 20 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>신규 신청</h2>
          <div className="form">
            <div className="field">
              <label>증명서 종류</label>
              <input className="input" value={certType} readOnly disabled />
              <p className="muted" style={{ fontSize: 11.5, marginTop: 3 }}>
                {emp?.status === "퇴사" ? "퇴사 직원은 경력증명서로 발급됩니다." : "재직(휴직) 상태는 재직증명서로 발급됩니다."}
              </p>
            </div>
            <div className="field">
              <label>발급 목적 (제출처)</label>
              <input className="input" placeholder="예: 은행 대출 제출용, 비자 신청용 등" value={purpose} onChange={(e) => setPurpose(e.target.value)} />
            </div>
          </div>
          {msg && <div role="status" style={{ color: "#1f7a3d", fontSize: 13, marginBottom: 12 }}>{msg}</div>}
          <button className="btn btn--sm" onClick={submit} disabled={submitting || loading || !emp}>
            {submitting ? "신청 중…" : "신청하기"}
          </button>
        </div>

        {/* Request history */}
        {reqs.length > 0 && (
          <div style={{ marginTop: 32 }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>신청 내역</h2>
            <div className="panel" style={{ padding: 0, overflow: "hidden" }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>신청일</th>
                    <th>종류</th>
                    <th>용도</th>
                    <th>상태</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {reqs.map((r) => (
                    <tr key={r.id}>
                      <td className="cellsub">{r.created_at.slice(0, 10)}</td>
                      <td>{r.cert_type}</td>
                      <td className="cellsub">{r.purpose || "—"}</td>
                      <td>
                        <span className={STATUS_CLS[r.status]}>{STATUS_LABEL[r.status]}</span>
                        {r.status === "rejected" && r.reject_reason && (
                          <div className="muted" style={{ fontSize: 11, marginTop: 2 }}>{r.reject_reason}</div>
                        )}
                      </td>
                      <td>
                        {r.status === "approved" && (
                          <button className="btn btn--sm btn--ghost" onClick={() => setViewId(r.id)}>보기 / 인쇄</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/AuthProvider";
import CertDoc, { type CertData } from "@/components/CertDoc";
import type { CertStatus, CertType } from "@/lib/database.types";

type Req = {
  id: string;
  cert_type: CertType;
  purpose: string | null;
  status: CertStatus;
  reject_reason: string | null;
  exit_date: string | null;
  issued_at: string | null;
  approved_by: string | null;
  created_at: string;
  employees: {
    name: string; department: string | null; position: string | null;
    hire_date: string | null; status: string;
  };
  profiles: { name: string | null } | null; // approved_by 프로필
};

type TabVal = "all" | CertStatus;

const STATUS_LABEL: Record<CertStatus, string> = { pending: "검토중", approved: "발급완료", rejected: "반려" };
const STATUS_CLS: Record<CertStatus, string> = { pending: "badge warn", approved: "badge ok", rejected: "badge off" };

const printCss = `
  @media print {
    .no-print { display: none !important; }
    body > * { display: none !important; }
    #cert-doc-wrap { display: block !important; position: fixed; inset: 0; z-index: 9999; background: #fff; }
    #cert-doc-wrap #cert-doc { width: 100% !important; padding: 14mm 16mm !important; }
  }
`;

export default function CertRequests() {
  const { user } = useAuth();
  const [reqs, setReqs] = useState<Req[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [tab, setTab] = useState<TabVal>("pending");
  const [viewId, setViewId] = useState<string | null>(null);

  // Approve modal state
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [exitDate, setExitDate] = useState("");
  const [approving, setApproving] = useState(false);

  // Reject modal state
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejecting, setRejecting] = useState(false);

  function load() {
    setLoading(true);
    supabase.from("cert_requests")
      .select("id, cert_type, purpose, status, reject_reason, exit_date, issued_at, approved_by, created_at, employees(name, department, position, hire_date, status), profiles(name)")
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        setLoading(false);
        if (error) { setErr(error.message); return; }
        setReqs((data as unknown as Req[]) ?? []);
      });
  }

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function approve(req: Req) {
    if (req.cert_type === "경력증명서" && !exitDate) { setErr("퇴사일을 입력하세요."); return; }
    setApproving(true); setErr(null);
    const { error } = await supabase.from("cert_requests").update({
      status: "approved",
      issued_at: new Date().toISOString(),
      approved_by: user?.id ?? null,
      exit_date: req.cert_type === "경력증명서" ? exitDate || null : null,
    }).eq("id", req.id);
    setApproving(false);
    if (error) { setErr(error.message); return; }
    setApprovingId(null); setExitDate("");
    load();
  }

  async function reject(id: string) {
    if (!rejectReason.trim()) { setErr("반려 사유를 입력하세요."); return; }
    setRejecting(true); setErr(null);
    const { error } = await supabase.from("cert_requests").update({
      status: "rejected",
      reject_reason: rejectReason.trim(),
    }).eq("id", id);
    setRejecting(false);
    if (error) { setErr(error.message); return; }
    setRejectingId(null); setRejectReason("");
    load();
  }

  const approvingReq = approvingId ? reqs.find((r) => r.id === approvingId) : null;
  const viewReq = viewId ? reqs.find((r) => r.id === viewId) : null;
  const certData: CertData | null = viewReq && viewReq.status === "approved" ? {
    certType: viewReq.cert_type,
    employeeName: viewReq.employees.name,
    department: viewReq.employees.department,
    position: viewReq.employees.position,
    hireDate: viewReq.employees.hire_date,
    exitDate: viewReq.exit_date,
    purpose: viewReq.purpose,
    issuedAt: viewReq.issued_at!,
    approverName: viewReq.profiles?.name ?? null,
  } : null;

  const visible = tab === "all" ? reqs : reqs.filter((r) => r.status === tab);
  const counts = { all: reqs.length, pending: 0, approved: 0, rejected: 0 };
  reqs.forEach((r) => { counts[r.status]++; });

  const TABS: [TabVal, string][] = [
    ["pending", `대기 ${counts.pending}`],
    ["approved", `발급완료 ${counts.approved}`],
    ["rejected", `반려 ${counts.rejected}`],
    ["all", `전체 ${counts.all}`],
  ];

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
            <div className="no-print" style={{ display: "flex", gap: 10, padding: "12px 16px", borderBottom: "1px solid var(--line-2)", justifyContent: "flex-end" }}>
              <button className="btn btn--sm" onClick={() => window.print()}>인쇄 / PDF 저장</button>
              <button className="btn btn--sm btn--ghost" onClick={() => setViewId(null)}>닫기</button>
            </div>
            <CertDoc data={certData} />
          </div>
        </div>
      )}

      {/* Approve modal */}
      {approvingReq && (
        <div onClick={() => { setApprovingId(null); setExitDate(""); }}
          style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(0,0,0,.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div onClick={(e) => e.stopPropagation()}
            style={{ background: "var(--paper)", borderRadius: 6, padding: 24, width: "100%", maxWidth: 380, boxShadow: "0 20px 60px rgba(0,0,0,.3)" }}>
            <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 4 }}>발급 승인</h3>
            <p className="muted" style={{ fontSize: 13, marginBottom: 16 }}>
              {approvingReq.employees.name} · {approvingReq.cert_type}
            </p>
            {approvingReq.cert_type === "경력증명서" && (
              <div className="field">
                <label>퇴사일 <span style={{ color: "#b3261e" }}>*</span></label>
                <input className="input" type="date" value={exitDate} onChange={(e) => setExitDate(e.target.value)} />
                <p className="muted" style={{ fontSize: 11.5, marginTop: 3 }}>경력증명서에 표기될 퇴사(종료)일입니다.</p>
              </div>
            )}
            {err && <p style={{ color: "#b3261e", fontSize: 13, marginBottom: 10 }}>{err}</p>}
            <div className="flex gap-s" style={{ marginTop: 16 }}>
              <button className="btn btn--sm" onClick={() => approve(approvingReq)} disabled={approving}>
                {approving ? "승인 중…" : "승인하고 발급"}
              </button>
              <button className="btn btn--sm btn--ghost" onClick={() => { setApprovingId(null); setExitDate(""); }}>취소</button>
            </div>
          </div>
        </div>
      )}

      {/* Reject modal */}
      {rejectingId && (
        <div onClick={() => { setRejectingId(null); setRejectReason(""); }}
          style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(0,0,0,.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div onClick={(e) => e.stopPropagation()}
            style={{ background: "var(--paper)", borderRadius: 6, padding: 24, width: "100%", maxWidth: 380, boxShadow: "0 20px 60px rgba(0,0,0,.3)" }}>
            <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 16 }}>반려 사유</h3>
            <div className="field">
              <label>사유 <span style={{ color: "#b3261e" }}>*</span></label>
              <input className="input" placeholder="예: 제출 목적 기재 필요" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} />
            </div>
            {err && <p style={{ color: "#b3261e", fontSize: 13, marginBottom: 10 }}>{err}</p>}
            <div className="flex gap-s" style={{ marginTop: 16 }}>
              <button className="btn btn--sm" style={{ background: "#b3261e", borderColor: "#b3261e", color: "#fff" }}
                onClick={() => reject(rejectingId)} disabled={rejecting}>
                {rejecting ? "반려 중…" : "반려 처리"}
              </button>
              <button className="btn btn--sm btn--ghost" onClick={() => { setRejectingId(null); setRejectReason(""); }}>취소</button>
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <div style={{ padding: "32px 36px" }}>
        <div style={{ marginBottom: 28 }}>
          <h1 className="kr-d3" style={{ fontSize: 24, fontWeight: 800 }}>증명서 관리</h1>
          <p className="muted" style={{ fontSize: 13.5, marginTop: 4 }}>재직·경력 증명서 발급 신청을 검토하고 승인합니다.</p>
        </div>

        {err && !approvingId && !rejectingId && (
          <div role="alert" style={{ color: "#b3261e", fontSize: 13.5, border: "1px solid var(--line-2)", padding: "10px 14px", marginBottom: 18, borderRadius: 4 }}>{err}</div>
        )}

        {/* Tabs */}
        <div style={{ display: "flex", gap: 0, marginBottom: 20, borderBottom: "1px solid var(--line-2)" }}>
          {TABS.map(([v, label]) => (
            <button key={v} type="button"
              onClick={() => setTab(v)}
              style={{
                background: "none", border: "none", cursor: "pointer", padding: "10px 18px",
                fontSize: 14, fontWeight: tab === v ? 700 : 400,
                color: tab === v ? "var(--ink)" : "var(--muted)",
                borderBottom: tab === v ? "2px solid var(--ink)" : "2px solid transparent",
                marginBottom: -1, transition: "color .15s",
              }}>
              {label}
            </button>
          ))}
        </div>

        <div className="panel" style={{ padding: 0, overflow: "auto" }}>
          {loading ? (
            <div className="cellsub" style={{ padding: 40, textAlign: "center" }}>불러오는 중…</div>
          ) : visible.length === 0 ? (
            <div className="cellsub" style={{ padding: 40, textAlign: "center" }}>신청 내역이 없습니다.</div>
          ) : (
            <table className="table" style={{ minWidth: 720 }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "center" }}>신청일</th>
                  <th style={{ textAlign: "center" }}>직원</th>
                  <th style={{ textAlign: "center" }}>종류</th>
                  <th style={{ textAlign: "center" }}>용도</th>
                  <th style={{ textAlign: "center" }}>상태</th>
                  <th style={{ textAlign: "center" }}>발급일</th>
                  <th style={{ textAlign: "center" }}></th>
                </tr>
              </thead>
              <tbody>
                {visible.map((r) => (
                  <tr key={r.id}>
                    <td style={{ textAlign: "center" }} className="cellsub">{r.created_at.slice(0, 10)}</td>
                    <td style={{ textAlign: "center", whiteSpace: "nowrap" }}>
                      <span style={{ fontWeight: 600 }}>{r.employees.name}</span>
                      {(r.employees.department || r.employees.position) && (
                        <span className="muted" style={{ fontSize: 12, marginLeft: 6 }}>
                          {[r.employees.department, r.employees.position].filter(Boolean).join(" · ")}
                        </span>
                      )}
                    </td>
                    <td style={{ textAlign: "center" }}>{r.cert_type}</td>
                    <td style={{ textAlign: "center" }} className="cellsub">{r.purpose || "—"}</td>
                    <td style={{ textAlign: "center" }}>
                      <span className={STATUS_CLS[r.status]}>{STATUS_LABEL[r.status]}</span>
                      {r.status === "rejected" && r.reject_reason && (
                        <div className="muted" style={{ fontSize: 11, marginTop: 2 }}>{r.reject_reason}</div>
                      )}
                    </td>
                    <td style={{ textAlign: "center" }} className="cellsub">{r.issued_at ? r.issued_at.slice(0, 10) : "—"}</td>
                    <td style={{ textAlign: "center" }}>
                      <div className="flex gap-s" style={{ justifyContent: "center" }}>
                        {r.status === "pending" && (
                          <>
                            <button className="btn btn--sm" onClick={() => { setErr(null); setApprovingId(r.id); setExitDate(""); }}>승인</button>
                            <button className="btn btn--sm btn--ghost" onClick={() => { setErr(null); setRejectingId(r.id); setRejectReason(""); }}>반려</button>
                          </>
                        )}
                        {r.status === "approved" && (
                          <button className="btn btn--sm btn--ghost" onClick={() => setViewId(r.id)}>보기</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}

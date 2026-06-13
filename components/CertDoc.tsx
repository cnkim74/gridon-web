"use client";

import type { CertType } from "@/lib/database.types";

export type CertData = {
  certType: CertType;
  employeeName: string;
  department: string | null;
  position: string | null;
  hireDate: string | null;
  exitDate: string | null;    // 경력증명서용
  purpose: string | null;
  issuedAt: string;           // ISO string, 발급(승인) 일시
};

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
}

function fmtDateSlash(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

function Stamp() {
  return (
    <svg
      width="90" height="90" viewBox="0 0 90 90"
      style={{ transform: "rotate(-12deg)", display: "block" }}
      aria-hidden="true"
    >
      <circle cx="45" cy="45" r="42" fill="none" stroke="#B22222" strokeWidth="2.5" />
      <circle cx="45" cy="45" r="34" fill="none" stroke="#B22222" strokeWidth="1.2" />
      <text x="45" y="32" textAnchor="middle" fontSize="9" fill="#B22222"
        fontFamily="'Noto Serif KR', 'Malgun Gothic', serif" fontWeight="700">대 표 이 사</text>
      <line x1="18" y1="39" x2="72" y2="39" stroke="#B22222" strokeWidth="0.8" />
      <text x="45" y="53" textAnchor="middle" fontSize="13" fill="#B22222"
        fontFamily="'Noto Serif KR', 'Malgun Gothic', serif" fontWeight="900">그 리 드 온</text>
      <line x1="18" y1="60" x2="72" y2="60" stroke="#B22222" strokeWidth="0.8" />
      <text x="45" y="74" textAnchor="middle" fontSize="9" fill="#B22222"
        fontFamily="'Noto Serif KR', 'Malgun Gothic', serif" fontWeight="700">대 표 이 사 인</text>
    </svg>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <tr>
      <td style={{ padding: "10px 14px", fontWeight: 600, whiteSpace: "nowrap", width: 120, background: "#f7f7f5", borderBottom: "1px solid #d0cfc8", borderRight: "1px solid #d0cfc8" }}>{label}</td>
      <td style={{ padding: "10px 14px", borderBottom: "1px solid #d0cfc8" }}>{value}</td>
    </tr>
  );
}

export default function CertDoc({ data }: { data: CertData }) {
  const isEmp = data.certType === "재직증명서";
  const issuedDate = fmtDate(data.issuedAt);
  const issuedYear = new Date(data.issuedAt).getFullYear();
  const issuedMonth = new Date(data.issuedAt).getMonth() + 1;
  const issuedDay = new Date(data.issuedAt).getDate();

  const period = isEmp
    ? `${fmtDateSlash(data.hireDate)} ~ 현재`
    : `${fmtDateSlash(data.hireDate)} ~ ${fmtDateSlash(data.exitDate)}`;

  const bodyText = isEmp
    ? "위 사람은 현재 당사에 위와 같이 재직 중임을 증명합니다."
    : "위 사람은 당사에 위와 같이 근무하였음을 증명합니다.";

  return (
    <div id="cert-doc" style={{
      fontFamily: "'Malgun Gothic', '맑은 고딕', 'Apple SD Gothic Neo', sans-serif",
      width: 680, margin: "0 auto", padding: "56px 60px 48px",
      background: "#fff", color: "#111", fontSize: 14, lineHeight: 1.7,
    }}>
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 48 }}>
        <div style={{ fontSize: 11, letterSpacing: 2, color: "#666", marginBottom: 8 }}>㈜ 그 리 드 온</div>
        <h1 style={{
          fontSize: 28, fontWeight: 900, letterSpacing: 10,
          margin: 0, paddingBottom: 12,
          borderBottom: "3px double #222",
        }}>
          {data.certType}
        </h1>
      </div>

      {/* Info table */}
      <table style={{ width: "100%", borderCollapse: "collapse", border: "1px solid #d0cfc8", marginBottom: 36 }}>
        <tbody>
          <Row label="성    명" value={<strong style={{ fontSize: 15 }}>{data.employeeName}</strong>} />
          <Row label="소    속" value={
            <span>
              {data.department || "—"}
              {data.position && <span style={{ marginLeft: 24, color: "#555" }}>직 위&nbsp;&nbsp;<strong>{data.position}</strong></span>}
            </span>
          } />
          {data.hireDate && <Row label="입 사 일" value={fmtDate(data.hireDate)} />}
          <Row label={isEmp ? "재직기간" : "재직기간"} value={period} />
          {!isEmp && data.exitDate && <Row label="퇴 사 일" value={fmtDate(data.exitDate)} />}
        </tbody>
      </table>

      {/* Body text */}
      <p style={{ fontSize: 15, textAlign: "center", margin: "36px 0 28px", fontWeight: 500, letterSpacing: 0.5 }}>
        {bodyText}
      </p>

      {/* Purpose */}
      <div style={{ margin: "0 0 56px", fontSize: 13.5 }}>
        <span style={{ fontWeight: 600 }}>발급목적&nbsp;&nbsp;:&nbsp;&nbsp;</span>
        <span>{data.purpose || "—"}</span>
      </div>

      {/* Issue date + company + stamp */}
      <div style={{ textAlign: "center", marginBottom: 36 }}>
        <div style={{ fontSize: 16, letterSpacing: 2, marginBottom: 40 }}>
          {issuedYear} 년&ensp;&ensp;{issuedMonth} 월&ensp;&ensp;{issuedDay} 일
        </div>
        <div style={{ display: "inline-block", textAlign: "right", position: "relative" }}>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>주식회사 그 리 드 온</div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8 }}>
            <span style={{ fontSize: 14 }}>대 표 이 사</span>
            <span style={{ display: "inline-block", position: "relative", top: -4 }}>
              <Stamp />
            </span>
          </div>
        </div>
      </div>

      {/* Footer note */}
      <p style={{ fontSize: 10.5, color: "#aaa", textAlign: "center", marginTop: 48, borderTop: "1px solid #eee", paddingTop: 10 }}>
        이 증명서는 {issuedDate}에 발급되었습니다. / ㈜그리드온
      </p>
    </div>
  );
}

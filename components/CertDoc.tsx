"use client";

import { useState } from "react";
import type { CertType } from "@/lib/database.types";

export type CertData = {
  certType: CertType;
  employeeName: string;
  department: string | null;
  position: string | null;
  hireDate: string | null;
  exitDate: string | null;
  purpose: string | null;
  issuedAt: string;
  approverName: string | null;
};

const STAMP_URL = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/stamps/seal.png`;
const LOGO_URL = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/logos/logo.png`;

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

function SvgStamp() {
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
        fontFamily="'Noto Serif KR', 'Malgun Gothic', serif" fontWeight="700">사 용 인 감</text>
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

function LogoWatermark() {
  const [err, setErr] = useState(false);
  if (err) return null;
  return (
    <div style={{
      position: "absolute", inset: 0,
      display: "flex", alignItems: "center", justifyContent: "center",
      pointerEvents: "none", zIndex: 0,
    }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={LOGO_URL}
        alt=""
        aria-hidden="true"
        style={{ width: 280, maxHeight: 160, objectFit: "contain", opacity: 0.06 }}
        onError={() => setErr(true)}
      />
    </div>
  );
}

function StampOverlay() {
  const [imgErr, setImgErr] = useState(false);

  return (
    <span style={{
      position: "absolute",
      top: "50%", left: "50%",
      transform: "translate(-50%, -50%)",
      width: 88, height: 88,
      display: "flex", alignItems: "center", justifyContent: "center",
      pointerEvents: "none", zIndex: 2,
    }}>
      {!imgErr ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={STAMP_URL}
          alt="직인"
          style={{ width: 88, height: 88, objectFit: "contain", opacity: 0.88, transform: "rotate(-10deg)" }}
          onError={() => setImgErr(true)}
        />
      ) : (
        <SvgStamp />
      )}
    </span>
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
      position: "relative", overflow: "hidden",
    }}>
      <LogoWatermark />
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
          <Row label="재직기간" value={period} />
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

      {/* Issue date */}
      <div style={{ textAlign: "center", marginBottom: 40 }}>
        <div style={{ fontSize: 16, letterSpacing: 2 }}>
          {issuedYear} 년&ensp;&ensp;{issuedMonth} 월&ensp;&ensp;{issuedDay} 일
        </div>
      </div>

      {/* Company + signature + stamp */}
      <div style={{ textAlign: "center" }}>
        <div style={{ display: "inline-block", textAlign: "right" }}>
          <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: 2, marginBottom: 10 }}>
            주 식 회 사 &nbsp;그 리 드 온
          </div>
          {/* Signature line: 대표 배 정 만 (인) with stamp over (인) */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 0 }}>
            <span style={{ fontSize: 14.5, letterSpacing: 1.5 }}>
              대 표&emsp;&emsp;배 정 만&emsp;&emsp;
            </span>
            {/* (인) wrapper — stamp is centered here */}
            <span style={{
              position: "relative",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: "2.2em",
              height: "2.2em",
            }}>
              <span style={{ fontSize: 14.5 }}>(인)</span>
              <StampOverlay />
            </span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <p style={{ fontSize: 10.5, color: "#aaa", textAlign: "center", marginTop: 56, borderTop: "1px solid #eee", paddingTop: 10 }}>
        이 증명서는 {issuedDate}에 발급되었습니다. / ㈜그리드온
      </p>
    </div>
  );
}

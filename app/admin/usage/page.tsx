import type { Metadata } from "next";

export const metadata: Metadata = { title: "요금·사용량" };

type Comp = { label: string; pct: number };
const COMPOSITION: Comp[] = [
  { label: "산업용", pct: 52 },
  { label: "일반용", pct: 27 },
  { label: "주택용", pct: 18 },
  { label: "기타·친환경", pct: 3 },
];

type Summary = {
  type: string;
  households: string;
  usage: string;
  bill: string;
  unit: string;
  delta: string;
  deltaKind: "ok" | "off";
};
const SUMMARY: Summary[] = [
  { type: "산업용", households: "38,492", usage: "4,649", bill: "612", unit: "131.6", delta: "▲ 7.2%", deltaKind: "ok" },
  { type: "일반용", households: "512,038", usage: "2,414", bill: "358", unit: "148.3", delta: "▲ 5.1%", deltaKind: "ok" },
  { type: "주택용", households: "1,256,910", usage: "1,609", bill: "268", unit: "166.5", delta: "▲ 12.4%", deltaKind: "ok" },
  { type: "기타·친환경", households: "34,576", usage: "268", bill: "46", unit: "171.2", delta: "▲ 1.0%", deltaKind: "off" },
];

export default function UsagePage() {
  return (
    <>
      <div className="apage-head">
        <div><h1>요금·사용량</h1><p>계량·청구 데이터를 기반으로 사용량과 요금 현황을 분석합니다.</p></div>
        <div className="flex gap-s wrap">
          <button className="btn btn--sm btn--ghost">2026년 6월 ▾</button>
          <button className="btn btn--sm">청구 마감 실행</button>
        </div>
      </div>

      <div className="kpis">
        <div className="kpi"><div className="kl">당월 청구액</div><div className="kv">1,284<span style={{ fontSize: ".45em", fontWeight: 600, color: "var(--muted)" }}> 억원</span></div><div className="kd"><span className="up">▲ 6.1%</span><span className="muted">전월</span></div></div>
        <div className="kpi"><div className="kl">총 사용량</div><div className="kv">8,940<span style={{ fontSize: ".45em", fontWeight: 600, color: "var(--muted)" }}> GWh</span></div><div className="kd"><span className="up">▲ 8.8%</span><span className="muted">계절 피크</span></div></div>
        <div className="kpi"><div className="kl">미납 건수</div><div className="kv">12,408</div><div className="kd"><span className="down">▲ 2.3%</span><span className="muted">미납액 38억</span></div></div>
        <div className="kpi"><div className="kl">평균 판매단가</div><div className="kv">143.6<span style={{ fontSize: ".45em", fontWeight: 600, color: "var(--muted)" }}> 원/kWh</span></div></div>
      </div>

      <div className="grid-2">
        {/* trend */}
        <div className="panel">
          <div className="panel-head"><h3>월별 사용량 추이</h3><span className="meta">단위: GWh</span></div>
          <div className="panel-body">
            <svg viewBox="0 0 560 220" className="spark-area" preserveAspectRatio="none" style={{ height: 220 }}>
              <g stroke="var(--line)" strokeWidth="1">
                <line x1="0" y1="55" x2="560" y2="55" /><line x1="0" y1="110" x2="560" y2="110" /><line x1="0" y1="165" x2="560" y2="165" />
              </g>
              <polygon points="0,150 93,158 186,140 280,120 373,96 466,70 560,40 560,220 0,220" fill="currentColor" opacity=".06" />
              <polyline points="0,150 93,158 186,140 280,120 373,96 466,70 560,40" fill="none" stroke="currentColor" strokeWidth="2.2" />
              <g fill="var(--bg)" stroke="currentColor" strokeWidth="2">
                <circle cx="0" cy="150" r="3.5" /><circle cx="186" cy="140" r="3.5" /><circle cx="373" cy="96" r="3.5" /><circle cx="560" cy="40" r="4" />
              </g>
            </svg>
            <div className="flex jcb" style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--soft)", marginTop: 12 }}>
              <span>1월</span><span>2월</span><span>3월</span><span>4월</span><span>5월</span><span>6월</span>
            </div>
          </div>
        </div>
        {/* by type */}
        <div className="panel">
          <div className="panel-head"><h3>계약 종별 사용 구성</h3><span className="meta">6월</span></div>
          <div className="panel-body" style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            {COMPOSITION.map((c) => (
              <div key={c.label}>
                <div className="flex jcb" style={{ fontSize: 13.5, marginBottom: 7 }}>
                  <span className="muted">{c.label}</span>
                  <span className="strong mono">{c.pct}%</span>
                </div>
                <div style={{ height: 8, background: "var(--faint)" }}>
                  <div style={{ width: `${c.pct}%`, height: "100%", background: "var(--ink)" }} />
                </div>
              </div>
            ))}
            <hr className="rule" style={{ margin: "4px 0" }} />
            <div className="flex jcb" style={{ fontSize: 13.5 }}>
              <span className="muted">신재생 충당 비중</span>
              <span className="badge ok dotok">24.1%</span>
            </div>
          </div>
        </div>
      </div>

      {/* table */}
      <div className="panel">
        <div className="panel-head"><h3>계약 종별 청구 요약</h3><a className="meta" href="#" style={{ borderBottom: "1px solid var(--line-2)" }}>상세 리포트</a></div>
        <table className="dtable">
          <thead>
            <tr>
              <th>계약 종별</th>
              <th style={{ textAlign: "right" }}>계약 호수</th>
              <th style={{ textAlign: "right" }}>사용량 (GWh)</th>
              <th style={{ textAlign: "right" }}>청구액 (억원)</th>
              <th style={{ textAlign: "right" }}>평균단가</th>
              <th style={{ width: 110 }}>전월 대비</th>
            </tr>
          </thead>
          <tbody>
            {SUMMARY.map((s) => (
              <tr key={s.type}>
                <td className="strong">{s.type}</td>
                <td style={{ textAlign: "right" }} className="mono">{s.households}</td>
                <td style={{ textAlign: "right" }} className="mono">{s.usage}</td>
                <td style={{ textAlign: "right" }} className="mono">{s.bill}</td>
                <td style={{ textAlign: "right" }} className="mono">{s.unit}</td>
                <td>
                  {s.deltaKind === "ok" ? (
                    <span className="badge ok dotok">{s.delta}</span>
                  ) : (
                    <span className="badge off">{s.delta}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

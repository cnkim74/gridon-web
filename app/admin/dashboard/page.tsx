import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "대시보드" };

const BARS: [string, number][] = [
  ["1월", 48], ["2월", 44], ["3월", 52], ["4월", 60], ["5월", 72], ["6월", 88],
];

const RECENT: [string, string, string, "대기" | "처리중" | "완료", string][] = [
  ["문의", "김서연", "요금 누진 단계 문의", "대기", "10분 전"],
  ["신청", "㈜대한산업", "계약전력 증설 (고압)", "처리중", "42분 전"],
  ["민원", "이준호", "정전 복구 지연 항의", "대기", "1시간 전"],
  ["신청", "박민지", "신규 전입 (주택용)", "완료", "2시간 전"],
  ["문의", "정태욱", "태양광 계통연계 절차", "처리중", "3시간 전"],
];

function StatusBadge({ status }: { status: "대기" | "처리중" | "완료" }) {
  if (status === "대기") return <span className="badge warn dotwarn">대기</span>;
  if (status === "처리중") return <span className="badge ok dotok">처리중</span>;
  return <span className="badge ok">완료</span>;
}

export default function DashboardPage() {
  return (
    <>
      <div className="apage-head">
        <div>
          <h1>대시보드</h1>
          <p>2026년 6월 13일 토요일 · 운영 현황 요약</p>
        </div>
        <div className="flex gap-s wrap">
          <button className="btn btn--sm btn--ghost">기간: 최근 7일 ▾</button>
          <button className="btn btn--sm">리포트 내보내기</button>
        </div>
      </div>

      {/* KPIs */}
      <div className="kpis">
        <div className="kpi"><div className="kl">실시간 공급 부하</div><div className="kv">62,418<span style={{ fontSize: ".45em", fontWeight: 600, color: "var(--muted)" }}> MW</span></div><div className="kd"><span className="up">▲ 3.2%</span><span className="muted">전일 대비</span></div></div>
        <div className="kpi"><div className="kl">신규 가입 (오늘)</div><div className="kv">1,284</div><div className="kd"><span className="up">▲ 12.5%</span><span className="muted">전일 대비</span></div></div>
        <div className="kpi"><div className="kl">미처리 문의</div><div className="kv">37</div><div className="kd"><span className="down">▲ 8건</span><span className="muted">대기 중</span></div></div>
        <div className="kpi"><div className="kl">진행 중 전기 신청</div><div className="kv">92</div><div className="kd"><span className="muted">현장확인 24 · 시공 18</span></div></div>
      </div>

      {/* charts */}
      <div className="grid-2">
        <div className="panel">
          <div className="panel-head"><h3>월별 전력 공급량</h3><span className="meta">단위: GWh · 2026</span></div>
          <div className="panel-body">
            <div className="chart">
              {BARS.map(([label, h]) => (
                <div key={label} className="bar" style={{ height: `${h}%` }}><span className="blab">{label}</span></div>
              ))}
            </div>
            <div className="chart-x" />
            <div className="legend" style={{ marginTop: 18 }}><span><i style={{ background: "var(--ink)" }} />공급량</span><span className="muted">피크 6월 · 8,940 GWh</span></div>
          </div>
        </div>
        <div className="panel">
          <div className="panel-head"><h3>계통 상태</h3><span className="badge ok dotok">정상</span></div>
          <div className="panel-body" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div className="flex jcb aic"><span className="muted" style={{ fontSize: 14 }}>공급 예비율</span><span className="strong" style={{ fontFamily: "var(--font-mono)" }}>18.4%</span></div>
            <div style={{ height: 6, background: "var(--faint)" }}><div style={{ width: "62%", height: "100%", background: "var(--ink)" }} /></div>
            <div className="flex jcb aic"><span className="muted" style={{ fontSize: 14 }}>신재생 출력 비중</span><span className="strong" style={{ fontFamily: "var(--font-mono)" }}>24.1%</span></div>
            <div style={{ height: 6, background: "var(--faint)" }}><div style={{ width: "24%", height: "100%", background: "var(--ink)" }} /></div>
            <div className="flex jcb aic"><span className="muted" style={{ fontSize: 14 }}>ESS 충전 상태(SOC)</span><span className="strong" style={{ fontFamily: "var(--font-mono)" }}>71%</span></div>
            <div style={{ height: 6, background: "var(--faint)" }}><div style={{ width: "71%", height: "100%", background: "var(--ink)" }} /></div>
            <hr className="rule" style={{ margin: "6px 0" }} />
            <div className="flex jcb aic"><span className="muted" style={{ fontSize: 14 }}>운영 변전소</span><span className="badge ok">312 / 312 가동</span></div>
            <div className="flex jcb aic"><span className="muted" style={{ fontSize: 14 }}>진행 중 점검</span><span className="badge warn dotwarn">3건</span></div>
          </div>
        </div>
      </div>

      {/* recent + quick */}
      <div className="grid-2">
        <div className="panel">
          <div className="panel-head"><h3>최근 접수 내역</h3><Link className="meta" href="/admin/inquiries" style={{ borderBottom: "1px solid var(--line-2)" }}>전체 보기</Link></div>
          <table className="dtable">
            <thead><tr><th>유형</th><th>고객</th><th>내용</th><th>상태</th><th>접수</th></tr></thead>
            <tbody>
              {RECENT.map(([type, name, body, status, when]) => (
                <tr key={`${name}-${body}`}>
                  <td><span className="badge off">{type}</span></td>
                  <td className="strong">{name}</td>
                  <td>{body}</td>
                  <td><StatusBadge status={status} /></td>
                  <td className="cellsub">{when}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="panel">
          <div className="panel-head"><h3>빠른 작업</h3></div>
          <div className="panel-body" style={{ display: "grid", gap: 10 }}>
            <Link className="btn btn--ghost btn--block" href="/admin/content" style={{ justifyContent: "flex-start" }}>＋ 공지사항 등록</Link>
            <Link className="btn btn--ghost btn--block" href="/admin/applications" style={{ justifyContent: "flex-start" }}>전기 신청 처리</Link>
            <Link className="btn btn--ghost btn--block" href="/admin/inquiries" style={{ justifyContent: "flex-start" }}>미처리 문의 확인 <span className="badge warn" style={{ marginLeft: "auto" }}>37</span></Link>
            <Link className="btn btn--ghost btn--block" href="/admin/members" style={{ justifyContent: "flex-start" }}>회원 검색</Link>
            <hr className="rule" style={{ margin: "6px 0" }} />
            <div className="side-sec" style={{ color: "var(--soft)", padding: "0 0 6px" }}>시스템 공지</div>
            <div style={{ fontSize: 13.5, color: "var(--muted)", lineHeight: 1.6 }}>
              · 6/15 02:00~04:00 요금 시스템 정기 점검<br />· AMI 펌웨어 v3.2 배포 예정 (6/18)
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

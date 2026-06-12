"use client";

import { useEffect, useState } from "react";

type TabKey = "press" | "notice" | "media";

const PRESS: [string, string, string][] = [
  ["보도자료", "그리드온, 차세대 AI 수요예측 플랫폼 ‘펄스’ 가동 — 계통 효율 12% 개선", "2026.05.28"],
  ["사업", "동남권 2.4GW 신재생 연계 ESS 단지 준공… 유연성 자원 대폭 확대", "2026.05.12"],
  ["기술", "자가복구 배전망 실증 완료, 정전 복구 시간 평균 67% 단축", "2026.04.21"],
  ["ESG", "그리드온, 2035 탄소중립 로드맵 발표 — 재생에너지 8GW 연계 목표", "2026.03.30"],
  ["수상", "스마트그리드 우수기업 대상 수상, 통합운영센터(GOC) 운영 성과 인정", "2026.02.18"],
  ["제휴", "전국 지자체와 스마트시티 전력 인프라 협력 MOU 체결", "2026.01.24"],
];

const NOTICE: [string, string, string][] = [
  ["점검", "6월 정기 설비 점검에 따른 일부 지역 순환 점검 안내", "2026.06.03"],
  ["시스템", "마이페이지 요금 조회 시스템 정기 점검 안내 (6/15 02:00~04:00)", "2026.05.30"],
  ["요금", "2026년 하반기 계절별 차등 요금제 적용 안내", "2026.05.20"],
  ["안내", "여름철 전력 피크 대비 수요반응(DR) 참여 고객 모집", "2026.05.08"],
  ["채용", "2026년 상반기 신입·경력 공개채용 서류 합격자 발표", "2026.04.15"],
];

const MEDIA: [string, string][] = [
  ["브랜드 필름", "Where the Grid turns On — 그리드온 브랜드 필름"],
  ["현장", "통합운영센터(GOC) 24시간을 따라가다"],
  ["인터뷰", "스마트그리드 엔지니어가 말하는 ‘깨어난 전력망’"],
];

function PlayIcon() {
  return (
    <svg className="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.1">
      <circle cx="12" cy="12" r="9" />
      <path d="M10 9l5 3-5 3z" fill="currentColor" stroke="none" />
    </svg>
  );
}

export default function NewsroomTabs() {
  const [tab, setTab] = useState<TabKey>("press");

  // deep-link via URL hash (#press / #notice / #media)
  useEffect(() => {
    const h = window.location.hash.slice(1);
    if (h === "press" || h === "notice" || h === "media") setTab(h);
  }, []);

  return (
    <>
      <div className="tab-bar" data-reveal>
        <button className={`tab${tab === "press" ? " active" : ""}`} onClick={() => setTab("press")} id="press">보도자료</button>
        <button className={`tab${tab === "notice" ? " active" : ""}`} onClick={() => setTab("notice")} id="notice">공지사항</button>
        <button className={`tab${tab === "media" ? " active" : ""}`} onClick={() => setTab("media")} id="media">미디어</button>
      </div>

      {/* press */}
      <div className={`tab-panel${tab === "press" ? " active" : ""}`}>
        <div className="list" data-reveal>
          {PRESS.map(([cat, title, date]) => (
            <a key={title} href="#">
              <span className="lc">{cat}</span>
              <span className="lt">{title}</span>
              <span className="ld">{date}</span>
            </a>
          ))}
        </div>
      </div>

      {/* notice */}
      <div className={`tab-panel${tab === "notice" ? " active" : ""}`}>
        <div className="list">
          {NOTICE.map(([cat, title, date]) => (
            <a key={title} href="#">
              <span className="lc">{cat}</span>
              <span className="lt">{title}</span>
              <span className="ld">{date}</span>
            </a>
          ))}
        </div>
      </div>

      {/* media */}
      <div className={`tab-panel${tab === "media" ? " active" : ""}`}>
        <div
          className="news"
          data-reveal
          style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 1, background: "var(--line)", border: "1px solid var(--line)", marginTop: 24 }}
        >
          {MEDIA.map(([cat, title]) => (
            <a className="news-card" href="#" key={title}>
              <div className="media-box" style={{ aspectRatio: "16/10", margin: "-1px -1px 0", border: 0 }}>
                <PlayIcon />
              </div>
              <div className="cat" style={{ marginTop: 18 }}>{cat}</div>
              <div className="nt">{title}</div>
            </a>
          ))}
        </div>
      </div>

      <div className="pager" style={{ marginTop: 28 }}>
        <button className="active">1</button>
        <button>2</button>
        <button>3</button>
        <button>→</button>
      </div>
    </>
  );
}

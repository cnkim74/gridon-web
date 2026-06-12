import Link from "next/link";
import { Spark } from "@/components/Spark";

export default function HomePage() {
  return (
    <>
      {/* ===================== HERO ===================== */}
      <section className="invert grid-bg hero" data-screen-label="홈 히어로">
        <div className="grid-lines" />
        <div className="container" style={{ position: "relative", zIndex: 2, width: "100%" }}>
          <div className="hero-grid">
            <div>
              <span className="eyebrow" data-reveal>
                Smart Grid · Smart Life
              </span>
              <h1 className="display d1" style={{ marginTop: 22 }} data-reveal data-delay=".05s">
                Where the
                <br />
                Grid turns{" "}
                <span style={{ whiteSpace: "nowrap" }}>
                  On<span style={{ color: "var(--paper)" }}>.</span>
                </span>
              </h1>
              <p className="kr" data-reveal data-delay=".12s">
                전력망이 깨어나는 <span className="lit">그 순간.</span>
              </p>
              <p className="lede" style={{ marginTop: 22 }} data-reveal data-delay=".18s">
                발전소부터 가정의 콘센트까지, 모든 전력 인프라가 지능적으로 연결되는 순간을
                설계합니다. 그리드온은 전력공급·스마트그리드·신재생·전기공사를 아우르는 종합
                전력회사입니다.
              </p>
              <div className="flex gap-s wrap" style={{ marginTop: 34 }} data-reveal data-delay=".24s">
                <Link className="btn btn--lg" href="/services">
                  사업 영역 보기 <span className="ar">→</span>
                </Link>
                <Link className="btn btn--lg btn--ghost" href="/support#apply">
                  전기 신청
                </Link>
              </div>
            </div>
            <div className="hero-spark" data-reveal data-delay=".2s" aria-hidden="true">
              <div className="glow" />
              <div className="ring">
                <svg viewBox="0 0 64 64" fill="none" style={{ width: "100%", height: "100%" }}>
                  <g className="ring-rot" style={{ transformOrigin: "32px 32px" }}>
                    <circle cx="32" cy="32" r="29" stroke="currentColor" strokeWidth=".6" strokeDasharray="2 6" opacity=".5" />
                  </g>
                  <path d="M40.45 13.87 A20 20 0 1 1 23.55 13.87" stroke="currentColor" strokeWidth="4.2" strokeLinecap="round" />
                  <path d="M33 4 L21 28 L30 28 L27 46 L43 22 L34 22 Z" fill="currentColor" />
                </svg>
              </div>
            </div>
          </div>
          <div className="ticker" data-reveal data-delay=".3s">
            <span className="live">실시간 계통 운영</span>
            <span>
              전국 공급 안정도 <b>99.98%</b>
            </span>
            <span>
              실시간 부하 <b>62,418{" "}MW</b>
            </span>
            <span>
              신재생 연계 <b>24.1%</b>
            </span>
            <span>
              운영 변전소 <b>312</b>
            </span>
          </div>
        </div>
      </section>

      {/* ===================== BRAND STORY ===================== */}
      <section className="section" id="story">
        <div className="container">
          <div className="story-grid">
            <div data-reveal>
              <span className="eyebrow">01 · About GRIDON</span>
              <h2 className="kr-d3" style={{ marginTop: 22 }}>
                그리드온은
                <br />두 단어의 결합입니다.
              </h2>
              <p className="lede" style={{ marginTop: 24 }}>
                단순히 전기를 공급하는 것을 넘어, 모든 전력 인프라가 지능적으로 깨어나 사람과
                도시를 연결하는 순간 — 그 활성화된 상태를 우리의 이름으로 삼았습니다.
              </p>
            </div>
            <div data-reveal data-delay=".1s">
              <div className="equation">
                <div className="eq-box">
                  <div className="lab">Infrastructure</div>
                  <div className="wd">GRID</div>
                  <div className="ko">전력망 · 인프라</div>
                </div>
                <div className="eq-op">+</div>
                <div className="eq-box">
                  <div className="lab">Activation</div>
                  <div className="wd">ON</div>
                  <div className="ko">작동 · 활성화</div>
                </div>
              </div>
              <div className="flex aic gap" style={{ marginTop: 22, justifyContent: "center" }}>
                <div className="eq-op">=</div>
                <div
                  className="eq-box"
                  style={{ flex: "none", minWidth: "auto", padding: "22px 30px", borderColor: "var(--line-2)" }}
                >
                  <div className="lab">The awakened grid</div>
                  <div className="wd" style={{ display: "flex", alignItems: "center", gap: 2 }}>
                    GRID
                    <span className="spark" style={{ width: ".84em", height: ".84em", display: "inline-block" }}>
                      <Spark />
                    </span>
                    N
                  </div>
                  <div className="ko">깨어난 전력망</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===================== STATS ===================== */}
      <section className="section--tight">
        <div className="container">
          <div className="stats" data-reveal>
            <div className="cell">
              <div className="stat-n">
                <span data-count="99.98" data-suf="%">99.98%</span>
              </div>
              <div className="stat-l">연간 공급 안정도</div>
            </div>
            <div className="cell">
              <div className="stat-n">
                <span data-count="312">312</span>
              </div>
              <div className="stat-l">운영 변전소</div>
            </div>
            <div className="cell">
              <div className="stat-n">
                <span data-count="2.4" data-suf="GW">2.4GW</span>
              </div>
              <div className="stat-l">신재생 연계 용량</div>
            </div>
            <div className="cell">
              <div className="stat-n">
                <span data-count="184" data-suf="만">184만</span>
              </div>
              <div className="stat-l">누적 고객 계정</div>
            </div>
          </div>
        </div>
      </section>

      {/* ===================== BUSINESS ===================== */}
      <section className="section" id="business">
        <div className="container">
          <div className="flex jcb wrap gap" style={{ alignItems: "flex-end", marginBottom: 38 }} data-reveal>
            <div style={{ flex: "1 1 340px" }}>
              <span className="eyebrow">02 · Business</span>
              <h2 className="kr-d2" style={{ marginTop: 20 }}>
                네 개의 축으로 전력의
                <br />모든 구간을 책임집니다.
              </h2>
            </div>
            <Link className="btn btn--ghost" href="/services">
              전체 사업 보기 <span className="ar">→</span>
            </Link>
          </div>

          <div className="biz" data-reveal>
            <div className="biz-card">
              <div className="top">
                <div>
                  <h3 className="h-kr">전력공급</h3>
                  <div className="en">Power Supply</div>
                </div>
                <svg className="biz-ico" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.4">
                  <path d="M24 4v9M24 35v9M4 24h9M35 24h9" />
                  <circle cx="24" cy="24" r="11" />
                  <path d="M25 18l-5 8h4l-1 6 5-8h-4z" fill="currentColor" stroke="none" />
                </svg>
              </div>
              <p>
                발전·송전·배전·소비 전 구간을 24시간 감시하며, 어떤 상황에서도 멈추지 않는
                신뢰할 수 있는 전력을 공급합니다.
              </p>
            </div>
            <div className="biz-card">
              <div className="top">
                <div>
                  <h3 className="h-kr">스마트그리드</h3>
                  <div className="en">Smart Grid</div>
                </div>
                <svg className="biz-ico" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.4">
                  <circle cx="10" cy="24" r="3" />
                  <circle cx="38" cy="12" r="3" />
                  <circle cx="38" cy="36" r="3" />
                  <circle cx="24" cy="24" r="3" />
                  <path d="M13 24h8M27 22l8-8M27 26l8 8" />
                </svg>
              </div>
              <p>
                ICT가 결합된 양방향 통신 전력망. 수요와 공급을 스스로 조정하고 이상을 감지해
                즉시 복구하는 도시의 신경망입니다.
              </p>
            </div>
            <div className="biz-card">
              <div className="top">
                <div>
                  <h3 className="h-kr">신재생 · ESS</h3>
                  <div className="en">Renewable · ESS</div>
                </div>
                <svg className="biz-ico" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.4">
                  <circle cx="18" cy="18" r="7" />
                  <path d="M18 5v4M18 27v4M5 18h4M27 18h4M9 9l3 3M27 27l-3-3M27 9l-3 3M9 27l3-3" />
                  <rect x="28" y="28" width="14" height="12" rx="1.5" />
                  <path d="M32 28v-3h6v3" />
                </svg>
              </div>
              <p>
                태양광·풍력 등 신재생 에너지와 ESS를 유연하게 통합합니다. 다음 세대도 켤 수
                있는 전기를 설계합니다.
              </p>
            </div>
            <div className="biz-card">
              <div className="top">
                <div>
                  <h3 className="h-kr">전기공사 · 용역</h3>
                  <div className="en">EPC · Service</div>
                </div>
                <svg className="biz-ico" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.4">
                  <path d="M30 6l-12 12 6 6 12-12z" />
                  <path d="M24 24L8 40M18 18l-4-4-6 6 4 4" />
                  <circle cx="34" cy="14" r="1.5" fill="currentColor" />
                </svg>
              </div>
              <p>
                전력 설비의 설계·시공·유지보수까지. 산업 현장과 도시 인프라에 안전하고 효율적인
                전기를 연결하는 종합 엔지니어링 용역을 수행합니다.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ===================== VALUES ===================== */}
      <section className="section invert" id="values" data-screen-label="브랜드 가치">
        <div className="container">
          <div className="flex jcb wrap gap" style={{ alignItems: "flex-end", marginBottom: 36 }} data-reveal>
            <div>
              <span className="eyebrow">03 · Brand Values</span>
              <h2 className="kr-d2" style={{ marginTop: 20 }}>
                하나의 약속,
                <br />네 개의 가치.
              </h2>
            </div>
            <p className="lede" style={{ marginBottom: 6 }}>
              SMART GRID가 SMART LIFE가 되는 모든 순간, 그리드온이 지키는 원칙입니다.
            </p>
          </div>

          <div className="values">
            <div className="value-row" data-reveal>
              <div className="vn">/ 01</div>
              <div>
                <div className="ven">Stability</div>
                <div className="vko">안정성</div>
              </div>
              <div className="vd">
                전기는 일상의 기본권입니다. 어떤 상황에서도 멈추지 않는 신뢰할 수 있는 전력 —
                이것이 그리드온의 첫 번째 약속입니다.
              </div>
            </div>
            <div className="value-row" data-reveal>
              <div className="vn">/ 02</div>
              <div>
                <div className="ven">Intelligence</div>
                <div className="vko">지능화</div>
              </div>
              <div className="vd">
                실시간으로 흐름을 읽고, 스스로 판단하고, 효율적으로 분배하는 전력. ICT와 결합한
                차세대 그리드를 추구합니다.
              </div>
            </div>
            <div className="value-row" data-reveal>
              <div className="vn">/ 03</div>
              <div>
                <div className="ven">Connection</div>
                <div className="vko">연결성</div>
              </div>
              <div className="vd">
                발전소부터 가정의 콘센트까지, 그리고 산업과 도시까지. 전력망은 결국 사람과
                사람을 연결하는 인프라입니다.
              </div>
            </div>
            <div className="value-row" data-reveal>
              <div className="vn">/ 04</div>
              <div>
                <div className="ven">Sustainability</div>
                <div className="vko">지속가능성</div>
              </div>
              <div className="vd">
                신재생 에너지와 ESS를 통합하는 유연한 그리드. 다음 세대도 켤 수 있는 전기를
                설계합니다.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===================== NEWSROOM ===================== */}
      <section className="section" id="newsroom">
        <div className="container">
          <div className="flex jcb wrap gap" style={{ alignItems: "flex-end", marginBottom: 38 }} data-reveal>
            <div style={{ flex: "1 1 340px" }}>
              <span className="eyebrow">04 · Newsroom</span>
              <h2 className="kr-d2" style={{ marginTop: 20 }}>
                그리드온 소식
              </h2>
            </div>
            <Link className="btn btn--ghost" href="/newsroom">
              전체 보기 <span className="ar">→</span>
            </Link>
          </div>
          <div className="news" data-reveal>
            <Link className="news-card" href="/newsroom#press">
              <div className="cat">보도자료</div>
              <div className="nt">
                그리드온, 차세대 AI 수요예측 플랫폼 ‘펄스’ 가동 — 계통 효율 12% 개선
              </div>
              <div className="nd">2026.05.28</div>
            </Link>
            <Link className="news-card" href="/newsroom#press">
              <div className="cat">사업</div>
              <div className="nt">동남권 2.4GW 신재생 연계 ESS 단지 준공… 유연성 자원 확대</div>
              <div className="nd">2026.05.12</div>
            </Link>
            <Link className="news-card" href="/newsroom#notice">
              <div className="cat">공지사항</div>
              <div className="nt">6월 정기 설비 점검에 따른 일부 지역 순환 점검 안내</div>
              <div className="nd">2026.06.03</div>
            </Link>
          </div>
        </div>
      </section>

      {/* ===================== QUICK / CUSTOMER ===================== */}
      <section className="invert section--tight" data-screen-label="고객 빠른메뉴">
        <div className="container">
          <div className="flex jcb wrap" style={{ alignItems: "flex-end", marginBottom: 24 }} data-reveal>
            <div>
              <span className="eyebrow">Customer</span>
              <h2 className="kr-d3" style={{ marginTop: 18 }}>
                바로 이용하기
              </h2>
            </div>
          </div>
          <div className="quick" data-reveal>
            <Link href="/support#apply">
              <svg className="qi" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M13 2L4 14h7l-1 8 9-12h-7z" />
              </svg>
              <div>
                <div className="ql">전기 신청</div>
                <div className="qd">신규 · 증설 · 명의변경</div>
              </div>
            </Link>
            <Link href="/support#bill">
              <svg className="qi" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="4" y="3" width="16" height="18" rx="1.5" />
                <path d="M8 8h8M8 12h8M8 16h5" />
              </svg>
              <div>
                <div className="ql">요금 조회·납부</div>
                <div className="qd">청구 내역 확인</div>
              </div>
            </Link>
            <Link href="/support#faq">
              <svg className="qi" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="12" cy="12" r="9" />
                <path d="M9.2 9.2a2.8 2.8 0 1 1 3.6 2.7c-.8.3-1.3.9-1.3 1.8" />
                <circle cx="12" cy="17" r=".6" fill="currentColor" />
              </svg>
              <div>
                <div className="ql">자주 묻는 질문</div>
                <div className="qd">FAQ · 도움말</div>
              </div>
            </Link>
            <Link href="/support#contact">
              <svg className="qi" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M4 5h16v12H8l-4 4z" />
              </svg>
              <div>
                <div className="ql">1:1 문의</div>
                <div className="qd">민원 · 상담 접수</div>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* ===================== CTA ===================== */}
      <section className="section invert grid-bg" style={{ borderTop: "1px solid var(--line)" }}>
        <div
          className="grid-lines"
          style={{
            maskImage: "radial-gradient(100% 100% at 50% 100%,#000 30%,transparent 78%)",
            WebkitMaskImage: "radial-gradient(100% 100% at 50% 100%,#000 30%,transparent 78%)",
          }}
        />
        <div className="container" style={{ position: "relative", zIndex: 2 }}>
          <div className="cta-band" data-reveal>
            <h2 className="kr-d2">
              지금, 그리드온과
              <br />연결되세요.
            </h2>
            <div className="flex stack gap-s">
              <Link
                className="btn btn--lg btn--block"
                href="/login"
                style={{ background: "var(--paper)", color: "var(--ink)", borderColor: "var(--paper)" }}
              >
                로그인 / 마이페이지
              </Link>
              <Link className="btn btn--lg btn--ghost btn--block" href="/support#contact">
                상담 문의하기
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

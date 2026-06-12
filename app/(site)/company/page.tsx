import type { Metadata } from "next";
import Link from "next/link";
import { Spark } from "@/components/Spark";

export const metadata: Metadata = { title: "회사소개" };

export default function CompanyPage() {
  return (
    <>
      {/* page hero */}
      <section className="invert grid-bg page-hero" data-screen-label="회사소개 히어로">
        <div className="grid-lines" />
        <div className="container" style={{ position: "relative", zIndex: 2 }}>
          <div className="crumb">
            <Link href="/">HOME</Link>
            <span className="sep">/</span>
            <span>회사소개</span>
          </div>
          <h1>
            전력망이 깨어나는
            <br />그 순간을 설계합니다
          </h1>
          <div className="en">About GRIDON</div>
          <p className="lede">
            그리드온은 전력공급·스마트그리드·신재생·전기공사를 아우르는 종합 전력회사입니다.
            모든 인프라가 지능적으로 연결되는 순간, 우리는 그 활성화된 상태를 이름으로
            삼았습니다.
          </p>
        </div>
      </section>

      {/* story */}
      <section className="section" id="story">
        <div className="container">
          <div className="split">
            <div data-reveal>
              <span className="eyebrow">01 · The Name</span>
              <h2 className="kr-d3" style={{ marginTop: 20 }}>
                두 단어,
                <br />하나의 약속.
              </h2>
              <p className="lede" style={{ marginTop: 22 }}>
                ‘그리드온’은 전력망(GRID)과 작동(ON)의 결합어입니다. 단순히 전기를 공급하는 것을
                넘어, 발전소부터 가정의 콘센트까지 모든 전력 인프라가 스스로 깨어나 사람과
                도시를 연결하는 순간 — 그 활성화된 상태가 우리의 정체성입니다.
              </p>
              <p className="lede" style={{ marginTop: 18 }}>
                보이지 않지만 가장 똑똑하게 작동하는 도시의 신경망. 그리드온은 SMART GRID가
                SMART LIFE가 되는 다리를 만듭니다.
              </p>
            </div>
            <div data-reveal data-delay=".08s">
              <div className="equation" style={{ display: "flex", alignItems: "center", gap: "clamp(10px,2vw,24px)", flexWrap: "wrap" }}>
                <div className="card" style={{ flex: 1, minWidth: 150, textAlign: "center", padding: "34px 20px" }}>
                  <div className="card-num" style={{ letterSpacing: ".16em" }}>INFRASTRUCTURE</div>
                  <div className="big-num" style={{ fontSize: "clamp(40px,5vw,64px)", marginTop: 10 }}>GRID</div>
                  <div className="muted" style={{ fontSize: 13, marginTop: 6 }}>전력망 · 인프라</div>
                </div>
                <div className="big-num" style={{ fontSize: 36, color: "var(--soft)" }}>+</div>
                <div className="card" style={{ flex: 1, minWidth: 150, textAlign: "center", padding: "34px 20px" }}>
                  <div className="card-num" style={{ letterSpacing: ".16em" }}>ACTIVATION</div>
                  <div className="big-num" style={{ fontSize: "clamp(40px,5vw,64px)", marginTop: 10 }}>ON</div>
                  <div className="muted" style={{ fontSize: 13, marginTop: 6 }}>작동 · 활성화</div>
                </div>
              </div>
              <div className="card" style={{ marginTop: 18, textAlign: "center", padding: "34px 20px", borderColor: "var(--line-2)" }}>
                <div className="card-num" style={{ letterSpacing: ".16em" }}>THE AWAKENED GRID</div>
                <div className="big-num" style={{ fontSize: "clamp(44px,5.4vw,68px)", marginTop: 12, display: "flex", alignItems: "center", justifyContent: "center", gap: 2 }}>
                  GRID
                  <span style={{ width: ".82em", height: ".82em", display: "inline-block", lineHeight: 0 }}>
                    <Spark />
                  </span>
                  N
                </div>
                <div className="muted" style={{ fontSize: 13, marginTop: 6 }}>깨어난 전력망</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* values */}
      <section className="section invert" id="values" data-screen-label="브랜드 가치">
        <div className="container">
          <div data-reveal style={{ marginBottom: 34 }}>
            <span className="eyebrow">02 · Brand Values</span>
            <h2 className="kr-d2" style={{ marginTop: 18 }}>하나의 약속, 네 개의 가치</h2>
          </div>
          <div className="values">
            <div className="value-row" data-reveal>
              <div className="vn">/ 01</div>
              <div><div className="ven">Stability</div><div className="vko">안정성</div></div>
              <div className="vd">전기는 일상의 기본권입니다. 어떤 상황에서도 멈추지 않는 신뢰할 수 있는 전력 — 이것이 그리드온의 첫 번째 약속입니다.</div>
            </div>
            <div className="value-row" data-reveal>
              <div className="vn">/ 02</div>
              <div><div className="ven">Intelligence</div><div className="vko">지능화</div></div>
              <div className="vd">실시간으로 흐름을 읽고, 스스로 판단하고, 효율적으로 분배하는 전력. ICT와 결합한 차세대 그리드를 추구합니다.</div>
            </div>
            <div className="value-row" data-reveal>
              <div className="vn">/ 03</div>
              <div><div className="ven">Connection</div><div className="vko">연결성</div></div>
              <div className="vd">발전소부터 가정의 콘센트까지, 그리고 산업과 도시까지. 전력망은 결국 사람과 사람을 연결하는 인프라입니다.</div>
            </div>
            <div className="value-row" data-reveal>
              <div className="vn">/ 04</div>
              <div><div className="ven">Sustainability</div><div className="vko">지속가능성</div></div>
              <div className="vd">신재생 에너지와 ESS를 통합하는 유연한 그리드. 다음 세대도 켤 수 있는 전기를 설계합니다.</div>
            </div>
          </div>
        </div>
      </section>

      {/* vision */}
      <section className="section" id="vision">
        <div className="container">
          <div className="flex jcb wrap gap" style={{ alignItems: "flex-end", marginBottom: 36 }} data-reveal>
            <div style={{ flex: "1 1 320px" }}>
              <span className="eyebrow">03 · Vision 2035</span>
              <h2 className="kr-d2" style={{ marginTop: 18 }}>
                2035, 멈춤 없는
                <br />지능형 전력 도시
              </h2>
            </div>
            <p className="lede" style={{ marginBottom: 4 }}>
              탄소중립 시대의 전력망은 더 유연하고, 더 똑똑하고, 더 단단해야 합니다. 그리드온의
              10년 로드맵입니다.
            </p>
          </div>
          <div className="stats" data-reveal>
            <div className="cell"><div className="stat-n">99.999<span style={{ fontSize: ".5em" }}>%</span></div><div className="stat-l">목표 공급 신뢰도 (Five-nines)</div></div>
            <div className="cell"><div className="stat-n">8<span style={{ fontSize: ".5em" }}>GW</span></div><div className="stat-l">신재생 연계 용량 (2035)</div></div>
            <div className="cell"><div className="stat-n">100<span style={{ fontSize: ".5em" }}>%</span></div><div className="stat-l">AMI 스마트미터 보급</div></div>
            <div className="cell"><div className="stat-n">−45<span style={{ fontSize: ".5em" }}>%</span></div><div className="stat-l">계통 손실 감축 목표</div></div>
          </div>
          <div className="feature-list" data-reveal style={{ marginTop: 24 }}>
            <div className="fi"><div className="fn">전략 01</div><div><div className="ft">계통 디지털 전환</div><div className="fd">전 구간 양방향 통신·AI 수요예측으로 자율 운영 그리드 구현</div></div></div>
            <div className="fi"><div className="fn">전략 02</div><div><div className="ft">유연성 자원 확대</div><div className="fd">ESS·V2G·수요반응을 통합한 분산형 유연성 플랫폼 구축</div></div></div>
            <div className="fi"><div className="fn">전략 03</div><div><div className="ft">회복탄력성 강화</div><div className="fd">자가복구(self-healing) 배전망과 마이크로그리드로 무정전 도시 실현</div></div></div>
          </div>
        </div>
      </section>

      {/* history + location */}
      <section className="section invert" id="history" data-screen-label="연혁·오시는길">
        <div className="container">
          <div className="split" style={{ alignItems: "start" }}>
            <div data-reveal>
              <span className="eyebrow">04 · History</span>
              <h2 className="kr-d3" style={{ marginTop: 18 }}>그리드온의 발자취</h2>
              <div className="tl" style={{ marginTop: 28 }}>
                <div className="tl-row"><div className="tl-year">2026</div><div className="tl-items"><div><b>05</b>AI 수요예측 플랫폼 ‘펄스’ 가동</div><div><b>02</b>동남권 2.4GW 신재생 연계 ESS 단지 준공</div></div></div>
                <div className="tl-row"><div className="tl-year">2024</div><div className="tl-items"><div><b>11</b>스마트그리드 통합운영센터(GOC) 개소</div><div><b>03</b>누적 고객 계정 180만 돌파</div></div></div>
                <div className="tl-row"><div className="tl-year">2021</div><div className="tl-items"><div><b>09</b>전기공사·용역 사업 부문 출범</div><div><b>01</b>제2변전 인프라 운영권 확보</div></div></div>
                <div className="tl-row"><div className="tl-year">2018</div><div className="tl-items"><div><b>06</b>그리드온 주식회사 설립</div></div></div>
              </div>
            </div>
            <div data-reveal data-delay=".08s">
              <span className="eyebrow">Location</span>
              <h2 className="kr-d3" style={{ marginTop: 18 }}>오시는 길</h2>
              <div className="media-box" style={{ marginTop: 24, aspectRatio: "16/11" }}>
                <svg className="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
                  <path d="M12 21s7-5.6 7-11a7 7 0 1 0-14 0c0 5.4 7 11 7 11z" />
                  <circle cx="12" cy="10" r="2.5" />
                </svg>
                <span className="ph">MAP · 본사 약도 영역</span>
              </div>
              <div className="feature-list" style={{ marginTop: 18 }}>
                <div className="fi"><div className="fn">본사</div><div><div className="ft">서울특별시 강남구 전력로 24, 그리드온타워</div><div className="fd">지하철 2호선 역삼역 4번 출구 도보 6분</div></div></div>
                <div className="fi"><div className="fn">대표</div><div><div className="ft">1666-0000</div><div className="fd">평일 09:00 – 18:00 · 24시간 고장신고 123</div></div></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section grid-bg" style={{ borderTop: "1px solid var(--line)" }}>
        <div className="container">
          <div className="flex jcb wrap gap-l" style={{ alignItems: "center" }} data-reveal>
            <h2 className="kr-d2">
              그리드온과 함께
              <br />일하고 싶다면
            </h2>
            <div className="flex gap-s wrap">
              <Link className="btn btn--lg" href="/recruit">채용 정보 <span className="ar">→</span></Link>
              <Link className="btn btn--lg btn--ghost" href="/support#contact">제휴·문의</Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

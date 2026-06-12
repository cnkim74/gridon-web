import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "사업·서비스" };

export default function ServicesPage() {
  return (
    <>
      <section className="invert grid-bg page-hero" data-screen-label="사업·서비스 히어로">
        <div className="grid-lines" />
        <div className="container" style={{ position: "relative", zIndex: 2 }}>
          <div className="crumb">
            <Link href="/">HOME</Link>
            <span className="sep">/</span>
            <span>사업·서비스</span>
          </div>
          <h1>
            네 개의 축으로
            <br />전력의 모든 구간을
          </h1>
          <div className="en">Business &amp; Services</div>
          <p className="lede">
            발전·송전·배전·소비, 그리고 신재생까지. 그리드온은 전력 가치사슬 전 구간을
            안정적이고 지능적으로 연결합니다.
          </p>
        </div>
      </section>

      {/* overview anchors */}
      <section className="section--tight" style={{ paddingTop: "clamp(40px,5vw,64px)" }}>
        <div className="container">
          <div
            className="biz"
            data-reveal
            style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 1, background: "var(--line)", border: "1px solid var(--line)" }}
          >
            <Link className="biz-card" href="#supply" style={{ minHeight: "auto", padding: 26 }}>
              <div className="top"><div><h3 className="h-kr" style={{ fontSize: 20, whiteSpace: "nowrap" }}>전력공급</h3><div className="en">Power Supply</div></div><span className="card-num">01</span></div>
            </Link>
            <Link className="biz-card" href="#smartgrid" style={{ minHeight: "auto", padding: 26 }}>
              <div className="top"><div><h3 className="h-kr" style={{ fontSize: 20, whiteSpace: "nowrap" }}>스마트그리드</h3><div className="en">Smart Grid</div></div><span className="card-num">02</span></div>
            </Link>
            <Link className="biz-card" href="#renewable" style={{ minHeight: "auto", padding: 26 }}>
              <div className="top"><div><h3 className="h-kr" style={{ fontSize: 20, whiteSpace: "nowrap" }}>신재생 · ESS</h3><div className="en">Renewable</div></div><span className="card-num">03</span></div>
            </Link>
            <Link className="biz-card" href="#epc" style={{ minHeight: "auto", padding: 26 }}>
              <div className="top"><div><h3 className="h-kr" style={{ fontSize: 20, whiteSpace: "nowrap" }}>전기공사 · 용역</h3><div className="en">EPC · Service</div></div><span className="card-num">04</span></div>
            </Link>
          </div>
        </div>
      </section>

      {/* 01 supply */}
      <section className="section" id="supply">
        <div className="container">
          <div className="split">
            <div data-reveal>
              <span className="eyebrow">01 · Power Supply</span>
              <h2 className="kr-d3" style={{ marginTop: 18 }}>
                멈추지 않는
                <br />전력공급
              </h2>
              <p className="lede" style={{ marginTop: 20 }}>
                발전·송전·배전·소비 전 구간을 24시간 감시합니다. 어떤 상황에서도 멈추지 않는
                신뢰할 수 있는 전력 — 일상의 기본권을 지키는 것이 그리드온의 첫 번째 약속입니다.
              </p>
              <div className="feature-list">
                <div className="fi"><div className="fn">01</div><div><div className="ft">통합운영센터(GOC) 24/7 감시</div><div className="fd">전국 계통을 실시간 모니터링하고 이상을 즉시 조치</div></div></div>
                <div className="fi"><div className="fn">02</div><div><div className="ft">자가복구 배전망</div><div className="fd">고장 구간을 자동 격리·우회해 정전 시간을 최소화</div></div></div>
                <div className="fi"><div className="fn">03</div><div><div className="ft">예방 정비 체계</div><div className="fd">설비 상태 기반(CBM) 진단으로 고장을 사전에 차단</div></div></div>
              </div>
            </div>
            <div data-reveal data-delay=".08s">
              <div className="media-box">
                <svg className="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.1"><path d="M4 20V8l8-4 8 4v12M4 20h16M9 20v-5h6v5M2 8h20" /></svg>
                <span className="ph">이미지 · 통합운영센터</span>
              </div>
              <div className="stats" style={{ marginTop: 18, gridTemplateColumns: "repeat(2,1fr)" }}>
                <div className="cell" style={{ padding: 26 }}><div className="stat-n" style={{ fontSize: 46 }}>99.98<span style={{ fontSize: ".5em" }}>%</span></div><div className="stat-l">연간 공급 안정도</div></div>
                <div className="cell" style={{ padding: 26 }}><div className="stat-n" style={{ fontSize: 46 }}>312</div><div className="stat-l">운영 변전소</div></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 02 smartgrid */}
      <section className="section invert" id="smartgrid" data-screen-label="스마트그리드">
        <div className="container">
          <div className="split rev">
            <div data-reveal data-delay=".08s" style={{ order: 2 }}>
              <div className="media-box">
                <svg className="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.1"><circle cx="5" cy="12" r="2" /><circle cx="19" cy="5" r="2" /><circle cx="19" cy="19" r="2" /><circle cx="12" cy="12" r="2" /><path d="M7 12h3M14 11l3-4.5M14 13l3 4.5" /></svg>
                <span className="ph">다이어그램 · 양방향 통신망</span>
              </div>
              <div className="feature-list" style={{ marginTop: 18 }}>
                <div className="fi"><div className="fn">AMI</div><div><div className="ft">지능형 검침 인프라</div><div className="fd">스마트미터로 사용 데이터를 실시간 수집·분석</div></div></div>
                <div className="fi"><div className="fn">DR</div><div><div className="ft">수요반응 플랫폼</div><div className="fd">피크 시간대 부하를 자동 조정해 계통 안정에 기여</div></div></div>
              </div>
            </div>
            <div data-reveal style={{ order: 1 }}>
              <span className="eyebrow">02 · Smart Grid</span>
              <h2 className="kr-d3" style={{ marginTop: 18 }}>
                스스로 판단하는
                <br />지능형 전력망
              </h2>
              <p className="lede" style={{ marginTop: 20 }}>
                ICT가 결합된 양방향 통신 전력망입니다. 발전·송전·배전·소비의 모든 구간이
                실시간으로 대화하며, 수요와 공급을 스스로 조정하고 이상을 감지하면 즉시
                복구합니다.
              </p>
              <p className="lede" style={{ marginTop: 16 }}>
                보이지 않지만 가장 똑똑하게 작동하는 도시의 신경망. AI 수요예측 플랫폼 ‘펄스’가
                계통 효율을 12% 개선했습니다.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 03 renewable */}
      <section className="section" id="renewable">
        <div className="container">
          <div className="split">
            <div data-reveal>
              <span className="eyebrow">03 · Renewable · ESS</span>
              <h2 className="kr-d3" style={{ marginTop: 18 }}>
                다음 세대도
                <br />켤 수 있는 전기
              </h2>
              <p className="lede" style={{ marginTop: 20 }}>
                태양광·풍력 등 신재생 에너지와 ESS를 유연하게 통합합니다. 변동성이 큰
                재생에너지를 안정적인 전력으로 바꾸는 유연성 자원을 설계·운영합니다.
              </p>
              <div className="feature-list">
                <div className="fi"><div className="fn">PV</div><div><div className="ft">태양광 발전 연계</div><div className="fd">분산 전원을 계통에 안전하게 통합</div></div></div>
                <div className="fi"><div className="fn">ESS</div><div><div className="ft">에너지저장장치 운영</div><div className="fd">잉여 전력을 저장하고 피크에 방전</div></div></div>
                <div className="fi"><div className="fn">VPP</div><div><div className="ft">가상발전소</div><div className="fd">분산 자원을 묶어 하나의 발전소처럼 제어</div></div></div>
              </div>
            </div>
            <div data-reveal data-delay=".08s">
              <div className="card" style={{ padding: 0, overflow: "hidden", borderColor: "var(--line-2)" }}>
                <div style={{ padding: "30px 30px 8px" }}><span className="eyebrow no-tick">연계 용량 추이</span></div>
                <div style={{ padding: "0 30px 30px" }}>
                  <svg viewBox="0 0 320 150" className="spark-area" preserveAspectRatio="none" style={{ height: 170 }}>
                    <polyline points="0,128 53,118 106,96 160,84 213,58 266,40 320,18" fill="none" stroke="currentColor" strokeWidth="2" />
                    <polygon points="0,128 53,118 106,96 160,84 213,58 266,40 320,18 320,150 0,150" fill="currentColor" opacity=".06" />
                  </svg>
                  <div className="flex jcb" style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--soft)", marginTop: 10 }}>
                    <span>2020</span><span>2026</span><span>2035(목표)</span>
                  </div>
                </div>
              </div>
              <div className="stats" style={{ marginTop: 18, gridTemplateColumns: "repeat(2,1fr)" }}>
                <div className="cell" style={{ padding: 26 }}><div className="stat-n" style={{ fontSize: 46 }}>2.4<span style={{ fontSize: ".5em" }}>GW</span></div><div className="stat-l">현재 신재생 연계</div></div>
                <div className="cell" style={{ padding: 26 }}><div className="stat-n" style={{ fontSize: 46 }}>8<span style={{ fontSize: ".5em" }}>GW</span></div><div className="stat-l">2035 목표</div></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 04 epc */}
      <section className="section invert" id="epc" data-screen-label="전기공사·용역">
        <div className="container">
          <div data-reveal style={{ marginBottom: 34 }}>
            <span className="eyebrow">04 · EPC · Service</span>
            <h2 className="kr-d2" style={{ marginTop: 18 }}>설계부터 시공, 유지보수까지</h2>
            <p className="lede" style={{ marginTop: 18 }}>
              전력 설비의 전 생애주기를 책임지는 종합 엔지니어링 용역. 산업 현장과 도시 인프라에
              안전하고 효율적인 전기를 연결합니다.
            </p>
          </div>
          <div className="steps" data-reveal>
            <div className="step"><div className="sn">01</div><div className="st">설계 · 엔지니어링</div><div className="sd">부하 분석부터 도면·인허가까지 최적 전력 설계</div></div>
            <div className="step"><div className="sn">02</div><div className="st">조달 · 시공</div><div className="sd">수배전반·케이블·변압기 설치 및 안전 시공</div></div>
            <div className="step"><div className="sn">03</div><div className="st">시험 · 준공</div><div className="sd">절연·계전 시험 후 무결점 송전 개시</div></div>
            <div className="step"><div className="sn">04</div><div className="st">유지보수 · 용역</div><div className="sd">정기 점검·예방정비로 무정전 운영 지속</div></div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section grid-bg" style={{ borderTop: "1px solid var(--line)" }}>
        <div className="container">
          <div className="flex jcb wrap gap-l" style={{ alignItems: "center" }} data-reveal>
            <h2 className="kr-d2">
              우리 사업장에 맞는
              <br />전력 솔루션이 궁금하다면
            </h2>
            <div className="flex gap-s wrap">
              <Link className="btn btn--lg" href="/support#contact">상담 신청 <span className="ar">→</span></Link>
              <Link className="btn btn--lg btn--ghost" href="/support#apply">전기 신청</Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

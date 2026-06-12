import type { Metadata } from "next";
import Link from "next/link";
import DemoForm from "@/components/DemoForm";

export const metadata: Metadata = { title: "고객지원" };

function Chev() {
  return (
    <svg className="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export default function SupportPage() {
  return (
    <>
      <section className="invert grid-bg page-hero" data-screen-label="고객지원 히어로">
        <div className="grid-lines" />
        <div className="container" style={{ position: "relative", zIndex: 2 }}>
          <div className="crumb">
            <Link href="/">HOME</Link>
            <span className="sep">/</span>
            <span>고객지원</span>
          </div>
          <h1>무엇을 도와드릴까요?</h1>
          <div className="en">Customer Support</div>
          <p className="lede">
            전기 신청부터 요금 조회, 자주 묻는 질문, 1:1 상담까지. 그리드온 고객센터{" "}
            <b style={{ color: "var(--paper)" }}>1666-0000</b> · 24시간 고장신고{" "}
            <b style={{ color: "var(--paper)" }}>123</b>
          </p>
        </div>
      </section>

      {/* quick tiles */}
      <section className="section--tight" style={{ paddingTop: "clamp(40px,5vw,64px)" }}>
        <div className="container">
          <div
            className="biz"
            data-reveal
            style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 1, background: "var(--line)", border: "1px solid var(--line)" }}
          >
            <Link className="biz-card" href="#apply" style={{ minHeight: "auto", padding: 26, gap: 0 }}>
              <div className="top" style={{ alignItems: "center" }}>
                <div className="flex aic gap-s">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M13 2L4 14h7l-1 8 9-12h-7z" /></svg>
                  <h3 className="h-kr" style={{ fontSize: 18, whiteSpace: "nowrap" }}>전기 신청</h3>
                </div>
                <span className="ar" style={{ color: "var(--soft)" }}>→</span>
              </div>
            </Link>
            <Link className="biz-card" href="#bill" style={{ minHeight: "auto", padding: 26, gap: 0 }}>
              <div className="top" style={{ alignItems: "center" }}>
                <div className="flex aic gap-s">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="4" y="3" width="16" height="18" rx="1.5" /><path d="M8 8h8M8 12h8M8 16h5" /></svg>
                  <h3 className="h-kr" style={{ fontSize: 18, whiteSpace: "nowrap" }}>요금 안내</h3>
                </div>
                <span className="ar" style={{ color: "var(--soft)" }}>→</span>
              </div>
            </Link>
            <Link className="biz-card" href="#faq" style={{ minHeight: "auto", padding: 26, gap: 0 }}>
              <div className="top" style={{ alignItems: "center" }}>
                <div className="flex aic gap-s">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="9" /><path d="M9.2 9.2a2.8 2.8 0 1 1 3.6 2.7c-.8.3-1.3.9-1.3 1.8" /><circle cx="12" cy="17" r=".6" fill="currentColor" /></svg>
                  <h3 className="h-kr" style={{ fontSize: 18, whiteSpace: "nowrap" }}>FAQ</h3>
                </div>
                <span className="ar" style={{ color: "var(--soft)" }}>→</span>
              </div>
            </Link>
            <Link className="biz-card" href="#contact" style={{ minHeight: "auto", padding: 26, gap: 0 }}>
              <div className="top" style={{ alignItems: "center" }}>
                <div className="flex aic gap-s">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 5h16v12H8l-4 4z" /></svg>
                  <h3 className="h-kr" style={{ fontSize: 18, whiteSpace: "nowrap" }}>1:1 문의</h3>
                </div>
                <span className="ar" style={{ color: "var(--soft)" }}>→</span>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* apply */}
      <section className="section" id="apply">
        <div className="container">
          <div data-reveal style={{ marginBottom: 32 }}>
            <span className="eyebrow">01 · Apply</span>
            <h2 className="kr-d2" style={{ marginTop: 18 }}>전기 신청</h2>
            <p className="lede" style={{ marginTop: 16 }}>
              신규 전입·증설·명의변경 신청을 온라인으로 접수합니다. 신청 후 영업일 기준 1~3일
              내 담당자가 연락드립니다.
            </p>
          </div>
          <div className="steps" data-reveal style={{ marginBottom: 30 }}>
            <div className="step"><div className="sn">01</div><div className="st">신청서 작성</div><div className="sd">신청 종류·주소·계약전력 입력</div></div>
            <div className="step"><div className="sn">02</div><div className="st">현장 확인</div><div className="sd">필요 시 설비 점검 및 견적 안내</div></div>
            <div className="step"><div className="sn">03</div><div className="st">계약 · 시공</div><div className="sd">공급 계약 체결 후 인입 공사</div></div>
            <div className="step"><div className="sn">04</div><div className="st">송전 개시</div><div className="sd">계량기 설치 및 전기 사용 시작</div></div>
          </div>
          <div className="card" data-reveal style={{ padding: "clamp(26px,3vw,40px)", borderColor: "var(--line-2)" }}>
            <DemoForm successMessage="전기 신청이 접수되었습니다. 담당자가 곧 연락드립니다.">
              <div className="form-row">
                <div className="field"><label>신청 종류 <span className="req">*</span></label><select className="select" required defaultValue=""><option value="" disabled>선택하세요</option><option>신규 (전입)</option><option>계약전력 증설</option><option>명의 변경</option><option>해지</option></select></div>
                <div className="field"><label>고객 구분 <span className="req">*</span></label><select className="select" required defaultValue=""><option value="" disabled>선택하세요</option><option>주택용 (가정)</option><option>일반용 (상가·사무실)</option><option>산업용 (공장)</option></select></div>
              </div>
              <div className="form-row">
                <div className="field"><label>신청인 성함 <span className="req">*</span></label><input className="input" required placeholder="홍길동" /></div>
                <div className="field"><label>연락처 <span className="req">*</span></label><input className="input" required placeholder="010-0000-0000" /></div>
              </div>
              <div className="field"><label>공급 주소 <span className="req">*</span></label><input className="input" required placeholder="도로명 주소를 입력하세요" /></div>
              <div className="field"><label>요청 사항</label><textarea className="textarea" placeholder="희망 계약전력, 시공 희망일 등을 적어주세요" /></div>
              <label className="flex aic gap-s" style={{ fontSize: 13.5, color: "var(--muted)", cursor: "pointer" }}>
                <input type="checkbox" required style={{ width: 16, height: 16, accentColor: "var(--ink)" }} />
                개인정보 수집·이용에 동의합니다. <span className="req">*</span>
              </label>
              <button className="btn btn--lg" type="submit" style={{ justifySelf: "start" }}>신청서 제출 <span className="ar">→</span></button>
            </DemoForm>
          </div>
        </div>
      </section>

      {/* bill */}
      <section className="section invert" id="bill" data-screen-label="요금 안내">
        <div className="container">
          <div className="split">
            <div data-reveal>
              <span className="eyebrow">02 · Billing</span>
              <h2 className="kr-d3" style={{ marginTop: 18 }}>요금 안내</h2>
              <p className="lede" style={{ marginTop: 20 }}>
                계약 종별에 따라 요금제가 다르게 적용됩니다. 로그인 후 마이페이지에서 실시간
                사용량과 청구 내역을 확인하고 납부할 수 있습니다.
              </p>
              <div className="flex gap-s wrap" style={{ marginTop: 24 }}>
                <Link className="btn" href="/login" style={{ background: "var(--paper)", color: "var(--ink)", borderColor: "var(--paper)" }}>요금 조회·납부</Link>
                <Link className="btn btn--ghost" href="#contact">요금 문의</Link>
              </div>
            </div>
            <div data-reveal data-delay=".08s">
              <div className="feature-list" style={{ marginTop: 0 }}>
                <div className="fi"><div className="fn">주택용</div><div><div className="ft">기본요금 + 전력량요금 (누진 3단계)</div><div className="fd">가정용 저압·고압 공급, 주거 전용</div></div></div>
                <div className="fi"><div className="fn">일반용</div><div><div className="ft">계약전력 기준 기본요금 + 계절·시간대 요금</div><div className="fd">상가·사무실·업무 시설</div></div></div>
                <div className="fi"><div className="fn">산업용</div><div><div className="ft">고압 공급 · 최대수요전력 기반 요금</div><div className="fd">제조·산업 현장 전용</div></div></div>
                <div className="fi"><div className="fn">친환경</div><div><div className="ft">녹색프리미엄 · 신재생 선택요금제</div><div className="fd">재생에너지 사용 인증 옵션</div></div></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* faq */}
      <section className="section" id="faq">
        <div className="container">
          <div className="split" style={{ gridTemplateColumns: ".7fr 1.3fr", alignItems: "start" }}>
            <div data-reveal>
              <span className="eyebrow">03 · FAQ</span>
              <h2 className="kr-d3" style={{ marginTop: 18 }}>
                자주 묻는
                <br />질문
              </h2>
              <p className="muted" style={{ marginTop: 18, fontSize: 15 }}>
                원하는 답을 찾지 못하셨나요?
                <br />1:1 문의로 직접 물어보세요.
              </p>
              <Link className="btn btn--ghost" href="#contact" style={{ marginTop: 18 }}>1:1 문의 <span className="ar">→</span></Link>
            </div>
            <div className="acc" data-reveal data-delay=".06s">
              <details>
                <summary><span className="q"><span className="qmark">Q</span>전기 신청은 얼마나 걸리나요?</span><Chev /></summary>
                <div className="a">신규 신청은 현장 확인과 인입 공사 일정에 따라 보통 영업일 기준 3~7일이 소요됩니다. 명의 변경 등 단순 변경은 1~2일 내 처리됩니다.</div>
              </details>
              <details>
                <summary><span className="q"><span className="qmark">Q</span>요금은 어디서 조회하고 납부하나요?</span><Chev /></summary>
                <div className="a">로그인 후 마이페이지에서 월별 사용량, 청구 내역, 납부 상태를 확인할 수 있습니다. 자동이체·카드·계좌이체 납부를 지원합니다.</div>
              </details>
              <details>
                <summary><span className="q"><span className="qmark">Q</span>정전이 발생했어요. 어떻게 하나요?</span><Chev /></summary>
                <div className="a">우선 옥내 차단기를 확인해 주세요. 차단기 정상인데도 정전이라면 24시간 고장신고 <b>123</b>으로 연락 주시면 즉시 출동합니다. 통합운영센터가 인근 계통 상태도 함께 확인합니다.</div>
              </details>
              <details>
                <summary><span className="q"><span className="qmark">Q</span>태양광을 설치했는데 계통에 연계할 수 있나요?</span><Chev /></summary>
                <div className="a">네. 신재생·ESS 사업부에서 분산전원 계통연계 신청을 접수합니다. 설비 용량과 위치에 따른 연계 가능 여부를 검토 후 안내드립니다.</div>
              </details>
              <details>
                <summary><span className="q"><span className="qmark">Q</span>계약전력을 늘리고 싶어요.</span><Chev /></summary>
                <div className="a">증설 신청을 통해 처리 가능합니다. 위 ‘전기 신청’에서 ‘계약전력 증설’을 선택해 접수하시면, 현장 설비 점검 후 견적과 일정을 안내드립니다.</div>
              </details>
            </div>
          </div>
        </div>
      </section>

      {/* contact */}
      <section className="section invert" id="contact" data-screen-label="1:1 문의">
        <div className="container">
          <div className="split">
            <div data-reveal>
              <span className="eyebrow">04 · Contact</span>
              <h2 className="kr-d3" style={{ marginTop: 18 }}>1:1 문의</h2>
              <p className="lede" style={{ marginTop: 20 }}>
                상담이 필요하신 내용을 남겨주세요. 영업일 기준 1일 이내에 답변드립니다.
              </p>
              <div className="feature-list" style={{ marginTop: 24 }}>
                <div className="fi"><div className="fn">전화</div><div><div className="ft">고객센터 1666-0000</div><div className="fd">평일 09:00 – 18:00</div></div></div>
                <div className="fi"><div className="fn">고장</div><div><div className="ft">24시간 고장신고 123</div><div className="fd">정전·고장 즉시 출동</div></div></div>
              </div>
            </div>
            <div className="card" data-reveal data-delay=".08s" style={{ padding: "clamp(26px,3vw,38px)", borderColor: "var(--line-2)" }}>
              <DemoForm successMessage="문의가 접수되었습니다. 빠르게 답변드리겠습니다.">
                <div className="field"><label>문의 유형 <span className="req">*</span></label><select className="select" required defaultValue=""><option value="" disabled>선택하세요</option><option>요금·납부</option><option>전기 신청·시공</option><option>정전·고장</option><option>제휴·사업 문의</option><option>기타</option></select></div>
                <div className="form-row">
                  <div className="field"><label>성함 <span className="req">*</span></label><input className="input" required placeholder="홍길동" /></div>
                  <div className="field"><label>이메일 <span className="req">*</span></label><input className="input" type="email" required placeholder="name@email.com" /></div>
                </div>
                <div className="field"><label>문의 내용 <span className="req">*</span></label><textarea className="textarea" required placeholder="문의하실 내용을 자세히 적어주세요" /></div>
                <button className="btn btn--lg" type="submit" style={{ justifySelf: "start", background: "var(--paper)", color: "var(--ink)", borderColor: "var(--paper)" }}>문의 보내기 <span className="ar">→</span></button>
              </DemoForm>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

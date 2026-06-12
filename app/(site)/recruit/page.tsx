import type { Metadata } from "next";
import Link from "next/link";
import SegFilter from "@/components/SegFilter";

export const metadata: Metadata = { title: "채용" };

const JOBS: [string, string, string][] = [
  ["계통운영", "스마트그리드 계통운영 엔지니어 (경력 3년+)", "상시채용"],
  ["신재생", "신재생·ESS 계통연계 설계 담당", "~06.30"],
  ["전기공사", "전기공사 현장 시공·감리 (신입/경력)", "상시채용"],
  ["데이터", "전력 수요예측 AI/데이터 사이언티스트", "~07.15"],
  ["고객", "고객센터 상담·민원 운영 매니저", "~06.20"],
];

export default function RecruitPage() {
  return (
    <>
      <section className="invert grid-bg page-hero" data-screen-label="채용 히어로">
        <div className="grid-lines" />
        <div className="container" style={{ position: "relative", zIndex: 2 }}>
          <div className="crumb">
            <Link href="/">HOME</Link>
            <span className="sep">/</span>
            <span>채용</span>
          </div>
          <h1>
            전력망을 깨우는
            <br />사람들
          </h1>
          <div className="en">Careers at GRIDON</div>
          <p className="lede">
            멈춤 없는 일상을 설계하는 일. 그리드온은 전기로 사람과 도시를 잇는 동료를 찾습니다.
          </p>
        </div>
      </section>

      {/* talent */}
      <section className="section" id="talent">
        <div className="container">
          <div data-reveal style={{ marginBottom: 34 }}>
            <span className="eyebrow">01 · Who we look for</span>
            <h2 className="kr-d2" style={{ marginTop: 18 }}>그리드온의 인재상</h2>
          </div>
          <div className="tri" data-reveal>
            <div className="tc">
              <svg className="ti" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4"><circle cx="12" cy="12" r="9" /><path d="M13 7l-5 8h4l-1 5" /></svg>
              <div className="th">멈추지 않는 책임감</div>
              <div className="tp">전기는 일상의 기본권. 어떤 상황에서도 끝까지 책임지는 사람을 신뢰합니다.</div>
            </div>
            <div className="tc">
              <svg className="ti" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4"><circle cx="9" cy="12" r="2" /><circle cx="19" cy="6" r="2" /><circle cx="19" cy="18" r="2" /><path d="M11 12h4M16 8l-4 3M16 16l-4-3" /></svg>
              <div className="th">연결하는 협업</div>
              <div className="tp">전력망처럼, 서로 다른 분야를 잇고 함께 더 큰 흐름을 만드는 사람.</div>
            </div>
            <div className="tc">
              <svg className="ti" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M12 3v4M12 17v4M3 12h4M17 12h4" /><circle cx="12" cy="12" r="3.5" /></svg>
              <div className="th">지능적인 호기심</div>
              <div className="tp">더 똑똑한 그리드를 위해 끊임없이 배우고 실험하는 사람.</div>
            </div>
          </div>
        </div>
      </section>

      {/* jobs */}
      <section className="section invert" id="jobs" data-screen-label="채용공고">
        <div className="container">
          <div className="flex jcb wrap gap" style={{ alignItems: "flex-end", marginBottom: 30 }} data-reveal>
            <div style={{ flex: "1 1 320px" }}>
              <span className="eyebrow">02 · Open Positions</span>
              <h2 className="kr-d2" style={{ marginTop: 18 }}>채용 공고</h2>
            </div>
            <div data-reveal>
              <SegFilter options={["전체", "정규직", "경력"]} />
            </div>
          </div>
          <div className="list" data-reveal style={{ borderTopColor: "rgba(234,230,216,.3)" }}>
            {JOBS.map(([cat, title, due]) => (
              <a key={title} href="#">
                <span className="lc">{cat}</span>
                <span className="lt">{title}</span>
                <span className="ld">{due}</span>
              </a>
            ))}
          </div>
          <div className="flex aic gap-l wrap" style={{ marginTop: 40, paddingTop: 30, borderTop: "1px solid rgba(234,230,216,.16)" }} data-reveal>
            <div>
              <h3 className="kr-d3" style={{ fontSize: "clamp(22px,2.6vw,34px)" }}>함께할 준비가 되셨나요?</h3>
              <p className="muted" style={{ marginTop: 10 }}>지원 서류는 채용 공고별 상세 페이지에서 접수합니다.</p>
            </div>
            <Link className="btn btn--lg" href="/support#contact" style={{ background: "var(--paper)", color: "var(--ink)", borderColor: "var(--paper)" }}>
              인재풀 등록 <span className="ar">→</span>
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

import Link from "next/link";
import { Wordmark } from "./Wordmark";

export default function SiteFooter() {
  return (
    <footer className="foot" data-screen-label="푸터">
      <div className="container">
        <div className="foot-grid">
          <div className="foot-col">
            <Wordmark style={{ color: "var(--paper)", fontSize: 28 }} />
            <p
              style={{
                color: "rgba(234,230,216,.6)",
                fontSize: 14,
                marginTop: 18,
                maxWidth: "34ch",
              }}
            >
              Smart Grid. Smart Life.
              <br />
              전력망이 깨어나는 그 순간, 그리드온이 함께합니다.
            </p>
            <div className="flex gap-s" style={{ marginTop: 22 }}>
              <a
                className="icon-btn"
                href="#"
                style={{ borderColor: "rgba(234,230,216,.2)", color: "var(--paper)" }}
                aria-label="유튜브"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M22 8.2a3 3 0 0 0-2.1-2.1C18 5.6 12 5.6 12 5.6s-6 0-7.9.5A3 3 0 0 0 2 8.2 31 31 0 0 0 1.7 12 31 31 0 0 0 2 15.8a3 3 0 0 0 2.1 2.1c1.9.5 7.9.5 7.9.5s6 0 7.9-.5a3 3 0 0 0 2.1-2.1A31 31 0 0 0 22.3 12 31 31 0 0 0 22 8.2zM10 15V9l5 3z" />
                </svg>
              </a>
              <a
                className="icon-btn"
                href="#"
                style={{ borderColor: "rgba(234,230,216,.2)", color: "var(--paper)" }}
                aria-label="링크드인"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M4.98 3.5A2.5 2.5 0 1 0 5 8.5a2.5 2.5 0 0 0 0-5zM3 9h4v12H3zM10 9h3.8v1.7h.05c.53-1 1.8-2 3.75-2 4 0 4.4 2.4 4.4 5.5V21h-4v-5.2c0-1.2 0-2.8-1.8-2.8s-2 1.4-2 2.7V21h-4z" />
                </svg>
              </a>
            </div>
          </div>
          <div className="foot-col">
            <h4>회사</h4>
            <Link href="/company#story">그리드온 이야기</Link>
            <Link href="/company#values">브랜드 가치</Link>
            <Link href="/company#vision">비전 · 전략</Link>
            <Link href="/recruit">채용</Link>
          </div>
          <div className="foot-col">
            <h4>서비스</h4>
            <Link href="/services#supply">전력공급</Link>
            <Link href="/services#smartgrid">스마트그리드</Link>
            <Link href="/services#renewable">신재생 · ESS</Link>
            <Link href="/services#epc">전기공사 · 용역</Link>
          </div>
          <div className="foot-col">
            <h4>고객지원</h4>
            <Link href="/support#apply">전기 신청</Link>
            <Link href="/support#bill">요금 안내</Link>
            <Link href="/support#faq">FAQ</Link>
            <Link href="/admin/dashboard">관리자 로그인</Link>
          </div>
        </div>
        <div className="foot-bottom">
          <span>© 2026 GRIDON CO., LTD. ALL RIGHTS RESERVED.</span>
          <span>
            서울특별시 강남구 전력로 24 · 대표 1666-0000 · 사업자등록번호
            000-00-00000
          </span>
        </div>
      </div>
    </footer>
  );
}

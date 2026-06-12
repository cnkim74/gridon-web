import type { Metadata } from "next";
import Link from "next/link";
import NewsroomTabs from "./NewsroomTabs";

export const metadata: Metadata = { title: "뉴스룸" };

export default function NewsroomPage() {
  return (
    <>
      <section className="invert grid-bg page-hero" data-screen-label="뉴스룸 히어로">
        <div className="grid-lines" />
        <div className="container" style={{ position: "relative", zIndex: 2 }}>
          <div className="crumb">
            <Link href="/">HOME</Link>
            <span className="sep">/</span>
            <span>뉴스룸</span>
          </div>
          <h1>그리드온 소식</h1>
          <div className="en">Newsroom</div>
          <p className="lede">
            보도자료, 공지사항, 미디어까지. 그리드온의 가장 최신 소식을 전합니다.
          </p>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <NewsroomTabs />
        </div>
      </section>
    </>
  );
}

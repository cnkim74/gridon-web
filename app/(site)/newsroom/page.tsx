import type { Metadata } from "next";
import Link from "next/link";
import NewsroomTabs from "./NewsroomTabs";

export const metadata: Metadata = { title: "커뮤니티" };

export default function NewsroomPage() {
  return (
    <>
      <section className="invert grid-bg page-hero" data-screen-label="커뮤니티 히어로">
        <div className="grid-lines" />
        <div className="container" style={{ position: "relative", zIndex: 2 }}>
          <div className="crumb">
            <Link href="/">HOME</Link>
            <span className="sep">/</span>
            <span>커뮤니티</span>
          </div>
          <h1>커뮤니티</h1>
          <div className="en">Community</div>
          <p className="lede">
            공지사항, 질의응답, 시공 실적까지. 그리드온의 소식과 이야기를 나눕니다.
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

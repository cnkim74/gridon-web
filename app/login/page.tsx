"use client";

import { useState } from "react";
import Link from "next/link";
import { Wordmark } from "@/components/Wordmark";
import { Spark } from "@/components/Spark";
import DemoForm from "@/components/DemoForm";

export default function LoginPage() {
  const [role, setRole] = useState<"개인" | "기업">("개인");

  return (
    <div className="auth">
      <section className="invert grid-bg auth-brand" data-screen-label="로그인 브랜드">
        <div className="grid-lines" />
        <Wordmark style={{ position: "relative", zIndex: 2, color: "var(--paper)", fontSize: 24 }} />
        <div style={{ position: "relative", zIndex: 2 }}>
          <div className="auth-spark">
            <svg viewBox="0 0 64 64" fill="none" style={{ width: "100%", height: "100%" }}>
              <path d="M40.45 13.87 A20 20 0 1 1 23.55 13.87" stroke="currentColor" strokeWidth="4.2" strokeLinecap="round" />
              <path d="M33 4 L21 28 L30 28 L27 46 L43 22 L34 22 Z" fill="currentColor" />
            </svg>
          </div>
          <h1 className="big" style={{ marginTop: 24 }}>
            Welcome
            <br />back.
          </h1>
          <p className="kr-d3" style={{ fontFamily: "var(--font-sans)", fontWeight: 700, fontSize: 20, marginTop: 14, color: "var(--paper)" }}>
            마이페이지에 오신 것을 환영합니다.
          </p>
          <p className="muted" style={{ marginTop: 8, color: "rgba(234,230,216,.6)" }}>
            요금 조회·납부, 사용량 확인, 전기 신청 내역을 한 곳에서.
          </p>
        </div>
        <div className="mono" style={{ position: "relative", zIndex: 2, fontSize: 11.5, color: "rgba(234,230,216,.5)" }}>
          SMART GRID. SMART LIFE.
        </div>
      </section>

      <section className="auth-form">
        <div className="auth-card">
          <div className="auth-tabs">
            <button className={role === "개인" ? "active" : ""} onClick={() => setRole("개인")}>개인 회원</button>
            <button className={role === "기업" ? "active" : ""} onClick={() => setRole("기업")}>기업 회원</button>
          </div>
          <h2 className="kr-d3" style={{ fontSize: 26 }}>로그인</h2>
          <p className="muted" style={{ fontSize: 14, marginTop: 8, marginBottom: 24 }}>
            {role} 계정으로 로그인하고 마이페이지를 이용하세요.
          </p>
          <DemoForm successMessage="로그인 데모입니다. 실제 인증은 연동 후 동작합니다.">
            <div className="field"><label>아이디 (이메일)</label><input className="input" type="email" placeholder="name@email.com" required /></div>
            <div className="field"><label>비밀번호</label><input className="input" type="password" placeholder="••••••••" required /></div>
            <label className="flex aic gap-s" style={{ fontSize: 13.5, color: "var(--muted)", cursor: "pointer" }}>
              <input type="checkbox" style={{ width: 16, height: 16, accentColor: "var(--ink)" }} />
              로그인 상태 유지
            </label>
            <button className="btn btn--lg btn--block" type="submit">로그인 <span className="ar">→</span></button>
          </DemoForm>
          <div className="flex jcb" style={{ marginTop: 18, fontSize: 13, color: "var(--muted)" }}>
            <a href="#" style={{ borderBottom: "1px solid var(--line-2)", paddingBottom: 1 }}>아이디·비밀번호 찾기</a>
            <a href="#" style={{ borderBottom: "1px solid var(--line-2)", paddingBottom: 1 }}>회원가입</a>
          </div>
          <hr className="rule" style={{ margin: "26px 0" }} />
          <Link className="btn btn--ghost btn--block" href="/admin/dashboard">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" style={{ marginRight: 2 }}>
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M3 9h18M9 21V9" />
            </svg>
            관리자 · 임직원 로그인
          </Link>
        </div>
      </section>
    </div>
  );
}

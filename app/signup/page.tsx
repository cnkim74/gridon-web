"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Wordmark } from "@/components/Wordmark";
import GoogleSignInButton from "@/components/GoogleSignInButton";
import { supabase } from "@/lib/supabase";

export default function SignupPage() {
  const router = useRouter();
  const [role, setRole] = useState<"개인" | "기업">("개인");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setNotice(null);

    if (password.length < 6) {
      setError("비밀번호는 6자 이상이어야 합니다.");
      return;
    }
    if (password !== confirm) {
      setError("비밀번호가 일치하지 않습니다.");
      return;
    }

    setSubmitting(true);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      // Stored on auth.users.raw_user_meta_data and read by the DB trigger
      // (handle_new_user) to populate public.profiles.
      options: { data: { name, member_type: role } },
    });

    if (error) {
      setError(
        error.message === "User already registered"
          ? "이미 가입된 이메일입니다."
          : error.message,
      );
      setSubmitting(false);
      return;
    }

    // Email confirmation is disabled → a session is returned immediately.
    // (If it gets re-enabled later, session is null until the user confirms.)
    if (data.session) {
      router.push("/");
    } else {
      setNotice("가입이 접수되었습니다. 이메일의 확인 링크를 눌러 인증을 완료하세요.");
      setSubmitting(false);
    }
  }

  return (
    <div className="auth">
      <section className="invert grid-bg auth-brand" data-screen-label="회원가입 브랜드">
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
            Join the
            <br />grid.
          </h1>
          <p className="kr-d3" style={{ fontFamily: "var(--font-sans)", fontWeight: 700, fontSize: 20, marginTop: 14, color: "var(--paper)" }}>
            그리드온 회원이 되어보세요.
          </p>
          <p className="muted" style={{ marginTop: 8, color: "rgba(234,230,216,.6)" }}>
            전기 신청, 요금 조회·납부, 사용량 리포트를 한 계정으로.
          </p>
        </div>
        <div className="mono" style={{ position: "relative", zIndex: 2, fontSize: 11.5, color: "rgba(234,230,216,.5)" }}>
          SMART GRID. SMART LIFE.
        </div>
      </section>

      <section className="auth-form">
        <div className="auth-card">
          <div className="auth-tabs">
            <button type="button" className={role === "개인" ? "active" : ""} onClick={() => setRole("개인")}>개인 회원</button>
            <button type="button" className={role === "기업" ? "active" : ""} onClick={() => setRole("기업")}>기업 회원</button>
          </div>
          <h2 className="kr-d3" style={{ fontSize: 26 }}>회원가입</h2>
          <p className="muted" style={{ fontSize: 14, marginTop: 8, marginBottom: 24 }}>
            {role} 계정으로 가입합니다.
          </p>
          <form className="form" onSubmit={handleSubmit}>
            <div className="field">
              <label htmlFor="signup-name">{role === "기업" ? "회사명 / 담당자명" : "이름"}</label>
              <input
                id="signup-name"
                className="input"
                type="text"
                placeholder={role === "기업" ? "㈜그리드온 · 홍길동" : "홍길동"}
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="signup-email">아이디 (이메일)</label>
              <input
                id="signup-email"
                className="input"
                type="email"
                placeholder="name@email.com"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="signup-password">비밀번호</label>
              <input
                id="signup-password"
                className="input"
                type="password"
                placeholder="6자 이상"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="signup-confirm">비밀번호 확인</label>
              <input
                id="signup-confirm"
                className="input"
                type="password"
                placeholder="••••••••"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
              />
            </div>
            {error && (
              <div
                role="alert"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  border: "1px solid var(--line-2)",
                  color: "#b3261e",
                  padding: "12px 14px",
                  fontSize: 14,
                  fontWeight: 600,
                }}
              >
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#b3261e", flex: "none" }} />
                {error}
              </div>
            )}
            {notice && (
              <div
                role="status"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  border: "1px solid var(--line-2)",
                  color: "var(--fg)",
                  padding: "12px 14px",
                  fontSize: 14,
                  fontWeight: 600,
                }}
              >
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#1f7a3d", flex: "none" }} />
                {notice}
              </div>
            )}
            <button className="btn btn--lg btn--block" type="submit" disabled={submitting}>
              {submitting ? "가입 중…" : <>회원가입 <span className="ar">→</span></>}
            </button>
          </form>
          <div className="flex aic" style={{ gap: 12, margin: "20px 0 14px", color: "var(--muted)", fontSize: 12.5 }}>
            <hr className="rule" style={{ flex: 1, margin: 0 }} />
            또는
            <hr className="rule" style={{ flex: 1, margin: 0 }} />
          </div>
          <GoogleSignInButton label="Google로 가입하기" />
          <div className="flex jcb" style={{ marginTop: 18, fontSize: 13, color: "var(--muted)" }}>
            <span>이미 회원이신가요?</span>
            <Link href="/login" style={{ borderBottom: "1px solid var(--line-2)", paddingBottom: 1 }}>로그인</Link>
          </div>
        </div>
      </section>
    </div>
  );
}

"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sba = supabase as any;
type SbaRes = { data: unknown; error: { message: string } | null };

type QnaItem = {
  id: string;
  question: string;
  answer: string;
  answered_at: string | null;
};

type AskForm = {
  name: string;
  email: string;
  question: string;
  is_public: boolean;
};

function Chev() {
  return (
    <svg className="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export default function QnaPage() {
  const [qnas, setQnas] = useState<QnaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<AskForm>({ name: "", email: "", question: "", is_public: true });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitErr, setSubmitErr] = useState<string | null>(null);

  useEffect(() => {
    sba.from("qna").select("id, question, answer, answered_at")
      .eq("status", "answered")
      .eq("is_public", true)
      .order("answered_at", { ascending: false })
      .then(({ data }: SbaRes) => {
        setLoading(false);
        setQnas((data as QnaItem[]) ?? []);
      });
  }, []);

  function setF<K extends keyof AskForm>(k: K, v: AskForm[K]) { setForm((f) => ({ ...f, [k]: v })); }

  async function submit() {
    if (!form.name.trim()) { setSubmitErr("이름을 입력하세요."); return; }
    if (!form.question.trim()) { setSubmitErr("질문 내용을 입력하세요."); return; }
    setSubmitting(true); setSubmitErr(null);
    const { error } = await sba.from("qna").insert({
      question: form.question.trim(),
      questioner_name: form.name.trim(),
      questioner_email: form.email.trim() || null,
      is_public: form.is_public,
    });
    setSubmitting(false);
    if (error) { setSubmitErr(error.message); return; }
    setSubmitted(true);
    setForm({ name: "", email: "", question: "", is_public: true });
  }

  return (
    <>
      <section className="invert grid-bg page-hero" data-screen-label="질의응답">
        <div className="grid-lines" />
        <div className="container" style={{ position: "relative", zIndex: 2 }}>
          <div className="crumb">
            <Link href="/">HOME</Link><span className="sep">/</span>
            <Link href="/support">고객지원</Link><span className="sep">/</span>
            <span>질의응답</span>
          </div>
          <h1>질의응답</h1>
          <div className="en">Q&amp;A</div>
          <p className="lede">전기 신청, 요금, 공사 관련 질문에 담당자가 직접 답변합니다.</p>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div style={{ display: "grid", gridTemplateColumns: "1.15fr .85fr", gap: 64, alignItems: "start" }}>

            {/* Q&A list */}
            <div>
              <h2 className="kr-d3" style={{ fontSize: 20, fontWeight: 800, marginBottom: 28 }}>답변된 질문</h2>
              {loading ? (
                <p className="muted">불러오는 중…</p>
              ) : qnas.length === 0 ? (
                <p className="muted">아직 게시된 답변이 없습니다.</p>
              ) : (
                <div className="acc" data-reveal>
                  {qnas.map((q) => (
                    <details key={q.id}>
                      <summary>
                        <span className="q"><span className="qmark">Q</span>{q.question}</span>
                        <Chev />
                      </summary>
                      <div className="a">
                        <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.85 }}>{q.answer}</div>
                        {q.answered_at && (
                          <div style={{ marginTop: 10, fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--soft)" }}>
                            {q.answered_at.slice(0, 10)}
                          </div>
                        )}
                      </div>
                    </details>
                  ))}
                </div>
              )}
            </div>

            {/* Submit form */}
            <div style={{ position: "sticky", top: "calc(var(--nav-h) + 24px)" }}>
              <div className="card" style={{ padding: "28px", borderColor: "var(--line-2)" }}>
                <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 6 }}>질문 하기</h3>
                <p className="muted" style={{ fontSize: 14, marginBottom: 22, lineHeight: 1.65 }}>
                  궁금한 점을 남겨주세요.<br />담당자가 확인 후 답변드립니다.
                </p>

                {submitted ? (
                  <div style={{ padding: "28px 20px", textAlign: "center", background: "var(--faint)", borderRadius: 6 }}>
                    <div style={{ fontSize: 28, marginBottom: 10 }}>✓</div>
                    <div style={{ fontWeight: 700, marginBottom: 6 }}>질문이 접수되었습니다.</div>
                    <div className="muted" style={{ fontSize: 13 }}>검토 후 답변드리겠습니다.</div>
                    <button className="btn btn--sm btn--ghost" style={{ marginTop: 18 }} onClick={() => setSubmitted(false)}>새 질문 작성</button>
                  </div>
                ) : (
                  <>
                    <div className="field" style={{ marginBottom: 12 }}>
                      <label>이름 <span className="req">*</span></label>
                      <input className="input" placeholder="홍길동" value={form.name} onChange={(e) => setF("name", e.target.value)} />
                    </div>
                    <div className="field" style={{ marginBottom: 12 }}>
                      <label>이메일 (선택)</label>
                      <input className="input" type="email" placeholder="name@email.com" value={form.email} onChange={(e) => setF("email", e.target.value)} />
                    </div>
                    <div className="field" style={{ marginBottom: 12 }}>
                      <label>질문 내용 <span className="req">*</span></label>
                      <textarea className="input" rows={4} placeholder="궁금하신 내용을 입력하세요." value={form.question} onChange={(e) => setF("question", e.target.value)} style={{ resize: "vertical" }} />
                    </div>
                    <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13.5, marginBottom: 18, cursor: "pointer", color: "var(--muted)" }}>
                      <input type="checkbox" checked={form.is_public} onChange={(e) => setF("is_public", e.target.checked)} style={{ accentColor: "var(--ink)" }} />
                      답변 공개 동의 (다른 고객도 볼 수 있습니다)
                    </label>
                    {submitErr && <p style={{ color: "#b3261e", fontSize: 13, marginBottom: 12 }}>{submitErr}</p>}
                    <button className="btn btn--block" onClick={submit} disabled={submitting}>
                      {submitting ? "제출 중…" : "질문 보내기"} <span className="ar">→</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

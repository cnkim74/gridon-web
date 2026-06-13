"use client";
import { Fragment, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/AuthProvider";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sba = supabase as any;
type SbaRes = { data: unknown; error: { message: string } | null };

type Qna = {
  id: string;
  question: string;
  questioner_name: string;
  questioner_email: string | null;
  is_public: boolean;
  status: "pending" | "answered" | "closed";
  answer: string | null;
  answered_at: string | null;
  created_at: string;
};

const STATUS_LABEL: Record<Qna["status"], string> = { pending: "답변대기", answered: "답변완료", closed: "종료" };
const STATUS_CLS:   Record<Qna["status"], string> = { pending: "badge warn", answered: "badge ok", closed: "badge off" };

// ── Answer Modal ──────────────────────────────────────────────────────────────
function AnswerModal({ qna, onSaved, onCancel }: { qna: Qna; onSaved: () => void; onCancel: () => void }) {
  const { user } = useAuth();
  const [answer, setAnswer] = useState(qna.answer ?? "");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function save() {
    if (!answer.trim()) { setErr("답변 내용을 입력하세요."); return; }
    setSaving(true); setErr(null);
    const { error } = await sba.from("qna").update({
      answer: answer.trim(),
      status: "answered",
      answered_at: new Date().toISOString(),
      answered_by: user?.id ?? null,
    }).eq("id", qna.id);
    setSaving(false);
    if (error) { setErr(error.message); return; }
    onSaved();
  }

  return (
    <div onClick={onCancel} style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(0,0,0,.45)", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "40px 20px", overflowY: "auto" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "var(--paper)", borderRadius: 6, padding: 28, width: "100%", maxWidth: 600, boxShadow: "0 20px 60px rgba(0,0,0,.3)" }}>
        <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 16 }}>질문 답변</h3>

        <div style={{ background: "var(--fill, rgba(0,0,0,.04))", borderRadius: 4, padding: "14px 16px", marginBottom: 18, borderLeft: "3px solid var(--ink)" }}>
          <div className="muted" style={{ fontSize: 11.5, marginBottom: 6 }}>
            {qna.questioner_name}
            {qna.questioner_email && <span> · {qna.questioner_email}</span>}
            <span> · {qna.created_at.slice(0, 10)}</span>
          </div>
          <div style={{ fontSize: 14.5, lineHeight: 1.75, whiteSpace: "pre-wrap" }}>{qna.question}</div>
        </div>

        <div className="field" style={{ marginBottom: 16 }}>
          <label>답변 내용 <span style={{ color: "#b3261e" }}>*</span></label>
          <textarea className="input" rows={7} value={answer} onChange={(e) => setAnswer(e.target.value)}
            placeholder="답변을 작성하세요." style={{ resize: "vertical", lineHeight: 1.7 }} />
        </div>

        {err && <p style={{ color: "#b3261e", fontSize: 13, margin: "0 0 12px" }}>{err}</p>}
        <div className="flex gap-s">
          <button className="btn btn--sm" onClick={save} disabled={saving}>{saving ? "저장 중…" : "답변 등록"}</button>
          <button className="btn btn--sm btn--ghost" onClick={onCancel}>취소</button>
        </div>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
type QFilt = "all" | "pending" | "answered" | "closed";

export default function QnaBoard() {
  const [qnas, setQnas] = useState<Qna[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [filter, setFilter] = useState<QFilt>("all");
  const [answering, setAnswering] = useState<Qna | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  function load() {
    setLoading(true);
    sba.from("qna").select("*").order("created_at", { ascending: false })
      .then(({ data, error }: SbaRes) => {
        setLoading(false);
        if (error) { setErr(error.message); return; }
        setQnas((data as Qna[]) ?? []);
      });
  }
  useEffect(() => { load(); }, []); // eslint-disable-line

  async function togglePublic(q: Qna) {
    await sba.from("qna").update({ is_public: !q.is_public }).eq("id", q.id);
    setQnas((prev) => prev.map((x) => x.id === q.id ? { ...x, is_public: !x.is_public } : x));
  }

  async function closeQna(q: Qna) {
    await sba.from("qna").update({ status: "closed" }).eq("id", q.id);
    setQnas((prev) => prev.map((x) => x.id === q.id ? { ...x, status: "closed" as const } : x));
  }

  async function del(q: Qna) {
    if (!confirm("삭제하시겠습니까?")) return;
    await sba.from("qna").delete().eq("id", q.id);
    setQnas((prev) => prev.filter((x) => x.id !== q.id));
  }

  const filtered = filter === "all" ? qnas : qnas.filter((q) => q.status === filter);
  const cnt = {
    all: qnas.length,
    pending: qnas.filter((q) => q.status === "pending").length,
    answered: qnas.filter((q) => q.status === "answered").length,
    closed: qnas.filter((q) => q.status === "closed").length,
  };

  return (
    <>
      {answering && (
        <AnswerModal
          qna={answering}
          onSaved={() => { setAnswering(null); load(); }}
          onCancel={() => setAnswering(null)}
        />
      )}

      <div style={{ padding: "32px 36px" }}>
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 24, fontWeight: 800 }}>질의응답 관리</h1>
          <p className="muted" style={{ fontSize: 13.5, marginTop: 4 }}>고객 질문을 확인하고 답변합니다.</p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 24 }}>
          {(["all", "pending", "answered", "closed"] as QFilt[]).map((k) => (
            <div key={k} className="panel" style={{ padding: "14px 16px", cursor: "pointer", borderLeft: filter === k ? "3px solid var(--ink)" : "3px solid transparent" }} onClick={() => setFilter(k)}>
              <div className="muted" style={{ fontSize: 11.5, marginBottom: 4 }}>
                {k === "all" ? "전체" : k === "pending" ? "답변대기" : k === "answered" ? "답변완료" : "종료"}
              </div>
              <div style={{ fontSize: 22, fontWeight: 800 }}>{cnt[k]}</div>
            </div>
          ))}
        </div>

        {err && <div role="alert" style={{ color: "#b3261e", fontSize: 13.5, marginBottom: 16 }}>{err}</div>}

        <div className="panel" style={{ padding: 0, overflow: "auto" }}>
          {loading ? (
            <div className="cellsub" style={{ padding: 40, textAlign: "center" }}>불러오는 중…</div>
          ) : filtered.length === 0 ? (
            <div className="cellsub" style={{ padding: 40, textAlign: "center" }}>질문이 없습니다.</div>
          ) : (
            <table className="table" style={{ minWidth: 680 }}>
              <thead>
                <tr>
                  <th style={{ width: 120 }}>작성자</th>
                  <th>질문</th>
                  <th style={{ width: 72, textAlign: "center" }}>공개</th>
                  <th style={{ width: 90, textAlign: "center" }}>상태</th>
                  <th style={{ width: 110 }}>작성일</th>
                  <th style={{ width: 160 }} />
                </tr>
              </thead>
              <tbody>
                {filtered.map((q) => (
                  <Fragment key={q.id}>
                    <tr style={{ cursor: "pointer" }} onClick={() => setExpandedId(expandedId === q.id ? null : q.id)}>
                      <td>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{q.questioner_name}</div>
                        {q.questioner_email && <div className="cellsub" style={{ fontSize: 11 }}>{q.questioner_email}</div>}
                      </td>
                      <td>
                        <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 340 }}>{q.question}</div>
                      </td>
                      <td style={{ textAlign: "center" }} onClick={(e) => e.stopPropagation()}>
                        <button type="button" onClick={() => togglePublic(q)}
                          className={`badge ${q.is_public ? "ok" : "off"}`} style={{ border: "none", cursor: "pointer" }}>
                          {q.is_public ? "공개" : "비공개"}
                        </button>
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <span className={STATUS_CLS[q.status]}>{STATUS_LABEL[q.status]}</span>
                      </td>
                      <td className="cellsub">{q.created_at.slice(0, 10)}</td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <div className="flex gap-s" style={{ justifyContent: "flex-end" }}>
                          <button className="btn btn--sm btn--ghost" style={{ fontSize: 11.5 }} onClick={() => setAnswering(q)}>
                            {q.status === "answered" ? "수정" : "답변"}
                          </button>
                          {q.status !== "closed" && (
                            <button className="btn btn--sm btn--ghost" style={{ fontSize: 11.5 }} onClick={() => closeQna(q)}>종료</button>
                          )}
                          <button className="btn btn--sm btn--ghost" style={{ fontSize: 11.5, color: "#b3261e" }} onClick={() => del(q)}>삭제</button>
                        </div>
                      </td>
                    </tr>
                    {expandedId === q.id && (
                      <tr style={{ background: "var(--fill, rgba(0,0,0,.03))" }}>
                        <td colSpan={6} style={{ padding: "14px 20px" }}>
                          <div style={{ marginBottom: q.answer ? 14 : 0 }}>
                            <div className="muted" style={{ fontSize: 11, marginBottom: 4, textTransform: "uppercase", letterSpacing: ".06em" }}>질문</div>
                            <div style={{ fontSize: 14, lineHeight: 1.8, whiteSpace: "pre-wrap" }}>{q.question}</div>
                          </div>
                          {q.answer && (
                            <div style={{ borderTop: "1px solid var(--line-2)", paddingTop: 12 }}>
                              <div className="muted" style={{ fontSize: 11, marginBottom: 4, textTransform: "uppercase", letterSpacing: ".06em" }}>
                                답변 · {q.answered_at?.slice(0, 10)}
                              </div>
                              <div style={{ fontSize: 14, lineHeight: 1.8, whiteSpace: "pre-wrap" }}>{q.answer}</div>
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}

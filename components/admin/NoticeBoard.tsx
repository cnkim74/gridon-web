"use client";
import { Fragment, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/AuthProvider";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sba = supabase as any;
type SbaRes = { data: unknown; error: { message: string } | null };

type Notice = {
  id: string;
  title: string;
  content: string;
  category: string;
  is_pinned: boolean;
  status: "draft" | "published";
  view_count: number;
  created_at: string;
};

const CATEGORIES = ["일반", "점검", "공지", "이벤트", "채용"];

// ── Editor Modal ──────────────────────────────────────────────────────────────
type NForm = {
  title: string; content: string; category: string;
  is_pinned: boolean; status: "draft" | "published";
};

function NoticeEditor({ initial, onSaved, onCancel }: {
  initial: Notice | null; onSaved: () => void; onCancel: () => void;
}) {
  const { user } = useAuth();
  const isNew = !initial;
  const [form, setForm] = useState<NForm>({
    title: initial?.title ?? "",
    content: initial?.content ?? "",
    category: initial?.category ?? "일반",
    is_pinned: initial?.is_pinned ?? false,
    status: initial?.status ?? "draft",
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function setF<K extends keyof NForm>(k: K, v: NForm[K]) { setForm((f) => ({ ...f, [k]: v })); }

  async function save() {
    if (!form.title.trim()) { setErr("제목을 입력하세요."); return; }
    if (!form.content.trim()) { setErr("내용을 입력하세요."); return; }
    setSaving(true); setErr(null);
    const payload = {
      title: form.title.trim(), content: form.content.trim(),
      category: form.category, is_pinned: form.is_pinned,
      status: form.status, created_by: user?.id ?? null,
    };
    const { error } = isNew
      ? await sba.from("notices").insert(payload)
      : await sba.from("notices").update(payload).eq("id", initial!.id);
    setSaving(false);
    if (error) { setErr(error.message); return; }
    onSaved();
  }

  return (
    <div onClick={onCancel} style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(0,0,0,.45)", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "40px 20px", overflowY: "auto" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "var(--paper)", borderRadius: 6, padding: 28, width: "100%", maxWidth: 720, boxShadow: "0 20px 60px rgba(0,0,0,.3)" }}>
        <h3 style={{ fontSize: 17, fontWeight: 800, marginBottom: 20 }}>{isNew ? "공지 작성" : "공지 수정"}</h3>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
          <div className="field">
            <label>카테고리</label>
            <select className="input" value={form.category} onChange={(e) => setF("category", e.target.value)}>
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div className="field" style={{ display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13.5, cursor: "pointer", whiteSpace: "nowrap" }}>
                <input type="checkbox" checked={form.is_pinned} onChange={(e) => setF("is_pinned", e.target.checked)} />
                상단 고정
              </label>
              <select className="input" value={form.status} onChange={(e) => setF("status", e.target.value as "draft" | "published")}>
                <option value="draft">임시저장</option>
                <option value="published">게시중</option>
              </select>
            </div>
          </div>
        </div>

        <div className="field" style={{ marginBottom: 14 }}>
          <label>제목 <span style={{ color: "#b3261e" }}>*</span></label>
          <input className="input" placeholder="공지 제목" value={form.title} onChange={(e) => setF("title", e.target.value)} />
        </div>

        <div className="field" style={{ marginBottom: 16 }}>
          <label>내용 <span style={{ color: "#b3261e" }}>*</span></label>
          <textarea className="input" rows={12} placeholder="공지 내용을 입력하세요." value={form.content} onChange={(e) => setF("content", e.target.value)} style={{ resize: "vertical", fontFamily: "inherit", lineHeight: 1.7 }} />
        </div>

        {err && <p style={{ color: "#b3261e", fontSize: 13, margin: "0 0 12px" }}>{err}</p>}
        <div className="flex gap-s">
          <button className="btn btn--sm" onClick={save} disabled={saving}>{saving ? "저장 중…" : "저장"}</button>
          <button className="btn btn--sm btn--ghost" onClick={onCancel}>취소</button>
        </div>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
type Filt = "all" | "published" | "draft";

export default function NoticeBoard() {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filt>("all");
  const [editing, setEditing] = useState<Notice | null | "new">(null);
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  function load() {
    setLoading(true);
    sba.from("notices").select("*")
      .order("is_pinned", { ascending: false })
      .order("created_at", { ascending: false })
      .then(({ data, error }: SbaRes) => {
        setLoading(false);
        if (error) { setErr(error.message); return; }
        setNotices((data as Notice[]) ?? []);
      });
  }
  useEffect(() => { load(); }, []); // eslint-disable-line

  async function toggleStatus(n: Notice) {
    const next = n.status === "published" ? "draft" : "published";
    await sba.from("notices").update({ status: next }).eq("id", n.id);
    setNotices((prev) => prev.map((x) => x.id === n.id ? { ...x, status: next } : x));
  }

  async function togglePin(n: Notice) {
    const next = !n.is_pinned;
    await sba.from("notices").update({ is_pinned: next }).eq("id", n.id);
    setNotices((prev) => prev.map((x) => x.id === n.id ? { ...x, is_pinned: next } : x));
  }

  async function del(n: Notice) {
    if (!confirm(`"${n.title}" 공지를 삭제하시겠습니까?`)) return;
    await sba.from("notices").delete().eq("id", n.id);
    setNotices((prev) => prev.filter((x) => x.id !== n.id));
  }

  const q = search.toLowerCase();
  const filtered = notices
    .filter((n) => filter === "all" || n.status === filter)
    .filter((n) => !q || n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q));

  const cnt = {
    all: notices.length,
    published: notices.filter((n) => n.status === "published").length,
    draft: notices.filter((n) => n.status === "draft").length,
  };

  return (
    <>
      {editing !== null && (
        <NoticeEditor
          initial={editing === "new" ? null : editing}
          onSaved={() => { setEditing(null); load(); }}
          onCancel={() => setEditing(null)}
        />
      )}

      <div style={{ padding: "32px 36px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 800 }}>공지사항 관리</h1>
            <p className="muted" style={{ fontSize: 13.5, marginTop: 4 }}>공지사항을 작성하고 게시합니다.</p>
          </div>
          <button className="btn btn--sm" onClick={() => setEditing("new")}>+ 새 공지</button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 24 }}>
          {(["all", "published", "draft"] as Filt[]).map((k) => (
            <div key={k} className="panel" style={{ padding: "14px 16px", cursor: "pointer", borderLeft: filter === k ? "3px solid var(--ink)" : "3px solid transparent" }} onClick={() => setFilter(k)}>
              <div className="muted" style={{ fontSize: 11.5, marginBottom: 4 }}>
                {k === "all" ? "전체" : k === "published" ? "게시중" : "임시저장"}
              </div>
              <div style={{ fontSize: 22, fontWeight: 800 }}>{cnt[k]}</div>
            </div>
          ))}
        </div>

        {err && <div role="alert" style={{ color: "#b3261e", fontSize: 13.5, marginBottom: 16 }}>{err}</div>}

        <div className="panel" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--line-2)" }}>
            <input className="input" placeholder="제목·내용 검색…" value={search} onChange={(e) => setSearch(e.target.value)} style={{ maxWidth: 320, fontSize: 13 }} />
          </div>

          {loading ? (
            <div className="cellsub" style={{ padding: 40, textAlign: "center" }}>불러오는 중…</div>
          ) : filtered.length === 0 ? (
            <div className="cellsub" style={{ padding: 40, textAlign: "center" }}>게시물이 없습니다.</div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: 36 }} />
                  <th style={{ width: 76 }}>카테고리</th>
                  <th>제목</th>
                  <th style={{ width: 90, textAlign: "center" }}>상태</th>
                  <th style={{ width: 120 }}>작성일</th>
                  <th style={{ width: 180 }} />
                </tr>
              </thead>
              <tbody>
                {filtered.map((n) => (
                  <Fragment key={n.id}>
                    <tr style={{ cursor: "pointer" }} onClick={() => setExpandedId(expandedId === n.id ? null : n.id)}>
                      <td style={{ textAlign: "center" }}>
                        <button type="button" title={n.is_pinned ? "고정 해제" : "상단 고정"}
                          onClick={(e) => { e.stopPropagation(); togglePin(n); }}
                          style={{ background: "none", border: "none", cursor: "pointer", fontSize: 14, opacity: n.is_pinned ? 1 : 0.3 }}>
                          📌
                        </button>
                      </td>
                      <td><span className="badge">{n.category}</span></td>
                      <td style={{ fontWeight: 600 }}>
                        {n.is_pinned && <span style={{ fontSize: 10, fontWeight: 700, color: "#b3261e", marginRight: 6 }}>고정</span>}
                        {n.title}
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <span className={`badge ${n.status === "published" ? "ok" : "off"}`}>
                          {n.status === "published" ? "게시중" : "임시저장"}
                        </span>
                      </td>
                      <td className="cellsub">{n.created_at.slice(0, 10)}</td>
                      <td>
                        <div className="flex gap-s" style={{ justifyContent: "flex-end" }} onClick={(e) => e.stopPropagation()}>
                          <button className="btn btn--sm btn--ghost" style={{ fontSize: 11.5 }} onClick={() => setEditing(n)}>수정</button>
                          <button className="btn btn--sm btn--ghost" style={{ fontSize: 11.5 }} onClick={() => toggleStatus(n)}>
                            {n.status === "published" ? "임시저장" : "게시"}
                          </button>
                          <button className="btn btn--sm btn--ghost" style={{ fontSize: 11.5, color: "#b3261e" }} onClick={() => del(n)}>삭제</button>
                        </div>
                      </td>
                    </tr>
                    {expandedId === n.id && (
                      <tr style={{ background: "var(--fill, rgba(0,0,0,.03))" }}>
                        <td colSpan={6} style={{ padding: "16px 20px" }}>
                          <div style={{ fontSize: 14, lineHeight: 1.85, whiteSpace: "pre-wrap", maxHeight: 260, overflow: "auto" }}>{n.content}</div>
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

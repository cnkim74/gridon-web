"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/AuthProvider";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sba = supabase as any;
type SbaRes = { data: unknown; error: { message: string } | null };

type PostStatus = "draft" | "published" | "scheduled";
type PostCat = "보도자료" | "공지사항" | "미디어";

type Post = {
  id: string;
  category: PostCat;
  title: string;
  content: string;
  media_url: string | null;
  thumbnail: string | null;
  author: string | null;
  status: PostStatus;
  publish_at: string | null;
  created_at: string;
  updated_at: string;
};

type Draft = {
  category: PostCat;
  title: string;
  content: string;
  media_url: string | null;
  thumbnail: string | null;
  author: string | null;
  status: PostStatus;
  publish_at: string | null;
};

const CATS: PostCat[] = ["보도자료", "공지사항", "미디어"];
const SLB: Record<PostStatus, string> = { draft: "임시저장", published: "게시중", scheduled: "예약" };
const SCL: Record<PostStatus, string> = {
  draft: "badge off",
  published: "badge ok dotok",
  scheduled: "badge warn dotwarn",
};
const PAGE_SIZE = 20;

const STATUS_CHIPS: { label: string; value: PostStatus | "전체" }[] = [
  { label: "전체 상태", value: "전체" },
  { label: "게시중", value: "published" },
  { label: "예약", value: "scheduled" },
  { label: "임시저장", value: "draft" },
];

function empty(): Draft {
  return { category: "보도자료", title: "", content: "", media_url: null, thumbnail: null, author: null, status: "draft", publish_at: null };
}

function fromPost(p: Post): Draft {
  return { category: p.category, title: p.title, content: p.content, media_url: p.media_url, thumbnail: p.thumbnail, author: p.author, status: p.status, publish_at: p.publish_at };
}

function SearchIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <circle cx="11" cy="11" r="7" /><path d="m20 20-3.2-3.2" />
    </svg>
  );
}

// ── Editor modal ────────────────────────────────────────────────────────────

function Editor({ post, onSave, onClose }: { post: Post | null; onSave: () => void; onClose: () => void }) {
  const { user } = useAuth();
  const [d, setD] = useState<Draft>(() => post ? fromPost(post) : empty());
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function set(k: keyof Draft, v: string | null) { setD((p) => ({ ...p, [k]: v })); }

  async function save() {
    if (!d.title.trim()) { setErr("제목을 입력하세요."); return; }
    setSaving(true); setErr(null);
    const base = {
      category: d.category,
      title: d.title.trim(),
      content: d.content,
      media_url: d.media_url?.trim() || null,
      thumbnail: d.thumbnail?.trim() || null,
      author: d.author?.trim() || null,
      status: d.status,
      publish_at: d.status === "scheduled" ? d.publish_at : null,
    };
    const payload = post ? base : { ...base, created_by: user?.id ?? null };
    const req = post
      ? sba.from("posts").update(payload).eq("id", post.id)
      : sba.from("posts").insert(payload);
    const { error }: SbaRes = await req;
    setSaving(false);
    if (error) { setErr((error as { message: string }).message); return; }
    onSave();
  }

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 300, background: "rgba(0,0,0,.45)", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "40px 20px 60px", overflowY: "auto" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "var(--paper)", borderRadius: 8, padding: "28px 32px", width: "100%", maxWidth: 680, boxShadow: "0 24px 64px rgba(0,0,0,.3)" }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 22 }}>{post ? "게시물 편집" : "새 글 작성"}</h2>

        {/* 분류 + 작성자 */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
          <div className="field">
            <label>분류</label>
            <select className="input" value={d.category} onChange={(e) => set("category", e.target.value)}>
              {CATS.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="field">
            <label>작성자</label>
            <input className="input" placeholder="홍보팀" value={d.author ?? ""} onChange={(e) => set("author", e.target.value || null)} />
          </div>
        </div>

        {/* 상태 + 예약일시 */}
        <div style={{ display: "grid", gridTemplateColumns: d.status === "scheduled" ? "1fr 1fr" : "auto", gap: 14, marginBottom: 14 }}>
          <div className="field">
            <label>상태</label>
            <select className="input" value={d.status} onChange={(e) => set("status", e.target.value)}>
              <option value="draft">임시저장</option>
              <option value="published">게시중</option>
              <option value="scheduled">예약</option>
            </select>
          </div>
          {d.status === "scheduled" && (
            <div className="field">
              <label>예약 발행일시</label>
              <input className="input" type="datetime-local" value={d.publish_at?.slice(0, 16) ?? ""} onChange={(e) => set("publish_at", e.target.value || null)} />
            </div>
          )}
        </div>

        {/* 제목 */}
        <div className="field" style={{ marginBottom: 14 }}>
          <label>제목 <span className="req">*</span></label>
          <input className="input" placeholder="제목을 입력하세요" value={d.title} onChange={(e) => set("title", e.target.value)} />
        </div>

        {/* 미디어 URL (미디어 분류만) */}
        {d.category === "미디어" && (
          <div className="field" style={{ marginBottom: 14 }}>
            <label>미디어 URL (YouTube / Vimeo 등)</label>
            <input className="input" type="url" placeholder="https://youtube.com/watch?v=..." value={d.media_url ?? ""} onChange={(e) => set("media_url", e.target.value || null)} />
          </div>
        )}

        {/* 썸네일 */}
        <div className="field" style={{ marginBottom: 14 }}>
          <label>썸네일 이미지 URL (선택)</label>
          <input className="input" type="url" placeholder="https://..." value={d.thumbnail ?? ""} onChange={(e) => set("thumbnail", e.target.value || null)} />
        </div>

        {/* 내용 */}
        <div className="field" style={{ marginBottom: 22 }}>
          <label>내용</label>
          <textarea className="input" rows={10} value={d.content} onChange={(e) => set("content", e.target.value)} style={{ resize: "vertical" }} />
        </div>

        {err && <p style={{ color: "#b3261e", fontSize: 13, marginBottom: 14 }}>{err}</p>}

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button className="btn btn--ghost btn--sm" type="button" onClick={onClose}>취소</button>
          <button className="btn btn--sm" type="button" onClick={save} disabled={saving}>{saving ? "저장 중…" : post ? "저장" : "게시"}</button>
        </div>
      </div>
    </div>
  );
}

// ── Main component ──────────────────────────────────────────────────────────

const chipBase: React.CSSProperties = {
  padding: "5px 14px", border: "1px solid var(--line-2)", borderRadius: 20,
  fontSize: 13, cursor: "pointer", background: "transparent",
};

export default function ContentBoard() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [cat, setCat] = useState<PostCat | "전체">("전체");
  const [statusF, setStatusF] = useState<PostStatus | "전체">("전체");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<Post | null | "new">(null);
  const [rev, setRev] = useState(0);

  useEffect(() => {
    setLoading(true);
    sba.from("posts").select("*").order("created_at", { ascending: false })
      .then(({ data }: SbaRes) => {
        setLoading(false);
        setPosts((data as Post[]) ?? []);
      });
  }, [rev]);

  const all = posts.length;
  const npub = posts.filter((p) => p.status === "published").length;
  const ndraft = posts.filter((p) => p.status === "draft").length;
  const nsched = posts.filter((p) => p.status === "scheduled").length;

  const ql = q.toLowerCase();
  const filtered = posts.filter((p) => {
    if (cat !== "전체" && p.category !== cat) return false;
    if (statusF !== "전체" && p.status !== statusF) return false;
    if (ql && !p.title.toLowerCase().includes(ql)) return false;
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const start = Math.max(0, Math.min(page - 5, totalPages - 9));
  const pageNums = Array.from({ length: totalPages }, (_, i) => i + 1).slice(start, start + 9);

  async function del(id: string) {
    if (!confirm("이 게시물을 삭제하시겠습니까?")) return;
    await sba.from("posts").delete().eq("id", id);
    setRev((r) => r + 1);
  }

  async function toggle(p: Post) {
    const next: PostStatus = p.status === "published" ? "draft" : "published";
    await sba.from("posts").update({ status: next }).eq("id", p.id);
    setRev((r) => r + 1);
  }

  function activeChip(active: boolean): React.CSSProperties {
    return { ...chipBase, background: active ? "var(--ink)" : "transparent", color: active ? "var(--paper)" : "inherit", fontWeight: active ? 700 : 400 };
  }

  return (
    <>
      <div className="apage-head">
        <div>
          <h1>콘텐츠 관리</h1>
          <p>보도자료·공지사항·미디어 등 사이트 게시물을 관리합니다.</p>
        </div>
        <button className="btn btn--sm" type="button" onClick={() => setEditing("new")}>＋ 새 글 작성</button>
      </div>

      <div className="kpis">
        <div className="kpi" style={{ cursor: "pointer" }} onClick={() => { setCat("전체"); setStatusF("전체"); setPage(1); }}>
          <div className="kl">전체 게시물</div><div className="kv">{all}</div>
        </div>
        <div className="kpi" style={{ cursor: "pointer" }} onClick={() => { setStatusF("published"); setPage(1); }}>
          <div className="kl">게시중</div><div className="kv">{npub}</div>
        </div>
        <div className="kpi" style={{ cursor: "pointer" }} onClick={() => { setStatusF("draft"); setPage(1); }}>
          <div className="kl">임시저장</div><div className="kv">{ndraft}</div>
        </div>
        <div className="kpi" style={{ cursor: "pointer" }} onClick={() => { setStatusF("scheduled"); setPage(1); }}>
          <div className="kl">예약 발행</div><div className="kv">{nsched}</div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-body">
          <div className="atable-tools">
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
              {/* Category chips */}
              {(["전체", ...CATS] as Array<PostCat | "전체">).map((c) => (
                <button key={c} type="button" style={activeChip(cat === c)} onClick={() => { setCat(c); setPage(1); }}>{c}</button>
              ))}
              <div style={{ width: 1, background: "var(--line-2)", alignSelf: "stretch", margin: "0 4px" }} />
              {/* Status chips */}
              {STATUS_CHIPS.map(({ label, value }) => (
                <button key={value} type="button" style={activeChip(statusF === value)} onClick={() => { setStatusF(value); setPage(1); }}>{label}</button>
              ))}
            </div>
            <div className="search-mini">
              <SearchIcon />
              <input placeholder="제목 검색" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
            </div>
          </div>
        </div>

        <table className="dtable">
          <thead>
            <tr>
              <th style={{ width: 90 }}>분류</th>
              <th>제목</th>
              <th style={{ width: 120 }}>작성자</th>
              <th style={{ width: 120 }}>상태</th>
              <th style={{ width: 130 }}>발행일</th>
              <th style={{ width: 110 }} />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={{ textAlign: "center", padding: "40px 0", color: "var(--muted)" }}>불러오는 중…</td></tr>
            ) : pageItems.length === 0 ? (
              <tr><td colSpan={6} style={{ textAlign: "center", padding: "40px 0", color: "var(--muted)" }}>게시물이 없습니다.</td></tr>
            ) : pageItems.map((p) => (
              <tr key={p.id}>
                <td><span className="badge off">{p.category}</span></td>
                <td className="strong">{p.title}</td>
                <td className="cellsub">{p.author ?? "—"}</td>
                <td>
                  <button
                    type="button"
                    className={SCL[p.status]}
                    onClick={() => toggle(p)}
                    title={p.status === "published" ? "클릭 → 임시저장" : "클릭 → 게시"}
                    style={{ cursor: "pointer", background: "none", border: "none", font: "inherit", padding: 0 }}
                  >
                    {SLB[p.status]}
                  </button>
                </td>
                <td className="cellsub">
                  {p.status === "scheduled" && p.publish_at
                    ? p.publish_at.slice(0, 10)
                    : p.status === "published"
                    ? p.updated_at.slice(0, 10)
                    : "—"}
                </td>
                <td>
                  <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                    <button type="button" onClick={() => setEditing(p)}
                      style={{ background: "none", border: "none", cursor: "pointer", font: "inherit", fontSize: 13, color: "var(--muted)", textDecoration: "underline" }}>
                      편집
                    </button>
                    <button type="button" onClick={() => del(p.id)}
                      style={{ background: "none", border: "none", cursor: "pointer", font: "inherit", fontSize: 13, color: "#b3261e" }}>
                      삭제
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {totalPages > 1 && (
          <div style={{ padding: "0 22px 22px" }}>
            <div className="pager">
              <button onClick={() => setPage((v) => Math.max(1, v - 1))} disabled={page === 1}>←</button>
              {pageNums.map((n) => (
                <button key={n} className={page === n ? "active" : ""} onClick={() => setPage(n)}>{n}</button>
              ))}
              <button onClick={() => setPage((v) => Math.min(totalPages, v + 1))} disabled={page === totalPages}>→</button>
            </div>
          </div>
        )}
      </div>

      {editing && (
        <Editor
          post={editing === "new" ? null : editing}
          onSave={() => { setEditing(null); setRev((r) => r + 1); }}
          onClose={() => setEditing(null)}
        />
      )}
    </>
  );
}

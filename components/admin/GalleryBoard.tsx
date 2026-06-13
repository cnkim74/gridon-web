"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/AuthProvider";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sba = supabase as any;
type SbaRes = { data: unknown; error: { message: string } | null };

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const BUCKET = "gallery";

type GalleryItem = {
  id: string;
  title: string;
  description: string | null;
  category: string;
  client_name: string | null;
  project_year: number | null;
  cover_url: string | null;
  status: "draft" | "published";
  sort_order: number;
  created_at: string;
};

const CATEGORIES = ["전기공사", "변전설비", "태양광", "송배전", "ESS", "기타"];

// ── Editor Modal ──────────────────────────────────────────────────────────────
type GForm = {
  title: string; description: string; category: string;
  client_name: string; project_year: string; cover_url: string;
  status: "draft" | "published";
};

function GalleryEditor({ initial, onSaved, onCancel }: {
  initial: GalleryItem | null; onSaved: () => void; onCancel: () => void;
}) {
  const { user } = useAuth();
  const isNew = !initial;
  const [form, setForm] = useState<GForm>({
    title: initial?.title ?? "",
    description: initial?.description ?? "",
    category: initial?.category ?? "전기공사",
    client_name: initial?.client_name ?? "",
    project_year: initial?.project_year ? String(initial.project_year) : "",
    cover_url: initial?.cover_url ?? "",
    status: initial?.status ?? "draft",
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function setF<K extends keyof GForm>(k: K, v: GForm[K]) { setForm((f) => ({ ...f, [k]: v })); }

  async function uploadImage(file: File) {
    if (file.size > 5 * 1024 * 1024) { setErr("이미지는 5MB 이하만 가능합니다."); return; }
    setUploading(true); setErr(null);
    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `${crypto.randomUUID()}/cover.${ext}`;
    const { error } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: true });
    setUploading(false);
    if (error) { setErr(`업로드 실패: ${error.message}`); return; }
    setF("cover_url", `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path}`);
  }

  async function save() {
    if (!form.title.trim()) { setErr("제목을 입력하세요."); return; }
    setSaving(true); setErr(null);
    const payload = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      category: form.category,
      client_name: form.client_name.trim() || null,
      project_year: form.project_year ? parseInt(form.project_year) : null,
      cover_url: form.cover_url.trim() || null,
      status: form.status,
      created_by: user?.id ?? null,
    };
    const { error } = isNew
      ? await sba.from("gallery").insert(payload)
      : await sba.from("gallery").update(payload).eq("id", initial!.id);
    setSaving(false);
    if (error) { setErr(error.message); return; }
    onSaved();
  }

  return (
    <div onClick={onCancel} style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(0,0,0,.45)", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "40px 20px", overflowY: "auto" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "var(--paper)", borderRadius: 6, padding: 28, width: "100%", maxWidth: 620, boxShadow: "0 20px 60px rgba(0,0,0,.3)" }}>
        <h3 style={{ fontSize: 17, fontWeight: 800, marginBottom: 20 }}>{isNew ? "실적 등록" : "실적 수정"}</h3>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
          <div className="field">
            <label>카테고리</label>
            <select className="input" value={form.category} onChange={(e) => setF("category", e.target.value)}>
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div className="field">
            <label>공개 상태</label>
            <select className="input" value={form.status} onChange={(e) => setF("status", e.target.value as "draft" | "published")}>
              <option value="draft">임시저장</option>
              <option value="published">게시중</option>
            </select>
          </div>
        </div>

        <div className="field" style={{ marginBottom: 14 }}>
          <label>제목 <span style={{ color: "#b3261e" }}>*</span></label>
          <input className="input" placeholder="예) OO변전소 전기공사" value={form.title} onChange={(e) => setF("title", e.target.value)} />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
          <div className="field">
            <label>발주처</label>
            <input className="input" placeholder="㈜한국전력" value={form.client_name} onChange={(e) => setF("client_name", e.target.value)} />
          </div>
          <div className="field">
            <label>준공연도</label>
            <input className="input" inputMode="numeric" placeholder="2024" value={form.project_year} onChange={(e) => setF("project_year", e.target.value)} />
          </div>
        </div>

        <div className="field" style={{ marginBottom: 14 }}>
          <label>설명</label>
          <textarea className="input" rows={3} value={form.description} onChange={(e) => setF("description", e.target.value)} style={{ resize: "vertical" }} placeholder="공사 내용 요약" />
        </div>

        {/* Image */}
        <div className="field" style={{ marginBottom: 16 }}>
          <label>대표 이미지</label>
          {form.cover_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={form.cover_url} alt="" style={{ width: "100%", maxHeight: 180, objectFit: "cover", borderRadius: 4, marginBottom: 8, border: "1px solid var(--line-2)" }} />
          )}
          <div style={{ display: "flex", gap: 8 }}>
            <input className="input" placeholder="이미지 URL" value={form.cover_url} onChange={(e) => setF("cover_url", e.target.value)} style={{ flex: 1, fontSize: 12 }} />
            <label className="btn btn--sm btn--ghost" style={{ cursor: "pointer", whiteSpace: "nowrap", flex: "none" }}>
              {uploading ? "업로드 중…" : "파일"}
              <input type="file" accept="image/*" style={{ display: "none" }} disabled={uploading}
                onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadImage(f); }} />
            </label>
          </div>
          <div className="muted" style={{ fontSize: 11.5, marginTop: 4 }}>JPG/PNG/WEBP · 최대 5MB</div>
        </div>

        {err && <p style={{ color: "#b3261e", fontSize: 13, margin: "0 0 12px" }}>{err}</p>}
        <div className="flex gap-s">
          <button className="btn btn--sm" onClick={save} disabled={saving || uploading}>{saving ? "저장 중…" : "저장"}</button>
          <button className="btn btn--sm btn--ghost" onClick={onCancel}>취소</button>
        </div>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function GalleryBoard() {
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [editing, setEditing] = useState<GalleryItem | null | "new">(null);
  const [catFilter, setCatFilter] = useState("전체");

  function load() {
    setLoading(true);
    sba.from("gallery").select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false })
      .then(({ data, error }: SbaRes) => {
        setLoading(false);
        if (error) { setErr(error.message); return; }
        setItems((data as GalleryItem[]) ?? []);
      });
  }
  useEffect(() => { load(); }, []); // eslint-disable-line

  async function toggleStatus(item: GalleryItem) {
    const next = item.status === "published" ? "draft" : "published";
    await sba.from("gallery").update({ status: next }).eq("id", item.id);
    setItems((prev) => prev.map((x) => x.id === item.id ? { ...x, status: next } : x));
  }

  async function del(item: GalleryItem) {
    if (!confirm(`"${item.title}"을 삭제하시겠습니까?`)) return;
    await sba.from("gallery").delete().eq("id", item.id);
    setItems((prev) => prev.filter((x) => x.id !== item.id));
  }

  const allCats = ["전체", ...CATEGORIES];
  const filtered = catFilter === "전체" ? items : items.filter((x) => x.category === catFilter);
  const published = items.filter((x) => x.status === "published").length;

  return (
    <>
      {editing !== null && (
        <GalleryEditor
          initial={editing === "new" ? null : editing}
          onSaved={() => { setEditing(null); load(); }}
          onCancel={() => setEditing(null)}
        />
      )}

      <div style={{ padding: "32px 36px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 800 }}>실적·갤러리 관리</h1>
            <p className="muted" style={{ fontSize: 13.5, marginTop: 4 }}>전기공사 완공 사진 및 실적을 등록합니다.</p>
          </div>
          <button className="btn btn--sm" onClick={() => setEditing("new")}>+ 실적 등록</button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 24 }}>
          {[["전체 실적", items.length], ["게시중", published], ["임시저장", items.length - published]].map(([l, v]) => (
            <div key={l} className="panel" style={{ padding: "14px 16px" }}>
              <div className="muted" style={{ fontSize: 11.5, marginBottom: 4 }}>{l}</div>
              <div style={{ fontSize: 22, fontWeight: 800 }}>{v}</div>
            </div>
          ))}
        </div>

        {err && <div role="alert" style={{ color: "#b3261e", fontSize: 13.5, marginBottom: 16 }}>{err}</div>}

        {/* Category filter chips */}
        <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
          {allCats.map((c) => (
            <button key={c} type="button" onClick={() => setCatFilter(c)}
              style={{ padding: "5px 14px", border: "1px solid var(--line-2)", borderRadius: 20, background: catFilter === c ? "var(--ink)" : "transparent", color: catFilter === c ? "var(--paper)" : "var(--ink)", fontSize: 12.5, cursor: "pointer", fontWeight: catFilter === c ? 700 : 400 }}>
              {c}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="cellsub" style={{ padding: 40, textAlign: "center" }}>불러오는 중…</div>
        ) : filtered.length === 0 ? (
          <div className="cellsub" style={{ padding: 40, textAlign: "center" }}>등록된 실적이 없습니다.</div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: 16 }}>
            {filtered.map((item) => (
              <div key={item.id} className="panel" style={{ padding: 0, overflow: "hidden" }}>
                <div style={{ aspectRatio: "16/9", background: "var(--fill, rgba(0,0,0,.04))", position: "relative", overflow: "hidden" }}>
                  {item.cover_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.cover_url} alt={item.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "var(--muted)", fontSize: 12 }}>이미지 없음</div>
                  )}
                  <span style={{ position: "absolute", top: 8, right: 8 }}
                    className={`badge ${item.status === "published" ? "ok" : "off"}`}>
                    {item.status === "published" ? "게시중" : "임시"}
                  </span>
                </div>
                <div style={{ padding: "12px 14px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, alignItems: "center" }}>
                    <span className="badge" style={{ fontSize: 11 }}>{item.category}</span>
                    {item.project_year && <span className="muted" style={{ fontSize: 11 }}>{item.project_year}년</span>}
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 14, lineHeight: 1.4, marginBottom: 2 }}>{item.title}</div>
                  {item.client_name && <div className="muted" style={{ fontSize: 12 }}>{item.client_name}</div>}
                </div>
                <div style={{ padding: "0 14px 12px", display: "flex", gap: 6 }}>
                  <button className="btn btn--sm btn--ghost" style={{ flex: 1, fontSize: 11.5 }} onClick={() => setEditing(item)}>수정</button>
                  <button className="btn btn--sm btn--ghost" style={{ flex: 1, fontSize: 11.5 }} onClick={() => toggleStatus(item)}>
                    {item.status === "published" ? "임시저장" : "게시"}
                  </button>
                  <button className="btn btn--sm btn--ghost" style={{ fontSize: 11.5, color: "#b3261e" }} onClick={() => del(item)}>삭제</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

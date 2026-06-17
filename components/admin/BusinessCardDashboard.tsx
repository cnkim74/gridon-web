"use client";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/AuthProvider";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sba = supabase as any;
type SbaRes = { data: unknown; error: { message: string } | null };
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const BUCKET = "receipts";

type Card = {
  id: string;
  photo_url: string | null;
  name: string | null;
  company: string | null;
  title: string | null;
  dept: string | null;
  mobile: string | null;
  phone: string | null;
  email: string | null;
  fax: string | null;
  address: string | null;
  category: string;
  notes: string | null;
  created_at: string;
};

type Draft = Omit<Card, "id" | "created_at">;

const CATS = ["거래처", "협력사", "관공서", "고객", "기타"];

function emptyDraft(): Draft {
  return { photo_url: null, name: "", company: "", title: "", dept: "", mobile: "", phone: "", email: "", fax: "", address: "", category: "거래처", notes: "" };
}

// 파일 → base64 (data URL에서 분리)
function fileToBase64(file: File): Promise<{ data: string; mediaType: string }> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => {
      const res = r.result as string;
      const comma = res.indexOf(",");
      const meta = res.slice(0, comma);
      const data = res.slice(comma + 1);
      const mt = meta.match(/data:(.*?);/)?.[1] || file.type || "image/jpeg";
      resolve({ data, mediaType: mt });
    };
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

// ── 편집 모달 ────────────────────────────────────────────────────────────────

function CardEditor({ item, onSave, onClose }: { item: Card | null; onSave: () => void; onClose: () => void }) {
  const { user } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [d, setD] = useState<Draft>(() => item ? { ...item } : emptyDraft());
  const [uploading, setUploading] = useState(false);
  const [ocrBusy, setOcrBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function set<K extends keyof Draft>(k: K, v: Draft[K]) { setD((p) => ({ ...p, [k]: v })); }

  async function runOcr(file: File) {
    setOcrBusy(true); setErr(null);
    try {
      const { data, mediaType } = await fileToBase64(file);
      const { data: result, error } = await supabase.functions.invoke("ocr-extract", {
        body: { image_base64: data, media_type: mediaType, kind: "card" },
      });
      if (error) throw error;
      const r = result as Record<string, string>;
      // 추출된 비어있지 않은 값만 채움
      setD((prev) => {
        const next = { ...prev };
        (["name", "company", "title", "dept", "mobile", "phone", "email", "fax", "address"] as (keyof Draft)[])
          .forEach((k) => { const v = r[k as string]; if (v && v.trim()) next[k] = v.trim() as never; });
        return next;
      });
    } catch (e) {
      setErr("자동 인식 실패: " + (e as Error).message + " (직접 입력하셔도 됩니다)");
    } finally {
      setOcrBusy(false);
    }
  }

  async function uploadPhoto(file: File) {
    setUploading(true); setErr(null);
    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `business-cards/${user?.id ?? "anon"}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: true });
    setUploading(false);
    if (error) { setErr(error.message); return; }
    set("photo_url", `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path}`);
    runOcr(file); // 업로드 후 자동 인식
  }

  async function save() {
    if (!d.name?.trim() && !d.company?.trim()) { setErr("이름 또는 회사명을 입력하세요."); return; }
    setSaving(true); setErr(null);
    const clean = (s: string | null) => (s && s.trim() ? s.trim() : null);
    const base = {
      photo_url: d.photo_url, name: clean(d.name), company: clean(d.company), title: clean(d.title),
      dept: clean(d.dept), mobile: clean(d.mobile), phone: clean(d.phone), email: clean(d.email),
      fax: clean(d.fax), address: clean(d.address), category: d.category, notes: clean(d.notes),
      updated_at: new Date().toISOString(),
    };
    const payload = item ? base : { ...base, created_by: user?.id ?? null };
    const req = item ? sba.from("business_cards").update(payload).eq("id", item.id) : sba.from("business_cards").insert(payload);
    const { error }: SbaRes = await req;
    setSaving(false);
    if (error) { setErr((error as { message: string }).message); return; }
    onSave();
  }

  const L = (t: string) => <label style={{ fontSize: 13, fontWeight: 600 }}>{t}</label>;

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 300, background: "rgba(0,0,0,.45)", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "40px 20px 60px", overflowY: "auto" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "var(--paper)", borderRadius: 8, padding: "28px 32px", width: "100%", maxWidth: 620, boxShadow: "0 24px 64px rgba(0,0,0,.3)" }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 22 }}>{item ? "명함 편집" : "새 명함 등록"}</h2>

        <div onClick={() => fileRef.current?.click()} style={{ border: "1.5px dashed var(--line-2)", borderRadius: 6, padding: "14px 18px", marginBottom: 18, cursor: "pointer", display: "flex", alignItems: "center", gap: 14, background: "var(--faint)" }}>
          {d.photo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={d.photo_url} alt="명함" style={{ width: 96, height: 60, objectFit: "cover", borderRadius: 4, border: "1px solid var(--line)", flexShrink: 0 }} />
          ) : (
            <div style={{ width: 96, height: 60, borderRadius: 4, background: "var(--line-2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" style={{ opacity: .4 }}><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" fill="currentColor" stroke="none" /><path d="M21 15l-5-5L5 21" /></svg>
            </div>
          )}
          <div>
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 3 }}>
              {uploading ? "업로드 중…" : ocrBusy ? "🤖 명함 자동 인식 중…" : d.photo_url ? "명함 사진 변경" : "명함 사진 촬영·첨부"}
            </div>
            <div style={{ fontSize: 12, color: "var(--muted)" }}>사진을 올리면 이름·회사·연락처가 자동 입력됩니다 · JPG · PNG</div>
          </div>
        </div>
        <input ref={fileRef} type="file" accept="image/*"
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          capture="environment" style={{ display: "none" }}
          onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadPhoto(f); }} />

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
          <div className="field">{L("이름")}<input className="input" value={d.name ?? ""} onChange={(e) => set("name", e.target.value)} /></div>
          <div className="field">{L("분류")}<select className="input" value={d.category} onChange={(e) => set("category", e.target.value)}>{CATS.map((c) => <option key={c} value={c}>{c}</option>)}</select></div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 12, marginBottom: 12 }}>
          <div className="field">{L("회사명")}<input className="input" value={d.company ?? ""} onChange={(e) => set("company", e.target.value)} /></div>
          <div className="field">{L("직책")}<input className="input" placeholder="예: 대리, 팀장" value={d.title ?? ""} onChange={(e) => set("title", e.target.value)} /></div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
          <div className="field">{L("부서")}<input className="input" value={d.dept ?? ""} onChange={(e) => set("dept", e.target.value)} /></div>
          <div className="field">{L("휴대폰")}<input className="input" inputMode="tel" value={d.mobile ?? ""} onChange={(e) => set("mobile", e.target.value)} /></div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
          <div className="field">{L("전화")}<input className="input" inputMode="tel" value={d.phone ?? ""} onChange={(e) => set("phone", e.target.value)} /></div>
          <div className="field">{L("팩스")}<input className="input" inputMode="tel" value={d.fax ?? ""} onChange={(e) => set("fax", e.target.value)} /></div>
        </div>
        <div className="field" style={{ marginBottom: 12 }}>{L("이메일")}<input className="input" inputMode="email" value={d.email ?? ""} onChange={(e) => set("email", e.target.value)} /></div>
        <div className="field" style={{ marginBottom: 12 }}>{L("주소")}<input className="input" value={d.address ?? ""} onChange={(e) => set("address", e.target.value)} /></div>
        <div className="field" style={{ marginBottom: 20 }}>{L("비고")}<textarea className="input" rows={2} value={d.notes ?? ""} onChange={(e) => set("notes", e.target.value)} style={{ resize: "vertical" }} /></div>

        {err && <p style={{ color: "#b3261e", fontSize: 13, marginBottom: 12 }}>{err}</p>}
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button className="btn btn--ghost btn--sm" type="button" onClick={onClose}>취소</button>
          <button className="btn btn--sm" type="button" onClick={save} disabled={saving || uploading}>{saving ? "저장 중…" : item ? "저장" : "등록"}</button>
        </div>
      </div>
    </div>
  );
}

// ── 메인 ──────────────────────────────────────────────────────────────────────

export default function BusinessCardDashboard() {
  const [items, setItems] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("전체");
  const [editItem, setEditItem] = useState<Card | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [rev, setRev] = useState(0);

  useEffect(() => {
    setLoading(true);
    sba.from("business_cards").select("*").order("created_at", { ascending: false })
      .then(({ data }: SbaRes) => { setLoading(false); setItems((data as Card[]) ?? []); });
  }, [rev]);

  const filtered = items.filter((e) => {
    if (catFilter !== "전체" && e.category !== catFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return [e.name, e.company, e.title, e.dept, e.mobile, e.phone, e.email]
        .some((v) => (v ?? "").toLowerCase().includes(q));
    }
    return true;
  });

  async function del(id: string) {
    if (!confirm("이 명함을 삭제하시겠습니까?")) return;
    await sba.from("business_cards").delete().eq("id", id);
    setItems((prev) => prev.filter((e) => e.id !== id));
  }

  const chipStyle = (active: boolean): React.CSSProperties => ({
    padding: "4px 11px", border: "1px solid var(--line-2)", borderRadius: 20, fontSize: 12, cursor: "pointer",
    background: active ? "var(--ink)" : "transparent", color: active ? "var(--paper)" : "inherit", fontWeight: active ? 700 : 400,
  });

  return (
    <>
      <div className="apage-head">
        <div><h1>명함 관리</h1><p>명함 사진 업로드로 거래처·협력사 등 사업 관계자 정보 관리</p></div>
        <button className="btn btn--sm" type="button" onClick={() => { setEditItem(null); setShowEditor(true); }}>＋ 새 명함 등록</button>
      </div>

      <div className="kpis">
        <div className="kpi"><div className="kl">총 명함</div><div className="kv">{items.length}건</div></div>
        {CATS.slice(0, 3).map((c) => (
          <div className="kpi" key={c}><div className="kl">{c}</div><div className="kv">{items.filter((e) => e.category === c).length}건</div></div>
        ))}
      </div>

      <div className="panel">
        <div className="panel-body">
          <div className="atable-tools">
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
              {["전체", ...CATS.filter((c) => items.some((e) => e.category === c))].map((c) => (
                <button key={c} type="button" style={chipStyle(catFilter === c)} onClick={() => setCatFilter(c)}>{c}</button>
              ))}
            </div>
            <div className="search-mini">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.2-3.2" /></svg>
              <input placeholder="이름·회사·연락처 검색" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table className="dtable" style={{ minWidth: 880 }}>
            <thead>
              <tr>
                <th style={{ width: 76, textAlign: "center" }}>명함</th>
                <th style={{ width: 120 }}>이름 · 직책</th>
                <th>회사 · 부서</th>
                <th style={{ width: 130 }}>연락처</th>
                <th style={{ width: 170 }}>이메일</th>
                <th style={{ width: 80 }}>분류</th>
                <th style={{ width: 80 }} />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{ textAlign: "center", padding: "40px 0", color: "var(--muted)" }}>불러오는 중…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} style={{ textAlign: "center", padding: "48px 0", color: "var(--muted)" }}>
                  {items.length === 0 ? (
                    <div><div style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>등록된 명함이 없습니다</div>
                      <button className="btn btn--ghost btn--sm" type="button" onClick={() => { setEditItem(null); setShowEditor(true); }}>＋ 새 명함 등록</button></div>
                  ) : "검색 결과가 없습니다."}
                </td></tr>
              ) : filtered.map((e) => (
                <tr key={e.id}>
                  <td style={{ textAlign: "center" }}>
                    {e.photo_url ? (
                      <a href={e.photo_url} target="_blank" rel="noreferrer">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={e.photo_url} alt={e.name ?? "명함"} style={{ width: 60, height: 38, objectFit: "cover", borderRadius: 4, border: "1px solid var(--line)", cursor: "pointer" }} />
                      </a>
                    ) : (
                      <div style={{ width: 60, height: 38, borderRadius: 4, border: "1px dashed var(--line-2)", display: "inline-flex", alignItems: "center", justifyContent: "center", opacity: .35 }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" fill="currentColor" stroke="none" /><path d="M21 15l-5-5L5 21" /></svg>
                      </div>
                    )}
                  </td>
                  <td><div style={{ fontSize: 13, fontWeight: 600 }}>{e.name ?? "—"}</div>{e.title && <div style={{ fontSize: 11, color: "var(--muted)" }}>{e.title}</div>}</td>
                  <td><div style={{ fontSize: 13 }}>{e.company ?? "—"}</div>{e.dept && <div style={{ fontSize: 11, color: "var(--muted)" }}>{e.dept}</div>}</td>
                  <td style={{ fontSize: 12, fontFamily: "var(--font-mono)" }}>{e.mobile || e.phone || "—"}</td>
                  <td style={{ fontSize: 12 }}>{e.email ?? "—"}</td>
                  <td style={{ fontSize: 12 }}>{e.category}</td>
                  <td>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button type="button" onClick={() => { setEditItem(e); setShowEditor(true); }} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, color: "var(--muted)", padding: 0 }}>편집</button>
                      <button type="button" onClick={() => del(e.id)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, color: "#b3261e", padding: 0 }}>삭제</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length > 0 && (
          <div style={{ padding: "10px 20px", borderTop: "1px solid var(--line-2)", fontSize: 13, color: "var(--muted)" }}>{filtered.length}건 표시 / 전체 {items.length}건</div>
        )}
      </div>

      {showEditor && <CardEditor item={editItem} onSave={() => { setShowEditor(false); setRev((r) => r + 1); }} onClose={() => setShowEditor(false)} />}
    </>
  );
}

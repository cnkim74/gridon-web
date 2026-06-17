"use client";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/AuthProvider";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sba = supabase as any;
type SbaRes = { data: unknown; error: { message: string } | null };
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const BUCKET = "receipts";

type License = {
  id: string;
  photo_url: string | null;
  company_name: string;
  biz_no: string | null;
  ceo: string | null;
  corp_no: string | null;
  biz_type: string | null;
  biz_item: string | null;
  address: string | null;
  open_date: string | null;
  notes: string | null;
  created_at: string;
};

type Draft = Omit<License, "id" | "created_at">;

function emptyDraft(): Draft {
  return { photo_url: null, company_name: "", biz_no: "", ceo: "", corp_no: "", biz_type: "", biz_item: "", address: "", open_date: "", notes: "" };
}

// ── 편집 모달 ────────────────────────────────────────────────────────────────

function LicenseEditor({ item, onSave, onClose }: { item: License | null; onSave: () => void; onClose: () => void }) {
  const { user } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [d, setD] = useState<Draft>(() => item ? { ...item, open_date: item.open_date ?? "" } : emptyDraft());
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function set<K extends keyof Draft>(k: K, v: Draft[K]) { setD((p) => ({ ...p, [k]: v })); }

  async function uploadPhoto(file: File) {
    setUploading(true); setErr(null);
    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `business-license/${user?.id ?? "anon"}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: true });
    setUploading(false);
    if (error) { setErr(error.message); return; }
    set("photo_url", `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path}`);
  }

  async function save() {
    if (!d.company_name?.trim()) { setErr("상호(법인명)를 입력하세요."); return; }
    setSaving(true); setErr(null);
    const clean = (s: string | null) => (s && s.trim() ? s.trim() : null);
    const base = {
      photo_url: d.photo_url, company_name: d.company_name.trim(), biz_no: clean(d.biz_no), ceo: clean(d.ceo),
      corp_no: clean(d.corp_no), biz_type: clean(d.biz_type), biz_item: clean(d.biz_item), address: clean(d.address),
      open_date: d.open_date || null, notes: clean(d.notes), updated_at: new Date().toISOString(),
    };
    const payload = item ? base : { ...base, created_by: user?.id ?? null };
    const req = item ? sba.from("business_licenses").update(payload).eq("id", item.id) : sba.from("business_licenses").insert(payload);
    const { error }: SbaRes = await req;
    setSaving(false);
    if (error) { setErr((error as { message: string }).message); return; }
    onSave();
  }

  const L = (t: string) => <label style={{ fontSize: 13, fontWeight: 600 }}>{t}</label>;

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 300, background: "rgba(0,0,0,.45)", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "40px 20px 60px", overflowY: "auto" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "var(--paper)", borderRadius: 8, padding: "28px 32px", width: "100%", maxWidth: 620, boxShadow: "0 24px 64px rgba(0,0,0,.3)" }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 22 }}>{item ? "사업자등록 편집" : "새 사업자등록"}</h2>

        <div onClick={() => fileRef.current?.click()} style={{ border: "1.5px dashed var(--line-2)", borderRadius: 6, padding: "14px 18px", marginBottom: 18, cursor: "pointer", display: "flex", alignItems: "center", gap: 14, background: "var(--faint)" }}>
          {d.photo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={d.photo_url} alt="사업자등록증" style={{ width: 64, height: 84, objectFit: "cover", borderRadius: 4, border: "1px solid var(--line)", flexShrink: 0 }} />
          ) : (
            <div style={{ width: 64, height: 84, borderRadius: 4, background: "var(--line-2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" style={{ opacity: .4 }}><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" fill="currentColor" stroke="none" /><path d="M21 15l-5-5L5 21" /></svg>
            </div>
          )}
          <div>
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 3 }}>{uploading ? "업로드 중…" : d.photo_url ? "등록증 사진 변경" : "사업자등록증 촬영·첨부"}</div>
            <div style={{ fontSize: 12, color: "var(--muted)" }}>카메라 또는 파일 선택 · JPG · PNG</div>
          </div>
        </div>
        <input ref={fileRef} type="file" accept="image/*"
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          capture="environment" style={{ display: "none" }}
          onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadPhoto(f); }} />

        <div className="field" style={{ marginBottom: 12 }}>{L("상호 (법인명) *")}<input className="input" value={d.company_name} onChange={(e) => set("company_name", e.target.value)} /></div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
          <div className="field">{L("사업자등록번호")}<input className="input" placeholder="000-00-00000" value={d.biz_no ?? ""} onChange={(e) => set("biz_no", e.target.value)} /></div>
          <div className="field">{L("대표자")}<input className="input" value={d.ceo ?? ""} onChange={(e) => set("ceo", e.target.value)} /></div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
          <div className="field">{L("법인등록번호")}<input className="input" value={d.corp_no ?? ""} onChange={(e) => set("corp_no", e.target.value)} /></div>
          <div className="field">{L("개업연월일")}<input className="input" type="date" value={d.open_date ?? ""} onChange={(e) => set("open_date", e.target.value)} /></div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
          <div className="field">{L("업태")}<input className="input" placeholder="예: 건설업" value={d.biz_type ?? ""} onChange={(e) => set("biz_type", e.target.value)} /></div>
          <div className="field">{L("종목")}<input className="input" placeholder="예: 전기공사" value={d.biz_item ?? ""} onChange={(e) => set("biz_item", e.target.value)} /></div>
        </div>
        <div className="field" style={{ marginBottom: 12 }}>{L("사업장 주소")}<input className="input" value={d.address ?? ""} onChange={(e) => set("address", e.target.value)} /></div>
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

export default function BusinessLicenseDashboard() {
  const [items, setItems] = useState<License[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editItem, setEditItem] = useState<License | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [rev, setRev] = useState(0);

  useEffect(() => {
    setLoading(true);
    sba.from("business_licenses").select("*").order("created_at", { ascending: false })
      .then(({ data }: SbaRes) => { setLoading(false); setItems((data as License[]) ?? []); });
  }, [rev]);

  const filtered = items.filter((e) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return [e.company_name, e.biz_no, e.ceo, e.biz_type, e.biz_item].some((v) => (v ?? "").toLowerCase().includes(q));
  });

  async function del(id: string) {
    if (!confirm("이 사업자등록을 삭제하시겠습니까?")) return;
    await sba.from("business_licenses").delete().eq("id", id);
    setItems((prev) => prev.filter((e) => e.id !== id));
  }

  return (
    <>
      <div className="apage-head">
        <div><h1>사업자 등록</h1><p>사업자등록증 사진·정보 관리 (상호·등록번호·대표자·업태·종목)</p></div>
        <button className="btn btn--sm" type="button" onClick={() => { setEditItem(null); setShowEditor(true); }}>＋ 새 사업자등록</button>
      </div>

      <div className="kpis">
        <div className="kpi"><div className="kl">등록 사업자</div><div className="kv">{items.length}건</div></div>
      </div>

      <div className="panel">
        <div className="panel-body">
          <div className="atable-tools">
            <div />
            <div className="search-mini">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.2-3.2" /></svg>
              <input placeholder="상호·등록번호·대표자 검색" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table className="dtable" style={{ minWidth: 880 }}>
            <thead>
              <tr>
                <th style={{ width: 64, textAlign: "center" }}>등록증</th>
                <th>상호 (법인명)</th>
                <th style={{ width: 140 }}>사업자등록번호</th>
                <th style={{ width: 90 }}>대표자</th>
                <th style={{ width: 180 }}>업태 · 종목</th>
                <th style={{ width: 80 }} />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ textAlign: "center", padding: "40px 0", color: "var(--muted)" }}>불러오는 중…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: "center", padding: "48px 0", color: "var(--muted)" }}>
                  {items.length === 0 ? (
                    <div><div style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>등록된 사업자가 없습니다</div>
                      <button className="btn btn--ghost btn--sm" type="button" onClick={() => { setEditItem(null); setShowEditor(true); }}>＋ 새 사업자등록</button></div>
                  ) : "검색 결과가 없습니다."}
                </td></tr>
              ) : filtered.map((e) => (
                <tr key={e.id}>
                  <td style={{ textAlign: "center" }}>
                    {e.photo_url ? (
                      <a href={e.photo_url} target="_blank" rel="noreferrer">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={e.photo_url} alt={e.company_name} style={{ width: 38, height: 50, objectFit: "cover", borderRadius: 4, border: "1px solid var(--line)", cursor: "pointer" }} />
                      </a>
                    ) : (
                      <div style={{ width: 38, height: 50, borderRadius: 4, border: "1px dashed var(--line-2)", display: "inline-flex", alignItems: "center", justifyContent: "center", opacity: .35 }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" fill="currentColor" stroke="none" /><path d="M21 15l-5-5L5 21" /></svg>
                      </div>
                    )}
                  </td>
                  <td><div style={{ fontSize: 13, fontWeight: 600 }}>{e.company_name}</div>{e.address && <div style={{ fontSize: 11, color: "var(--muted)" }}>{e.address}</div>}</td>
                  <td style={{ fontSize: 12, fontFamily: "var(--font-mono)" }}>{e.biz_no ?? "—"}</td>
                  <td style={{ fontSize: 13 }}>{e.ceo ?? "—"}</td>
                  <td style={{ fontSize: 12 }}>{[e.biz_type, e.biz_item].filter(Boolean).join(" · ") || "—"}</td>
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

      {showEditor && <LicenseEditor item={editItem} onSave={() => { setShowEditor(false); setRev((r) => r + 1); }} onClose={() => setShowEditor(false)} />}
    </>
  );
}

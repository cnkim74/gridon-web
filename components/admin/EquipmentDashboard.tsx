"use client";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/AuthProvider";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sba = supabase as any;
type SbaRes = { data: unknown; error: { message: string } | null };
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const BUCKET = "receipts";

// ── Types ──────────────────────────────────────────────────────────────────

type Equipment = {
  id: string;
  asset_no: string | null;
  name: string;
  category: string;
  manufacturer: string | null;
  model: string | null;
  serial_no: string | null;
  spec: string | null;
  quantity: number;
  unit: string | null;
  status: string;
  purchase_date: string | null;
  purchase_price: number | null;
  supplier: string | null;
  warranty_until: string | null;
  location: string | null;
  assignee: string | null;
  branch: string | null;
  last_check: string | null;
  next_check: string | null;
  photo_url: string | null;
  notes: string | null;
  created_at: string;
};

type Draft = {
  asset_no: string;
  name: string;
  category: string;
  manufacturer: string;
  model: string;
  serial_no: string;
  spec: string;
  quantity: string;
  unit: string;
  status: string;
  purchase_date: string;
  purchase_price: string;
  supplier: string;
  warranty_until: string;
  location: string;
  assignee: string;
  branch: string;
  last_check: string;
  next_check: string;
  photo_url: string | null;
  notes: string;
};

// ── Constants ──────────────────────────────────────────────────────────────

const CATS = ["측정장비", "전동공구", "수공구", "안전장비", "차량", "IT장비", "사무기기", "통신장비", "기타"];
const STATUSES = ["사용중", "보관중", "수리중", "대여중", "폐기"];
const UNITS = ["대", "개", "세트", "식", "쌍", "벌"];

// ── Helpers ────────────────────────────────────────────────────────────────

function fmt(n: number) { return n.toLocaleString("ko-KR") + "원"; }
function todayStr() { return new Date().toISOString().slice(0, 10); }
function statusClass(s: string) {
  if (s === "사용중") return "badge ok";
  if (s === "수리중") return "badge warn dotwarn";
  if (s === "대여중") return "badge warn";
  return "badge off";
}

// ── Status badge (click to cycle) ────────────────────────────────────────────

function StatusBadge({ status, onClick }: { status: string; onClick?: () => void }) {
  return (
    <span
      className={statusClass(status)}
      onClick={onClick}
      style={{ cursor: onClick ? "pointer" : undefined, userSelect: "none", whiteSpace: "nowrap", opacity: status === "폐기" ? .55 : 1 }}
      title={onClick ? "클릭하여 상태 변경" : undefined}
    >
      {status}
    </span>
  );
}

// ── Equipment editor modal ───────────────────────────────────────────────────

function EquipmentEditor({ item, onSave, onClose }: { item: Equipment | null; onSave: () => void; onClose: () => void }) {
  const { user } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [d, setD] = useState<Draft>(() => ({
    asset_no: item?.asset_no ?? "",
    name: item?.name ?? "",
    category: item?.category ?? "기타",
    manufacturer: item?.manufacturer ?? "",
    model: item?.model ?? "",
    serial_no: item?.serial_no ?? "",
    spec: item?.spec ?? "",
    quantity: String(item?.quantity ?? 1),
    unit: item?.unit ?? "대",
    status: item?.status ?? "사용중",
    purchase_date: item?.purchase_date ?? "",
    purchase_price: item?.purchase_price ? item.purchase_price.toLocaleString("ko-KR") : "",
    supplier: item?.supplier ?? "",
    warranty_until: item?.warranty_until ?? "",
    location: item?.location ?? "",
    assignee: item?.assignee ?? "",
    branch: item?.branch ?? "",
    last_check: item?.last_check ?? "",
    next_check: item?.next_check ?? "",
    photo_url: item?.photo_url ?? null,
    notes: item?.notes ?? "",
  }));
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function set(k: keyof Draft, v: string | null) { setD((p) => ({ ...p, [k]: v })); }

  async function uploadPhoto(file: File) {
    setUploading(true); setErr(null);
    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `equipment/${user?.id ?? "anon"}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: true });
    setUploading(false);
    if (error) { setErr(error.message); return; }
    set("photo_url", `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path}`);
  }

  async function save() {
    if (!d.name.trim()) { setErr("장비명을 입력하세요."); return; }
    const qty = parseInt(d.quantity.replace(/[^0-9]/g, ""), 10);
    const price = d.purchase_price ? parseInt(d.purchase_price.replace(/[^0-9]/g, ""), 10) : null;
    setSaving(true); setErr(null);
    const base = {
      asset_no: d.asset_no.trim() || null,
      name: d.name.trim(),
      category: d.category,
      manufacturer: d.manufacturer.trim() || null,
      model: d.model.trim() || null,
      serial_no: d.serial_no.trim() || null,
      spec: d.spec.trim() || null,
      quantity: isNaN(qty) || qty < 1 ? 1 : qty,
      unit: d.unit || "대",
      status: d.status,
      purchase_date: d.purchase_date || null,
      purchase_price: price,
      supplier: d.supplier.trim() || null,
      warranty_until: d.warranty_until || null,
      location: d.location.trim() || null,
      assignee: d.assignee.trim() || null,
      branch: d.branch.trim() || null,
      last_check: d.last_check || null,
      next_check: d.next_check || null,
      photo_url: d.photo_url,
      notes: d.notes.trim() || null,
      updated_at: new Date().toISOString(),
    };
    const payload = item ? base : { ...base, created_by: user?.id ?? null };
    const req = item
      ? sba.from("equipment").update(payload).eq("id", item.id)
      : sba.from("equipment").insert(payload);
    const { error }: SbaRes = await req;
    setSaving(false);
    if (error) { setErr((error as { message: string }).message); return; }
    onSave();
  }

  const fieldLabel = (t: string) => <label style={{ fontSize: 13, fontWeight: 600 }}>{t}</label>;

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 300, background: "rgba(0,0,0,.45)", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "40px 20px 60px", overflowY: "auto" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "var(--paper)", borderRadius: 8, padding: "28px 32px", width: "100%", maxWidth: 680, boxShadow: "0 24px 64px rgba(0,0,0,.3)" }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 22 }}>{item ? "장비 편집" : "새 장비 등록"}</h2>

        {/* 사진 */}
        <div onClick={() => fileRef.current?.click()} style={{ border: "1.5px dashed var(--line-2)", borderRadius: 6, padding: "14px 18px", marginBottom: 18, cursor: "pointer", display: "flex", alignItems: "center", gap: 14, background: "var(--faint)" }}>
          {d.photo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={d.photo_url} alt="장비" style={{ width: 64, height: 64, objectFit: "cover", borderRadius: 4, border: "1px solid var(--line)", flexShrink: 0 }} />
          ) : (
            <div style={{ width: 64, height: 64, borderRadius: 4, background: "var(--line-2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" style={{ opacity: .4 }}>
                <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" fill="currentColor" stroke="none" /><path d="M21 15l-5-5L5 21" />
              </svg>
            </div>
          )}
          <div>
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 3 }}>{uploading ? "업로드 중…" : d.photo_url ? "사진 변경" : "장비 사진 첨부"}</div>
            <div style={{ fontSize: 12, color: "var(--muted)" }}>카메라 촬영 또는 파일 선택 · JPG · PNG</div>
          </div>
        </div>
        <input ref={fileRef} type="file" accept="image/*"
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          capture="environment"
          style={{ display: "none" }}
          onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadPhoto(f); }}
        />

        {/* 장비명 / 관리번호 */}
        <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 12, marginBottom: 12 }}>
          <div className="field">{fieldLabel("장비명 *")}
            <input className="input" placeholder="예: 절연저항계, 임팩트 드릴" value={d.name} onChange={(e) => set("name", e.target.value)} />
          </div>
          <div className="field">{fieldLabel("관리번호")}
            <input className="input" placeholder="예: EQ-2026-001" value={d.asset_no} onChange={(e) => set("asset_no", e.target.value)} />
          </div>
        </div>

        {/* 분류 / 상태 */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
          <div className="field">{fieldLabel("분류")}
            <select className="input" value={d.category} onChange={(e) => set("category", e.target.value)}>
              {CATS.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="field">{fieldLabel("상태")}
            <select className="input" value={d.status} onChange={(e) => set("status", e.target.value)}>
              {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        {/* 제조사 / 모델 */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
          <div className="field">{fieldLabel("제조사")}
            <input className="input" placeholder="예: HIOKI, 보쉬" value={d.manufacturer} onChange={(e) => set("manufacturer", e.target.value)} />
          </div>
          <div className="field">{fieldLabel("모델명")}
            <input className="input" placeholder="예: IR4056-20" value={d.model} onChange={(e) => set("model", e.target.value)} />
          </div>
        </div>

        {/* 시리얼 / 규격 */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
          <div className="field">{fieldLabel("시리얼번호")}
            <input className="input" placeholder="제품 고유번호" value={d.serial_no} onChange={(e) => set("serial_no", e.target.value)} />
          </div>
          <div className="field">{fieldLabel("규격 · 사양")}
            <input className="input" placeholder="예: 18V, 1000V, 5kg" value={d.spec} onChange={(e) => set("spec", e.target.value)} />
          </div>
        </div>

        {/* 수량 / 단위 */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
          <div className="field">{fieldLabel("수량")}
            <input className="input" type="text" inputMode="numeric" placeholder="1" value={d.quantity} onChange={(e) => set("quantity", e.target.value)} />
          </div>
          <div className="field">{fieldLabel("단위")}
            <select className="input" value={d.unit} onChange={(e) => set("unit", e.target.value)}>
              {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
        </div>

        {/* 구입일 / 구입가격 */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
          <div className="field">{fieldLabel("구입일")}
            <input className="input" type="date" value={d.purchase_date} onChange={(e) => set("purchase_date", e.target.value)} />
          </div>
          <div className="field">{fieldLabel("구입가격 (원)")}
            <input className="input" type="text" inputMode="numeric" placeholder="150,000" value={d.purchase_price}
              onChange={(e) => set("purchase_price", e.target.value)}
              onBlur={(e) => { const n = parseInt(e.target.value.replace(/[^0-9]/g, ""), 10); if (!isNaN(n)) set("purchase_price", n.toLocaleString("ko-KR")); }}
            />
          </div>
        </div>

        {/* 구입처 / 보증만료일 */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
          <div className="field">{fieldLabel("구입처")}
            <input className="input" placeholder="예: ○○계측기상사" value={d.supplier} onChange={(e) => set("supplier", e.target.value)} />
          </div>
          <div className="field">{fieldLabel("보증 만료일")}
            <input className="input" type="date" value={d.warranty_until} onChange={(e) => set("warranty_until", e.target.value)} />
          </div>
        </div>

        {/* 보관위치 / 담당자 */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
          <div className="field">{fieldLabel("보관 위치")}
            <input className="input" placeholder="예: 본사 창고 A-3" value={d.location} onChange={(e) => set("location", e.target.value)} />
          </div>
          <div className="field">{fieldLabel("사용자 · 담당자")}
            <input className="input" placeholder="예: 홍길동" value={d.assignee} onChange={(e) => set("assignee", e.target.value)} />
          </div>
        </div>

        {/* 지사 / 최근점검 / 다음점검 */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
          <div className="field">{fieldLabel("지사")}
            <input className="input" placeholder="경남지사…" value={d.branch} onChange={(e) => set("branch", e.target.value)} />
          </div>
          <div className="field">{fieldLabel("최근 점검일")}
            <input className="input" type="date" value={d.last_check} onChange={(e) => set("last_check", e.target.value)} />
          </div>
          <div className="field">{fieldLabel("다음 점검일")}
            <input className="input" type="date" value={d.next_check} onChange={(e) => set("next_check", e.target.value)} />
          </div>
        </div>

        <div className="field" style={{ marginBottom: 20 }}>
          {fieldLabel("비고")}
          <textarea className="input" rows={2} value={d.notes} onChange={(e) => set("notes", e.target.value)} style={{ resize: "vertical" }} />
        </div>

        {err && <p style={{ color: "#b3261e", fontSize: 13, marginBottom: 12 }}>{err}</p>}
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button className="btn btn--ghost btn--sm" type="button" onClick={onClose}>취소</button>
          <button className="btn btn--sm" type="button" onClick={save} disabled={saving || uploading}>
            {saving ? "저장 중…" : item ? "저장" : "등록"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main dashboard ─────────────────────────────────────────────────────────

export default function EquipmentDashboard() {
  const [items, setItems] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("전체");
  const [statusFilter, setStatusFilter] = useState("전체");
  const [editItem, setEditItem] = useState<Equipment | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [rev, setRev] = useState(0);

  useEffect(() => {
    setLoading(true);
    sba.from("equipment").select("*").order("created_at", { ascending: false })
      .then(({ data }: SbaRes) => {
        setLoading(false);
        setItems((data as Equipment[]) ?? []);
      });
  }, [rev]);

  // KPIs
  const totalCount = items.length;
  const totalQty = items.reduce((s, e) => s + (e.quantity || 1), 0);
  const inUse = items.filter((e) => e.status === "사용중").length;
  const repairing = items.filter((e) => e.status === "수리중").length;
  const totalValue = items.reduce((s, e) => s + (e.purchase_price ?? 0) * (e.quantity || 1), 0);

  // Filter
  const filtered = items.filter((e) => {
    if (catFilter !== "전체" && e.category !== catFilter) return false;
    if (statusFilter !== "전체" && e.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return [e.name, e.asset_no, e.manufacturer, e.model, e.serial_no, e.assignee, e.location, e.branch]
        .some((v) => (v ?? "").toLowerCase().includes(q));
    }
    return true;
  });

  async function cycleStatus(e: Equipment) {
    const next = STATUSES[(STATUSES.indexOf(e.status) + 1) % STATUSES.length];
    await sba.from("equipment").update({ status: next, updated_at: new Date().toISOString() }).eq("id", e.id);
    setItems((prev) => prev.map((x) => x.id === e.id ? { ...x, status: next } : x));
  }

  async function del(id: string) {
    if (!confirm("이 장비를 삭제하시겠습니까?")) return;
    await sba.from("equipment").delete().eq("id", id);
    setItems((prev) => prev.filter((e) => e.id !== id));
  }

  const chipStyle = (active: boolean): React.CSSProperties => ({
    padding: "4px 11px", border: "1px solid var(--line-2)", borderRadius: 20, fontSize: 12, cursor: "pointer",
    background: active ? "var(--ink)" : "transparent", color: active ? "var(--paper)" : "inherit", fontWeight: active ? 700 : 400,
  });

  const today = todayStr();

  return (
    <>
      <div className="apage-head">
        <div><h1>장비 관리현황</h1><p>장비 등록·세부사항 관리 · 상태·점검 추적 · 자산 현황</p></div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn--sm" type="button" onClick={() => { setEditItem(null); setShowEditor(true); }}>＋ 새 장비 등록</button>
        </div>
      </div>

      {/* KPIs */}
      <div className="kpis">
        <div className="kpi">
          <div className="kl">총 장비</div>
          <div className="kv">{totalCount}종 · {totalQty.toLocaleString("ko-KR")}점</div>
        </div>
        <div className="kpi">
          <div className="kl">사용중</div>
          <div className="kv" style={{ color: "#1f7a3d" }}>{inUse}종</div>
        </div>
        <div className="kpi">
          <div className="kl">수리중</div>
          <div className="kv" style={{ color: "#9a6a1e" }}>{repairing}종</div>
        </div>
        <div className="kpi">
          <div className="kl">총 자산가치</div>
          <div className="kv" style={{ fontSize: 18 }}>{totalValue > 0 ? fmt(totalValue) : "—"}</div>
        </div>
      </div>

      {/* Table panel */}
      <div className="panel">
        <div className="panel-body">
          <div className="atable-tools">
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
              {/* 분류 필터 */}
              {["전체", ...CATS.filter((c) => items.some((e) => e.category === c))].map((c) => (
                <button key={c} type="button" style={chipStyle(catFilter === c)} onClick={() => setCatFilter(c)}>{c}</button>
              ))}
              <span style={{ width: 1, height: 22, background: "var(--line-2)", margin: "0 4px", alignSelf: "center" }} />
              {/* 상태 필터 */}
              {["전체", ...STATUSES.filter((s) => items.some((e) => e.status === s))].map((s) => (
                <button key={s} type="button" style={chipStyle(statusFilter === s)} onClick={() => setStatusFilter(s)}>{s}</button>
              ))}
            </div>
            <div className="search-mini">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.2-3.2" /></svg>
              <input placeholder="장비명·관리번호·담당자 검색" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table className="dtable" style={{ minWidth: 940 }}>
            <thead>
              <tr>
                <th style={{ width: 52, textAlign: "center" }}>사진</th>
                <th style={{ width: 110 }}>관리번호</th>
                <th>장비명 · 모델</th>
                <th style={{ width: 90 }}>분류</th>
                <th style={{ width: 64, textAlign: "center" }}>수량</th>
                <th style={{ width: 80, textAlign: "center" }}>상태</th>
                <th style={{ width: 110 }}>보관위치</th>
                <th style={{ width: 80 }}>담당자</th>
                <th style={{ width: 100 }}>다음점검</th>
                <th style={{ width: 80 }} />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={10} style={{ textAlign: "center", padding: "40px 0", color: "var(--muted)" }}>불러오는 중…</td></tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={10} style={{ textAlign: "center", padding: "48px 0", color: "var(--muted)" }}>
                    {totalCount === 0 ? (
                      <div>
                        <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>등록된 장비가 없습니다</div>
                        <button className="btn btn--ghost btn--sm" type="button" onClick={() => { setEditItem(null); setShowEditor(true); }}>＋ 새 장비 등록</button>
                      </div>
                    ) : "검색 결과가 없습니다."}
                  </td>
                </tr>
              ) : filtered.map((e) => {
                const overdue = e.next_check && e.next_check < today;
                return (
                  <tr key={e.id}>
                    <td style={{ textAlign: "center" }}>
                      {e.photo_url ? (
                        <a href={e.photo_url} target="_blank" rel="noreferrer">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={e.photo_url} alt={e.name} style={{ width: 34, height: 34, objectFit: "cover", borderRadius: 4, border: "1px solid var(--line)", cursor: "pointer" }} />
                        </a>
                      ) : (
                        <div style={{ width: 34, height: 34, borderRadius: 4, border: "1px dashed var(--line-2)", display: "inline-flex", alignItems: "center", justifyContent: "center", opacity: .35 }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" fill="currentColor" stroke="none" /><path d="M21 15l-5-5L5 21" /></svg>
                        </div>
                      )}
                    </td>
                    <td style={{ fontSize: 12, fontFamily: "var(--font-mono)", color: "var(--muted)", whiteSpace: "nowrap" }}>{e.asset_no ?? "—"}</td>
                    <td>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{e.name}</div>
                      {(e.manufacturer || e.model) && (
                        <div style={{ fontSize: 11, color: "var(--muted)" }}>{[e.manufacturer, e.model].filter(Boolean).join(" · ")}</div>
                      )}
                    </td>
                    <td style={{ fontSize: 12 }}>{e.category}</td>
                    <td style={{ textAlign: "center", fontSize: 13, fontFamily: "var(--font-mono)" }}>{e.quantity}{e.unit ?? ""}</td>
                    <td style={{ textAlign: "center" }}>
                      <StatusBadge status={e.status} onClick={() => cycleStatus(e)} />
                    </td>
                    <td style={{ fontSize: 12 }}>{e.location ?? "—"}</td>
                    <td style={{ fontSize: 12 }}>{e.assignee ?? "—"}</td>
                    <td style={{ fontSize: 12, fontFamily: "var(--font-mono)", whiteSpace: "nowrap", color: overdue ? "#b3261e" : "var(--muted)", fontWeight: overdue ? 700 : 400 }}>
                      {e.next_check ?? "—"}{overdue ? " ⚠" : ""}
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <button type="button" onClick={() => { setEditItem(e); setShowEditor(true); }} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, color: "var(--muted)", padding: 0 }}>편집</button>
                        <button type="button" onClick={() => del(e.id)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, color: "#b3261e", padding: 0 }}>삭제</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filtered.length > 0 && (
          <div style={{ padding: "10px 20px", borderTop: "1px solid var(--line-2)", fontSize: 13, color: "var(--muted)" }}>
            {filtered.length}종 표시 / 전체 {totalCount}종
          </div>
        )}
      </div>

      {showEditor && (
        <EquipmentEditor
          item={editItem}
          onSave={() => { setShowEditor(false); setRev((r) => r + 1); }}
          onClose={() => setShowEditor(false)}
        />
      )}
    </>
  );
}

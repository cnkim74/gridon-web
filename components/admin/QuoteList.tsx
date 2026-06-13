"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/AuthProvider";

// Tables added after type generation — untyped access
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sba = supabase as any;
type SbaRes = { data: unknown; error: { message: string } | null };

// ── Types ──────────────────────────────────────────────────────────────────
type QStatus = "draft" | "sent" | "accepted" | "rejected" | "expired";

type QItem = {
  id?: string;
  sort_order: number;
  description: string;
  quantity: number;
  unit: string;
  unit_price: number;
  vat_rate: number;
};

type Quote = {
  id: string;
  quote_no: string;
  client_name: string;
  client_company: string | null;
  client_tel: string | null;
  client_email: string | null;
  client_address: string | null;
  status: QStatus;
  valid_until: string | null;
  note: string | null;
  created_at: string;
  quote_items: QItem[];
};

// ── Constants ──────────────────────────────────────────────────────────────
const STATUS_LABEL: Record<QStatus, string> = {
  draft: "임시", sent: "발송", accepted: "수락", rejected: "반려", expired: "만료",
};
const STATUS_CLS: Record<QStatus, string> = {
  draft: "badge", sent: "badge ok", accepted: "badge ok", rejected: "badge off", expired: "badge",
};
const STATUS_COLOR: Record<QStatus, string> = {
  draft: "#888", sent: "#1a5fa8", accepted: "#1a7f4b", rejected: "#b3261e", expired: "#aaa",
};

function fmtKRW(n: number) { return n.toLocaleString() + "원"; }
function today() { return new Date().toISOString().slice(0, 10); }
function addDays(d: string, n: number) {
  const dt = new Date(d); dt.setDate(dt.getDate() + n); return dt.toISOString().slice(0, 10);
}

const PRINT_CSS = `
  @media print {
    .no-print { display: none !important; }
    body > * { display: none !important; }
    #quote-print { display: block !important; position: fixed; inset: 0; z-index: 9999; background: #fff; overflow: auto; }
  }
`;

// ── Quote Document (print) ─────────────────────────────────────────────────
function QuoteDoc({ q, onClose }: { q: Quote; onClose: () => void }) {
  const items = q.quote_items.slice().sort((a, b) => a.sort_order - b.sort_order);
  const subtotal = items.reduce((s, i) => s + Math.round(i.quantity * i.unit_price), 0);
  const vat      = items.reduce((s, i) => s + Math.round(i.quantity * i.unit_price * i.vat_rate), 0);
  const total    = subtotal + vat;

  const issuedDate = new Date(q.created_at);
  const fmtDate = (iso: string) => { const d = new Date(iso); return `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,"0")}.${String(d.getDate()).padStart(2,"0")}`; };

  return (
    <>
      <style>{PRINT_CSS}</style>
      <div id="quote-print" style={{
        position: "fixed", inset: 0, zIndex: 200, background: "rgba(0,0,0,.5)",
        display: "flex", alignItems: "flex-start", justifyContent: "center",
        padding: 20, overflowY: "auto",
      }}>
        <div style={{ background: "#fff", borderRadius: 4, boxShadow: "0 24px 64px rgba(0,0,0,.35)", overflow: "hidden", maxWidth: 780, width: "100%" }}>
          <div className="no-print" style={{ display: "flex", gap: 10, padding: "12px 16px", borderBottom: "1px solid #e0e0e0", justifyContent: "flex-end" }}>
            <button className="btn btn--sm" onClick={() => window.print()}>인쇄 / PDF 저장</button>
            <button className="btn btn--sm btn--ghost" onClick={onClose}>닫기</button>
          </div>

          {/* Document body */}
          <div style={{ padding: "48px 56px", fontFamily: "'Malgun Gothic','Apple SD Gothic Neo',sans-serif", color: "#111", fontSize: 13.5 }}>
            {/* Title row */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 32 }}>
              <div>
                <h1 style={{ fontSize: 28, fontWeight: 900, letterSpacing: 10, margin: 0, borderBottom: "3px double #222", paddingBottom: 10 }}>견&ensp;적&ensp;서</h1>
                <div style={{ marginTop: 10, fontSize: 12.5, color: "#555" }}>
                  번호: <strong>{q.quote_no}</strong>&ensp;·&ensp;
                  발급일: {fmtDate(q.created_at)}&ensp;·&ensp;
                  유효기간: {q.valid_until ? fmtDate(q.valid_until) : "—"}
                </div>
              </div>
              <div style={{ textAlign: "right", fontSize: 13, lineHeight: 1.8 }}>
                <div style={{ fontWeight: 700, fontSize: 15 }}>㈜ 그 리 드 온</div>
                <div style={{ color: "#666" }}>담당: 배 정 만 대표</div>
              </div>
            </div>

            {/* Client info */}
            <div style={{ border: "1px solid #d0cfc8", borderRadius: 4, padding: "14px 18px", marginBottom: 24, fontSize: 13 }}>
              <div style={{ fontWeight: 700, marginBottom: 6, fontSize: 13.5 }}>수신</div>
              <div style={{ fontSize: 15, fontWeight: 700 }}>{q.client_company || q.client_name}</div>
              {q.client_company && <div style={{ color: "#555" }}>담당: {q.client_name}</div>}
              {q.client_address && <div style={{ color: "#777", fontSize: 12 }}>{q.client_address}</div>}
              {q.client_tel && <div style={{ color: "#777", fontSize: 12 }}>TEL: {q.client_tel}</div>}
            </div>

            {/* Items table */}
            <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 20, fontSize: 12.5 }}>
              <thead>
                <tr style={{ background: "#111", color: "#fff" }}>
                  <th style={{ padding: "8px 10px", textAlign: "center", width: 36 }}>No</th>
                  <th style={{ padding: "8px 10px", textAlign: "left" }}>품목 · 내역</th>
                  <th style={{ padding: "8px 10px", textAlign: "right", width: 60 }}>수량</th>
                  <th style={{ padding: "8px 10px", textAlign: "center", width: 50 }}>단위</th>
                  <th style={{ padding: "8px 10px", textAlign: "right", width: 110 }}>단가</th>
                  <th style={{ padding: "8px 10px", textAlign: "right", width: 110 }}>공급가액</th>
                  <th style={{ padding: "8px 10px", textAlign: "right", width: 90 }}>부가세</th>
                  <th style={{ padding: "8px 10px", textAlign: "right", width: 110 }}>합계</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it, i) => {
                  const supply = Math.round(it.quantity * it.unit_price);
                  const v      = Math.round(supply * it.vat_rate);
                  return (
                    <tr key={i} style={{ borderBottom: "1px solid #e8e8e8" }}>
                      <td style={{ padding: "8px 10px", textAlign: "center", color: "#888" }}>{i + 1}</td>
                      <td style={{ padding: "8px 10px" }}>{it.description}</td>
                      <td style={{ padding: "8px 10px", textAlign: "right" }}>{it.quantity % 1 === 0 ? it.quantity.toFixed(0) : it.quantity}</td>
                      <td style={{ padding: "8px 10px", textAlign: "center", color: "#666" }}>{it.unit}</td>
                      <td style={{ padding: "8px 10px", textAlign: "right" }}>{it.unit_price.toLocaleString()}</td>
                      <td style={{ padding: "8px 10px", textAlign: "right" }}>{supply.toLocaleString()}</td>
                      <td style={{ padding: "8px 10px", textAlign: "right" }}>{v.toLocaleString()}</td>
                      <td style={{ padding: "8px 10px", textAlign: "right", fontWeight: 600 }}>{(supply + v).toLocaleString()}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Totals */}
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 24 }}>
              <table style={{ fontSize: 13 }}>
                <tbody>
                  <tr>
                    <td style={{ padding: "5px 16px 5px 0", color: "#666" }}>공급가액 합계</td>
                    <td style={{ padding: "5px 0", textAlign: "right", fontWeight: 600, minWidth: 120 }}>{subtotal.toLocaleString()}원</td>
                  </tr>
                  <tr>
                    <td style={{ padding: "5px 16px 5px 0", color: "#666" }}>부가세 합계</td>
                    <td style={{ padding: "5px 0", textAlign: "right", fontWeight: 600 }}>{vat.toLocaleString()}원</td>
                  </tr>
                  <tr style={{ borderTop: "2px solid #111" }}>
                    <td style={{ padding: "8px 16px 5px 0", fontWeight: 800, fontSize: 15 }}>합계 금액</td>
                    <td style={{ padding: "8px 0 5px", textAlign: "right", fontWeight: 800, fontSize: 16 }}>{fmtKRW(total)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {q.note && (
              <div style={{ borderTop: "1px solid #e8e8e8", paddingTop: 14, fontSize: 12.5, color: "#555" }}>
                <strong>비고</strong>&ensp;{q.note}
              </div>
            )}

            <p style={{ fontSize: 10, color: "#aaa", textAlign: "center", marginTop: 36, borderTop: "1px solid #eee", paddingTop: 10 }}>
              위와 같이 견적합니다. ㈜그리드온 · {fmtDate(issuedDate.toISOString())}
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

// ── Quote Editor ───────────────────────────────────────────────────────────
const EMPTY_ITEM = (): QItem => ({ sort_order: 0, description: "", quantity: 1, unit: "식", unit_price: 0, vat_rate: 0.1 });

type EditForm = {
  client_name: string; client_company: string; client_tel: string;
  client_email: string; client_address: string; valid_until: string; note: string;
};

function QuoteEditor({
  initial, onSaved, onCancel,
}: {
  initial: Quote | null;
  onSaved: (q: Quote) => void;
  onCancel: () => void;
}) {
  const { user } = useAuth();
  const isNew = !initial;

  const [form, setForm] = useState<EditForm>({
    client_name:    initial?.client_name    ?? "",
    client_company: initial?.client_company ?? "",
    client_tel:     initial?.client_tel     ?? "",
    client_email:   initial?.client_email   ?? "",
    client_address: initial?.client_address ?? "",
    valid_until:    initial?.valid_until    ?? addDays(today(), 30),
    note:           initial?.note           ?? "",
  });
  const [items, setItems] = useState<QItem[]>(
    initial?.quote_items.length ? initial.quote_items.slice().sort((a, b) => a.sort_order - b.sort_order) : [EMPTY_ITEM()]
  );
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const subtotal = useMemo(() => items.reduce((s, i) => s + Math.round(i.quantity * i.unit_price), 0), [items]);
  const vat      = useMemo(() => items.reduce((s, i) => s + Math.round(i.quantity * i.unit_price * i.vat_rate), 0), [items]);

  function setF(k: keyof EditForm, v: string) { setForm((f) => ({ ...f, [k]: v })); }
  function setItem(idx: number, k: keyof QItem, v: string | number) {
    setItems((prev) => prev.map((it, i) => i === idx ? { ...it, [k]: v } : it));
  }
  function addItem() { setItems((prev) => [...prev, EMPTY_ITEM()]); }
  function removeItem(idx: number) { setItems((prev) => prev.filter((_, i) => i !== idx)); }

  async function save(asDraft = true) {
    if (!form.client_name.trim()) { setErr("수신자 이름을 입력하세요."); return; }
    if (items.some((i) => !i.description.trim())) { setErr("품목 내역을 모두 입력하세요."); return; }
    setSaving(true); setErr(null);

    let quoteNo = initial?.quote_no ?? "";
    if (isNew) {
      const { data: noData, error: noErr } = await sba.rpc("next_quote_no");
      if (noErr) { setErr(noErr.message); setSaving(false); return; }
      quoteNo = noData as string;
    }

    const payload = {
      quote_no:       quoteNo,
      client_name:    form.client_name.trim(),
      client_company: form.client_company.trim() || null,
      client_tel:     form.client_tel.trim()     || null,
      client_email:   form.client_email.trim()   || null,
      client_address: form.client_address.trim() || null,
      valid_until:    form.valid_until || null,
      note:           form.note.trim() || null,
      status:         (initial?.status === "draft" || !initial) ? (asDraft ? "draft" : "sent") : initial.status,
      created_by:     user?.id ?? null,
    };

    let quoteId = initial?.id;
    if (isNew) {
      const { data, error } = await sba.from("quotes").insert(payload).select("id").single();
      if (error) { setErr(error.message); setSaving(false); return; }
      quoteId = (data as { id: string }).id;
    } else {
      const { error } = await sba.from("quotes").update(payload).eq("id", quoteId!);
      if (error) { setErr(error.message); setSaving(false); return; }
      await sba.from("quote_items").delete().eq("quote_id", quoteId!);
    }

    const itemsToInsert = items.map((it, idx) => ({
      quote_id:    quoteId!,
      sort_order:  idx,
      description: it.description.trim(),
      quantity:    it.quantity,
      unit:        it.unit,
      unit_price:  it.unit_price,
      vat_rate:    it.vat_rate,
    }));
    const { error: iErr } = await sba.from("quote_items").insert(itemsToInsert);
    if (iErr) { setErr(iErr.message); setSaving(false); return; }

    const { data: fresh } = await sba.from("quotes")
      .select("*, quote_items(*)")
      .eq("id", quoteId!)
      .single();
    setSaving(false);
    onSaved(fresh as unknown as Quote);
  }

  return (
    <div style={{ background: "var(--paper)", border: "1px solid var(--line-2)", borderRadius: 6, padding: 28, maxWidth: 900 }}>
      <h2 style={{ fontSize: 17, fontWeight: 800, marginBottom: 20 }}>{isNew ? "새 견적서" : `견적서 수정 — ${initial!.quote_no}`}</h2>

      {/* Client info */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 20 }}>
        <div className="field">
          <label>수신자 <span style={{ color: "#b3261e" }}>*</span></label>
          <input className="input" placeholder="홍길동" value={form.client_name} onChange={(e) => setF("client_name", e.target.value)} />
        </div>
        <div className="field">
          <label>회사명</label>
          <input className="input" placeholder="㈜한국전력" value={form.client_company} onChange={(e) => setF("client_company", e.target.value)} />
        </div>
        <div className="field">
          <label>연락처</label>
          <input className="input" placeholder="02-0000-0000" value={form.client_tel} onChange={(e) => setF("client_tel", e.target.value)} />
        </div>
        <div className="field">
          <label>유효기간</label>
          <input className="input" type="date" value={form.valid_until} onChange={(e) => setF("valid_until", e.target.value)} />
        </div>
        <div className="field" style={{ gridColumn: "1/-1" }}>
          <label>주소</label>
          <input className="input" value={form.client_address} onChange={(e) => setF("client_address", e.target.value)} />
        </div>
      </div>

      {/* Line items */}
      <div style={{ marginBottom: 14, fontWeight: 700, fontSize: 13.5 }}>품목</div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 680, marginBottom: 10, fontSize: 13 }}>
          <thead>
            <tr style={{ background: "var(--surface-2)" }}>
              <th style={{ padding: "8px 10px", textAlign: "left", fontWeight: 600, fontSize: 12 }}>내역</th>
              <th style={{ padding: "8px 8px", width: 72, fontWeight: 600, fontSize: 12 }}>수량</th>
              <th style={{ padding: "8px 8px", width: 56, fontWeight: 600, fontSize: 12 }}>단위</th>
              <th style={{ padding: "8px 8px", width: 130, fontWeight: 600, fontSize: 12 }}>단가</th>
              <th style={{ padding: "8px 8px", width: 80, fontWeight: 600, fontSize: 12 }}>부가세</th>
              <th style={{ padding: "8px 8px", width: 110, fontWeight: 600, fontSize: 12, textAlign: "right" }}>공급가액</th>
              <th style={{ width: 36 }}></th>
            </tr>
          </thead>
          <tbody>
            {items.map((it, idx) => {
              const supply = Math.round(it.quantity * it.unit_price);
              return (
                <tr key={idx} style={{ borderBottom: "1px solid var(--line-2)" }}>
                  <td style={{ padding: "6px 8px" }}>
                    <input className="input" style={{ fontSize: 13 }} placeholder="품목/내역 입력" value={it.description}
                      onChange={(e) => setItem(idx, "description", e.target.value)} />
                  </td>
                  <td style={{ padding: "6px 6px" }}>
                    <input className="input" type="number" style={{ textAlign: "right", fontSize: 13 }} value={it.quantity}
                      onChange={(e) => setItem(idx, "quantity", parseFloat(e.target.value) || 0)} />
                  </td>
                  <td style={{ padding: "6px 6px" }}>
                    <input className="input" style={{ fontSize: 13 }} value={it.unit}
                      onChange={(e) => setItem(idx, "unit", e.target.value)} />
                  </td>
                  <td style={{ padding: "6px 6px" }}>
                    <input className="input" type="number" style={{ textAlign: "right", fontSize: 13 }} value={it.unit_price}
                      onChange={(e) => setItem(idx, "unit_price", parseInt(e.target.value.replace(/[^\d]/g, "")) || 0)} />
                  </td>
                  <td style={{ padding: "6px 6px" }}>
                    <select className="input" style={{ fontSize: 12 }} value={String(it.vat_rate)}
                      onChange={(e) => setItem(idx, "vat_rate", parseFloat(e.target.value))}>
                      <option value="0.1">10%</option>
                      <option value="0">면세</option>
                    </select>
                  </td>
                  <td style={{ padding: "6px 8px", textAlign: "right", fontWeight: 600 }}>{supply.toLocaleString()}</td>
                  <td style={{ padding: "6px 4px" }}>
                    {items.length > 1 && (
                      <button type="button" onClick={() => removeItem(idx)}
                        style={{ background: "none", border: "none", cursor: "pointer", color: "#b3261e", fontSize: 16, lineHeight: 1 }}>×</button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <button type="button" className="btn btn--sm btn--ghost" onClick={addItem} style={{ marginBottom: 20, fontSize: 12 }}>+ 품목 추가</button>

      {/* Totals preview */}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 28, marginBottom: 20, padding: "12px 16px", background: "var(--surface-2)", borderRadius: 4, fontSize: 13 }}>
        <span className="muted">공급가액 <strong style={{ color: "var(--ink)", marginLeft: 8 }}>{subtotal.toLocaleString()}원</strong></span>
        <span className="muted">부가세 <strong style={{ color: "var(--ink)", marginLeft: 8 }}>{vat.toLocaleString()}원</strong></span>
        <span style={{ fontWeight: 800 }}>합계 {fmtKRW(subtotal + vat)}</span>
      </div>

      {/* Note */}
      <div className="field" style={{ marginBottom: 20 }}>
        <label>비고</label>
        <textarea className="input" rows={2} value={form.note} onChange={(e) => setF("note", e.target.value)}
          placeholder="납부조건, 특이사항 등" style={{ resize: "vertical" }} />
      </div>

      {err && <div role="alert" style={{ color: "#b3261e", fontSize: 13, marginBottom: 14 }}>{err}</div>}

      <div className="flex gap-s">
        <button className="btn btn--sm" onClick={() => save(false)} disabled={saving}>
          {saving ? "저장 중…" : "발송 상태로 저장"}
        </button>
        <button className="btn btn--sm btn--ghost" onClick={() => save(true)} disabled={saving}>임시 저장</button>
        <button className="btn btn--sm btn--ghost" onClick={onCancel}>취소</button>
      </div>
    </div>
  );
}

// ── Main QuoteList ─────────────────────────────────────────────────────────
type TabVal = "all" | QStatus;

const TABS: [TabVal, string][] = [
  ["all", "전체"], ["draft", "임시"], ["sent", "발송"], ["accepted", "수락"],
  ["rejected", "반려"], ["expired", "만료"],
];

const STATUS_ACTIONS: Partial<Record<QStatus, { label: string; next: QStatus; danger?: boolean }[]>> = {
  draft:    [{ label: "발송 처리", next: "sent" }],
  sent:     [{ label: "수락", next: "accepted" }, { label: "반려", next: "rejected", danger: true }],
  accepted: [{ label: "만료 처리", next: "expired", danger: true }],
};

export default function QuoteList() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabVal>("all");
  const [view, setView] = useState<"list" | "edit" | "print">("list");
  const [selected, setSelected] = useState<Quote | null>(null);  // edit target
  const [printQ, setPrintQ] = useState<Quote | null>(null);
  const [err, setErr] = useState<string | null>(null);

  function load() {
    setLoading(true);
    sba.from("quotes").select("*, quote_items(*)")
      .order("created_at", { ascending: false })
      .then(({ data, error }: SbaRes) => {
        setLoading(false);
        if (error) { setErr(error.message); return; }
        setQuotes((data as unknown as Quote[]) ?? []);
      });
  }
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function changeStatus(q: Quote, next: QStatus) {
    const { error } = await sba.from("quotes").update({ status: next }).eq("id", q.id);
    if (error) { setErr(error.message); return; }
    setQuotes((prev) => prev.map((x) => x.id === q.id ? { ...x, status: next } : x));
  }

  async function deleteQuote(q: Quote) {
    if (!confirm(`"${q.quote_no}" 견적서를 삭제하시겠습니까?`)) return;
    const { error } = await sba.from("quotes").delete().eq("id", q.id);
    if (error) { setErr(error.message); return; }
    setQuotes((prev) => prev.filter((x) => x.id !== q.id));
  }

  const visible = tab === "all" ? quotes : quotes.filter((q) => q.status === tab);
  const counts = { all: quotes.length, draft: 0, sent: 0, accepted: 0, rejected: 0, expired: 0 };
  quotes.forEach((q) => { counts[q.status]++; });

  if (view === "edit") {
    return (
      <div style={{ padding: "32px 36px" }}>
        <QuoteEditor
          initial={selected}
          onSaved={(q) => { load(); setView("list"); }}
          onCancel={() => setView("list")}
        />
      </div>
    );
  }

  const totalAccepted = quotes.filter((q) => q.status === "accepted")
    .flatMap((q) => q.quote_items)
    .reduce((s, i) => s + Math.round(i.quantity * i.unit_price * (1 + i.vat_rate)), 0);

  return (
    <>
      {printQ && <QuoteDoc q={printQ} onClose={() => setPrintQ(null)} />}

      <div style={{ padding: "32px 36px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
          <div>
            <h1 className="kr-d3" style={{ fontSize: 24, fontWeight: 800 }}>견적서</h1>
            <p className="muted" style={{ fontSize: 13.5, marginTop: 4 }}>견적서를 발행하고 수락 현황을 관리합니다.</p>
          </div>
          <button className="btn btn--sm" onClick={() => { setSelected(null); setView("edit"); }}>+ 새 견적서</button>
        </div>

        {/* Quick stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 24 }}>
          {[
            { label: "전체 견적",   val: `${counts.all}건` },
            { label: "발송 중",     val: `${counts.sent}건` },
            { label: "수락 완료",   val: `${counts.accepted}건` },
            { label: "수락 총액",   val: `${totalAccepted.toLocaleString()}원` },
          ].map(({ label, val }) => (
            <div key={label} className="panel" style={{ padding: "14px 16px" }}>
              <div className="muted" style={{ fontSize: 11.5, marginBottom: 5 }}>{label}</div>
              <div style={{ fontSize: 18, fontWeight: 800 }}>{val}</div>
            </div>
          ))}
        </div>

        {err && <div role="alert" style={{ color: "#b3261e", fontSize: 13.5, marginBottom: 16 }}>{err}</div>}

        {/* Tabs */}
        <div style={{ display: "flex", borderBottom: "1px solid var(--line-2)", marginBottom: 20 }}>
          {TABS.map(([v, label]) => (
            <button key={v} type="button" onClick={() => setTab(v)}
              style={{
                background: "none", border: "none", cursor: "pointer", padding: "10px 16px",
                fontSize: 13.5, fontWeight: tab === v ? 700 : 400,
                color: tab === v ? "var(--ink)" : "var(--muted)",
                borderBottom: tab === v ? "2px solid var(--ink)" : "2px solid transparent",
                marginBottom: -1,
              }}>
              {label} {counts[v] > 0 && <span style={{ fontSize: 11, color: "var(--muted)", marginLeft: 3 }}>{counts[v]}</span>}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="panel" style={{ padding: 0, overflow: "auto" }}>
          {loading ? (
            <div className="cellsub" style={{ padding: 40, textAlign: "center" }}>불러오는 중…</div>
          ) : visible.length === 0 ? (
            <div className="cellsub" style={{ padding: 40, textAlign: "center" }}>견적서가 없습니다.</div>
          ) : (
            <table className="table" style={{ minWidth: 780 }}>
              <thead>
                <tr>
                  <th>견적번호</th>
                  <th>수신처</th>
                  <th style={{ textAlign: "right" }}>합계금액</th>
                  <th style={{ textAlign: "center" }}>유효기간</th>
                  <th style={{ textAlign: "center" }}>상태</th>
                  <th style={{ textAlign: "center" }}>작성일</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {visible.map((q) => {
                  const total = q.quote_items.reduce((s, i) => s + Math.round(i.quantity * i.unit_price * (1 + i.vat_rate)), 0);
                  const actions = STATUS_ACTIONS[q.status] ?? [];
                  return (
                    <tr key={q.id}>
                      <td style={{ fontWeight: 700, color: "var(--muted)", fontSize: 12.5 }}>{q.quote_no}</td>
                      <td>
                        <span style={{ fontWeight: 600 }}>{q.client_company || q.client_name}</span>
                        {q.client_company && <span className="muted" style={{ fontSize: 11, marginLeft: 5 }}>{q.client_name}</span>}
                      </td>
                      <td style={{ textAlign: "right", fontWeight: 700 }}>{total.toLocaleString()}원</td>
                      <td style={{ textAlign: "center" }} className="cellsub">{q.valid_until ?? "—"}</td>
                      <td style={{ textAlign: "center" }}>
                        <span className={STATUS_CLS[q.status]} style={{ color: STATUS_COLOR[q.status] }}>
                          {STATUS_LABEL[q.status]}
                        </span>
                      </td>
                      <td style={{ textAlign: "center" }} className="cellsub">{q.created_at.slice(0, 10)}</td>
                      <td>
                        <div className="flex gap-s" style={{ justifyContent: "flex-end", flexWrap: "nowrap" }}>
                          <button className="btn btn--sm btn--ghost" style={{ fontSize: 11.5 }} onClick={() => setPrintQ(q)}>보기</button>
                          {(q.status === "draft" || q.status === "sent") && (
                            <button className="btn btn--sm btn--ghost" style={{ fontSize: 11.5 }}
                              onClick={() => { setSelected(q); setView("edit"); }}>수정</button>
                          )}
                          {actions.map(({ label, next, danger }) => (
                            <button key={next} className="btn btn--sm btn--ghost" style={{ fontSize: 11.5, color: danger ? "#b3261e" : undefined, borderColor: danger ? "#b3261e" : undefined }}
                              onClick={() => changeStatus(q, next)}>{label}</button>
                          ))}
                          {q.status === "draft" && (
                            <button className="btn btn--sm btn--ghost" style={{ fontSize: 11.5, color: "#b3261e" }}
                              onClick={() => deleteQuote(q)}>삭제</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}

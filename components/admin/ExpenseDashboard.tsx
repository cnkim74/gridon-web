"use client";
import { useEffect, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/AuthProvider";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sba = supabase as any;
type SbaRes = { data: unknown; error: { message: string } | null };
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const BUCKET = "receipts";

// ── Types ──────────────────────────────────────────────────────────────────

type Expense = {
  id: string;
  tx_date: string;
  amount: number;
  vat_amount: number;
  category: string;
  vendor: string | null;
  description: string | null;
  payment_method: string | null;
  receipt_url: string | null;
  branch: string | null;
  source: string;
  created_at: string;
};

type Draft = {
  tx_date: string;
  amount: string;
  vat_amount: string;
  category: string;
  vendor: string;
  description: string;
  payment_method: string;
  branch: string;
  receipt_url: string | null;
};

// ── Constants ──────────────────────────────────────────────────────────────

const CATS = ["공사 자재·장비", "식비·접대", "교통·운반", "차량 용품", "사무용품", "통신비", "공과금", "임차료", "인건비", "개인 용품", "기타"];
const PAYS = ["법인카드", "현금", "계좌이체", "기타"];
const MONTHS = ["1월","2월","3월","4월","5월","6월","7월","8월","9월","10월","11월","12월"];

const CAT_MAP: Record<string, string> = {
  "식대": "식비·접대",
  "차량 유류비": "교통·운반",
  "교통비": "교통·운반",
};

// ── Helpers ────────────────────────────────────────────────────────────────

function fmt(n: number) { return n.toLocaleString("ko-KR") + "원"; }
function todayStr() { return new Date().toISOString().slice(0, 10); }
function padMonth(m: number) { return String(m).padStart(2, "0"); }

function toDateStr(val: unknown): string {
  if (val instanceof Date) return val.toISOString().slice(0, 10);
  if (typeof val === "number") {
    return new Date((val - 25569) * 86400000).toISOString().slice(0, 10);
  }
  const s = String(val ?? "").trim().replace(/[./]/g, "-");
  if (/^\d{4}-\d{1,2}-\d{1,2}/.test(s)) return s.slice(0, 10);
  const d = new Date(s);
  return isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
}

function mapCat(raw: string): string {
  const c = String(raw ?? "").trim();
  return CAT_MAP[c] ?? (CATS.includes(c) ? c : "기타");
}

// ── Monthly bar chart ──────────────────────────────────────────────────────

function BarChart({ bars, highlight }: { bars: { label: string; val: number }[]; highlight?: number }) {
  const peak = Math.max(...bars.map((b) => b.val), 1);
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 120, paddingTop: 8 }}>
      {bars.map((b, i) => (
        <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, minWidth: 0 }}>
          <div title={fmt(b.val)} style={{
            width: "100%",
            height: `${Math.max(3, (b.val / peak) * 96)}px`,
            background: i === highlight ? "var(--ink)" : "var(--faint)",
            border: i === highlight ? "none" : "1px solid var(--line-2)",
            borderRadius: "3px 3px 0 0",
            transition: "height .3s ease",
          }} />
          <span style={{ fontSize: 10, color: i === highlight ? "var(--ink)" : "var(--muted)", fontWeight: i === highlight ? 700 : 400, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "100%" }}>
            {b.label}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Category breakdown ─────────────────────────────────────────────────────

function CatBreakdown({ expenses }: { expenses: Expense[] }) {
  const totals = CATS
    .map((c) => ({ cat: c, total: expenses.filter((e) => e.category === c).reduce((s, e) => s + e.amount, 0) }))
    .filter((x) => x.total > 0)
    .sort((a, b) => b.total - a.total);
  const grand = totals.reduce((s, x) => s + x.total, 0) || 1;
  if (totals.length === 0) return <p className="muted" style={{ fontSize: 14, padding: "20px 0" }}>데이터 없음</p>;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {totals.slice(0, 8).map((x) => (
        <div key={x.cat}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginBottom: 5 }}>
            <span style={{ color: "var(--muted)" }}>{x.cat}</span>
            <span style={{ fontWeight: 600, fontFamily: "var(--font-mono)" }}>{fmt(x.total)}</span>
          </div>
          <div style={{ height: 5, background: "var(--faint)", borderRadius: 3, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${(x.total / grand) * 100}%`, background: "var(--ink)", borderRadius: 3, transition: "width .4s ease", opacity: 0.15 + (x.total / grand) * 0.85 }} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Branch summary table (엑셀 대시보드 스타일) ────────────────────────────

function BranchSummary({ expenses }: { expenses: Expense[] }) {
  const branches = [...new Set(expenses.map((e) => e.branch).filter(Boolean))] as string[];
  if (branches.length === 0) return <p className="muted" style={{ fontSize: 14, padding: "12px 0" }}>지사 데이터 없음</p>;

  const grandTotal = expenses.reduce((s, e) => s + e.amount, 0) || 1;

  const rows = branches.map((br) => {
    const items = expenses.filter((e) => e.branch === br);
    const dates = [...new Set(items.map((e) => e.tx_date))].sort();
    const supply = items.reduce((s, e) => s + (e.amount - (e.vat_amount ?? 0)), 0);
    const vat = items.reduce((s, e) => s + (e.vat_amount ?? 0), 0);
    const total = items.reduce((s, e) => s + e.amount, 0);
    return {
      branch: br,
      days: dates.length,
      count: items.length,
      period: dates.length > 0 ? `${dates[0]} ~ ${dates[dates.length - 1]}` : "-",
      supply, vat, total,
      ratio: total / grandTotal,
    };
  }).sort((a, b) => b.total - a.total);

  const sumSupply = rows.reduce((s, r) => s + r.supply, 0);
  const sumVat = rows.reduce((s, r) => s + r.vat, 0);
  const sumTotal = rows.reduce((s, r) => s + r.total, 0);

  return (
    <div style={{ overflowX: "auto" }}>
      <table className="dtable" style={{ minWidth: 640 }}>
        <thead>
          <tr>
            <th>지사</th>
            <th style={{ textAlign: "center" }}>거래일</th>
            <th style={{ textAlign: "center" }}>품목수</th>
            <th>기간</th>
            <th style={{ textAlign: "right" }}>공급가액</th>
            <th style={{ textAlign: "right" }}>부가세</th>
            <th style={{ textAlign: "right" }}>합계</th>
            <th style={{ textAlign: "right" }}>비중</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.branch}>
              <td style={{ fontWeight: 700 }}>{r.branch}</td>
              <td style={{ textAlign: "center", color: "var(--muted)" }}>{r.days}일</td>
              <td style={{ textAlign: "center", color: "var(--muted)" }}>{r.count}건</td>
              <td style={{ fontSize: 12, color: "var(--muted)", fontFamily: "var(--font-mono)" }}>{r.period}</td>
              <td style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontSize: 13 }}>{r.supply.toLocaleString("ko-KR")}</td>
              <td style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--muted)" }}>{r.vat.toLocaleString("ko-KR")}</td>
              <td style={{ textAlign: "right", fontWeight: 700, fontFamily: "var(--font-mono)" }}>{r.total.toLocaleString("ko-KR")}</td>
              <td style={{ textAlign: "right", fontSize: 13, color: "var(--muted)" }}>{(r.ratio * 100).toFixed(1)}%</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr style={{ fontWeight: 700 }}>
            <td>합계</td>
            <td />
            <td style={{ textAlign: "center" }}>{rows.reduce((s, r) => s + r.count, 0)}건</td>
            <td />
            <td style={{ textAlign: "right", fontFamily: "var(--font-mono)" }}>{sumSupply.toLocaleString("ko-KR")}</td>
            <td style={{ textAlign: "right", fontFamily: "var(--font-mono)", color: "var(--muted)" }}>{sumVat.toLocaleString("ko-KR")}</td>
            <td style={{ textAlign: "right", fontFamily: "var(--font-mono)" }}>{sumTotal.toLocaleString("ko-KR")}</td>
            <td style={{ textAlign: "right" }}>100%</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

// ── Expense editor modal ───────────────────────────────────────────────────

function ExpenseEditor({ expense, onSave, onClose }: { expense: Expense | null; onSave: () => void; onClose: () => void }) {
  const { user } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [d, setD] = useState<Draft>(() => ({
    tx_date: expense?.tx_date ?? todayStr(),
    amount: expense ? expense.amount.toLocaleString("ko-KR") : "",
    vat_amount: expense?.vat_amount ? expense.vat_amount.toLocaleString("ko-KR") : "",
    category: expense?.category ?? "기타",
    vendor: expense?.vendor ?? "",
    description: expense?.description ?? "",
    payment_method: expense?.payment_method ?? "법인카드",
    branch: expense?.branch ?? "",
    receipt_url: expense?.receipt_url ?? null,
  }));
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function set(k: keyof Draft, v: string | null) { setD((p) => ({ ...p, [k]: v })); }

  async function uploadReceipt(file: File) {
    setUploading(true); setErr(null);
    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `${user?.id ?? "anon"}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: true });
    setUploading(false);
    if (error) { setErr(error.message); return; }
    set("receipt_url", `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path}`);
  }

  async function save() {
    if (!d.tx_date) { setErr("날짜를 입력하세요."); return; }
    const amt = parseInt(d.amount.replace(/[^0-9]/g, ""), 10);
    if (isNaN(amt) || amt <= 0) { setErr("올바른 금액을 입력하세요."); return; }
    const vat = parseInt(d.vat_amount.replace(/[^0-9]/g, "") || "0", 10);
    setSaving(true); setErr(null);
    const base = {
      tx_date: d.tx_date, amount: amt, vat_amount: vat, category: d.category,
      vendor: d.vendor.trim() || null, description: d.description.trim() || null,
      payment_method: d.payment_method, receipt_url: d.receipt_url,
      branch: d.branch.trim() || null,
    };
    const payload = expense ? base : { ...base, source: "manual", created_by: user?.id ?? null };
    const req = expense
      ? sba.from("expenses").update(payload).eq("id", expense.id)
      : sba.from("expenses").insert(payload);
    const { error }: SbaRes = await req;
    setSaving(false);
    if (error) { setErr((error as { message: string }).message); return; }
    onSave();
  }

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 300, background: "rgba(0,0,0,.45)", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "40px 20px 60px", overflowY: "auto" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "var(--paper)", borderRadius: 8, padding: "28px 32px", width: "100%", maxWidth: 640, boxShadow: "0 24px 64px rgba(0,0,0,.3)" }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 22 }}>{expense ? "지출 편집" : "새 지출 등록"}</h2>

        <div onClick={() => fileRef.current?.click()} style={{ border: "1.5px dashed var(--line-2)", borderRadius: 6, padding: "14px 18px", marginBottom: 18, cursor: "pointer", display: "flex", alignItems: "center", gap: 14, background: "var(--faint)" }}>
          {d.receipt_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={d.receipt_url} alt="영수증" style={{ width: 64, height: 64, objectFit: "cover", borderRadius: 4, border: "1px solid var(--line)", flexShrink: 0 }} />
          ) : (
            <div style={{ width: 64, height: 64, borderRadius: 4, background: "var(--line-2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" style={{ opacity: .4 }}>
                <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" fill="currentColor" stroke="none" /><path d="M21 15l-5-5L5 21" />
              </svg>
            </div>
          )}
          <div>
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 3 }}>{uploading ? "업로드 중…" : d.receipt_url ? "영수증 변경" : "영수증 첨부"}</div>
            <div style={{ fontSize: 12, color: "var(--muted)" }}>카메라 촬영 또는 파일 선택 · JPG · PNG · PDF</div>
          </div>
        </div>
        <input ref={fileRef} type="file" accept="image/*,application/pdf"
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          capture="environment"
          style={{ display: "none" }}
          onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadReceipt(f); }}
        />

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
          <div className="field"><label>날짜</label>
            <input className="input" type="date" value={d.tx_date} onChange={(e) => set("tx_date", e.target.value)} />
          </div>
          <div className="field"><label>지사</label>
            <input className="input" placeholder="경남지사, 서부산지사…" value={d.branch} onChange={(e) => set("branch", e.target.value)} />
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
          <div className="field"><label>합계 금액 (원)</label>
            <input className="input" type="text" inputMode="numeric" placeholder="50,000" value={d.amount}
              onChange={(e) => set("amount", e.target.value)}
              onBlur={(e) => { const n = parseInt(e.target.value.replace(/[^0-9]/g, ""), 10); if (!isNaN(n)) set("amount", n.toLocaleString("ko-KR")); }}
            />
          </div>
          <div className="field"><label>부가세 (원)</label>
            <input className="input" type="text" inputMode="numeric" placeholder="4,545" value={d.vat_amount}
              onChange={(e) => set("vat_amount", e.target.value)}
              onBlur={(e) => { const n = parseInt(e.target.value.replace(/[^0-9]/g, ""), 10); if (!isNaN(n)) set("vat_amount", n.toLocaleString("ko-KR")); }}
            />
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
          <div className="field"><label>분류</label>
            <select className="input" value={d.category} onChange={(e) => set("category", e.target.value)}>
              {CATS.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="field"><label>결제수단</label>
            <select className="input" value={d.payment_method} onChange={(e) => set("payment_method", e.target.value)}>
              {PAYS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
        </div>

        <div className="field" style={{ marginBottom: 12 }}>
          <label>거래처</label>
          <input className="input" placeholder="○○식당, ○○공구상가…" value={d.vendor} onChange={(e) => set("vendor", e.target.value)} />
        </div>
        <div className="field" style={{ marginBottom: 20 }}>
          <label>내용</label>
          <textarea className="input" rows={2} value={d.description} onChange={(e) => set("description", e.target.value)} style={{ resize: "vertical" }} />
        </div>

        {err && <p style={{ color: "#b3261e", fontSize: 13, marginBottom: 12 }}>{err}</p>}
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button className="btn btn--ghost btn--sm" type="button" onClick={onClose}>취소</button>
          <button className="btn btn--sm" type="button" onClick={save} disabled={saving || uploading}>
            {saving ? "저장 중…" : expense ? "저장" : "등록"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Excel importer ─────────────────────────────────────────────────────────

type FileFormat = "template" | "gridon";

const GRIDON_PREVIEW_COLS = [0, 2, 4, 5, 11, 12];
const GRIDON_PREVIEW_LABELS = ["지사", "일자", "구입처", "품목명", "합계(원)", "카테고리"];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseGridonRows(wb: XLSX.WorkBook): any[][] {
  // 1) "전체내역" 포함 시트 우선 (이모지 인코딩 차이 방지)
  const allSheetName = wb.SheetNames.find((n) => n.includes("전체내역"));
  if (allSheetName) {
    const allWs = wb.Sheets[allSheetName];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const raw = XLSX.utils.sheet_to_json<any[]>(allWs, { header: 1, defval: "" });
    const hi = raw.findIndex((r) => Array.isArray(r) && r.some((c) => String(c) === "일자" || String(c) === "지사"));
    if (hi >= 0) {
      return [raw[hi], ...raw.slice(hi + 1).filter((r) => r[2] !== "" && r[2] !== undefined && r[2] !== null)];
    }
  }
  // 2) 지사별 시트 합침
  const branches = wb.SheetNames.filter((n) => !n.includes("대시보드") && !n.includes("전체내역") && n.includes("_"));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const combined: any[][] = [];
  let headerSet = false;
  for (const name of branches) {
    const ws = wb.Sheets[name];
    if (!ws) continue;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const raw = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1, defval: "" });
    const hi = raw.findIndex((r) => Array.isArray(r) && r.some((c) => String(c) === "일자"));
    if (hi < 0) continue;
    if (!headerSet) { combined.push(["지사", "월", ...raw[hi]]); headerSet = true; }
    const branch = name.split("_")[0];
    const month = name.split("_")[1] ?? "";
    raw.slice(hi + 1).filter((r) => r[0] !== "" && r[0] !== undefined)
      .forEach((r) => combined.push([branch, month, ...r]));
  }
  return combined;
}

function ExcelImporter({ onImport, onClose }: { onImport: () => void; onClose: () => void }) {
  const { user } = useAuth();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [rows, setRows] = useState<any[][]>([]);
  const [format, setFormat] = useState<FileFormat>("template");
  const [importing, setImporting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function parseFile(file: File) {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(new Uint8Array(e.target?.result as ArrayBuffer), { type: "array", cellDates: true });
        const isGridon = wb.SheetNames.some((n) => n.includes("전체내역")) ||
          wb.SheetNames.some((n) => n.includes("지사") || n.includes("_202"));
        if (isGridon) {
          const parsed = parseGridonRows(wb);
          if (parsed.length > 1) { setRows(parsed); setFormat("gridon"); setErr(null); return; }
        }
        const ws = wb.Sheets[wb.SheetNames[0]];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setRows(XLSX.utils.sheet_to_json<any[]>(ws, { header: 1, defval: "" }));
        setFormat("template"); setErr(null);
      } catch (ex) {
        setErr(`파일을 읽을 수 없습니다. (${ex instanceof Error ? ex.message : String(ex)})`);
      }
    };
    reader.readAsArrayBuffer(file);
  }

  function downloadTemplate() {
    const ws = XLSX.utils.aoa_to_sheet([
      ["날짜", "금액", "부가세", "분류", "거래처", "내용", "결제수단", "지사"],
      ["2026-06-14", 50000, 4545, "식비·접대", "○○식당", "점심 회식", "법인카드", "경남지사"],
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "지출내역");
    XLSX.writeFile(wb, "expense_template.xlsx");
  }

  async function doImport() {
    if (rows.length < 2) return;
    setImporting(true); setErr(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let records: any[];
    if (format === "gridon") {
      // 전체내역: 지사(0) 월(1) 일자(2) 요일(3) 구입처(4) 품목명(5) 규격(6)
      //          수량(7) 단가(8) 공급가액(9) 부가세(10) 합계(11) 카테고리(12) 비고(13)
      records = rows.slice(1).map((r) => {
        const spec = String(r[6] ?? "").trim();
        const qty = r[7]; const price = r[8]; const note = String(r[13] ?? "").trim();
        let desc = String(r[5] ?? "").trim();
        if (spec) desc += ` (${spec})`;
        if (qty && price) desc += ` × ${qty} @ ${Number(price).toLocaleString("ko-KR")}원`;
        if (note) desc += ` / ${note}`;
        return {
          tx_date: toDateStr(r[2]),
          amount: Math.round(Number(r[11] ?? 0)),
          vat_amount: Math.max(0, Math.round(Number(r[10] ?? 0))),
          category: mapCat(String(r[12] ?? "")),
          vendor: String(r[4] ?? "").trim() || null,
          description: desc || null,
          payment_method: "기타",
          branch: String(r[0] ?? "").trim() || null,
          source: "excel",
          created_by: user?.id ?? null,
        };
      }).filter((r) => r.tx_date && r.amount !== 0);
    } else {
      // 템플릿: 날짜(0) 금액(1) 부가세(2) 분류(3) 거래처(4) 내용(5) 결제수단(6) 지사(7)
      records = rows.slice(1).map((r) => ({
        tx_date: toDateStr(r[0]),
        amount: parseInt(String(r[1] ?? "0").replace(/[^0-9]/g, ""), 10),
        vat_amount: parseInt(String(r[2] ?? "0").replace(/[^0-9]/g, "") || "0", 10),
        category: mapCat(String(r[3] ?? "")),
        vendor: String(r[4] ?? "").trim() || null,
        description: String(r[5] ?? "").trim() || null,
        payment_method: String(r[6] ?? "법인카드").trim() || "법인카드",
        branch: String(r[7] ?? "").trim() || null,
        source: "excel",
        created_by: user?.id ?? null,
      })).filter((r) => r.tx_date && r.amount > 0);
    }
    if (records.length === 0) { setErr("가져올 유효한 데이터가 없습니다."); setImporting(false); return; }
    const { error }: SbaRes = await sba.from("expenses").insert(records);
    setImporting(false);
    if (error) { setErr((error as { message: string }).message); return; }
    onImport();
  }

  const previewRows = format === "gridon"
    ? [GRIDON_PREVIEW_LABELS, ...rows.slice(1, 11).map((r) => GRIDON_PREVIEW_COLS.map((ci) => r[ci]))]
    : rows.slice(0, 11);
  const dataCount = rows.length > 1 ? rows.length - 1 : 0;

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 300, background: "rgba(0,0,0,.45)", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "40px 20px 60px", overflowY: "auto" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "var(--paper)", borderRadius: 8, padding: "28px 32px", width: "100%", maxWidth: 860, boxShadow: "0 24px 64px rgba(0,0,0,.3)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h2 style={{ fontSize: 18, fontWeight: 800 }}>엑셀 가져오기</h2>
          <button type="button" className="btn btn--ghost btn--sm" onClick={downloadTemplate}>템플릿 다운로드</button>
        </div>
        <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 16, lineHeight: 1.7 }}>
          <strong>그리드온 영수증 정리 양식</strong>과 직접 입력 템플릿 모두 자동 인식합니다.
        </p>
        <label style={{ display: "block", border: "1.5px dashed var(--line-2)", borderRadius: 6, padding: "24px 20px", textAlign: "center", cursor: "pointer", background: "var(--faint)", marginBottom: 18 }}>
          <input type="file" accept=".xlsx,.xls,.csv" style={{ display: "none" }} onChange={(e) => { const f = e.target.files?.[0]; if (f) parseFile(f); }} />
          <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 5 }}>파일 선택</div>
          <div style={{ fontSize: 13, color: "var(--muted)" }}>.xlsx · .xls · .csv</div>
        </label>
        {rows.length > 1 && (
          <>
            <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 8, display: "flex", gap: 10, alignItems: "center" }}>
              <span>미리보기 · 전체 <strong>{dataCount}건</strong></span>
              {format === "gridon" && <span style={{ background: "var(--ink)", color: "var(--paper)", fontSize: 11, padding: "2px 8px", borderRadius: 10, fontWeight: 700 }}>그리드온 양식 감지</span>}
            </div>
            <div style={{ overflowX: "auto", marginBottom: 18 }}>
              <table className="dtable" style={{ minWidth: 520 }}>
                <thead><tr>{(previewRows[0] ?? []).map((h, i) => <th key={i} style={{ fontSize: 12 }}>{String(h)}</th>)}</tr></thead>
                <tbody>{previewRows.slice(1).map((row, ri) => (
                  <tr key={ri}>{(row as unknown[]).map((cell, ci) => <td key={ci} style={{ fontSize: 12.5 }}>{String(cell)}</td>)}</tr>
                ))}</tbody>
              </table>
            </div>
          </>
        )}
        {err && <p style={{ color: "#b3261e", fontSize: 13, marginBottom: 12 }}>{err}</p>}
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button className="btn btn--ghost btn--sm" type="button" onClick={onClose}>취소</button>
          <button className="btn btn--sm" type="button" onClick={doImport} disabled={dataCount === 0 || importing}>
            {importing ? "가져오는 중…" : `${dataCount}건 가져오기`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main dashboard ─────────────────────────────────────────────────────────

export default function ExpenseDashboard() {
  const now = new Date();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [viewMode, setViewMode] = useState<"year" | "month">("year"); // 기본: 연도별 전체
  const [modal, setModal] = useState<"add" | "excel" | null>(null);
  const [editExp, setEditExp] = useState<Expense | null>(null);
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
  const [catFilter, setCatFilter] = useState("전체");
  const [branchFilter, setBranchFilter] = useState("전체");
  const [search, setSearch] = useState("");
  const [rev, setRev] = useState(0);

  useEffect(() => {
    setLoading(true);
    sba.from("expenses").select("*")
      .gte("tx_date", `${year}-01-01`)
      .lte("tx_date", `${year}-12-31`)
      .order("tx_date", { ascending: false })
      .then(({ data }: SbaRes) => {
        setLoading(false);
        setExpenses((data as Expense[]) ?? []);
      });
  }, [year, rev]);

  const curMonthPfx = `${year}-${padMonth(month)}`;
  const today = todayStr();

  // 현재 뷰 기준 expenses
  const viewExpenses = viewMode === "month"
    ? expenses.filter((e) => e.tx_date.startsWith(curMonthPfx))
    : expenses;

  // KPI (항상 연간 기준)
  const todayTotal = expenses.filter((e) => e.tx_date === today).reduce((s, e) => s + e.amount, 0);
  const yearTotal = expenses.reduce((s, e) => s + e.amount, 0);
  const yearVat = expenses.reduce((s, e) => s + (e.vat_amount ?? 0), 0);
  const yearSupply = yearTotal - yearVat;
  const yearCount = expenses.length;

  // 월별 바차트
  const monthlyBars = MONTHS.map((_, i) => ({
    label: `${i + 1}월`,
    val: expenses.filter((e) => parseInt(e.tx_date.slice(5, 7)) === i + 1).reduce((s, e) => s + e.amount, 0),
  }));

  const daysInMonth = new Date(year, month, 0).getDate();
  const dailyBars = Array.from({ length: daysInMonth }, (_, i) => {
    const d = `${curMonthPfx}-${padMonth(i + 1)}`;
    return { label: String(i + 1), val: expenses.filter((e) => e.tx_date === d).reduce((s, e) => s + e.amount, 0) };
  });

  // 지사 목록
  const branches = [...new Set(expenses.map((e) => e.branch).filter(Boolean))] as string[];

  // 목록 필터
  const listExpenses = viewExpenses.filter((e) => {
    if (branchFilter !== "전체" && e.branch !== branchFilter) return false;
    if (catFilter !== "전체" && e.category !== catFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (e.vendor ?? "").toLowerCase().includes(q) || (e.description ?? "").toLowerCase().includes(q);
    }
    return true;
  });
  const listTotal = listExpenses.reduce((s, e) => s + e.amount, 0);
  const listVat = listExpenses.reduce((s, e) => s + (e.vat_amount ?? 0), 0);

  function prevMonth() { if (month === 1) { setYear((y) => y - 1); setMonth(12); } else setMonth((m) => m - 1); }
  function nextMonth() { if (month === 12) { setYear((y) => y + 1); setMonth(1); } else setMonth((m) => m + 1); }

  async function del(id: string) {
    if (!confirm("삭제하시겠습니까?")) return;
    await sba.from("expenses").delete().eq("id", id);
    setRev((r) => r + 1);
  }

  const chipStyle = (active: boolean): React.CSSProperties => ({
    padding: "4px 11px", border: "1px solid var(--line-2)", borderRadius: 20, fontSize: 12, cursor: "pointer",
    background: active ? "var(--ink)" : "transparent", color: active ? "var(--paper)" : "inherit", fontWeight: active ? 700 : 400,
  });

  return (
    <>
      <div className="apage-head">
        <div><h1>지출 관리</h1><p>영수증·엑셀 등록 및 지사별·월별 현황</p></div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn--ghost btn--sm" type="button" onClick={() => setModal("excel")}>엑셀 가져오기</button>
          <button className="btn btn--sm" type="button" onClick={() => { setEditExp(null); setModal("add"); }}>＋ 새 지출</button>
        </div>
      </div>

      {/* ── 연간 KPI ─────────────────────────────────────────────────── */}
      <div className="kpis">
        <div className="kpi">
          <div className="kl">{year}년 합계</div>
          <div className="kv" style={{ fontSize: 18 }}>{fmt(yearTotal)}</div>
        </div>
        <div className="kpi">
          <div className="kl">공급가액</div>
          <div className="kv" style={{ fontSize: 18 }}>{yearSupply.toLocaleString("ko-KR")}원</div>
        </div>
        <div className="kpi">
          <div className="kl">부가세</div>
          <div className="kv" style={{ fontSize: 16, color: "var(--muted)" }}>{yearVat.toLocaleString("ko-KR")}원</div>
        </div>
        <div className="kpi">
          <div className="kl">오늘 / 총 건수</div>
          <div className="kv">{todayTotal > 0 ? fmt(todayTotal) + " · " : ""}{yearCount}건</div>
        </div>
      </div>

      {/* ── 지사별 요약 ───────────────────────────────────────────────── */}
      {branches.length > 0 && (
        <div className="panel" style={{ marginBottom: 16 }}>
          <div className="panel-body" style={{ borderBottom: "1px solid var(--line-2)" }}>
            <span style={{ fontWeight: 700, fontSize: 14 }}>■ 지사별 요약</span>
            <span style={{ marginLeft: 10, fontSize: 12, color: "var(--muted)" }}>{year}년</span>
          </div>
          <div className="panel-body">
            {loading ? <p className="muted" style={{ fontSize: 14 }}>불러오는 중…</p> : <BranchSummary expenses={expenses} />}
          </div>
        </div>
      )}

      {/* ── 차트 + 카테고리 ───────────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: 16, marginBottom: 16 }}>
        <div className="panel">
          <div className="panel-body" style={{ borderBottom: "1px solid var(--line-2)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", gap: 6 }}>
              {(["year", "month"] as const).map((m) => (
                <button key={m} type="button" style={chipStyle(viewMode === m)} onClick={() => setViewMode(m)}>
                  {m === "year" ? "연도별" : "월별"}
                </button>
              ))}
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              {viewMode === "month" ? (
                <>
                  <button type="button" onClick={prevMonth} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: "var(--muted)" }}>‹</button>
                  <span style={{ fontWeight: 700, fontSize: 13, minWidth: 76, textAlign: "center" }}>{year}년 {month}월</span>
                  <button type="button" onClick={nextMonth} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: "var(--muted)" }}>›</button>
                </>
              ) : (
                <>
                  <button type="button" onClick={() => setYear((y) => y - 1)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: "var(--muted)" }}>‹</button>
                  <span style={{ fontWeight: 700, fontSize: 13, minWidth: 56, textAlign: "center" }}>{year}년</span>
                  <button type="button" onClick={() => setYear((y) => y + 1)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: "var(--muted)" }}>›</button>
                </>
              )}
            </div>
          </div>
          <div className="panel-body">
            {loading ? <p className="muted" style={{ textAlign: "center", padding: "32px 0" }}>불러오는 중…</p> : (
              <BarChart bars={viewMode === "year" ? monthlyBars : dailyBars} highlight={viewMode === "year" ? month - 1 : undefined} />
            )}
          </div>
        </div>
        <div className="panel">
          <div className="panel-body" style={{ borderBottom: "1px solid var(--line-2)" }}>
            <span style={{ fontWeight: 700, fontSize: 13 }}>카테고리별</span>
          </div>
          <div className="panel-body">
            {loading ? <p className="muted" style={{ fontSize: 13 }}>불러오는 중…</p> : <CatBreakdown expenses={viewExpenses} />}
          </div>
        </div>
      </div>

      {/* ── 상세 목록 ─────────────────────────────────────────────────── */}
      <div className="panel">
        <div className="panel-body">
          <div className="atable-tools">
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
              {/* 지사 필터 */}
              {branches.length > 0 && ["전체", ...branches].map((b) => (
                <button key={b} type="button" style={chipStyle(branchFilter === b)} onClick={() => setBranchFilter(b)}>{b}</button>
              ))}
              <span style={{ width: 1, height: 22, background: "var(--line-2)", margin: "0 4px", alignSelf: "center" }} />
              {/* 카테고리 필터 */}
              {["전체", ...CATS.filter((c) => viewExpenses.some((e) => e.category === c))].map((c) => (
                <button key={c} type="button" style={chipStyle(catFilter === c)} onClick={() => setCatFilter(c)}>{c}</button>
              ))}
            </div>
            <div className="search-mini">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.2-3.2"/></svg>
              <input placeholder="거래처·내용 검색" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>
        </div>

        <table className="dtable">
          <thead>
            <tr>
              <th style={{ width: 90 }}>날짜</th>
              {branches.length > 0 && <th style={{ width: 90 }}>지사</th>}
              <th style={{ width: 90 }}>분류</th>
              <th>거래처 · 내용</th>
              <th style={{ width: 80 }}>결제</th>
              <th style={{ width: 110, textAlign: "right" }}>공급가액</th>
              <th style={{ width: 80, textAlign: "right" }}>부가세</th>
              <th style={{ width: 120, textAlign: "right" }}>합계</th>
              <th style={{ width: 44 }}>영수증</th>
              <th style={{ width: 80 }} />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={10} style={{ textAlign: "center", padding: "40px 0", color: "var(--muted)" }}>불러오는 중…</td></tr>
            ) : listExpenses.length === 0 ? (
              <tr><td colSpan={10} style={{ textAlign: "center", padding: "40px 0", color: "var(--muted)" }}>지출 내역이 없습니다.</td></tr>
            ) : listExpenses.map((e) => {
              const supply = e.amount - (e.vat_amount ?? 0);
              return (
                <tr key={e.id}>
                  <td style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--muted)" }}>{e.tx_date}</td>
                  {branches.length > 0 && <td style={{ fontSize: 12 }}>{e.branch ?? "—"}</td>}
                  <td><span className="badge off" style={{ fontSize: 11 }}>{e.category}</span></td>
                  <td>
                    {e.vendor && <div style={{ fontWeight: 600, fontSize: 13 }}>{e.vendor}</div>}
                    {e.description && <div className="cellsub" style={{ fontSize: 11.5 }}>{e.description}</div>}
                  </td>
                  <td className="cellsub" style={{ fontSize: 12 }}>{e.payment_method ?? "—"}</td>
                  <td style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--muted)" }}>{supply.toLocaleString("ko-KR")}</td>
                  <td style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--muted)" }}>{(e.vat_amount ?? 0).toLocaleString("ko-KR")}</td>
                  <td style={{ textAlign: "right", fontWeight: 700, fontFamily: "var(--font-mono)", fontSize: 13 }}>{e.amount.toLocaleString("ko-KR")}</td>
                  <td style={{ textAlign: "center" }}>
                    {e.receipt_url ? (
                      <button type="button" onClick={() => setReceiptUrl(e.receipt_url!)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={e.receipt_url} alt="영수증" style={{ width: 30, height: 30, objectFit: "cover", borderRadius: 3, border: "1px solid var(--line)" }} />
                      </button>
                    ) : <span style={{ color: "var(--muted)", fontSize: 11 }}>—</span>}
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                      <button type="button" onClick={() => { setEditExp(e); setModal("add"); }} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, color: "var(--muted)", textDecoration: "underline" }}>편집</button>
                      <button type="button" onClick={() => del(e.id)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, color: "#b3261e" }}>삭제</button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {listExpenses.length > 0 && (
          <div style={{ padding: "12px 20px", borderTop: "1px solid var(--line-2)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
            <span style={{ fontSize: 13, color: "var(--muted)" }}>{listExpenses.length}건</span>
            <div style={{ display: "flex", gap: 20, fontFamily: "var(--font-mono)", fontSize: 13 }}>
              <span style={{ color: "var(--muted)" }}>공급가액 {(listTotal - listVat).toLocaleString("ko-KR")} + 부가세 {listVat.toLocaleString("ko-KR")}</span>
              <span style={{ fontWeight: 700 }}>합계 {fmt(listTotal)}</span>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {modal === "add" && (
        <ExpenseEditor expense={editExp} onSave={() => { setModal(null); setEditExp(null); setRev((r) => r + 1); }} onClose={() => { setModal(null); setEditExp(null); }} />
      )}
      {modal === "excel" && (
        <ExcelImporter onImport={() => { setModal(null); setRev((r) => r + 1); }} onClose={() => setModal(null)} />
      )}

      {/* 영수증 전체보기 */}
      {receiptUrl && (
        <div onClick={() => setReceiptUrl(null)} style={{ position: "fixed", inset: 0, zIndex: 400, background: "rgba(0,0,0,.85)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ position: "relative", maxWidth: "88vw", maxHeight: "90vh" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={receiptUrl} alt="영수증" style={{ maxWidth: "100%", maxHeight: "88vh", objectFit: "contain", borderRadius: 4, display: "block" }} />
            <button onClick={() => setReceiptUrl(null)} style={{ position: "absolute", top: -14, right: -14, width: 30, height: 30, borderRadius: "50%", background: "var(--paper)", border: "none", cursor: "pointer", fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 8px rgba(0,0,0,.3)" }}>×</button>
          </div>
        </div>
      )}
    </>
  );
}

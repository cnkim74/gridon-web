"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/AuthProvider";
import { ym } from "@/lib/payroll";

// Tables added after type generation — untyped access
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sba = supabase as any;
type SbaRes = { data: unknown; error: { message: string } | null };

// ── Types ──────────────────────────────────────────────────────────────────
type TxType = "income" | "expense";

type Category = {
  id: string; type: TxType; name: string; color: string; sort_order: number;
};

type Tx = {
  id: string; type: TxType; category_id: string | null; amount: number;
  tx_date: string; description: string; vendor_client: string | null; note: string | null;
  created_at: string;
  tx_categories: { name: string; color: string } | null;
};

// ── Helpers ────────────────────────────────────────────────────────────────
function won(n: number) { return n.toLocaleString() + "원"; }

function monthRange(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  const last = new Date(y, m, 0).getDate();
  return { from: `${ym}-01`, to: `${ym}-${String(last).padStart(2, "0")}` };
}

function prevMonths(cur: string, n: number): string[] {
  const [y, m] = cur.split("-").map(Number);
  const result: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const mm = ((m - 1 - i + 1200) % 12) + 1;
    const yy = y - Math.floor((i - (m - 1) + 12) / 12);
    const actual = new Date(y, m - 1 - i, 1);
    result.push(`${actual.getFullYear()}-${String(actual.getMonth() + 1).padStart(2, "0")}`);
  }
  return result;
}

function ymLabel(s: string) { const [, m] = s.split("-"); return `${parseInt(m)}월`; }

// ── Add/Edit Transaction Modal ─────────────────────────────────────────────
type TxForm = {
  type: TxType; category_id: string; amount: string;
  tx_date: string; description: string; vendor_client: string; note: string;
};

function TxModal({
  initial, categories, onSaved, onCancel,
}: {
  initial: Tx | null;
  categories: Category[];
  onSaved: () => void;
  onCancel: () => void;
}) {
  const { user } = useAuth();
  const isNew = !initial;

  const [form, setForm] = useState<TxForm>({
    type:          initial?.type          ?? "income",
    category_id:   initial?.category_id   ?? "",
    amount:        initial ? String(initial.amount) : "",
    tx_date:       initial?.tx_date        ?? new Date().toISOString().slice(0, 10),
    description:   initial?.description   ?? "",
    vendor_client: initial?.vendor_client ?? "",
    note:          initial?.note          ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function setF(k: keyof TxForm, v: string) { setForm((f) => ({ ...f, [k]: v })); }

  const filteredCats = categories.filter((c) => c.type === form.type).sort((a, b) => a.sort_order - b.sort_order);

  async function save() {
    if (!form.description.trim()) { setErr("내용을 입력하세요."); return; }
    const amt = parseInt(form.amount.replace(/[^\d]/g, ""));
    if (!amt || amt <= 0) { setErr("금액을 입력하세요."); return; }
    setSaving(true); setErr(null);
    const payload = {
      type:          form.type,
      category_id:   form.category_id || null,
      amount:        amt,
      tx_date:       form.tx_date,
      description:   form.description.trim(),
      vendor_client: form.vendor_client.trim() || null,
      note:          form.note.trim() || null,
      created_by:    user?.id ?? null,
    };
    const { error } = isNew
      ? await sba.from("transactions").insert(payload)
      : await sba.from("transactions").update(payload).eq("id", initial!.id);
    setSaving(false);
    if (error) { setErr(error.message); return; }
    onSaved();
  }

  return (
    <div onClick={onCancel} style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(0,0,0,.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div onClick={(e) => e.stopPropagation()}
        style={{ background: "var(--paper)", borderRadius: 6, padding: 24, width: "100%", maxWidth: 440, boxShadow: "0 20px 60px rgba(0,0,0,.3)" }}>
        <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 18 }}>{isNew ? "거래 추가" : "거래 수정"}</h3>

        {/* Type toggle */}
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          {(["income", "expense"] as TxType[]).map((t) => (
            <button key={t} type="button"
              onClick={() => { setF("type", t); setF("category_id", ""); }}
              style={{
                flex: 1, padding: "8px 0", border: "1px solid var(--line-2)", borderRadius: 4, cursor: "pointer", fontWeight: 700, fontSize: 13.5,
                background: form.type === t ? (t === "income" ? "#1a7f4b" : "#b3261e") : "var(--surface-2)",
                color: form.type === t ? "#fff" : "var(--ink)",
              }}>
              {t === "income" ? "수입" : "지출"}
            </button>
          ))}
        </div>

        <div className="form">
          <div className="field">
            <label>내용 <span style={{ color: "#b3261e" }}>*</span></label>
            <input className="input" placeholder="공사 대금, 인건비 등" value={form.description} onChange={(e) => setF("description", e.target.value)} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div className="field">
              <label>금액 <span style={{ color: "#b3261e" }}>*</span></label>
              <input className="input" inputMode="numeric" placeholder="0" value={form.amount}
                onChange={(e) => setF("amount", e.target.value)} />
            </div>
            <div className="field">
              <label>날짜</label>
              <input className="input" type="date" value={form.tx_date} onChange={(e) => setF("tx_date", e.target.value)} />
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div className="field">
              <label>카테고리</label>
              <select className="input" value={form.category_id} onChange={(e) => setF("category_id", e.target.value)}>
                <option value="">— 선택</option>
                {filteredCats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="field">
              <label>거래처</label>
              <input className="input" placeholder="㈜한국전력 등" value={form.vendor_client} onChange={(e) => setF("vendor_client", e.target.value)} />
            </div>
          </div>
        </div>

        {err && <p style={{ color: "#b3261e", fontSize: 13, margin: "8px 0" }}>{err}</p>}

        <div className="flex gap-s" style={{ marginTop: 16 }}>
          <button className="btn btn--sm" onClick={save} disabled={saving}>{saving ? "저장 중…" : "저장"}</button>
          <button className="btn btn--sm btn--ghost" onClick={onCancel}>취소</button>
        </div>
      </div>
    </div>
  );
}

// ── FinanceDashboard ───────────────────────────────────────────────────────
export default function FinanceDashboard() {
  const [month, setMonth] = useState(ym.now());
  const [txList, setTxList] = useState<Tx[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // Modal state
  const [editing, setEditing] = useState<Tx | null | "new">(null);
  const [txFilter, setTxFilter] = useState<TxType | "all">("all");

  // Load categories once
  useEffect(() => {
    sba.from("tx_categories").select("*").order("sort_order").then(({ data }: { data: Category[] | null }) => {
      setCategories(data ?? []);
    });
  }, []);

  // Load transactions for current month + 5 previous months (for chart)
  const months6 = useMemo(() => prevMonths(month, 6), [month]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    const oldest = months6[0] + "-01";
    const { to: newest } = monthRange(month);
    sba.from("transactions")
      .select("*, tx_categories(name, color)")
      .gte("tx_date", oldest)
      .lte("tx_date", newest)
      .order("tx_date", { ascending: false })
      .then(({ data, error }: SbaRes) => {
        if (!active) return;
        setLoading(false);
        if (error) { setErr(error.message); return; }
        setTxList((data as unknown as Tx[]) ?? []);
      });
    return () => { active = false; };
  }, [month, months6]);

  async function deleteTx(tx: Tx) {
    if (!confirm("삭제하시겠습니까?")) return;
    const { error } = await sba.from("transactions").delete().eq("id", tx.id);
    if (error) { setErr(error.message); return; }
    setTxList((prev) => prev.filter((t) => t.id !== tx.id));
  }

  // Current month transactions
  const { from, to } = monthRange(month);
  const curMonthTx = txList.filter((t) => t.tx_date >= from && t.tx_date <= to);
  const income  = curMonthTx.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const expense = curMonthTx.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const balance = income - expense;

  // 6-month chart data
  const chartData = useMemo(() => months6.map((m) => {
    const { from: f, to: t2 } = monthRange(m);
    const mx = txList.filter((tx) => tx.tx_date >= f && tx.tx_date <= t2);
    return {
      label: ymLabel(m),
      income:  mx.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0),
      expense: mx.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0),
    };
  }), [txList, months6]);

  const maxVal = useMemo(() => Math.max(...chartData.flatMap((d) => [d.income, d.expense]), 1), [chartData]);

  // Expense breakdown by category this month
  const expenseCats = useMemo(() => {
    const map = new Map<string, { name: string; color: string; amount: number }>();
    curMonthTx.filter((t) => t.type === "expense").forEach((t) => {
      const key = t.category_id ?? "__none";
      const name = t.tx_categories?.name ?? "미분류";
      const color = t.tx_categories?.color ?? "#aaa";
      const prev = map.get(key) ?? { name, color, amount: 0 };
      map.set(key, { ...prev, amount: prev.amount + t.amount });
    });
    return Array.from(map.values()).sort((a, b) => b.amount - a.amount);
  }, [curMonthTx]);

  // Filtered transaction list
  const visibleTx = txFilter === "all" ? curMonthTx : curMonthTx.filter((t) => t.type === txFilter);

  return (
    <>
      {editing !== null && (
        <TxModal
          initial={editing === "new" ? null : editing}
          categories={categories}
          onSaved={() => {
            setEditing(null);
            // Reload
            setLoading(true);
            const oldest = months6[0] + "-01";
            const { to: newest } = monthRange(month);
            sba.from("transactions")
              .select("*, tx_categories(name, color)")
              .gte("tx_date", oldest).lte("tx_date", newest)
              .order("tx_date", { ascending: false })
              .then(({ data }: SbaRes) => { setLoading(false); setTxList((data as unknown as Tx[]) ?? []); });
          }}
          onCancel={() => setEditing(null)}
        />
      )}

      <div style={{ padding: "32px 36px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
          <div>
            <h1 className="kr-d3" style={{ fontSize: 24, fontWeight: 800 }}>수입 · 지출</h1>
            <p className="muted" style={{ fontSize: 13.5, marginTop: 4 }}>월별 수입·지출 현황을 기록하고 확인합니다.</p>
          </div>
          <div className="flex gap-s" style={{ alignItems: "center" }}>
            <input type="month" className="input" value={month}
              onChange={(e) => setMonth(e.target.value)} style={{ width: 155 }} />
            <button className="btn btn--sm" onClick={() => setEditing("new")}>+ 추가</button>
          </div>
        </div>

        {err && <div role="alert" style={{ color: "#b3261e", fontSize: 13.5, marginBottom: 16 }}>{err}</div>}

        {/* Summary cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14, marginBottom: 24 }}>
          <div className="panel" style={{ padding: "16px 18px", borderLeft: "3px solid #1a7f4b" }}>
            <div className="muted" style={{ fontSize: 11.5, marginBottom: 5 }}>이번달 수입</div>
            <div style={{ fontSize: 21, fontWeight: 800, color: "#1a7f4b" }}>{won(income)}</div>
            <div className="muted" style={{ fontSize: 11.5, marginTop: 4 }}>{curMonthTx.filter((t) => t.type === "income").length}건</div>
          </div>
          <div className="panel" style={{ padding: "16px 18px", borderLeft: "3px solid #b3261e" }}>
            <div className="muted" style={{ fontSize: 11.5, marginBottom: 5 }}>이번달 지출</div>
            <div style={{ fontSize: 21, fontWeight: 800, color: "#b3261e" }}>{won(expense)}</div>
            <div className="muted" style={{ fontSize: 11.5, marginTop: 4 }}>{curMonthTx.filter((t) => t.type === "expense").length}건</div>
          </div>
          <div className="panel" style={{ padding: "16px 18px", background: balance >= 0 ? undefined : "#fff5f5", borderLeft: `3px solid ${balance >= 0 ? "var(--ink)" : "#b3261e"}` }}>
            <div className="muted" style={{ fontSize: 11.5, marginBottom: 5 }}>잔액 (수입 − 지출)</div>
            <div style={{ fontSize: 21, fontWeight: 800, color: balance >= 0 ? "var(--ink)" : "#b3261e" }}>
              {balance >= 0 ? "+" : ""}{won(balance)}
            </div>
            <div className="muted" style={{ fontSize: 11.5, marginTop: 4 }}>{ym.label(month)} 기준</div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 20, marginBottom: 24 }}>
          {/* Bar chart */}
          <div className="panel" style={{ padding: "18px 20px" }}>
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 14, color: "var(--muted)" }}>최근 6개월 수입·지출</div>
            <div style={{ display: "flex", gap: 10, height: 120, alignItems: "flex-end" }}>
              {chartData.map(({ label, income: inc, expense: exp }) => (
                <div key={label} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                  <div style={{ display: "flex", gap: 3, width: "100%", height: 100, alignItems: "flex-end" }}>
                    <div style={{ flex: 1, background: "#1a7f4b", opacity: .75, borderRadius: "3px 3px 0 0", height: `${(inc / maxVal) * 100}%`, minHeight: inc > 0 ? 2 : 0 }} />
                    <div style={{ flex: 1, background: "#b3261e", opacity: .7, borderRadius: "3px 3px 0 0", height: `${(exp / maxVal) * 100}%`, minHeight: exp > 0 ? 2 : 0 }} />
                  </div>
                  <div style={{ fontSize: 10.5, color: "var(--muted)", marginTop: 4 }}>{label}</div>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 16, marginTop: 10 }}>
              {[["#1a7f4b", "수입"], ["#b3261e", "지출"]].map(([c, l]) => (
                <div key={l} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11 }}>
                  <span style={{ width: 10, height: 10, background: c, borderRadius: 2, display: "inline-block", opacity: .8 }} />
                  {l}
                </div>
              ))}
            </div>
          </div>

          {/* Expense breakdown */}
          <div className="panel" style={{ padding: "18px 20px", minWidth: 220 }}>
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 14, color: "var(--muted)" }}>지출 카테고리</div>
            {expenseCats.length === 0
              ? <p className="muted" style={{ fontSize: 12 }}>지출 없음</p>
              : expenseCats.map(({ name, color, amount }) => (
                <div key={name} style={{ marginBottom: 9 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 3 }}>
                    <span style={{ fontWeight: 600 }}>{name}</span>
                    <span className="muted">{won(amount)}</span>
                  </div>
                  <div style={{ height: 4, background: "var(--surface-2)", borderRadius: 2 }}>
                    <div style={{ height: 4, background: color, borderRadius: 2, width: `${(amount / expense) * 100}%` }} />
                  </div>
                </div>
              ))
            }
          </div>
        </div>

        {/* Transaction list */}
        <div className="panel" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", borderBottom: "1px solid var(--line-2)" }}>
            <div style={{ display: "flex", gap: 6 }}>
              {(["all", "income", "expense"] as const).map((f) => (
                <button key={f} type="button" onClick={() => setTxFilter(f)}
                  style={{ padding: "5px 12px", border: "1px solid var(--line-2)", borderRadius: 4, background: txFilter === f ? "var(--ink)" : "transparent", color: txFilter === f ? "var(--paper)" : "var(--ink)", fontSize: 12.5, cursor: "pointer", fontWeight: txFilter === f ? 700 : 400 }}>
                  {f === "all" ? "전체" : f === "income" ? "수입" : "지출"}
                </button>
              ))}
            </div>
            <span className="muted" style={{ fontSize: 12 }}>{visibleTx.length}건</span>
          </div>

          {loading
            ? <div className="cellsub" style={{ padding: 40, textAlign: "center" }}>불러오는 중…</div>
            : visibleTx.length === 0
            ? <div className="cellsub" style={{ padding: 40, textAlign: "center" }}>거래 내역이 없습니다.</div>
            : (
              <table className="table">
                <thead>
                  <tr>
                    <th>날짜</th>
                    <th>내용</th>
                    <th>카테고리</th>
                    <th>거래처</th>
                    <th style={{ textAlign: "right" }}>금액</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {visibleTx.map((tx) => (
                    <tr key={tx.id}>
                      <td className="cellsub">{tx.tx_date}</td>
                      <td style={{ fontWeight: 600 }}>{tx.description}</td>
                      <td>
                        {tx.tx_categories && (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12 }}>
                            <span style={{ width: 7, height: 7, borderRadius: "50%", background: tx.tx_categories.color, display: "inline-block" }} />
                            {tx.tx_categories.name}
                          </span>
                        )}
                      </td>
                      <td className="cellsub">{tx.vendor_client ?? "—"}</td>
                      <td style={{ textAlign: "right", fontWeight: 700, color: tx.type === "income" ? "#1a7f4b" : "#b3261e" }}>
                        {tx.type === "income" ? "+" : "−"}{tx.amount.toLocaleString()}원
                      </td>
                      <td>
                        <div className="flex gap-s" style={{ justifyContent: "flex-end" }}>
                          <button className="btn btn--sm btn--ghost" style={{ fontSize: 11.5 }} onClick={() => setEditing(tx)}>수정</button>
                          <button className="btn btn--sm btn--ghost" style={{ fontSize: 11.5, color: "#b3261e" }} onClick={() => deleteTx(tx)}>삭제</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          }
        </div>
      </div>
    </>
  );
}

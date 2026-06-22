"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/AuthProvider";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sba = supabase as any;
type SbaRes = { data: unknown; error: { message: string } | null };

type Schedule = {
  id: string;
  title: string;
  category: string;
  start_date: string;
  end_date: string | null;
  all_day: boolean;
  start_time: string | null;
  end_time: string | null;
  location: string | null;
  notes: string | null;
  created_at: string;
};

type Draft = {
  title: string;
  category: string;
  start_date: string;
  end_date: string;
  all_day: boolean;
  start_time: string;
  end_time: string;
  location: string;
  notes: string;
};

const CATS: { key: string; color: string }[] = [
  { key: "업무", color: "#2563eb" },
  { key: "회의", color: "#0891b2" },
  { key: "현장", color: "#1f7a3d" },
  { key: "행사", color: "#9a6a1e" },
  { key: "휴무", color: "#dc2626" },
  { key: "개인", color: "#7c3aed" },
  { key: "기타", color: "#475569" },
];
const colorOf = (c: string) => CATS.find((x) => x.key === c)?.color ?? "#475569";
const WEEK = ["일", "월", "화", "수", "목", "금", "토"];

function ymd(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function todayStr() { return ymd(new Date()); }

// 6주 × 7일 그리드 (월요일 무관, 일요일 시작)
function monthGrid(year: number, month: number): Date[][] {
  const first = new Date(year, month, 1);
  const start = new Date(year, month, 1 - first.getDay());
  const weeks: Date[][] = [];
  const cur = new Date(start);
  for (let w = 0; w < 6; w++) {
    const row: Date[] = [];
    for (let d = 0; d < 7; d++) {
      row.push(new Date(cur));
      cur.setDate(cur.getDate() + 1);
    }
    weeks.push(row);
  }
  return weeks;
}

// ── 편집 모달 ────────────────────────────────────────────────────────────────

function ScheduleEditor({ item, defaultDate, onSave, onDelete, onClose }: {
  item: Schedule | null; defaultDate: string; onSave: () => void; onDelete: (id: string) => void; onClose: () => void;
}) {
  const { user } = useAuth();
  const [d, setD] = useState<Draft>(() => ({
    title: item?.title ?? "",
    category: item?.category ?? "업무",
    start_date: item?.start_date ?? defaultDate,
    end_date: item?.end_date ?? "",
    all_day: item?.all_day ?? true,
    start_time: item?.start_time ?? "",
    end_time: item?.end_time ?? "",
    location: item?.location ?? "",
    notes: item?.notes ?? "",
  }));
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function set<K extends keyof Draft>(k: K, v: Draft[K]) { setD((p) => ({ ...p, [k]: v })); }

  async function save() {
    if (!d.title.trim()) { setErr("일정 제목을 입력하세요."); return; }
    if (!d.start_date) { setErr("시작일을 입력하세요."); return; }
    setSaving(true); setErr(null);
    const base = {
      title: d.title.trim(),
      category: d.category,
      start_date: d.start_date,
      end_date: d.end_date && d.end_date >= d.start_date ? d.end_date : null,
      all_day: d.all_day,
      start_time: d.all_day ? null : (d.start_time || null),
      end_time: d.all_day ? null : (d.end_time || null),
      location: d.location.trim() || null,
      notes: d.notes.trim() || null,
      updated_at: new Date().toISOString(),
    };
    const payload = item ? base : { ...base, created_by: user?.id ?? null };
    const req = item ? sba.from("schedules").update(payload).eq("id", item.id) : sba.from("schedules").insert(payload);
    const { error }: SbaRes = await req;
    setSaving(false);
    if (error) { setErr((error as { message: string }).message); return; }
    onSave();
  }

  const L = (t: string) => <label style={{ fontSize: 13, fontWeight: 600 }}>{t}</label>;

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 300, background: "rgba(0,0,0,.45)", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "40px 20px 60px", overflowY: "auto" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "var(--paper)", borderRadius: 8, padding: "28px 32px", width: "100%", maxWidth: 520, boxShadow: "0 24px 64px rgba(0,0,0,.3)" }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 22 }}>{item ? "일정 편집" : "새 일정"}</h2>

        <div className="field" style={{ marginBottom: 12 }}>{L("제목 *")}
          <input className="input" placeholder="예: 경남본부 점검 회의" value={d.title} onChange={(e) => set("title", e.target.value)} />
        </div>

        <div className="field" style={{ marginBottom: 12 }}>{L("분류")}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {CATS.map((c) => (
              <button key={c.key} type="button" onClick={() => set("category", c.key)}
                style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "5px 11px", borderRadius: 20, fontSize: 12, cursor: "pointer",
                  border: "1px solid " + (d.category === c.key ? c.color : "var(--line-2)"),
                  background: d.category === c.key ? c.color : "transparent", color: d.category === c.key ? "#fff" : "inherit", fontWeight: d.category === c.key ? 700 : 400 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: d.category === c.key ? "#fff" : c.color }} />
                {c.key}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
          <div className="field">{L("시작일")}
            <input className="input" type="date" value={d.start_date} onChange={(e) => set("start_date", e.target.value)} />
          </div>
          <div className="field">{L("종료일 (선택)")}
            <input className="input" type="date" value={d.end_date} min={d.start_date} onChange={(e) => set("end_date", e.target.value)} />
          </div>
        </div>

        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, marginBottom: 12, cursor: "pointer" }}>
          <input type="checkbox" checked={d.all_day} onChange={(e) => set("all_day", e.target.checked)} />
          하루 종일
        </label>

        {!d.all_day && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
            <div className="field">{L("시작 시간")}<input className="input" type="time" value={d.start_time} onChange={(e) => set("start_time", e.target.value)} /></div>
            <div className="field">{L("종료 시간")}<input className="input" type="time" value={d.end_time} onChange={(e) => set("end_time", e.target.value)} /></div>
          </div>
        )}

        <div className="field" style={{ marginBottom: 12 }}>{L("장소")}
          <input className="input" placeholder="예: 본사 회의실, 창원 현장" value={d.location} onChange={(e) => set("location", e.target.value)} />
        </div>
        <div className="field" style={{ marginBottom: 20 }}>{L("메모")}
          <textarea className="input" rows={2} value={d.notes} onChange={(e) => set("notes", e.target.value)} style={{ resize: "vertical" }} />
        </div>

        {err && <p style={{ color: "#b3261e", fontSize: 13, marginBottom: 12 }}>{err}</p>}
        <div style={{ display: "flex", gap: 10, justifyContent: "space-between", alignItems: "center" }}>
          <div>
            {item && <button className="btn btn--ghost btn--sm" type="button" onClick={() => onDelete(item.id)} style={{ color: "#b3261e" }}>삭제</button>}
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button className="btn btn--ghost btn--sm" type="button" onClick={onClose}>취소</button>
            <button className="btn btn--sm" type="button" onClick={save} disabled={saving}>{saving ? "저장 중…" : item ? "저장" : "등록"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── 메인 ──────────────────────────────────────────────────────────────────────

export default function ScheduleDashboard() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth()); // 0-based
  const [items, setItems] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [rev, setRev] = useState(0);
  const [editItem, setEditItem] = useState<Schedule | null>(null);
  const [defaultDate, setDefaultDate] = useState(todayStr());
  const [showEditor, setShowEditor] = useState(false);

  useEffect(() => {
    setLoading(true);
    sba.from("schedules").select("*").order("start_date", { ascending: true })
      .then(({ data }: SbaRes) => { setLoading(false); setItems((data as Schedule[]) ?? []); });
  }, [rev]);

  const grid = monthGrid(year, month);
  const today = todayStr();

  // 해당 날짜에 걸친 일정
  function eventsOn(dateStr: string) {
    return items.filter((e) => {
      const end = e.end_date && e.end_date >= e.start_date ? e.end_date : e.start_date;
      return e.start_date <= dateStr && end >= dateStr;
    });
  }

  // 이번 달 목록 (시작일이 이번 달이거나 이번 달에 걸친 것)
  const monthPfx = `${year}-${String(month + 1).padStart(2, "0")}`;
  const monthList = items.filter((e) => {
    const end = e.end_date && e.end_date >= e.start_date ? e.end_date : e.start_date;
    return e.start_date.slice(0, 7) === monthPfx || (e.start_date <= `${monthPfx}-31` && end >= `${monthPfx}-01`);
  }).sort((a, b) => a.start_date.localeCompare(b.start_date) || (a.start_time ?? "").localeCompare(b.start_time ?? ""));

  function prevMonth() { if (month === 0) { setYear((y) => y - 1); setMonth(11); } else setMonth((m) => m - 1); }
  function nextMonth() { if (month === 11) { setYear((y) => y + 1); setMonth(0); } else setMonth((m) => m + 1); }
  function goToday() { setYear(now.getFullYear()); setMonth(now.getMonth()); }

  function openNew(date: string) { setEditItem(null); setDefaultDate(date); setShowEditor(true); }
  function openEdit(e: Schedule) { setEditItem(e); setDefaultDate(e.start_date); setShowEditor(true); }

  async function del(id: string) {
    if (!confirm("이 일정을 삭제하시겠습니까?")) return;
    await sba.from("schedules").delete().eq("id", id);
    setShowEditor(false);
    setItems((prev) => prev.filter((e) => e.id !== id));
  }

  const navBtn: React.CSSProperties = { background: "none", border: "1px solid var(--line-2)", borderRadius: 6, width: 30, height: 30, cursor: "pointer", fontSize: 16, color: "var(--muted)" };

  return (
    <>
      <div className="apage-head">
        <div><h1>일정 관리</h1><p>그리드온 전사 일정 · 월간 캘린더</p></div>
        <button className="btn btn--sm" type="button" onClick={() => openNew(today)}>＋ 새 일정</button>
      </div>

      {/* 분류 범례 */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 14, fontSize: 12, color: "var(--muted)" }}>
        {CATS.map((c) => (
          <span key={c.key} style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: c.color }} /> {c.key}
          </span>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 16, alignItems: "start" }}>
        {/* 캘린더 */}
        <div className="panel">
          <div className="panel-body" style={{ borderBottom: "1px solid var(--line-2)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <button type="button" style={navBtn} onClick={prevMonth}>‹</button>
              <span style={{ fontWeight: 800, fontSize: 17, minWidth: 110, textAlign: "center" }}>{year}년 {month + 1}월</span>
              <button type="button" style={navBtn} onClick={nextMonth}>›</button>
            </div>
            <button className="btn btn--ghost btn--sm" type="button" onClick={goToday}>오늘</button>
          </div>

          <div style={{ padding: "0 0 8px" }}>
            {/* 요일 헤더 */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", borderBottom: "1px solid var(--line-2)" }}>
              {WEEK.map((w, i) => (
                <div key={w} style={{ textAlign: "center", padding: "8px 0", fontSize: 12, fontWeight: 700, color: i === 0 ? "#dc2626" : i === 6 ? "#2563eb" : "var(--muted)" }}>{w}</div>
              ))}
            </div>
            {/* 날짜 그리드 */}
            {grid.map((row, ri) => (
              <div key={ri} style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)" }}>
                {row.map((date) => {
                  const ds = ymd(date);
                  const inMonth = date.getMonth() === month;
                  const isToday = ds === today;
                  const evs = eventsOn(ds);
                  const dow = date.getDay();
                  return (
                    <div key={ds} onClick={() => openNew(ds)}
                      style={{ minHeight: 92, borderRight: "1px solid var(--line-2)", borderBottom: "1px solid var(--line-2)", padding: 4, cursor: "pointer", background: isToday ? "rgba(37,99,235,.06)" : inMonth ? "transparent" : "var(--faint)", opacity: inMonth ? 1 : .55 }}>
                      <div style={{ textAlign: "right", fontSize: 12, fontWeight: isToday ? 800 : 500, marginBottom: 2,
                        color: isToday ? "#2563eb" : dow === 0 ? "#dc2626" : dow === 6 ? "#2563eb" : "inherit" }}>
                        {isToday ? <span style={{ background: "#2563eb", color: "#fff", borderRadius: "50%", padding: "1px 6px" }}>{date.getDate()}</span> : date.getDate()}
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                        {evs.slice(0, 3).map((e) => (
                          <div key={e.id} onClick={(ev) => { ev.stopPropagation(); openEdit(e); }}
                            title={e.title}
                            style={{ fontSize: 11, lineHeight: 1.3, padding: "1px 5px", borderRadius: 4, background: colorOf(e.category), color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {!e.all_day && e.start_time ? `${e.start_time} ` : ""}{e.title}
                          </div>
                        ))}
                        {evs.length > 3 && <div style={{ fontSize: 10, color: "var(--muted)", paddingLeft: 4 }}>＋{evs.length - 3}건</div>}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* 이번 달 목록 */}
        <div className="panel" style={{ alignSelf: "start" }}>
          <div className="panel-body" style={{ borderBottom: "1px solid var(--line-2)", fontWeight: 700, fontSize: 14 }}>
            {month + 1}월 일정 {monthList.length}건
          </div>
          <div style={{ maxHeight: "70vh", overflowY: "auto", padding: 8 }}>
            {loading ? (
              <p className="muted" style={{ fontSize: 13, padding: 12 }}>불러오는 중…</p>
            ) : monthList.length === 0 ? (
              <p className="muted" style={{ fontSize: 13, padding: 12 }}>이번 달 일정이 없습니다.</p>
            ) : monthList.map((e) => (
              <button key={e.id} type="button" onClick={() => openEdit(e)}
                style={{ display: "block", width: "100%", textAlign: "left", padding: "9px 10px", border: "none", background: "none", cursor: "pointer", borderRadius: 6, marginBottom: 2 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 2 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: colorOf(e.category), flexShrink: 0 }} />
                  <span style={{ fontSize: 12, fontFamily: "var(--font-mono)", color: "var(--muted)" }}>
                    {e.start_date.slice(5).replace("-", "/")}{e.end_date && e.end_date !== e.start_date ? `~${e.end_date.slice(5).replace("-", "/")}` : ""}
                    {!e.all_day && e.start_time ? ` ${e.start_time}` : ""}
                  </span>
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, paddingLeft: 15 }}>{e.title}</div>
                {e.location && <div style={{ fontSize: 11, color: "var(--muted)", paddingLeft: 15 }}>📍 {e.location}</div>}
              </button>
            ))}
          </div>
        </div>
      </div>

      {showEditor && (
        <ScheduleEditor
          item={editItem}
          defaultDate={defaultDate}
          onSave={() => { setShowEditor(false); setRev((r) => r + 1); }}
          onDelete={del}
          onClose={() => setShowEditor(false)}
        />
      )}
    </>
  );
}

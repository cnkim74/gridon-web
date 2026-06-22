"use client";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/AuthProvider";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sba = supabase as any;
type SbaRes = { data: unknown; error: { message: string } | null };

type Recur = "none" | "weekly" | "monthly";

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
  assignee: string | null;
  recur: Recur;
  recur_until: string | null;
  created_at: string;
};

type Draft = {
  title: string; category: string; start_date: string; end_date: string;
  all_day: boolean; start_time: string; end_time: string; location: string; notes: string;
  assignee: string; recur: Recur; recur_until: string;
};

type Emp = { id: string; name: string };
type Att = { id: string; work_date: string; status: string | null; check_in: string | null; check_out: string | null };

// 캘린더에 표시되는 한 건(반복 전개 포함)
type Occ = Schedule & { occ_start: string; occ_end: string };

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
const ATT_COLOR = "#94a3b8";

function pad(n: number) { return String(n).padStart(2, "0"); }
function ymd(d: Date) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
function parseYmd(s: string) { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); }
function addDays(d: Date, n: number) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
function addMonths(d: Date, n: number) {
  const x = new Date(d); const day = x.getDate();
  x.setDate(1); x.setMonth(x.getMonth() + n);
  x.setDate(Math.min(day, new Date(x.getFullYear(), x.getMonth() + 1, 0).getDate()));
  return x;
}
function dayDiff(a: string, b: string) { return Math.round((parseYmd(b).getTime() - parseYmd(a).getTime()) / 86400000); }
function todayStr() { return ymd(new Date()); }

function monthGrid(year: number, month: number): Date[][] {
  const first = new Date(year, month, 1);
  const start = new Date(year, month, 1 - first.getDay());
  const weeks: Date[][] = [];
  const cur = new Date(start);
  for (let w = 0; w < 6; w++) {
    const row: Date[] = [];
    for (let d = 0; d < 7; d++) { row.push(new Date(cur)); cur.setDate(cur.getDate() + 1); }
    weeks.push(row);
  }
  return weeks;
}

// 반복 일정을 표시 범위 내 개별 건으로 전개
function expandOccurrences(list: Schedule[], rangeStart: string, rangeEnd: string): Occ[] {
  const out: Occ[] = [];
  for (const s of list) {
    const span = s.end_date && s.end_date >= s.start_date ? dayDiff(s.start_date, s.end_date) : 0;
    if (s.recur === "none" || !s.recur) {
      const end = ymd(addDays(parseYmd(s.start_date), span));
      if (s.start_date <= rangeEnd && end >= rangeStart) out.push({ ...s, occ_start: s.start_date, occ_end: end });
      continue;
    }
    const until = s.recur_until || rangeEnd;
    let cur = parseYmd(s.start_date);
    for (let i = 0; i < 500; i++) {
      const occStart = ymd(cur);
      if (occStart > until || occStart > rangeEnd) break;
      const occEnd = ymd(addDays(cur, span));
      if (occStart <= rangeEnd && occEnd >= rangeStart) out.push({ ...s, occ_start: occStart, occ_end: occEnd });
      cur = s.recur === "weekly" ? addDays(cur, 7) : addMonths(cur, 1);
    }
  }
  return out;
}

// ── 편집 모달 ────────────────────────────────────────────────────────────────

function ScheduleEditor({ item, defaultDate, employees, onSave, onDelete, onClose }: {
  item: Schedule | null; defaultDate: string; employees: Emp[]; onSave: () => void; onDelete: (id: string) => void; onClose: () => void;
}) {
  const { user } = useAuth();
  const [d, setD] = useState<Draft>(() => ({
    title: item?.title ?? "", category: item?.category ?? "업무",
    start_date: item?.start_date ?? defaultDate, end_date: item?.end_date ?? "",
    all_day: item?.all_day ?? true, start_time: item?.start_time ?? "", end_time: item?.end_time ?? "",
    location: item?.location ?? "", notes: item?.notes ?? "",
    assignee: item?.assignee ?? "", recur: item?.recur ?? "none", recur_until: item?.recur_until ?? "",
  }));
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  function set<K extends keyof Draft>(k: K, v: Draft[K]) { setD((p) => ({ ...p, [k]: v })); }

  async function save() {
    if (!d.title.trim()) { setErr("일정 제목을 입력하세요."); return; }
    if (!d.start_date) { setErr("시작일을 입력하세요."); return; }
    setSaving(true); setErr(null);
    const base = {
      title: d.title.trim(), category: d.category, start_date: d.start_date,
      end_date: d.end_date && d.end_date >= d.start_date ? d.end_date : null,
      all_day: d.all_day, start_time: d.all_day ? null : (d.start_time || null), end_time: d.all_day ? null : (d.end_time || null),
      location: d.location.trim() || null, notes: d.notes.trim() || null,
      assignee: d.assignee || null, recur: d.recur, recur_until: d.recur !== "none" && d.recur_until ? d.recur_until : null,
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
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: d.category === c.key ? "#fff" : c.color }} />{c.key}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
          <div className="field">{L("담당자")}
            <select className="input" value={d.assignee} onChange={(e) => set("assignee", e.target.value)}>
              <option value="">(미지정)</option>
              {employees.map((emp) => <option key={emp.id} value={emp.name}>{emp.name}</option>)}
            </select>
          </div>
          <div className="field">{L("반복")}
            <select className="input" value={d.recur} onChange={(e) => set("recur", e.target.value as Recur)}>
              <option value="none">안 함</option>
              <option value="weekly">매주</option>
              <option value="monthly">매월</option>
            </select>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
          <div className="field">{L("시작일")}
            <input className="input" type="date" value={d.start_date} onChange={(e) => set("start_date", e.target.value)} />
          </div>
          <div className="field">{L(d.recur === "none" ? "종료일 (선택)" : "반복 종료일")}
            <input className="input" type="date" min={d.start_date}
              value={d.recur === "none" ? d.end_date : d.recur_until}
              onChange={(e) => set(d.recur === "none" ? "end_date" : "recur_until", e.target.value)} />
          </div>
        </div>

        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, marginBottom: 12, cursor: "pointer" }}>
          <input type="checkbox" checked={d.all_day} onChange={(e) => set("all_day", e.target.checked)} /> 하루 종일
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
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>{item && <button className="btn btn--ghost btn--sm" type="button" onClick={() => onDelete(item.id)} style={{ color: "#b3261e" }}>삭제</button>}</div>
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

type View = "month" | "week" | "day";

export default function ScheduleDashboard() {
  const [view, setView] = useState<View>("month");
  const [cursor, setCursor] = useState(new Date());
  const [items, setItems] = useState<Schedule[]>([]);
  const [employees, setEmployees] = useState<Emp[]>([]);
  const [assigneeFilter, setAssigneeFilter] = useState("전체");
  const [showAtt, setShowAtt] = useState(false);
  const [attRecords, setAttRecords] = useState<Att[]>([]);
  const [loading, setLoading] = useState(true);
  const [rev, setRev] = useState(0);
  const [editItem, setEditItem] = useState<Schedule | null>(null);
  const [defaultDate, setDefaultDate] = useState(todayStr());
  const [showEditor, setShowEditor] = useState(false);

  // 일정 + 직원 로드
  useEffect(() => {
    setLoading(true);
    sba.from("schedules").select("*").order("start_date", { ascending: true })
      .then(({ data }: SbaRes) => { setLoading(false); setItems((data as Schedule[]) ?? []); });
  }, [rev]);
  useEffect(() => {
    sba.from("employees").select("id,name").eq("status", "재직").order("name")
      .then(({ data }: SbaRes) => setEmployees((data as Emp[]) ?? []));
  }, []);

  // 표시 범위
  const today = todayStr();
  const { rangeStart, rangeEnd, weeks, weekDays, title } = useMemo(() => {
    if (view === "month") {
      const y = cursor.getFullYear(), m = cursor.getMonth();
      const g = monthGrid(y, m);
      return { rangeStart: ymd(g[0][0]), rangeEnd: ymd(g[5][6]), weeks: g, weekDays: [] as Date[], title: `${y}년 ${m + 1}월` };
    }
    if (view === "week") {
      const ws = addDays(cursor, -cursor.getDay());
      const days = Array.from({ length: 7 }, (_, i) => addDays(ws, i));
      return { rangeStart: ymd(days[0]), rangeEnd: ymd(days[6]), weeks: [] as Date[][], weekDays: days, title: `${ws.getFullYear()}년 ${ws.getMonth() + 1}월 ${ws.getDate()}일 주` };
    }
    const ds = ymd(cursor);
    return { rangeStart: ds, rangeEnd: ds, weeks: [] as Date[][], weekDays: [cursor], title: `${cursor.getFullYear()}년 ${cursor.getMonth() + 1}월 ${cursor.getDate()}일 (${WEEK[cursor.getDay()]})` };
  }, [view, cursor]);

  // 출근부 로드 (특정 담당자 + 범위)
  const selectedEmp = employees.find((e) => e.name === assigneeFilter);
  useEffect(() => {
    if (!showAtt || !selectedEmp) { setAttRecords([]); return; }
    sba.from("attendance").select("id,work_date,status,check_in,check_out")
      .eq("employee_id", selectedEmp.id).gte("work_date", rangeStart).lte("work_date", rangeEnd)
      .then(({ data }: SbaRes) => setAttRecords((data as Att[]) ?? []));
  }, [showAtt, selectedEmp, rangeStart, rangeEnd]);

  // 필터 + 반복 전개
  const occ = useMemo(() => {
    const filtered = assigneeFilter === "전체" ? items : items.filter((e) => e.assignee === assigneeFilter);
    return expandOccurrences(filtered, rangeStart, rangeEnd);
  }, [items, assigneeFilter, rangeStart, rangeEnd]);

  function schedOn(ds: string) {
    return occ.filter((e) => e.occ_start <= ds && e.occ_end >= ds)
      .sort((a, b) => (a.all_day === b.all_day ? (a.start_time ?? "").localeCompare(b.start_time ?? "") : a.all_day ? -1 : 1));
  }
  function attOn(ds: string) { return attRecords.filter((a) => a.work_date === ds); }

  function prev() { setCursor((c) => view === "month" ? addMonths(c, -1) : view === "week" ? addDays(c, -7) : addDays(c, -1)); }
  function next() { setCursor((c) => view === "month" ? addMonths(c, 1) : view === "week" ? addDays(c, 7) : addDays(c, 1)); }

  function openNew(date: string) { setEditItem(null); setDefaultDate(date); setShowEditor(true); }
  function openEdit(e: Occ | Schedule) { const base = items.find((x) => x.id === e.id) ?? (e as Schedule); setEditItem(base); setDefaultDate(base.start_date); setShowEditor(true); }
  async function del(id: string) {
    if (!confirm("이 일정을 삭제하시겠습니까? (반복 일정이면 전체가 삭제됩니다)")) return;
    await sba.from("schedules").delete().eq("id", id);
    setShowEditor(false); setItems((prev) => prev.filter((e) => e.id !== id));
  }

  const navBtn: React.CSSProperties = { background: "none", border: "1px solid var(--line-2)", borderRadius: 6, width: 30, height: 30, cursor: "pointer", fontSize: 16, color: "var(--muted)" };
  const viewBtn = (v: View): React.CSSProperties => ({ padding: "5px 12px", border: "1px solid var(--line-2)", borderRadius: 6, fontSize: 13, cursor: "pointer", background: view === v ? "var(--ink)" : "transparent", color: view === v ? "var(--paper)" : "inherit", fontWeight: view === v ? 700 : 400 });

  function Chip({ e }: { e: Occ }) {
    return (
      <div onClick={(ev) => { ev.stopPropagation(); openEdit(e); }} title={e.title}
        style={{ fontSize: 11, lineHeight: 1.35, padding: "1px 5px", borderRadius: 4, background: colorOf(e.category), color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", cursor: "pointer", display: "flex", gap: 4, alignItems: "center" }}>
        {e.recur !== "none" && <span title="반복">↻</span>}
        <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{!e.all_day && e.start_time ? `${e.start_time} ` : ""}{e.title}{e.assignee ? ` · ${e.assignee}` : ""}</span>
      </div>
    );
  }
  function AttChip({ a }: { a: Att }) {
    return (
      <div title={`출근부: ${a.status ?? ""}`} style={{ fontSize: 11, lineHeight: 1.35, padding: "1px 5px", borderRadius: 4, border: `1px solid ${ATT_COLOR}`, color: ATT_COLOR, background: "transparent", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
        🕘 {a.status ?? "출근"}{a.check_in ? ` ${a.check_in.slice(0, 5)}` : ""}
      </div>
    );
  }

  return (
    <>
      <div className="apage-head">
        <div><h1>일정 관리</h1><p>그리드온 전사 일정 · 담당자·반복·출근부 연동</p></div>
        <button className="btn btn--sm" type="button" onClick={() => openNew(today)}>＋ 새 일정</button>
      </div>

      {/* 툴바: 보기 / 담당자 / 출근부 / 범례 */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center", marginBottom: 12 }}>
        <div style={{ display: "flex", gap: 4 }}>
          {(["month", "week", "day"] as View[]).map((v) => (
            <button key={v} type="button" style={viewBtn(v)} onClick={() => setView(v)}>{v === "month" ? "월" : v === "week" ? "주" : "일"}</button>
          ))}
        </div>
        <select className="input" style={{ width: "auto", minWidth: 130, height: 32, padding: "0 10px" }} value={assigneeFilter} onChange={(e) => setAssigneeFilter(e.target.value)}>
          <option value="전체">담당자 전체</option>
          {employees.map((emp) => <option key={emp.id} value={emp.name}>{emp.name}</option>)}
        </select>
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, cursor: "pointer", color: selectedEmp ? "inherit" : "var(--muted)" }}
          title={selectedEmp ? "" : "특정 담당자를 선택하면 그 직원의 출근부가 표시됩니다"}>
          <input type="checkbox" checked={showAtt} onChange={(e) => setShowAtt(e.target.checked)} /> 출근부 표시
        </label>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", fontSize: 11, color: "var(--muted)", marginLeft: "auto" }}>
          {CATS.map((c) => <span key={c.key} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><span style={{ width: 9, height: 9, borderRadius: 2, background: c.color }} />{c.key}</span>)}
        </div>
      </div>

      <div className="panel">
        <div className="panel-body" style={{ borderBottom: "1px solid var(--line-2)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button type="button" style={navBtn} onClick={prev}>‹</button>
            <span style={{ fontWeight: 800, fontSize: 17, minWidth: 170, textAlign: "center" }}>{title}</span>
            <button type="button" style={navBtn} onClick={next}>›</button>
          </div>
          <button className="btn btn--ghost btn--sm" type="button" onClick={() => setCursor(new Date())}>오늘</button>
        </div>

        {/* ── 월 보기 ── */}
        {view === "month" && (
          <div style={{ paddingBottom: 8 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", borderBottom: "1px solid var(--line-2)" }}>
              {WEEK.map((w, i) => <div key={w} style={{ textAlign: "center", padding: "8px 0", fontSize: 12, fontWeight: 700, color: i === 0 ? "#dc2626" : i === 6 ? "#2563eb" : "var(--muted)" }}>{w}</div>)}
            </div>
            {weeks.map((row, ri) => (
              <div key={ri} style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)" }}>
                {row.map((date) => {
                  const ds = ymd(date), inMonth = date.getMonth() === cursor.getMonth(), isToday = ds === today, dow = date.getDay();
                  const evs = schedOn(ds), atts = showAtt ? attOn(ds) : [];
                  const all = [...evs, ...atts];
                  return (
                    <div key={ds} onClick={() => openNew(ds)} style={{ minHeight: 96, borderRight: "1px solid var(--line-2)", borderBottom: "1px solid var(--line-2)", padding: 4, cursor: "pointer", background: isToday ? "rgba(37,99,235,.06)" : inMonth ? "transparent" : "var(--faint)", opacity: inMonth ? 1 : .55 }}>
                      <div style={{ textAlign: "right", fontSize: 12, fontWeight: isToday ? 800 : 500, marginBottom: 2, color: isToday ? "#2563eb" : dow === 0 ? "#dc2626" : dow === 6 ? "#2563eb" : "inherit" }}>
                        {isToday ? <span style={{ background: "#2563eb", color: "#fff", borderRadius: "50%", padding: "1px 6px" }}>{date.getDate()}</span> : date.getDate()}
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                        {evs.slice(0, 3).map((e) => <Chip key={e.id + e.occ_start} e={e} />)}
                        {atts.slice(0, 1).map((a) => <AttChip key={a.id} a={a} />)}
                        {all.length > 4 && <div style={{ fontSize: 10, color: "var(--muted)", paddingLeft: 4 }}>＋{all.length - 4}건</div>}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        )}

        {/* ── 주 보기 ── */}
        {view === "week" && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)" }}>
            {weekDays.map((date) => {
              const ds = ymd(date), isToday = ds === today, dow = date.getDay();
              const evs = schedOn(ds), atts = showAtt ? attOn(ds) : [];
              return (
                <div key={ds} onClick={() => openNew(ds)} style={{ borderRight: "1px solid var(--line-2)", minHeight: 360, cursor: "pointer", background: isToday ? "rgba(37,99,235,.05)" : "transparent" }}>
                  <div style={{ textAlign: "center", padding: "8px 0", borderBottom: "1px solid var(--line-2)", fontSize: 12, fontWeight: 700, color: dow === 0 ? "#dc2626" : dow === 6 ? "#2563eb" : "var(--muted)" }}>
                    {WEEK[dow]} <span style={{ color: isToday ? "#2563eb" : "inherit" }}>{date.getDate()}</span>
                  </div>
                  <div style={{ padding: 5, display: "flex", flexDirection: "column", gap: 3 }}>
                    {evs.map((e) => <Chip key={e.id + e.occ_start} e={e} />)}
                    {atts.map((a) => <AttChip key={a.id} a={a} />)}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── 일 보기 ── */}
        {view === "day" && (() => {
          const ds = ymd(cursor); const evs = schedOn(ds); const atts = showAtt ? attOn(ds) : [];
          return (
            <div style={{ padding: "16px 20px" }}>
              {evs.length === 0 && atts.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px 0", color: "var(--muted)" }}>
                  <div style={{ marginBottom: 10 }}>등록된 일정이 없습니다.</div>
                  <button className="btn btn--ghost btn--sm" type="button" onClick={() => openNew(ds)}>＋ 이 날 일정 추가</button>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {evs.map((e) => (
                    <div key={e.id + e.occ_start} onClick={() => openEdit(e)} style={{ display: "flex", gap: 12, padding: "12px 14px", border: "1px solid var(--line-2)", borderLeft: `4px solid ${colorOf(e.category)}`, borderRadius: 8, cursor: "pointer" }}>
                      <div style={{ minWidth: 96, fontSize: 13, fontFamily: "var(--font-mono)", color: "var(--muted)" }}>{e.all_day ? "하루 종일" : `${e.start_time ?? ""}${e.end_time ? "~" + e.end_time : ""}`}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 700 }}>{e.recur !== "none" ? "↻ " : ""}{e.title} <span style={{ fontSize: 11, color: colorOf(e.category), fontWeight: 600 }}>· {e.category}</span></div>
                        <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
                          {e.assignee ? `👤 ${e.assignee}` : ""}{e.assignee && e.location ? " · " : ""}{e.location ? `📍 ${e.location}` : ""}
                        </div>
                        {e.notes && <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>{e.notes}</div>}
                      </div>
                    </div>
                  ))}
                  {atts.map((a) => (
                    <div key={a.id} style={{ display: "flex", gap: 12, padding: "12px 14px", border: `1px dashed ${ATT_COLOR}`, borderRadius: 8, color: ATT_COLOR }}>
                      <div style={{ minWidth: 96, fontSize: 13, fontFamily: "var(--font-mono)" }}>{a.check_in ? a.check_in.slice(0, 5) : ""}{a.check_out ? "~" + a.check_out.slice(0, 5) : ""}</div>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>🕘 출근부 · {a.status ?? "출근"}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })()}
      </div>

      {loading && <p className="muted" style={{ fontSize: 13, marginTop: 10 }}>불러오는 중…</p>}

      {showEditor && (
        <ScheduleEditor item={editItem} defaultDate={defaultDate} employees={employees}
          onSave={() => { setShowEditor(false); setRev((r) => r + 1); }} onDelete={del} onClose={() => setShowEditor(false)} />
      )}
    </>
  );
}

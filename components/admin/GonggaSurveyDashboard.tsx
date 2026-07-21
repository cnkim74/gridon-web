"use client";
import { useEffect, useState, useRef, Fragment } from "react";
import { supabase } from "@/lib/supabase";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sba = supabase as any;
type SbaRes = { data: unknown; error: { message: string } | null };

// app_settings 키
const K_API = "drive_api_key";          // 구글 API 키(드라이브·시트 공용, 결과보고서와 공유)
const K_SHEET = "result_sheet";         // 결과보고서용 시트(초기 시드용)
const K_GONGGA_SHEETS = "gongga_sheets"; // 지사별 공가조사표 구글시트 링크 (JSON: {지사: url})
const K_GONGGA_JISA = "gongga_jisa";     // 마지막 선택 지사

// 불량코드 범례(1~10)
const BAD = ["방수장치불량", "여유장 과다", "전력선동시시설", "맨홀 천공", "관로구 파손", "구조물파손", "관로파손 유입", "통신기기시설불량", "내관 미설치", "기타(단선등)"];
// 통신설비 시설내역 컬럼(13) + 시트 열 인덱스
const TEL_COLS = ["벽면번호", "관로구번호", "PE내관규격", "통신사업자", "케이블번호", "선종", "규격", "조수", "불량코드", "여유장유무", "접속함체유무", "봉인번호", "특이사항"];
const TEL_CIDX = [10, 11, 12, 13, 14, 15, 16, 17, 18, 22, 23, 24, 25];
// 자기설비 내역 컬럼(22) + 시트 열 인덱스
const SELF_COLS = ["자기설비코드", "자기설비 선로명", "자기설비 선로번호", "자기설비 전산화번호", "자기설비 벽면번호", "자기설비 관로구번호", "사업자", "상호", "임대기준", "관로규격", "PE내관규격", "승인", "설치일자", "케이블번호", "용도", "선종", "규격", "선로길이", "실측선로길이", "접속사유", "봉인번호", "접수번호"];
const SELF_CIDX = [1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23];
const TEL_MINROWS = 13, SELF_MINROWS = 13;

type Survey = { key: string; sa: string; dig: string; line: string; seq: string; bigo: string; hoe: string; tel: string[][]; self: string[][] };

// ── 시트 헬퍼 ──────────────────────────────────────────────────────────────
function extractSheetId(input: string): string {
  const s = (input ?? "").trim();
  // "웹에 게시" 링크(/spreadsheets/d/e/2PACX-…/pubhtml)는 API로 못 읽음 → 감지용 특수값
  if (/\/spreadsheets\/d\/e\//.test(s)) return "__PUBLISHED__";
  const m = s.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  if (m) return m[1];
  if (/^[a-zA-Z0-9_-]{20,}$/.test(s)) return s;
  return s;
}
const cell = (rows: unknown[][], r: number, c: number) => { const v = (rows[r] ?? [])[c]; return v == null ? "" : String(v).trim(); };
function normLine(s: string) { return (s ?? "").normalize("NFC").replace(/\s+/g, "").toLowerCase(); }
function titleOfRange(range: string): string { const m = range.match(/^'?([^'!]+)'?!/); return m ? m[1] : range; }

// 구글 API 응답을 JSON으로 안전 파싱. HTML(오류·로그인 페이지)이 오면 원인 구분 메시지로 던진다.
async function fetchJson(url: string): Promise<Record<string, unknown>> {
  const res = await fetch(url);
  const text = await res.text();
  let json: Record<string, unknown> | null = null;
  try { json = JSON.parse(text); } catch { /* HTML 등 비-JSON */ }
  if (!json) {
    // 서버가 JSON이 아닌 HTML을 반환 → 링크/키가 API 요청에 맞지 않음
    throw new Error("구글 서버가 데이터(JSON) 대신 웹페이지(HTML)를 반환했습니다. 시트 링크가 올바른 형식(…/spreadsheets/d/시트ID/edit)인지, API 키가 유효한지 확인하세요.");
  }
  const err = (json.error as { message?: string } | undefined)?.message;
  if (!res.ok) throw new Error(err || `구글 API 오류 (${res.status})`);
  return json;
}
async function sheetTitles(id: string, key: string): Promise<string[]> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${id}?key=${key}&fields=sheets.properties.title`;
  const json = await fetchJson(url);
  return ((json.sheets as { properties: { title: string } }[]) ?? []).map((s) => s.properties.title);
}
async function sheetsBatch(id: string, key: string, ranges: string[]): Promise<{ range: string; values?: unknown[][] }[]> {
  const qs = ranges.map((r) => `ranges=${encodeURIComponent(r)}`).join("&");
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${id}/values:batchGet?${qs}&majorDimension=ROWS&valueRenderOption=UNFORMATTED_VALUE&key=${key}`;
  const json = await fetchJson(url);
  return (json.valueRanges as { range: string; values?: unknown[][] }[]) ?? [];
}

// 공가조사표_{지사} 시트 → 맨홀별 Survey (46행/블록, '사업소명' 라벨행 기준)
function parseSurvey(rows: unknown[][]): Survey[] {
  const starts: number[] = [];
  for (let i = 0; i < rows.length; i++) if (cell(rows, i, 0).includes("사업소명")) starts.push(i);
  const out: Survey[] = [];
  for (let b = 0; b < starts.length; b++) {
    const s = starts[b];
    const end = b + 1 < starts.length ? starts[b + 1] : rows.length;
    const line = cell(rows, s + 1, 5), seq = cell(rows, s + 1, 7);
    if (!line && !seq) continue;
    // 자기설비 헤더행 찾기(블록 내 col B에 '자기설비')
    let selfHead = -1;
    for (let r = s + 6; r < end; r++) if (cell(rows, r, 1).includes("자기설비")) { selfHead = r; break; }
    const telEnd = selfHead > 0 ? selfHead : s + 34;
    const tel: string[][] = [];
    for (let r = s + 6; r < telEnd; r++) { const v = TEL_CIDX.map((c) => cell(rows, r, c)); if (v.some((x) => x)) tel.push(v); }
    const self: string[][] = [];
    if (selfHead > 0) for (let r = selfHead + 1; r < end; r++) { const v = SELF_CIDX.map((c) => cell(rows, r, c)); if (v.some((x) => x)) self.push(v); }
    out.push({ key: normLine(line + seq), sa: cell(rows, s + 1, 0), dig: cell(rows, s + 1, 3), line, seq, bigo: cell(rows, s + 1, 11), hoe: cell(rows, s + 1, 15), tel, self });
  }
  return out;
}

// 정기검사시스템_{지사} 시트 → 맨홀 기준목록(선로·선호·전산화). 공가조사표 탭에 없는 맨홀도 포함하기 위한 소스.
function parseRecList(rows: unknown[][], jisa: string): Survey[] {
  const out: Survey[] = [];
  for (let i = 0; i < rows.length; i++) {
    if (!(rows[i] ?? []).some((c) => String(c ?? "").includes("검사기록표"))) continue;
    const line = cell(rows, i + 3, 2), seq = cell(rows, i + 3, 4);
    if (!line && !seq) continue;
    out.push({ key: normLine(line + seq), sa: jisa, dig: cell(rows, i + 3, 7), line, seq, bigo: "", hoe: "", tel: [], self: [] });
  }
  return out;
}
const jisaOfTitle = (title: string) => title.replace(/^정기검사시스템_/, "").trim();

// ── 약도 직접 그리기 (아이패드 펜슬·터치 / PC 마우스) ─────────────────────────
function SketchPad({ value, onSave }: { value: string; onSave: (d: string) => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const c = ref.current; if (!c) return;
    const ctx = c.getContext("2d"); if (!ctx) return;
    ctx.clearRect(0, 0, c.width, c.height);
    if (value) { const img = new Image(); img.onload = () => ctx.drawImage(img, 0, 0, c.width, c.height); img.src = value; }
  }, [value]);

  const pos = (e: React.PointerEvent) => {
    const c = ref.current!; const r = c.getBoundingClientRect();
    return { x: (e.clientX - r.left) * (c.width / r.width), y: (e.clientY - r.top) * (c.height / r.height) };
  };
  const down = (e: React.PointerEvent) => { drawing.current = true; last.current = pos(e); (e.target as Element).setPointerCapture(e.pointerId); };
  const move = (e: React.PointerEvent) => {
    if (!drawing.current) return;
    const ctx = ref.current!.getContext("2d")!; const p = pos(e);
    ctx.strokeStyle = "#111"; ctx.lineWidth = 2.5; ctx.lineCap = "round"; ctx.lineJoin = "round";
    ctx.beginPath(); ctx.moveTo(last.current!.x, last.current!.y); ctx.lineTo(p.x, p.y); ctx.stroke();
    last.current = p;
  };
  const up = () => { if (!drawing.current) return; drawing.current = false; onSave(ref.current!.toDataURL("image/png")); };
  const clear = () => { const c = ref.current!; c.getContext("2d")!.clearRect(0, 0, c.width, c.height); onSave(""); };

  const fileRef = useRef<HTMLInputElement>(null);
  const loadImage = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const c = ref.current!; const ctx = c.getContext("2d")!;
        const scale = Math.min(c.width / img.width, c.height / img.height);
        const w = img.width * scale, h = img.height * scale;
        ctx.drawImage(img, (c.width - w) / 2, (c.height - h) / 2, w, h);
        onSave(c.toDataURL("image/png"));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  };

  return (
    <>
      <canvas ref={ref} width={700} height={700} className="sketch-canvas"
        onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerLeave={up} />
      <div className="sketch-tools no-print">
        <button type="button" onClick={() => fileRef.current?.click()}>이미지</button>
        <button type="button" onClick={clear}>지우기</button>
      </div>
      <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }}
        onChange={(e) => { const f = e.target.files?.[0]; if (f) loadImage(f); e.target.value = ""; }} />
    </>
  );
}

// 셀 편집칸 (화면 입력 → blur 저장, 인쇄 시 값 그대로)
function SvCell({ value, onSave }: { value: string; onSave: (v: string) => void }) {
  const [v, setV] = useState(value);
  const [p, setP] = useState(value);
  if (p !== value) { setP(value); setV(value); }
  return <input className="sv-cell-input" value={v} onChange={(e) => setV(e.target.value)} onBlur={() => { if (v !== value) onSave(v.trim()); }} />;
}

// ── 공가조사표 한 장 ───────────────────────────────────────────────────────
function SurveySheet({ sv, sketch, onSketch, editable, ov, onCell }: {
  sv: Survey; sketch: string; onSketch?: (d: string) => void; editable?: boolean; ov?: Record<string, string>; onCell?: (id: string, v: string) => void;
}) {
  const telRows = Math.max(TEL_MINROWS, sv.tel.length);
  const selfRows = Math.max(SELF_MINROWS, sv.self.length);
  // 셀: 편집모드면 입력칸, 아니면 텍스트. 값 = 수정본(ov) 우선, 없으면 시트값
  const c = (id: string, sheetVal: string) =>
    editable && onCell ? <SvCell value={ov?.[id] ?? sheetVal} onSave={(v) => onCell(id, v)} /> : (ov?.[id] ?? sheetVal);
  return (
    <div className="sv-page doc-font">
      <table className="sv-info"><tbody>
        <tr>
          <td className="lab">사업소명</td><td>{c("sa", sv.sa)}</td>
          <td className="lab">전산화번호</td><td>{c("dig", sv.dig)}</td>
          <td className="lab">선로명</td><td>{c("line", sv.line)}</td>
          <td className="lab">선로번호</td><td>{c("seq", sv.seq)}</td>
          <td className="lab">비고</td><td className="sv-bigo">{c("bigo", sv.bigo)}</td>
          <td className="lab">회선수</td><td className="sv-hoe">{c("hoe", sv.hoe)}</td>
        </tr>
      </tbody></table>
      <table className="sv-legend"><tbody>
        <tr><td className="lab">불량코드</td>
          {BAD.map((b, i) => <Fragment key={i}><td className="bc-n">{i + 1}</td><td className="bc-l">{b}</td></Fragment>)}
        </tr>
      </tbody></table>
      <div className="sv-mid" style={{ flexGrow: telRows }}>
        <div className="sv-box">
          {editable && onSketch
            ? <SketchPad value={sketch} onSave={onSketch} />
            : (sketch && <img className="sv-sketch-print" src={sketch} alt="약도" />)}
        </div>
        <div className="sv-telwrap">
          <div className="sv-sect">통신설비 시설내역</div>
          <table className="sv-tel">
            <thead><tr>{TEL_COLS.map((col) => <th key={col}>{col}</th>)}</tr></thead>
            <tbody>
              {Array.from({ length: telRows }).map((_, i) => (
                <tr key={i}>{TEL_COLS.map((_, j) => <td key={j}>{c(`t${i}_${j}`, sv.tel[i]?.[j] ?? "")}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="sv-self-title">자기설비 내역</div>
      <table className="sv-self" style={{ flexGrow: selfRows }}>
        <thead><tr>{SELF_COLS.map((col) => <th key={col}>{col}</th>)}</tr></thead>
        <tbody>
          {Array.from({ length: selfRows }).map((_, i) => (
            <tr key={i}>{SELF_COLS.map((_, j) => <td key={j}>{c(`s${i}_${j}`, sv.self[i]?.[j] ?? "")}</td>)}</tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── 메인 ───────────────────────────────────────────────────────────────────
export default function GonggaSurveyDashboard() {
  const [apiKey, setApiKey] = useState("");
  const [sheets, setSheets] = useState<Record<string, string>>({}); // 지사 → 시트 링크
  const [jisa, setJisa] = useState("");                             // 선택된 지사
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [selected, setSelected] = useState<Survey | null>(null);
  const [mode, setMode] = useState<"single" | "all">("single");
  const [sketches, setSketches] = useState<Record<string, string>>({});
  const [surveyOv, setSurveyOv] = useState<Record<string, Record<string, string>>>({});
  // 지사·시트 설정 편집
  const [showSettings, setShowSettings] = useState(false);
  const [editRows, setEditRows] = useState<{ name: string; url: string }[]>([]);
  const [savedOk, setSavedOk] = useState(false);

  const sketchKey = (sv: Survey) => `약도:${sv.line} ${sv.seq}`.trim();
  async function saveSketch(sv: Survey, data: string) {
    const k = sketchKey(sv);
    setSketches((prev) => ({ ...prev, [k]: data }));
    await sba.from("line_overrides").upsert({ line_name: k, sketch: data, updated_at: new Date().toISOString() });
  }
  const cellKey = (sv: Survey) => `공가:${sv.line} ${sv.seq}`.trim();
  async function saveCell(sv: Survey, id: string, value: string) {
    const k = cellKey(sv);
    const next = { ...(surveyOv[k] ?? {}), [id]: value };
    if (!value) delete next[id];
    setSurveyOv((prev) => ({ ...prev, [k]: next }));
    await sba.from("line_overrides").upsert({ line_name: k, survey: next, updated_at: new Date().toISOString() });
  }

  useEffect(() => {
    (async () => {
      const { data }: SbaRes = await sba.from("app_settings").select("key,value");
      const rows = (data as { key: string; value: string }[]) ?? [];
      const get = (k: string) => rows.find((r) => r.key === k)?.value ?? "";
      const k = get(K_API);
      let sh: Record<string, string> = {};
      try { sh = JSON.parse(get(K_GONGGA_SHEETS) || "{}"); } catch { sh = {}; }
      // 최초 1회: 지사별 링크가 없으면 결과보고서 시트를 '기본' 지사로 시드
      if (Object.keys(sh).length === 0 && get(K_SHEET).trim()) sh = { 기본: get(K_SHEET).trim() };
      const names = Object.keys(sh);
      const savedJisa = get(K_GONGGA_JISA);
      const j = names.includes(savedJisa) ? savedJisa : (names[0] ?? "");
      setApiKey(k); setSheets(sh); setJisa(j);
      if (k.trim() && j && sh[j]) load(k, sh[j]);
    })();
    // 저장된 약도 로드 (line_overrides.sketch, 마이그레이션 전이면 무시)
    (async () => {
      const res: SbaRes = await sba.from("line_overrides").select("line_name,sketch");
      if (res.error) return;
      const m: Record<string, string> = {};
      for (const r of (res.data as { line_name: string; sketch: string | null }[]) ?? []) {
        if (r.line_name?.startsWith("약도:") && r.sketch) m[r.line_name] = r.sketch;
      }
      setSketches(m);
    })();
    // 저장된 셀 수정본 로드 (line_overrides.survey, 마이그레이션 전이면 무시)
    (async () => {
      const res: SbaRes = await sba.from("line_overrides").select("line_name,survey");
      if (res.error) return;
      const m: Record<string, Record<string, string>> = {};
      for (const r of (res.data as { line_name: string; survey: Record<string, string> | null }[]) ?? []) {
        if (r.line_name?.startsWith("공가:") && r.survey) m[r.line_name] = r.survey;
      }
      setSurveyOv(m);
    })();
  }, []);

  async function load(key: string, sheetInput: string) {
    const id = extractSheetId(sheetInput);
    if (id === "__PUBLISHED__") { setErr("‘웹에 게시’ 링크(/d/e/…/pubhtml)는 API로 읽을 수 없습니다. 브라우저 주소창의 일반 편집 링크(…/spreadsheets/d/시트ID/edit)를 넣어주세요."); return; }
    if (!key.trim() || !id) { setErr("‘지사·시트 설정’에서 API 키와 지사별 구글시트 링크를 먼저 저장하세요."); return; }
    setLoading(true); setErr(null); setSurveys([]); setSelected(null);
    try {
      const titles = await sheetTitles(id, key.trim());
      const gongga = titles.filter((t) => t.startsWith("공가조사표") && !t.includes("양식"));
      const jeonggi = titles.filter((t) => t.startsWith("정기검사시스템"));
      if (gongga.length === 0 && jeonggi.length === 0) { setErr("시트에서 '공가조사표_*' 또는 '정기검사시스템_*' 탭을 찾지 못했습니다."); return; }
      const vrs = await sheetsBatch(id, key.trim(), [...gongga, ...jeonggi]);
      // 공가조사표 자동채움 데이터
      const svMap = new Map<string, Survey>();
      for (const vr of vrs) {
        if (!titleOfRange(vr.range).startsWith("공가조사표")) continue;
        for (const sv of parseSurvey(vr.values ?? [])) svMap.set(sv.key, sv);
      }
      // 정기검사시스템 = 맨홀 기준목록(결과보고서와 동일 개수). 공가조사표 탭에 없으면 빈 양식으로 채움.
      const all: Survey[] = [];
      const seen = new Set<string>();
      for (const vr of vrs) {
        const title = titleOfRange(vr.range);
        if (!title.startsWith("정기검사시스템")) continue;
        for (const base of parseRecList(vr.values ?? [], jisaOfTitle(title))) {
          if (seen.has(base.key)) continue;
          seen.add(base.key);
          const sv = svMap.get(base.key);
          all.push(sv ? { ...sv, sa: sv.sa || base.sa, dig: sv.dig || base.dig } : base);
        }
      }
      // 정기검사시스템에 없고 공가조사표에만 있는 맨홀도 포함
      for (const sv of svMap.values()) if (!seen.has(sv.key)) { seen.add(sv.key); all.push(sv); }
      all.sort((a, b) => (a.line + a.seq).localeCompare(b.line + b.seq, "ko", { numeric: true }));
      setSurveys(all);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  function doPrint() {
    document.getElementById("sv-print-style")?.remove();
    const style = document.createElement("style");
    style.id = "sv-print-style";
    style.textContent = "@page{size:A4 landscape;margin:0}"; // 여백 0 → 브라우저 머리글/바닥글 숨김. 실제 여백은 .sv-page 안쪽 padding으로
    document.head.appendChild(style);
    const cleanup = () => { document.getElementById("sv-print-style")?.remove(); window.removeEventListener("afterprint", cleanup); };
    window.addEventListener("afterprint", cleanup);
    window.print();
  }

  // 지사 전환 → 선택 저장 + 해당 지사 시트 로드
  function selectJisa(name: string) {
    setJisa(name); setSelected(null); setMode("single");
    sba.from("app_settings").upsert({ key: K_GONGGA_JISA, value: name });
    if (apiKey.trim() && sheets[name]) load(apiKey, sheets[name]);
    else { setSurveys([]); setErr(sheets[name] ? null : `‘${name}’ 지사의 시트 링크가 없습니다. ‘지사·시트 설정’에서 등록하세요.`); }
  }

  // 설정 열기 → 편집행 시드
  function openSettings() {
    const rows = Object.entries(sheets).map(([name, url]) => ({ name, url }));
    setEditRows(rows.length ? rows : [{ name: "", url: "" }]);
    setSavedOk(false); setShowSettings(true);
  }
  async function saveSettings() {
    const next: Record<string, string> = {};
    for (const r of editRows) if (r.name.trim() && r.url.trim()) next[r.name.trim()] = r.url.trim();
    const names = Object.keys(next);
    const j = names.includes(jisa) ? jisa : (names[0] ?? "");
    setSheets(next); setJisa(j);
    // API 키가 비어 있으면 공용 키를 덮어쓰지 않는다(다른 메뉴 인증 보호)
    const rows: { key: string; value: string }[] = [
      { key: K_GONGGA_SHEETS, value: JSON.stringify(next) },
      { key: K_GONGGA_JISA, value: j },
    ];
    if (apiKey.trim()) rows.push({ key: K_API, value: apiKey.trim() });
    await sba.from("app_settings").upsert(rows);
    setSavedOk(true); setShowSettings(false);
    if (apiKey.trim() && j && next[j]) load(apiKey, next[j]);
    else setSurveys([]);
  }

  const shown = surveys;
  const withData = shown.filter((s) => s.tel.length || s.self.length).length;

  return (
    <>
      <div className="apage-head no-print">
        <div><h1>공가조사표 (통신설비)</h1><p>지사를 선택하면 저장된 지사별 구글시트에서 통신설비 공가조사표(가로)를 자동 생성</p></div>
        {surveys.length > 0 && (
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn--ghost btn--sm" type="button" onClick={() => { setMode("all"); setSelected(null); }}>{jisa || "전체"} {shown.length}개 인쇄</button>
            <button className="btn btn--ghost btn--sm" type="button" onClick={() => sheets[jisa] && load(apiKey, sheets[jisa])} disabled={loading}>새로고침</button>
            <button className="btn btn--sm" type="button" onClick={doPrint} disabled={mode === "single" ? !selected : shown.length === 0}>🖨 인쇄 · PDF 저장</button>
          </div>
        )}
      </div>

      {/* 지사 선택 바 */}
      <div className="panel no-print" style={{ marginBottom: 14, padding: "12px 16px", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <strong style={{ fontSize: 13 }}>지사</strong>
        <select value={jisa} onChange={(e) => selectJisa(e.target.value)} disabled={Object.keys(sheets).length === 0}
          style={{ padding: "7px 12px", fontSize: 14, borderRadius: 6, border: "1px solid var(--line-2)", minWidth: 160, background: "var(--paper)", color: "inherit" }}>
          {Object.keys(sheets).length === 0 && <option value="">등록된 지사 없음</option>}
          {Object.keys(sheets).map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
        {jisa && surveys.length > 0 && <span style={{ fontSize: 12, color: "var(--muted)" }}>선로 {shown.length}개 · 데이터 {withData}개</span>}
        <button className="btn btn--ghost btn--sm" type="button" onClick={openSettings} style={{ marginLeft: "auto" }}>⚙ 지사·시트 설정</button>
      </div>

      {showSettings && (
        <div className="panel no-print" style={{ marginBottom: 14, padding: "16px 18px" }}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>지사·시트 설정</div>
          <label style={{ display: "block", fontSize: 12, color: "var(--muted)", marginBottom: 4 }}>구글 API 키 (드라이브·시트 공용)</label>
          <input value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="AIza…" spellCheck={false}
            style={{ width: "100%", padding: "8px 11px", fontSize: 13, borderRadius: 6, border: "1px solid var(--line-2)", marginBottom: 14, background: "var(--paper)", color: "inherit" }} />
          <label style={{ display: "block", fontSize: 12, color: "var(--muted)", marginBottom: 6 }}>지사별 구글시트 링크 (지사명 + 시트 주소)</label>
          {editRows.map((r, i) => (
            <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8 }}>
              <input value={r.name} onChange={(e) => setEditRows((p) => p.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} placeholder="지사명 (예: 중부산지사)"
                style={{ width: 170, padding: "8px 11px", fontSize: 13, borderRadius: 6, border: "1px solid var(--line-2)", background: "var(--paper)", color: "inherit" }} />
              <input value={r.url} onChange={(e) => setEditRows((p) => p.map((x, j) => j === i ? { ...x, url: e.target.value } : x))} placeholder="https://docs.google.com/spreadsheets/d/…" spellCheck={false}
                style={{ flex: 1, padding: "8px 11px", fontSize: 13, borderRadius: 6, border: "1px solid var(--line-2)", background: "var(--paper)", color: "inherit" }} />
              <button className="btn btn--ghost btn--sm" type="button" onClick={() => setEditRows((p) => p.filter((_, j) => j !== i))}>삭제</button>
            </div>
          ))}
          <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
            <button className="btn btn--ghost btn--sm" type="button" onClick={() => setEditRows((p) => [...p, { name: "", url: "" }])}>+ 지사 추가</button>
            <button className="btn btn--sm" type="button" onClick={saveSettings} style={{ marginLeft: "auto" }}>저장</button>
            <button className="btn btn--ghost btn--sm" type="button" onClick={() => setShowSettings(false)}>닫기</button>
          </div>
        </div>
      )}
      {savedOk && !showSettings && <div className="panel no-print" style={{ marginBottom: 12, padding: "10px 16px", fontSize: 13, color: "var(--ok, #157347)" }}>✓ 설정을 저장했습니다.</div>}

      {err && <div className="panel no-print" style={{ marginBottom: 16, padding: "12px 18px", color: "#b3261e", fontSize: 13 }}>⚠ {err}</div>}
      {loading && <div className="panel no-print" style={{ padding: 40, textAlign: "center", color: "var(--muted)" }}>공가조사표 불러오는 중…</div>}

      {!loading && surveys.length === 0 && !err && (
        <div className="panel no-print" style={{ padding: "60px 20px", textAlign: "center", color: "var(--muted)" }}>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>표시할 공가조사표가 없습니다</div>
          <div style={{ fontSize: 13 }}>‘⚙ 지사·시트 설정’에서 지사별 구글시트 링크를 등록한 뒤, 위에서 지사를 선택하세요.</div>
        </div>
      )}

      {surveys.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: 16 }}>
          <div className="panel no-print" style={{ alignSelf: "start", maxHeight: "80vh", overflowY: "auto" }}>
            <div className="panel-body" style={{ borderBottom: "1px solid var(--line-2)", fontWeight: 700, fontSize: 13, position: "sticky", top: 0, background: "var(--paper)" }}>
              {jisa && <span style={{ marginRight: 6 }}>{jisa}</span>}선로 {shown.length}개 · 데이터 {withData}개
            </div>
            <div style={{ padding: 8 }}>
              {shown.map((s) => {
                const on = selected?.key === s.key && mode === "single";
                const has = s.tel.length || s.self.length;
                return (
                  <button key={s.key} type="button" onClick={() => { setMode("single"); setSelected(s); }}
                    style={{ display: "flex", justifyContent: "space-between", width: "100%", textAlign: "left", padding: "9px 12px", borderRadius: 6, border: "1px solid " + (on ? "var(--ink)" : "transparent"), background: on ? "var(--ink)" : "transparent", color: on ? "var(--paper)" : "inherit", cursor: "pointer", fontSize: 13, marginBottom: 2 }}>
                    <span>{s.line} {s.seq}</span>
                    <span style={{ fontSize: 11, opacity: .7 }}>{has ? `통${s.tel.length}·자${s.self.length}` : "—"}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            {mode === "single" && selected && (
              <div className="sd-print"><SurveySheet sv={selected} sketch={sketches[sketchKey(selected)] ?? ""} onSketch={(d) => saveSketch(selected, d)} editable ov={surveyOv[cellKey(selected)]} onCell={(id, v) => saveCell(selected, id, v)} /></div>
            )}
            {mode === "single" && !selected && (
              <div className="panel no-print" style={{ padding: "60px 20px", textAlign: "center", color: "var(--muted)", fontSize: 13 }}>좌측에서 선로를 선택하세요.</div>
            )}
            {mode === "all" && (
              <div className="sd-print">
                {shown.map((s) => <Fragment key={s.key}><SurveySheet sv={s} sketch={sketches[sketchKey(s)] ?? ""} ov={surveyOv[cellKey(s)]} /></Fragment>)}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

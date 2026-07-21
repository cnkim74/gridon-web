"use client";
import { useEffect, useState, useRef, Fragment } from "react";
import { supabase } from "@/lib/supabase";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sba = supabase as any;
type SbaRes = { data: unknown; error: { message: string } | null };

// app_settings 키 (결과보고서와 공유)
const K_API = "drive_api_key";   // 구글 API 키(드라이브·시트 공용)
const K_FOLDER = "report_folder"; // 구글 드라이브 폴더 링크(결과보고서와 동일)
const K_SHEET = "result_sheet";  // 점검 데이터 구글시트 링크(결과보고서와 동일)

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

// ── 드라이브 헬퍼 (결과보고서와 동일 방식: 폴더 → 선로 하위폴더 목록) ─────────
type DriveFile = { id: string; name: string; mimeType: string };
type Line = { id: string; name: string };
function extractFolderId(input: string): string {
  const s = (input ?? "").trim();
  const m = s.match(/\/folders\/([a-zA-Z0-9_-]+)/) || s.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (m) return m[1];
  if (/^[a-zA-Z0-9_-]{20,}$/.test(s)) return s;
  return s;
}
const isFolder = (f: DriveFile) => f.mimeType === "application/vnd.google-apps.folder";
const isImage = (f: DriveFile) => f.mimeType?.startsWith("image/");
async function driveList(folderId: string, apiKey: string): Promise<DriveFile[]> {
  const q = encodeURIComponent(`'${folderId}' in parents and trashed = false`);
  const url = `https://www.googleapis.com/drive/v3/files?q=${q}&key=${apiKey}` +
    `&fields=files(id,name,mimeType)&pageSize=1000&orderBy=name&supportsAllDrives=true&includeItemsFromAllDrives=true`;
  const json = await fetchJson(url, "드라이브 폴더", "폴더 링크가 …/drive/folders/폴더ID 형식인지");
  return (json.files as DriveFile[]) ?? [];
}
// 폴더/선로명 → 선로명(문자) + 선호번호 분리 ("국제M161" → 국제 / M161)
function splitLine(name: string): { title: string; seq: string } {
  const s = (name ?? "").normalize("NFC").trim();
  const m = s.match(/^(.*?)\s*([A-Za-z]*\d[\w-]*)$/);
  if (m) return { title: m[1].trim(), seq: m[2].trim() };
  return { title: s, seq: "" };
}

// ── 시트 헬퍼 ──────────────────────────────────────────────────────────────
function extractSheetId(input: string): string {
  const s = (input ?? "").trim();
  // 드라이브 폴더 링크를 시트 칸에 잘못 넣은 경우 감지
  if (/\/(drive\/)?folders\//.test(s)) return "__FOLDER__";
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

// 구글 API 응답을 JSON으로 안전 파싱. HTML(오류·로그인 페이지)이 오면 어느 리소스인지 밝혀 던진다.
async function fetchJson(url: string, resource: string, hint: string): Promise<Record<string, unknown>> {
  let res: Response;
  try {
    res = await fetch(url);
  } catch (e) {
    // fetch 자체 실패(네트워크·CORS·차단) — 리소스명을 밝혀 던진다
    throw new Error(`[${resource}] 네트워크 요청이 전송되지 못했습니다(${(e as Error).message}). ${hint}, 그리고 해당 링크가 “링크가 있는 모든 사용자·뷰어”로 공개됐는지 확인하세요.`);
  }
  const text = await res.text();
  let json: Record<string, unknown> | null = null;
  try { json = JSON.parse(text); } catch { /* HTML 등 비-JSON */ }
  if (!json) {
    // 서버가 JSON이 아닌 HTML을 반환 → 링크/키가 API 요청에 맞지 않음
    throw new Error(`[${resource}] 구글 서버가 데이터(JSON) 대신 웹페이지(HTML)를 반환했습니다. ${hint} 또는 API 키가 유효한지 확인하세요.`);
  }
  const err = (json.error as { message?: string } | undefined)?.message;
  if (!res.ok) throw new Error(`[${resource}] ${err || `구글 API 오류 (${res.status})`}`);
  return json;
}
async function sheetTitles(id: string, key: string): Promise<string[]> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${id}?key=${key}&fields=sheets.properties.title`;
  const json = await fetchJson(url, "구글시트", "시트 링크가 …/spreadsheets/d/시트ID/edit 형식인지");
  return ((json.sheets as { properties: { title: string } }[]) ?? []).map((s) => s.properties.title);
}
async function sheetsBatch(id: string, key: string, ranges: string[]): Promise<{ range: string; values?: unknown[][] }[]> {
  const qs = ranges.map((r) => `ranges=${encodeURIComponent(r)}`).join("&");
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${id}/values:batchGet?${qs}&majorDimension=ROWS&valueRenderOption=UNFORMATTED_VALUE&key=${key}`;
  const json = await fetchJson(url, "구글시트", "시트 링크가 …/spreadsheets/d/시트ID/edit 형식인지");
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
  const [apiKey, setApiKey] = useState("");     // 공용 구글 API 키(다른 메뉴와 공유)
  const [folder, setFolder] = useState("");     // 구글 드라이브 폴더 링크(결과보고서와 동일)
  const [sheetUrl, setSheetUrl] = useState(""); // 점검 데이터 시트(result_sheet, 표 자동채움)
  const [lines, setLines] = useState<Line[]>([]);        // 선로 목록(드라이브 하위폴더)
  const [svMap, setSvMap] = useState<Record<string, Survey>>({}); // 선로 → 공가조사표 시트값
  const [loadingLines, setLoadingLines] = useState(false);
  const [sheetLoading, setSheetLoading] = useState(false);
  const [sheetErr, setSheetErr] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [selected, setSelected] = useState<Line | null>(null);
  const [mode, setMode] = useState<"single" | "all">("single");
  const [sketches, setSketches] = useState<Record<string, string>>({});
  const [surveyOv, setSurveyOv] = useState<Record<string, Record<string, string>>>({});
  const [savedOk, setSavedOk] = useState(false);

  // 선로(드라이브 폴더) → Survey (시트값 있으면 자동채움, 없으면 빈 양식)
  const surveyOf = (line: Line): Survey => {
    const key = normLine(line.name);
    const base = svMap[key];
    if (base) return base;
    const { title, seq } = splitLine(line.name);
    return { key, sa: "", dig: "", line: title, seq, bigo: "", hoe: "", tel: [], self: [] };
  };

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
      const k = get(K_API), f = get(K_FOLDER), sh = get(K_SHEET);
      setApiKey(k); setFolder(f); setSheetUrl(sh);
      if (k.trim() && f.trim()) loadLinesWith(k, f);
      if (k.trim() && sh.trim()) loadSheet(k, sh);
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

  // 선로 목록 불러오기 (결과보고서와 동일: 폴더 → 하위 선로 폴더)
  async function loadLinesWith(key: string, folderInput: string) {
    if (!key.trim() || !folderInput.trim()) { setErr("API 키와 폴더 링크를 먼저 입력·저장하세요."); return; }
    setErr(null); setLoadingLines(true); setLines([]); setSelected(null);
    try {
      const fid = extractFolderId(folderInput);
      const items = await driveList(fid, key.trim());
      const subFolders = items.filter(isFolder);
      if (subFolders.length > 0) {
        const sorted = subFolders.map((f) => ({ id: f.id, name: f.name }))
          .sort((a, b) => a.name.localeCompare(b.name, "ko", { numeric: true }));
        setLines(sorted);
      } else if (items.some(isImage)) {
        setLines([{ id: fid, name: "(이 폴더)" }]);
      } else {
        setErr("폴더 안에 선로 하위폴더도, 사진도 없습니다. 폴더 링크와 공개 설정을 확인하세요.");
      }
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setLoadingLines(false);
    }
  }

  // 구글시트(점검 데이터 원본) → 선로별 공가조사표 자동채움 맵
  async function loadSheet(key: string, sheetInput: string) {
    const id = extractSheetId(sheetInput);
    if (id === "__FOLDER__") { setSheetErr("시트 칸에 ‘드라이브 폴더’ 링크가 들어가 있습니다. 스프레드시트 링크(…/spreadsheets/d/시트ID/edit)로 바꿔주세요."); return; }
    if (id === "__PUBLISHED__") { setSheetErr("‘웹에 게시’ 링크(/d/e/…/pubhtml)는 API로 읽을 수 없습니다. 일반 편집 링크(…/spreadsheets/d/시트ID/edit)를 넣어주세요."); return; }
    if (!key.trim() || !id) { setSheetErr("API 키와 구글시트 링크를 먼저 입력·저장하세요."); return; }
    setSheetLoading(true); setSheetErr(null);
    try {
      const titles = await sheetTitles(id, key.trim());
      const gongga = titles.filter((t) => t.startsWith("공가조사표") && !t.includes("양식"));
      const jeonggi = titles.filter((t) => t.startsWith("정기검사시스템"));
      if (gongga.length === 0 && jeonggi.length === 0) { setSheetErr("시트에서 '공가조사표_*' 또는 '정기검사시스템_*' 탭을 찾지 못했습니다."); return; }
      const vrs = await sheetsBatch(id, key.trim(), [...gongga, ...jeonggi]);
      const m: Record<string, Survey> = {};
      for (const vr of vrs) {
        if (!titleOfRange(vr.range).startsWith("공가조사표")) continue;
        for (const sv of parseSurvey(vr.values ?? [])) m[sv.key] = sv;
      }
      // 정기검사시스템의 전산화번호·사업소명을 빈 값에 보강
      for (const vr of vrs) {
        const title = titleOfRange(vr.range);
        if (!title.startsWith("정기검사시스템")) continue;
        for (const base of parseRecList(vr.values ?? [], jisaOfTitle(title))) {
          const ex = m[base.key];
          if (ex) m[base.key] = { ...ex, sa: ex.sa || base.sa, dig: ex.dig || base.dig };
          else m[base.key] = base;
        }
      }
      setSvMap(m);
    } catch (e) {
      setSheetErr((e as Error).message);
    } finally {
      setSheetLoading(false);
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

  // 설정 저장 (결과보고서와 동일: 폴더·시트 링크 저장, API 키는 공용이라 건드리지 않음)
  const saveSettings = async () => {
    const { error }: SbaRes = await sba.from("app_settings").upsert([
      { key: K_FOLDER, value: folder.trim() },
      { key: K_SHEET, value: sheetUrl.trim() },
    ]);
    if (error) { setErr("설정 저장 실패: " + error.message); return; }
    setSavedOk(true); setTimeout(() => setSavedOk(false), 1800);
    if (apiKey.trim() && folder.trim()) loadLinesWith(apiKey, folder);
    if (apiKey.trim() && sheetUrl.trim()) loadSheet(apiKey, sheetUrl);
  };

  const selectedSv = selected ? surveyOf(selected) : null;

  return (
    <>
      <div className="apage-head no-print">
        <div><h1>공가조사표 (통신설비)</h1><p>결과보고서와 동일하게 드라이브 폴더의 선로 목록을 불러오고, 시트값으로 통신설비 공가조사표(가로)를 자동 채움</p></div>
        {lines.length > 0 && (
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn--ghost btn--sm" type="button" onClick={() => { setMode("all"); setSelected(null); }}>전체 {lines.length}개 인쇄</button>
            <button className="btn btn--ghost btn--sm" type="button" onClick={() => loadLinesWith(apiKey, folder)} disabled={loadingLines}>새로고침</button>
            <button className="btn btn--sm" type="button" onClick={doPrint} disabled={mode === "single" ? !selected : lines.length === 0}>🖨 인쇄 · PDF 저장</button>
          </div>
        )}
      </div>

      {/* 설정 (결과보고서와 동일: ⚙ 폴더 설정 details 패널) */}
      <details className="panel no-print" style={{ marginBottom: 16 }} open={!folder}>
        <summary style={{ cursor: "pointer", padding: "14px 20px", fontWeight: 700, fontSize: 14 }}>⚙ 폴더 설정</summary>
        <div className="panel-body" style={{ borderTop: "1px solid var(--line-2)", display: "grid", gap: 12 }}>
          <div className="field">
            <label>구글 드라이브 폴더 링크 <span style={{ fontWeight: 400, color: "var(--muted)" }}>· 결과보고서와 동일 폴더 (하위 선로 폴더 목록)</span></label>
            <input className="input" placeholder="https://drive.google.com/drive/folders/..." value={folder} onChange={(e) => setFolder(e.target.value)} />
          </div>
          <div className="field">
            <label>점검 데이터 구글시트 링크 <span style={{ fontWeight: 400, color: "var(--muted)" }}>· 공가조사표_지사·정기검사시스템_지사 값을 실시간으로 읽어 자동 채움</span></label>
            <input className="input" placeholder="https://docs.google.com/spreadsheets/d/..." value={sheetUrl} onChange={(e) => setSheetUrl(e.target.value)} />
            <div style={{ fontSize: 12, color: sheetErr ? "#b3261e" : "var(--muted)", marginTop: 4 }}>
              {sheetLoading ? "시트 불러오는 중…" : sheetErr ? `⚠ ${sheetErr}` : Object.keys(svMap).length > 0 ? `✓ 시트에서 공가조사표 ${Object.keys(svMap).length}개 데이터 연동됨` : "저장하면 시트를 읽어 자동 채웁니다. (Google Sheets API 활성화 + 시트 링크공개 필요)"}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button className="btn btn--sm" type="button" onClick={saveSettings}>저장</button>
            <button className="btn btn--ghost btn--sm" type="button" onClick={() => loadLinesWith(apiKey, folder)} disabled={loadingLines}>선로 목록 불러오기</button>
            {savedOk && <span style={{ fontSize: 13, color: "#1f7a3d" }}>✓ 저장됨</span>}
          </div>
          <p style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.6, margin: 0 }}>
            · 결과보고서 메뉴에서 폴더·시트를 이미 저장했다면 자동으로 연동됩니다. (구글 API 키·폴더·시트 모두 공용)<br />
            · 경남본부(상위) 폴더 링크를 붙여넣으면 하위 선로 폴더가 자동으로 목록에 표시됩니다.<br />
            · 드라이브 폴더와 시트를 “링크가 있는 모든 사용자 · 뷰어”로 공개해야 합니다.
          </p>
        </div>
      </details>

      {err && <div className="panel no-print" style={{ marginBottom: 16, padding: "12px 18px", color: "#b3261e", fontSize: 13, borderColor: "rgba(179,38,30,.3)" }}>⚠ {err}</div>}
      {loadingLines && <div className="panel no-print" style={{ padding: 40, textAlign: "center", color: "var(--muted)" }}>선로 목록 불러오는 중…</div>}

      {!loadingLines && lines.length === 0 && !err && (
        <div className="panel no-print" style={{ padding: "60px 20px", textAlign: "center", color: "var(--muted)" }}>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>폴더를 먼저 설정하세요</div>
          <div style={{ fontSize: 13 }}>위 ⚙ 폴더 설정에서 드라이브 폴더 링크를 입력하고 “선로 목록 불러오기”를 누르세요.</div>
        </div>
      )}

      {lines.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: 16 }}>
          <div className="panel no-print" style={{ alignSelf: "start", maxHeight: "80vh", overflowY: "auto" }}>
            <div className="panel-body" style={{ borderBottom: "1px solid var(--line-2)", fontWeight: 700, fontSize: 13, position: "sticky", top: 0, background: "var(--paper)" }}>
              선로 {lines.length}개
            </div>
            <div style={{ padding: 8 }}>
              {lines.map((l) => {
                const on = selected?.id === l.id && mode === "single";
                const sv = surveyOf(l);
                const has = sv.tel.length || sv.self.length;
                return (
                  <button key={l.id} type="button" onClick={() => { setMode("single"); setSelected(l); }}
                    style={{ display: "flex", justifyContent: "space-between", width: "100%", textAlign: "left", padding: "9px 12px", borderRadius: 6, border: "1px solid " + (on ? "var(--ink)" : "transparent"), background: on ? "var(--ink)" : "transparent", color: on ? "var(--paper)" : "inherit", cursor: "pointer", fontSize: 13, marginBottom: 2 }}>
                    <span>{l.name}</span>
                    <span style={{ fontSize: 11, opacity: .7 }}>{has ? `통${sv.tel.length}·자${sv.self.length}` : "—"}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            {mode === "single" && selectedSv && (
              <div className="sd-print"><SurveySheet sv={selectedSv} sketch={sketches[sketchKey(selectedSv)] ?? ""} onSketch={(d) => saveSketch(selectedSv, d)} editable ov={surveyOv[cellKey(selectedSv)]} onCell={(id, v) => saveCell(selectedSv, id, v)} /></div>
            )}
            {mode === "single" && !selected && (
              <div className="panel no-print" style={{ padding: "60px 20px", textAlign: "center", color: "var(--muted)", fontSize: 13 }}>좌측에서 선로를 선택하세요.</div>
            )}
            {mode === "all" && (
              <div className="sd-print">
                {lines.map((l) => { const sv = surveyOf(l); return <Fragment key={l.id}><SurveySheet sv={sv} sketch={sketches[sketchKey(sv)] ?? ""} ov={surveyOv[cellKey(sv)]} /></Fragment>; })}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

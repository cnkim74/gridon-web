"use client";
import { useEffect, useState, useRef, Fragment } from "react";
import { supabase } from "@/lib/supabase";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sba = supabase as any;
type SbaRes = { data: unknown; error: { message: string } | null };

// app_settings 키 (결과보고서와 공유)
const K_API = "drive_api_key";
const K_SHEET = "result_sheet";

// 불량코드 범례(1~10)
const BAD = ["방수장치불량", "여유장 과다", "전력선동시시설", "맨홀 천공", "관로구 파손", "구조물파손", "관로파손 유입", "통신기기시설불량", "내관 미설치", "기타(단선등)"];
// 통신설비 시설내역 컬럼(13) + 시트 열 인덱스
const TEL_COLS = ["벽면번호", "관로구번호", "PE내관규격", "통신사업자", "케이블번호", "선종", "규격", "조수", "불량코드", "여유장유무", "접속함체유무", "봉인번호", "특이사항"];
const TEL_CIDX = [10, 11, 12, 13, 14, 15, 16, 17, 18, 22, 23, 24, 25];
// 자기설비 내역 컬럼(22) + 시트 열 인덱스
const SELF_COLS = ["자기설비코드", "자기설비 선로명", "자기설비 선로번호", "자기설비 전산화번호", "자기설비 벽면번호", "자기설비 관로구번호", "사업자", "상호", "임대기준", "관로규격", "PE내관규격", "승인", "설치일자", "케이블번호", "용도", "선종", "규격", "선로길이", "실측선로길이", "접속사유", "봉인번호", "접수번호"];
const SELF_CIDX = [1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23];
const TEL_MINROWS = 16, SELF_MINROWS = 8;

type Survey = { key: string; sa: string; dig: string; line: string; seq: string; bigo: string; hoe: string; tel: string[][]; self: string[][] };

// ── 시트 헬퍼 ──────────────────────────────────────────────────────────────
function extractSheetId(input: string): string {
  const s = (input ?? "").trim();
  const m = s.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  if (m) return m[1];
  if (/^[a-zA-Z0-9_-]{20,}$/.test(s)) return s;
  return s;
}
const cell = (rows: unknown[][], r: number, c: number) => { const v = (rows[r] ?? [])[c]; return v == null ? "" : String(v).trim(); };
function normLine(s: string) { return (s ?? "").normalize("NFC").replace(/\s+/g, "").toLowerCase(); }

async function sheetTitles(id: string, key: string): Promise<string[]> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${id}?key=${key}&fields=sheets.properties.title`;
  const res = await fetch(url); const json = await res.json();
  if (!res.ok) throw new Error(json?.error?.message || `시트 조회 오류 (${res.status})`);
  return ((json.sheets as { properties: { title: string } }[]) ?? []).map((s) => s.properties.title);
}
async function sheetsBatch(id: string, key: string, ranges: string[]): Promise<{ range: string; values?: unknown[][] }[]> {
  const qs = ranges.map((r) => `ranges=${encodeURIComponent(r)}`).join("&");
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${id}/values:batchGet?${qs}&majorDimension=ROWS&valueRenderOption=UNFORMATTED_VALUE&key=${key}`;
  const res = await fetch(url); const json = await res.json();
  if (!res.ok) throw new Error(json?.error?.message || `시트 값 오류 (${res.status})`);
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

  return (
    <>
      <canvas ref={ref} width={780} height={640} className="sketch-canvas"
        onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerLeave={up} />
      <button type="button" className="sketch-clear no-print" onClick={clear}>지우기</button>
    </>
  );
}

// ── 공가조사표 한 장 ───────────────────────────────────────────────────────
function SurveySheet({ sv, sketch, onSketch, editable }: { sv: Survey; sketch: string; onSketch?: (d: string) => void; editable?: boolean }) {
  const telRows = Math.max(TEL_MINROWS, sv.tel.length);
  const selfRows = Math.max(SELF_MINROWS, sv.self.length);
  return (
    <div className="sv-page doc-font">
      <table className="sv-info"><tbody>
        <tr>
          <td className="lab">사업소명</td><td>{sv.sa}</td>
          <td className="lab">전산화번호</td><td>{sv.dig}</td>
          <td className="lab">선로명</td><td>{sv.line}</td>
          <td className="lab">선로번호</td><td>{sv.seq}</td>
          <td className="lab">비고</td><td className="sv-bigo">{sv.bigo}</td>
          <td className="lab">회선수</td><td className="sv-hoe">{sv.hoe}</td>
        </tr>
      </tbody></table>
      <table className="sv-legend"><tbody>
        <tr><td className="lab">불량코드</td>
          {BAD.map((b, i) => <Fragment key={i}><td className="bc-n">{i + 1}</td><td className="bc-l">{b}</td></Fragment>)}
        </tr>
      </tbody></table>
      <div className="sv-mid">
        <div className="sv-box">
          <span className="sv-cap">□ 약도</span>
          {editable && onSketch
            ? <SketchPad value={sketch} onSave={onSketch} />
            : (sketch && <img className="sv-sketch-print" src={sketch} alt="약도" />)}
        </div>
        <div className="sv-telwrap">
          <div className="sv-sect">통신설비 시설내역</div>
          <table className="sv-tel">
            <thead><tr>{TEL_COLS.map((c) => <th key={c}>{c}</th>)}</tr></thead>
            <tbody>
              {Array.from({ length: telRows }).map((_, i) => (
                <tr key={i}>{TEL_COLS.map((_, j) => <td key={j}>{sv.tel[i]?.[j] ?? ""}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="sv-self-title">자기설비 내역</div>
      <table className="sv-self">
        <thead><tr>{SELF_COLS.map((c) => <th key={c}>{c}</th>)}</tr></thead>
        <tbody>
          {Array.from({ length: selfRows }).map((_, i) => (
            <tr key={i}>{SELF_COLS.map((_, j) => <td key={j}>{sv.self[i]?.[j] ?? ""}</td>)}</tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── 메인 ───────────────────────────────────────────────────────────────────
export default function GonggaSurveyDashboard() {
  const [apiKey, setApiKey] = useState("");
  const [sheetUrl, setSheetUrl] = useState("");
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [selected, setSelected] = useState<Survey | null>(null);
  const [mode, setMode] = useState<"single" | "all">("single");
  const [sketches, setSketches] = useState<Record<string, string>>({});

  const sketchKey = (sv: Survey) => `약도:${sv.line} ${sv.seq}`.trim();
  async function saveSketch(sv: Survey, data: string) {
    const k = sketchKey(sv);
    setSketches((prev) => ({ ...prev, [k]: data }));
    await sba.from("line_overrides").upsert({ line_name: k, sketch: data, updated_at: new Date().toISOString() });
  }

  useEffect(() => {
    (async () => {
      const { data }: SbaRes = await sba.from("app_settings").select("key,value");
      const rows = (data as { key: string; value: string }[]) ?? [];
      const get = (k: string) => rows.find((r) => r.key === k)?.value ?? "";
      const k = get(K_API), sh = get(K_SHEET);
      setApiKey(k); setSheetUrl(sh);
      if (k.trim() && sh.trim()) load(k, sh);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function load(key: string, sheetInput: string) {
    const id = extractSheetId(sheetInput);
    if (!key.trim() || !id) { setErr("결과보고서 설정에서 API 키와 구글시트 링크를 먼저 저장하세요."); return; }
    setLoading(true); setErr(null); setSurveys([]); setSelected(null);
    try {
      const titles = await sheetTitles(id, key.trim());
      const wanted = titles.filter((t) => t.startsWith("공가조사표") && !t.includes("양식"));
      if (wanted.length === 0) { setErr("시트에서 '공가조사표_*' 탭을 찾지 못했습니다."); return; }
      const vrs = await sheetsBatch(id, key.trim(), wanted);
      const all: Survey[] = [];
      for (const vr of vrs) all.push(...parseSurvey(vr.values ?? []));
      all.sort((a, b) => (a.line + a.seq).localeCompare(b.line + b.seq, "ko", { numeric: true }));
      setSurveys(all);
    } catch (e) {
      setErr((e as Error).message + " (Google Sheets API 활성화 + 시트 링크공개 필요)");
    } finally {
      setLoading(false);
    }
  }

  function doPrint() {
    document.getElementById("sv-print-style")?.remove();
    const style = document.createElement("style");
    style.id = "sv-print-style";
    style.textContent = "@page{size:A4 landscape;margin:6mm}";
    document.head.appendChild(style);
    const cleanup = () => { document.getElementById("sv-print-style")?.remove(); window.removeEventListener("afterprint", cleanup); };
    window.addEventListener("afterprint", cleanup);
    window.print();
  }

  const withData = surveys.filter((s) => s.tel.length || s.self.length).length;

  return (
    <>
      <div className="apage-head no-print">
        <div><h1>공가조사표 (통신설비)</h1><p>구글시트 공가조사표_지사 데이터를 선로별로 읽어 통신설비 공가조사표(가로) 자동 생성</p></div>
        {surveys.length > 0 && (
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn--ghost btn--sm" type="button" onClick={() => { setMode("all"); setSelected(null); }}>전체 {surveys.length}개 인쇄</button>
            <button className="btn btn--ghost btn--sm" type="button" onClick={() => load(apiKey, sheetUrl)} disabled={loading}>새로고침</button>
            <button className="btn btn--sm" type="button" onClick={doPrint} disabled={mode === "single" ? !selected : surveys.length === 0}>🖨 인쇄 · PDF 저장</button>
          </div>
        )}
      </div>

      {err && <div className="panel no-print" style={{ marginBottom: 16, padding: "12px 18px", color: "#b3261e", fontSize: 13 }}>⚠ {err}</div>}
      {loading && <div className="panel no-print" style={{ padding: 40, textAlign: "center", color: "var(--muted)" }}>공가조사표 불러오는 중…</div>}

      {!loading && surveys.length === 0 && !err && (
        <div className="panel no-print" style={{ padding: "60px 20px", textAlign: "center", color: "var(--muted)" }}>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>공가조사표 데이터가 없습니다</div>
          <div style={{ fontSize: 13 }}>결과보고서 페이지에서 구글시트를 먼저 연결·저장하세요. (같은 시트의 공가조사표_지사 탭을 읽습니다)</div>
        </div>
      )}

      {surveys.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: 16 }}>
          <div className="panel no-print" style={{ alignSelf: "start", maxHeight: "80vh", overflowY: "auto" }}>
            <div className="panel-body" style={{ borderBottom: "1px solid var(--line-2)", fontWeight: 700, fontSize: 13, position: "sticky", top: 0, background: "var(--paper)" }}>
              선로 {surveys.length}개 · 데이터 {withData}개
            </div>
            <div style={{ padding: 8 }}>
              {surveys.map((s) => {
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
              <div className="sd-print"><SurveySheet sv={selected} sketch={sketches[sketchKey(selected)] ?? ""} onSketch={(d) => saveSketch(selected, d)} editable /></div>
            )}
            {mode === "single" && !selected && (
              <div className="panel no-print" style={{ padding: "60px 20px", textAlign: "center", color: "var(--muted)", fontSize: 13 }}>좌측에서 선로를 선택하세요.</div>
            )}
            {mode === "all" && (
              <div className="sd-print">
                {surveys.map((s) => <Fragment key={s.key}><SurveySheet sv={s} sketch={sketches[sketchKey(s)] ?? ""} /></Fragment>)}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

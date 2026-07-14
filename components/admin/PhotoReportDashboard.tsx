"use client";
import { useEffect, useState, Fragment } from "react";
import { supabase } from "@/lib/supabase";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sba = supabase as any;
type SbaRes = { data: unknown; error: { message: string } | null };

// ── 점검 항목 매핑 (매뉴얼 2단계 표 + 사진대지 양식) ─────────────────────────
// 번호 → 사진대지 라벨. 11번(열화상)은 현재 제외 → 빈칸 유지.
type Slot = { no: string; label: string };

const PAGE1: Slot[] = [
  { no: "01", label: "표시찰" },
  { no: "02", label: "전경" },
  { no: "03", label: "단차" },
  { no: "04", label: "침수높이" },
  { no: "05", label: "양수중" },
  { no: "06", label: "양수후" },
];
const PAGE2: Slot[] = [
  { no: "07", label: "1번 벽면(서)" },
  { no: "08", label: "2번 벽면(동)" },
  { no: "09", label: "3번 벽면(북)" },
  { no: "10", label: "4번 벽면(남)" },
  { no: "12", label: "접지측정" },     // 파일번호 12
  { no: "TH1", label: "열화상 측정" }, // 파일명 #1 (#2 이상은 추가 페이지)
];

const DEFAULT_PROJECT = "2026년 경남본부 배전맨홀 점검공사(차도)";

// Supabase app_settings 키 (관리자 전용, 모든 기기에서 공유)
const K_API = "drive_api_key";
const K_FOLDER = "report_folder";
const K_PROJECT = "report_project";
const K_RESULT_DEFAULTS = "result_defaults"; // 결과보고서 프로젝트 공통정보 (JSON)
const K_SHEET = "result_sheet"; // 결과보고서 점검 데이터 원본 구글시트 링크

// ── Drive 헬퍼 ───────────────────────────────────────────────────────────────

type DriveFile = { id: string; name: string; mimeType: string };

function extractFolderId(input: string): string {
  const s = input.trim();
  // /folders/<id>  또는  ?id=<id>  또는  순수 id
  const m = s.match(/\/folders\/([a-zA-Z0-9_-]+)/) || s.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (m) return m[1];
  // open?id 형태나 순수 ID
  if (/^[a-zA-Z0-9_-]{20,}$/.test(s)) return s;
  return s;
}

async function driveList(folderId: string, apiKey: string): Promise<DriveFile[]> {
  const q = encodeURIComponent(`'${folderId}' in parents and trashed = false`);
  const url = `https://www.googleapis.com/drive/v3/files?q=${q}&key=${apiKey}` +
    `&fields=files(id,name,mimeType)&pageSize=1000&orderBy=name&supportsAllDrives=true&includeItemsFromAllDrives=true`;
  const res = await fetch(url);
  const json = await res.json();
  if (!res.ok) {
    const msg = json?.error?.message || `오류 (${res.status})`;
    throw new Error(msg);
  }
  return (json.files as DriveFile[]) ?? [];
}

const isFolder = (f: DriveFile) => f.mimeType === "application/vnd.google-apps.folder";
const isImage = (f: DriveFile) => f.mimeType?.startsWith("image/");

// 파일명 앞쪽의 01~12 번호 추출 ("01.jpg", "01 표시찰.jpg", "01_번호찰.jpg" 모두 매칭)
function slotNumOf(name: string): string | null {
  const m = name.match(/^\s*0*([0-9]{1,2})\b/);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  if (n >= 1 && n <= 12) return String(n).padStart(2, "0");
  return null;
}

function driveImg(id: string) {
  return `https://drive.google.com/thumbnail?id=${id}&sz=w1600`;
}

// 파일명이 "공1","공2"처럼 공+숫자로 시작하면 그 번호, 아니면 null
function gongNumOf(name: string): number | null {
  const m = name.match(/^\s*공\s*0*(\d+)/);
  return m ? parseInt(m[1], 10) : null;
}

// 파일명이 "#1","#2"처럼 #+숫자로 시작하면 그 번호(열화상), 아니면 null
function thermalNumOf(name: string): number | null {
  const m = name.match(/^\s*#\s*0*(\d+)/);
  return m ? parseInt(m[1], 10) : null;
}

// 폴더 파일 목록 → 01~12 사진 매핑 + 기타(공N) + 열화상(#N: TH키) 목록
// (01~12, 공N, #N 외의 파일명은 임의 참고용이므로 불러오지 않음)
function buildPhotoMap(files: DriveFile[]): { map: Record<string, string>; extras: string[] } {
  const map: Record<string, string> = {};
  const gongs: { n: number; url: string }[] = [];
  for (const f of files.filter(isImage)) {
    // 맥에서 올린 한글 파일명은 유니코드 분해형(NFD)이라 NFC로 정규화 후 매칭
    const nm = (f.name ?? "").normalize("NFC");
    const th = thermalNumOf(nm);
    if (th !== null) { if (!map[`TH${th}`]) map[`TH${th}`] = driveImg(f.id); continue; }
    const s = slotNumOf(nm);
    if (s) { if (!map[s]) map[s] = driveImg(f.id); continue; }
    const g = gongNumOf(nm);
    if (g !== null) gongs.push({ n: g, url: driveImg(f.id) });
    // 그 외 파일명은 무시
  }
  gongs.sort((a, b) => a.n - b.n);
  return { map, extras: gongs.map((e) => e.url) };
}

// photoMap에서 열화상(TH2 이상) URL을 번호순으로 (열화상 추가 페이지용)
function thermalExtras(photoMap: Record<string, string>): string[] {
  return Object.keys(photoMap)
    .map((k) => /^TH(\d+)$/.exec(k))
    .filter((m): m is RegExpExecArray => !!m)
    .map((m) => ({ n: parseInt(m[1], 10), url: photoMap[m[0]] }))
    .filter((x) => x.n >= 2)
    .sort((a, b) => a.n - b.n)
    .map((x) => x.url);
}

// 선로명 정규화 (유니코드 NFC + 공백 제거) — 폴더명(NFD) ↔ DB line_name(NFC) 매칭용
function normLine(s: string) {
  return (s ?? "").normalize("NFC").replace(/\s+/g, "").toLowerCase();
}

// ── 결과보고서(4종 세트) 타입·기본값 ─────────────────────────────────────────

// 프로젝트 공통정보 (app_settings 키: result_defaults, JSON 문자열)
type ResultDefaults = {
  coverProject: string;   // 표지 공사명
  coverCompany: string;   // 표지 회사명
  bonbu: string;          // 본부
  saeopso: string;        // 사업소
  installPos: string;     // 설치위치(도로)
  inspectDate: string;    // 정기점검일 = 검사일자
  inspectorOrg: string;   // 점검자 소속
  inspectorName: string;  // 점검자 성명
  checkerOrg: string;     // 검사자 소속
  overall: string;        // 종합판정
};
const DEFAULT_RESULT: ResultDefaults = {
  coverProject: "2026년 서부산지사 배전맨홀 청소점검공사",
  coverCompany: "(주)승일",
  bonbu: "부산울산본부", saeopso: "서부산지사", installPos: "도로",
  inspectDate: "", inspectorOrg: "(주)승일", inspectorName: "배정만",
  checkerOrg: "(주)승일", overall: "양호",
};

// 맨홀별 수동입력값 (line_overrides.report jsonb)
type DlTemp = { a: string; b: string; c: string };
type ReportOverride = {
  lineTitle?: string;   // 선로명 (국제)
  seq?: string;         // 선호번호 (M161)
  installPos?: string;  // 설치위치
  inspectDate?: string; // 정기점검일
  floodHeight?: string; // 침수높이 (cm)
  cleanYn?: string;     // 청소여부 (기본 미실시)
  step?: string;        // 맨홀단차 (mm)
  jointCount?: string;  // 접속재수량 (예: 6/3)
  dlCount?: number;     // D/L 블록 수 (기본 5, 초과 가능)
  dlNames?: string[];   // D/L별 구분 접두어 (OO D/L의 OO)
  temps?: DlTemp[];     // D/L별 접속재 온도
  overall?: string;     // 종합판정
  special?: string;     // 특이사항
  heatTemp?: string;    // 일반점검표 접속개소 과열여부 비고 온도(℃)
  marks?: Record<string, "부">; // 판정결과: 기본 적합, 부적합인 행만 저장 (rowId → "부")
};
// 폴더/선로명 → 선로명(문자) + 선호번호(숫자 포함) 분리 ("국제M161" → 국제 / M161)
function splitLine(name: string): { title: string; seq: string } {
  const s = (name ?? "").normalize("NFC").trim();
  const m = s.match(/^(.*?)\s*([A-Za-z]*\d[\w-]*)$/);
  if (m) return { title: m[1].trim(), seq: m[2].trim() };
  return { title: s, seq: "" };
}

// ── 구글 시트(점검 데이터 원본) 실시간 연동 ──────────────────────────────────
type SheetReport = ReportOverride & { digital?: string };

function extractSheetId(input: string): string {
  const s = (input ?? "").trim();
  const m = s.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  if (m) return m[1];
  if (/^[a-zA-Z0-9_-]{20,}$/.test(s)) return s;
  return s;
}

// 셀 값 → 문자열 (엑셀 날짜 시리얼이면 YYYY-MM-DD로 변환)
function cell(v: unknown): string { return v == null ? "" : String(v).trim(); }
function asDate(v: unknown): string {
  const s = cell(v); const n = Number(s);
  if (s !== "" && Number.isFinite(n) && n >= 20000 && n <= 90000) {
    const d = new Date(Date.UTC(1899, 11, 30) + n * 86400000);
    const p = (x: number) => String(x).padStart(2, "0");
    return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())}`;
  }
  return s;
}
function temp(v: unknown): string { const s = cell(v); return s ? (/[℃C]$/.test(s) ? s : `${s}℃`) : ""; }

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
function titleOfRange(range: string): string {
  const m = range.match(/^'?([^'!]+)'?!/);
  return m ? m[1] : range;
}

// 블록 시작행(제목 포함 행) 인덱스들
function blockStarts(rows: unknown[][], keyword: string): number[] {
  const out: number[] = [];
  for (let i = 0; i < rows.length; i++) {
    if ((rows[i] ?? []).some((c) => cell(c).includes(keyword))) out.push(i);
  }
  return out;
}
const at = (rows: unknown[][], r: number, c: number): string => cell((rows[r] ?? [])[c]);

// 맨홀점검표 시트 → key(정규화 선로명+선호번호)별 일반점검표 값
function parseGi(rows: unknown[][], map: Record<string, SheetReport>) {
  for (const s of blockStarts(rows, "일반점검표")) {
    const line = at(rows, s + 2, 2), seq = at(rows, s + 3, 2);
    if (!line && !seq) continue;
    const k = normLine(line + seq);
    map[k] = {
      ...map[k], lineTitle: line || undefined, seq: seq || undefined,
      installPos: at(rows, s + 2, 7) || undefined,
      inspectDate: asDate((rows[s + 3] ?? [])[7]) || undefined,
      floodHeight: at(rows, s + 4, 7) || undefined,
      step: at(rows, s + 6, 2) || undefined,
    };
  }
}

// "OO D/L" 구분 라벨에서 OO(접두어)만 추출 ("-D/L"·"  D/L" → "", "국제 D/L" → "국제")
function dlPrefix(label: string): string {
  return cell(label).replace(/D\s*\/?\s*L\s*$/i, "").replace(/^[\s\-·・]+/, "").trim();
}

// 정기검사시스템 시트 → key별 검사기록표 값(전산화번호·접속재수량·D/L 온도·종합판정·특이사항)
// D/L 블록은 개수 가변(케이블·접속재 행이 반복되는 만큼) → 특이사항 전까지 동적 파싱
function parseRec(rows: unknown[][], map: Record<string, SheetReport>) {
  for (const s of blockStarts(rows, "검사기록표")) {
    const line = at(rows, s + 3, 2), seq = at(rows, s + 3, 4);
    if (!line && !seq) continue;
    const k = normLine(line + seq);
    const temps: DlTemp[] = []; const dlNames: string[] = [];
    let n = 0;
    for (; n < 40; n++) {
      const base = 14 + 5 * n; // n번째 D/L 블록의 '케이블, 접속재' 행
      if (!at(rows, s + base, 1).includes("케이블")) break;
      dlNames.push(dlPrefix(at(rows, s + base, 0)));
      const tRow = rows[s + base + 1] ?? []; // '접속재 온도' 행 (A/B/C상)
      temps.push({ a: temp(tRow[6]), b: temp(tRow[7]), c: temp(tRow[8]) });
    }
    const special = at(rows, s + 14 + 5 * n, 1); // 블록들 다음 = 특이사항 내용
    map[k] = {
      ...map[k], lineTitle: (map[k]?.lineTitle ?? line) || undefined, seq: (map[k]?.seq ?? seq) || undefined,
      digital: at(rows, s + 3, 7) || undefined,
      jointCount: at(rows, s + 4, 7) || undefined,
      inspectDate: map[k]?.inspectDate ?? (asDate((rows[s + 5] ?? [])[2]) || undefined),
      overall: at(rows, s + 6, 2) || undefined,
      special: special || undefined,
      temps, dlNames, ...(n > 0 ? { dlCount: n } : {}),
    };
  }
}

function parseInspectSheets(vrs: { range: string; values?: unknown[][] }[]): Record<string, SheetReport> {
  const map: Record<string, SheetReport> = {};
  for (const vr of vrs) {
    const title = titleOfRange(vr.range); const rows = vr.values ?? [];
    if (title.startsWith("맨홀점검표")) parseGi(rows, map);
    else if (title.startsWith("정기검사시스템")) parseRec(rows, map);
  }
  return map;
}

// 밑줄 인라인 편집칸 (화면 입력 → blur 저장, 인쇄 시 값 그대로 출력)
function REditable({ value, onSave, align = "center", bold, ph, w }: {
  value: string; onSave: (v: string) => void; align?: "center" | "left" | "right"; bold?: boolean; ph?: string; w?: string;
}) {
  const [v, setV] = useState(value);
  const [prev, setPrev] = useState(value);
  if (prev !== value) { setPrev(value); setV(value); } // 외부 value 변경 시 렌더 중 동기화(React 권장 패턴)
  return (
    <input
      value={v} placeholder={ph}
      onChange={(e) => setV(e.target.value)}
      onBlur={() => { if (v !== value) onSave(v.trim()); }}
      style={{ width: w ?? "100%", border: "none", background: "transparent", font: "inherit",
        fontWeight: bold ? 700 : undefined, textAlign: align, padding: "0 2px", color: "inherit", outline: "none" }}
    />
  );
}

type ReportFns = { ov: ReportOverride; rd: ResultDefaults; onReport: (patch: Partial<ReportOverride>) => void; onDigital: (v: string) => void };

// ── 표지 (전체 1장) ──────────────────────────────────────────────────────────
function CoverPage({ project, company }: { project: string; company: string }) {
  return (
    <div className="ri-page cover-page doc-font">
      <div className="cover-frame">
        <div className="cover-inner">
          <div className="cover-titlebox">맨홀 및 핸드홀 조사표</div>
          <div className="cover-bar" />
          <div className="cover-proj">{project}</div>
          <div className="cover-company">{company}</div>
          <div className="cover-bar" style={{ marginTop: "auto" }} />
        </div>
      </div>
    </div>
  );
}

// ── 일반점검표 ────────────────────────────────────────────────────────────────
const GI_STRUCT = [
  "맨홀 윗뚜껑 매물, 돌출, 파손 및 포장상태",
  "맨홀 속뚜껑 시건장치 유무 및 부식여부",
  "산소, 탄산가스, 일산화탄소, 황화수소 농도상태",
  "사다리, 발판볼트 설치상태 및 부식여부",
  "벽면의 균열길이가 연속해서 가로로 있는지 여부",
  "벽면에서 토사와 함께 물이 흐르는지 여부",
  "벽면 콘크리트 파손 약 20%와 철근 노출 여부",
  "방수장치 설치상태",
];
const GI_ELEC = [
  "접지선 설치상태", "금구류(지지대, 행거) 변형여부", "접속개소 과열여부(측정결과 입력)",
  "접속부분의 변형(레진의 누출, 테이프 이탈)", "케이블 바닥에 방치여부",
  "케이블 방재 및 시행상태(관통부, 케이블)", "케이블 외피 손상유무", "케이블 표면온도 이상유무",
  "케이블 접속함의 지지상태", "케이블 이상장력 유무", "관로 인입부분 굴곡개소의 케이블 지지여부",
  "허용곡률반경 유지여부", "각종 표시찰 설치 및 이상유무",
];

function GeneralInspectPage({ derived, ov, rd, onReport }: { derived: { title: string; seq: string } } & ReportFns) {
  const title = ov.lineTitle ?? derived.title;
  const seq = ov.seq ?? derived.seq;
  return (
    <div className="ri-page gi-page doc-font">
      <table className="gi-frame">
        <tbody>
          <tr><td className="gi-titlecell">맨·핸드홀 내 전력설비 일반점검표</td></tr>
        </tbody>
      </table>
      <table className="gi-head">
        <tbody>
          <tr><td className="lab">선로명</td><td><REditable value={title} onSave={(v) => onReport({ lineTitle: v })} /></td>
              <td className="lab">설치위치</td><td colSpan={2}><REditable value={ov.installPos ?? rd.installPos} onSave={(v) => onReport({ installPos: v })} /></td></tr>
          <tr><td className="lab">선호번호</td><td><REditable value={seq} onSave={(v) => onReport({ seq: v })} /></td>
              <td className="lab">정기점검일</td><td colSpan={2} style={{ fontWeight: 700 }}>{ov.inspectDate ?? rd.inspectDate}</td></tr>
          <tr><td className="lab">점검자 소속</td><td>{rd.inspectorOrg}</td>
              <td className="lab">침수높이</td><td><REditable value={ov.floodHeight ?? ""} onSave={(v) => onReport({ floodHeight: v })} /></td><td className="unit">cm</td></tr>
          <tr><td className="lab">점검자 성명</td><td>{rd.inspectorName}</td>
              <td className="lab">청소여부</td><td colSpan={2}><REditable value={ov.cleanYn ?? "미실시"} onSave={(v) => onReport({ cleanYn: v })} /></td></tr>
          <tr><td className="lab">맨홀단차</td><td className="step-cell"><REditable value={ov.step ?? "0"} onSave={(v) => onReport({ step: v })} w="46px" /><span className="unit-in">mm</span></td>
              <td className="lab">청소사유</td><td colSpan={2}>-</td></tr>
        </tbody>
      </table>

      <div className="ri-sub">□ 점검 세부리스트</div>
      <table className="gi-list">
        <tbody>
          <tr><th className="cat">점검 항목</th><th>점검 사항</th><th className="res">점검 결과</th><th className="rmk">비고</th></tr>
          {GI_STRUCT.map((t, i) => (
            <tr key={t}>{i === 0 && <td className="cat" rowSpan={GI_STRUCT.length}>구조물설비</td>}
              <td className="item">{t}</td><td className="res">양호</td><td /></tr>
          ))}
          {GI_ELEC.map((t, i) => (
            <tr key={t}>{i === 0 && <td className="cat" rowSpan={GI_ELEC.length}>전기시설물<br />(케이블 및 기타설비)</td>}
              <td className="item">{t}</td><td className="res">양호</td>
              <td className={t.startsWith("접속개소") ? "heat-rmk" : ""}>
                {t.startsWith("접속개소")
                  ? <><REditable value={ov.heatTemp ?? ""} onSave={(v) => onReport({ heatTemp: v })} align="right" w="72%" />℃</>
                  : ""}
              </td></tr>
          ))}
        </tbody>
      </table>
      <table className="gi-foot">
        <tbody>
          <tr><td className="lab">(기타사항)</td><td className="val">양호</td></tr>
          <tr><td className="lab">(보강방법)</td><td className="val gi-foot-empty" /></tr>
        </tbody>
      </table>
    </div>
  );
}

// ── 검사기록표 ────────────────────────────────────────────────────────────────
const REC_ROWS = ["케이블, 접속재", "접속재 온도", "관로구 방수장치", "금구류", "선로표시찰 상태"];

// 판정결과 두 칸(적합/부적합) — 기본 적합, 클릭으로 토글. 화면에서만 클릭·인쇄엔 ✓만 표시.
function JudgeCells({ active, bad, onSet }: { active: boolean; bad: boolean; onSet: (bad: boolean) => void }) {
  if (!active) return (<><td /><td /></>);
  return (
    <>
      <td className="chk jc-click" title="적합" onClick={() => onSet(false)}>{bad ? "" : "✓"}</td>
      <td className="chk jc-click" title="부적합" onClick={() => onSet(true)}>{bad ? "✓" : ""}</td>
    </>
  );
}

// D/L 한 블록(5행). 구분칸은 "OO D/L"(OO 편집 가능), 판정·온도 모두 입력 가능
function DlBlock({ idx, name, temps, onName, onTemp, marks, onMark }: {
  idx: number; name: string; temps: DlTemp; onName: (v: string) => void; onTemp: (t: DlTemp) => void;
  marks: Record<string, "부">; onMark: (rowId: string, bad: boolean) => void;
}) {
  return (
    <>
      {REC_ROWS.map((label, r) => {
        const isTemp = r === 1;
        const rowId = `d${idx}_${r}`;
        const bad = marks[rowId] === "부";
        return (
          <tr key={r}>
            {r === 0 && <td className="gubun dl-gubun" rowSpan={5}>
              <REditable value={name || String(idx + 1)} onSave={onName} w="34px" /><span className="dl-suffix">D/L</span>
            </td>}
            <td className="sub">{label}</td>
            <JudgeCells active bad={bad} onSet={(b) => onMark(rowId, b)} />
            {isTemp ? (
              <>
                <td className="temp"><REditable value={temps.a} onSave={(v) => onTemp({ ...temps, a: v })} /></td>
                <td className="temp"><REditable value={temps.b} onSave={(v) => onTemp({ ...temps, b: v })} /></td>
                <td className="temp"><REditable value={temps.c} onSave={(v) => onTemp({ ...temps, c: v })} /></td>
              </>
            ) : (<td colSpan={3} />)}
          </tr>
        );
      })}
    </>
  );
}

// 검사기록표 세부검사표 헤더(2행)
function RecDetailHead() {
  return (
    <>
      <tr><th rowSpan={2} className="gubun">구분</th><th rowSpan={2} className="sub">세부항목</th>
          <th colSpan={2}>판정결과(√)</th><th colSpan={3}>비 고</th></tr>
      <tr><th className="jc">적합</th><th className="jc">부적합</th><th className="temp">A상</th><th className="temp">B상</th><th className="temp">C상</th></tr>
    </>
  );
}

const REC_P1_BLOCKS = 5; // 1페이지에 담는 D/L 블록 수
const REC_CONT_BLOCKS = 8; // 이어붙임 페이지당 D/L 블록 수

function RecordPage({ derived, ov, rd, onReport, onDigital, digital }: { derived: { title: string; seq: string }; digital: string } & ReportFns) {
  const seqFull = `${ov.lineTitle ?? derived.title} ${ov.seq ?? derived.seq}`.trim();
  const dlCount = Math.max(1, ov.dlCount ?? 5);
  const temps = ov.temps ?? [];
  const dlNames = ov.dlNames ?? [];
  const marks = ov.marks ?? {};
  const setCount = (n: number) => onReport({ dlCount: Math.max(1, Math.min(30, n)) });
  const setTemp = (i: number, t: DlTemp) => {
    const next = Array.from({ length: dlCount }, (_, k) => temps[k] ?? { a: "", b: "", c: "" });
    next[i] = t; onReport({ temps: next });
  };
  const setName = (i: number, v: string) => {
    const next = Array.from({ length: dlCount }, (_, k) => dlNames[k] ?? "");
    next[i] = v; onReport({ dlNames: next });
  };
  const setMark = (rowId: string, bad: boolean) => {
    const next = { ...marks };
    if (bad) next[rowId] = "부"; else delete next[rowId];
    onReport({ marks: next });
  };
  const block = (i: number) => (
    <DlBlock key={i} idx={i} name={dlNames[i] ?? ""} temps={temps[i] ?? { a: "", b: "", c: "" }}
      onName={(v) => setName(i, v)} onTemp={(t) => setTemp(i, t)} marks={marks} onMark={setMark} />
  );
  const structRows = ["구조물 상태(균열, 누수)", "유독가스 발생유무", "접지선 상태"].map((t, i) => {
    const rowId = `s${i}`; const bad = marks[rowId] === "부";
    return (
      <tr key={t}>{i === 0 && <td className="gubun" rowSpan={3}>구조물</td>}
        <td className="sub">{t}</td>
        <JudgeCells active bad={bad} onSet={(b) => setMark(rowId, b)} />
        <td colSpan={3} /></tr>
    );
  });
  const specialRow = (
    <tr><td className="gubun">특이사항</td><td className="rec-special" colSpan={6}>
      <REditable value={ov.special ?? ""} onSave={(v) => onReport({ special: v })} align="left" /></td></tr>
  );

  const p1 = Math.min(dlCount, REC_P1_BLOCKS);
  const contChunks: [number, number][] = [];
  for (let start = REC_P1_BLOCKS; start < dlCount; start += REC_CONT_BLOCKS) {
    contChunks.push([start, Math.min(start + REC_CONT_BLOCKS, dlCount)]);
  }

  return (
    <>
      <div className="ri-page rec-page doc-font">
        <div className="rec-title doc-title">맨·핸드홀 내 전력설비 검사기록표</div>
        <div className="no-print rec-dl-ctrl">
          D/L 블록 수:
          <button type="button" onClick={() => setCount(dlCount - 1)}>−</button>
          <b>{dlCount}</b>
          <button type="button" onClick={() => setCount(dlCount + 1)}>＋</button>
          <span>기본 5 · 시트값 자동 · 5개 초과 시 다음 장에 이어 출력</span>
        </div>
        <div className="rec-topbar">□ 기본사항　　날씨:　　　　온도　　　　습도</div>
        <table className="rec-basic">
          <tbody>
            <tr><td className="lab">본부</td><td>{rd.bonbu}</td><td className="lab">사업소</td><td>{rd.saeopso}</td></tr>
            <tr><td className="lab">선호번호</td><td>{seqFull}</td><td className="lab">전산화번호</td><td><REditable value={digital} onSave={onDigital} /></td></tr>
            <tr><td className="lab">대상설비</td><td /><td className="lab">접속재수량</td><td><REditable value={ov.jointCount ?? ""} onSave={(v) => onReport({ jointCount: v })} /></td></tr>
            <tr><td className="lab">검사일자</td><td>{ov.inspectDate ?? rd.inspectDate}</td><td className="lab">점검자소속</td><td>{rd.inspectorOrg}</td></tr>
            <tr><td className="lab">종합판정</td><td><REditable value={ov.overall ?? rd.overall} onSave={(v) => onReport({ overall: v })} /></td><td className="lab">점검자</td><td>{rd.inspectorName}</td></tr>
            <tr><td className="lab">검사자 소속</td><td>{rd.checkerOrg}</td><td className="lab">검사자</td><td className="sign-cell">(인)</td></tr>
          </tbody>
        </table>

        <div className="ri-sub">□ 항목별 세부 검사결과</div>
        <table className="rec-detail">
          <tbody>
            <RecDetailHead />
            {structRows}
            {Array.from({ length: p1 }, (_, i) => block(i))}
            {contChunks.length === 0 && specialRow}
          </tbody>
        </table>
      </div>

      {contChunks.map(([start, end], ci) => (
        <div className="ri-page rec-page doc-font" key={ci}>
          <div className="rec-title doc-title">맨·핸드홀 내 전력설비 검사기록표 (계속 {ci + 2})</div>
          <div className="ri-sub">□ 항목별 세부 검사결과 (계속)</div>
          <table className="rec-detail">
            <tbody>
              <RecDetailHead />
              {Array.from({ length: end - start }, (_, j) => block(start + j))}
              {ci === contChunks.length - 1 && specialRow}
            </tbody>
          </table>
        </div>
      ))}
    </>
  );
}

// ── 지중설비별 공가조사 사진대지 (가로 A4, 2×4 그리드) ───────────────────────

function GgCell({ url, cap }: { url?: string; cap?: string }) {
  return (
    <div className="gg-cell">
      {url ? <img src={url} alt={cap ?? ""} /> : <div className="gg-empty">　</div>}
      <div className="gg-cap">{cap ?? "　"}</div>
    </div>
  );
}

// 밑줄 스타일의 편집 가능한 입력칸 (화면에서 입력, 인쇄 시 텍스트로 출력)
function EditableField({ value, onSave, width }: { value: string; onSave: (v: string) => void; width: number }) {
  const [v, setV] = useState(value);
  const [prev, setPrev] = useState(value);
  if (prev !== value) { setPrev(value); setV(value); } // 외부 value 변경 시 렌더 중 동기화(React 권장 패턴)
  return (
    <input
      value={v}
      onChange={(e) => setV(e.target.value)}
      onBlur={() => { if (v !== value) onSave(v.trim()); }}
      className="gg-editable"
      style={{ minWidth: width, width, border: "none", borderBottom: "1px solid #999", background: "transparent", font: "inherit", padding: "0 4px", color: "inherit", textAlign: "center" }}
    />
  );
}

function GonggaHead({ lineName, digital, equipType, onOverride }: {
  lineName: string; digital: string; equipType: string; onOverride: (field: "digital_number" | "equip_type", v: string) => void;
}) {
  return (
    <>
      <div className="gg-title doc-title">□ 지중설비별 공가조사 사진대지</div>
      <div className="gg-head">
        <span>○ 설비명 : <span className="v">{lineName}</span></span>
        <span>○ 전산화번호 : <EditableField value={digital} width={110} onSave={(v) => onOverride("digital_number", v)} /></span>
        <span>○ 설비종류 : <EditableField value={equipType} width={90} onSave={(v) => onOverride("equip_type", v)} /></span>
      </div>
    </>
  );
}

type OverrideFn = (field: "digital_number" | "equip_type", v: string) => void;

// 본장: 헤더 + 전경/표시찰/서/동 + 북/남/기타·기타(공1~공2)
function GonggaPage({ lineName, digital, equipType, onOverride, photoMap, extras }: {
  lineName: string; digital: string; equipType: string; onOverride: OverrideFn; photoMap: Record<string, string>; extras: string[];
}) {
  return (
    <div className="gg-page doc-font">
      <GonggaHead lineName={lineName} digital={digital} equipType={equipType} onOverride={onOverride} />
      <div className="gg-grid">
        <GgCell url={photoMap["02"]} cap="전경" />
        <GgCell url={photoMap["01"]} cap="표시찰" />
        <GgCell url={photoMap["07"]} cap="서" />
        <GgCell url={photoMap["08"]} cap="동" />
        <GgCell url={photoMap["09"]} cap="북" />
        <GgCell url={photoMap["10"]} cap="남" />
        <GgCell url={extras[0]} cap="기타" />
        <GgCell url={extras[1]} cap="기타" />
      </div>
    </div>
  );
}

// 기타 추가장 (공3 이후) — 한 장에 8칸(2×4) 테두리 모두 표시, 이미지 있는 칸만 "기타"
function GonggaExtraPage({ lineName, digital, equipType, onOverride, urls }: { lineName: string; digital: string; equipType: string; onOverride: OverrideFn; urls: string[] }) {
  return (
    <div className="gg-page gg-page--extra doc-font">
      <GonggaHead lineName={lineName} digital={digital} equipType={equipType} onOverride={onOverride} />
      <div className="gg-grid">
        {Array.from({ length: 8 }).map((_, i) => (
          <GgCell key={i} url={urls[i]} cap={urls[i] ? "기타" : undefined} />
        ))}
      </div>
    </div>
  );
}

// 한 선로 출력: doc 종류에 따라 공가조사표(가로) / 사진대지(세로) / 결과보고서(4종)
function LineReport({ doc, project, lineName, digital, equipType, onOverride, photoMap, extras, rd, report, onReport }: {
  doc: "gongga" | "sajin" | "result"; project: string; lineName: string; digital: string; equipType: string; onOverride: OverrideFn; photoMap: Record<string, string>; extras: string[];
  rd?: ResultDefaults; report?: ReportOverride; onReport?: (patch: Partial<ReportOverride>) => void;
}) {
  const name = lineName === "(이 폴더)" ? "" : lineName;
  if (doc === "gongga") {
    // 기타: 첫 2장(공1·공2)은 본장, 나머지(공3~)는 8장씩 추가장
    const rest = extras.slice(2);
    const extraPages: string[][] = [];
    for (let i = 0; i < rest.length; i += 8) extraPages.push(rest.slice(i, i + 8));
    return (
      <div className="gongga-doc">
        <GonggaPage lineName={name} digital={digital} equipType={equipType} onOverride={onOverride} photoMap={photoMap} extras={extras} />
        {extraPages.map((urls, pi) => (
          <GonggaExtraPage key={pi} lineName={name} digital={digital} equipType={equipType} onOverride={onOverride} urls={urls} />
        ))}
      </div>
    );
  }
  if (doc === "result") {
    const defaults = rd ?? DEFAULT_RESULT;
    const ov = report ?? {};
    const derived = splitLine(name);
    const fns: ReportFns = { ov, rd: defaults, onReport: onReport ?? (() => {}), onDigital: (v) => onOverride("digital_number", v) };
    return (
      <div className="result-doc">
        <GeneralInspectPage derived={derived} {...fns} />
        <RecordPage derived={derived} digital={digital} {...fns} />
        <SajinPage project={project} lineName={name} slots={PAGE1} photoMap={photoMap} />
        <SajinPage project={project} lineName={name} slots={PAGE2} photoMap={photoMap} />
        <ThermalPages project={project} lineName={name} urls={thermalExtras(photoMap)} />
      </div>
    );
  }
  return (
    <div className="sajin-doc">
      <SajinPage project={project} lineName={name} slots={PAGE1} photoMap={photoMap} />
      <SajinPage project={project} lineName={name} slots={PAGE2} photoMap={photoMap} />
      <ThermalPages project={project} lineName={name} urls={thermalExtras(photoMap)} />
    </div>
  );
}

// ── 사진대지 한 페이지 ────────────────────────────────────────────────────────

function SajinPage({ project, lineName, slots, photoMap }: {
  project: string; lineName: string; slots: Slot[]; photoMap: Record<string, string>;
}) {
  const rows = [slots.slice(0, 2), slots.slice(2, 4), slots.slice(4, 6)];
  return (
    <div className="sd-page doc-font">
      <div className="sd-title doc-title">맨 홀 점 검 사 진 대 지</div>
      <div className="sd-head">
        <span>공사명　{project}</span>
        <span>맨홀명　{lineName}</span>
      </div>
      <table className="sd-grid">
        <tbody>
          {rows.map((pair, ri) => (
            <Row key={ri} pair={pair} photoMap={photoMap} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Row({ pair, photoMap }: { pair: Slot[]; photoMap: Record<string, string> }) {
  return (
    <>
      <tr>
        {pair.map((s) => (
          <td key={s.no} className="sd-cell">
            {photoMap[s.no]
              ? <img src={photoMap[s.no]} alt={s.label} />
              : <span className="sd-empty">　</span>}
          </td>
        ))}
      </tr>
      <tr>
        {pair.map((s) => <td key={s.no} className="sd-cap">{s.label}</td>)}
      </tr>
    </>
  );
}

// 열화상 추가 페이지: #2 이상을 한 장에 6칸(2×3)씩 "열화상 측정" 이름으로 반복 출력
function ThermalPages({ project, lineName, urls }: { project: string; lineName: string; urls: string[] }) {
  if (urls.length === 0) return null;
  const pages: string[][] = [];
  for (let i = 0; i < urls.length; i += 6) pages.push(urls.slice(i, i + 6));
  return (
    <>
      {pages.map((chunk, pi) => (
        <div className="sd-page doc-font" key={pi}>
          <div className="sd-title doc-title">맨 홀 점 검 사 진 대 지</div>
          <div className="sd-head"><span>공사명　{project}</span><span>맨홀명　{lineName}</span></div>
          <table className="sd-grid">
            <tbody>
              {[0, 2, 4].map((r) => (
                <Fragment key={r}>
                  <tr>{[chunk[r], chunk[r + 1]].map((u, ci) => (
                    <td key={ci} className="sd-cell">{u ? <img src={u} alt="열화상 측정" /> : <span className="sd-empty">　</span>}</td>
                  ))}</tr>
                  <tr>{[chunk[r], chunk[r + 1]].map((u, ci) => (
                    <td key={ci} className="sd-cap">{u ? "열화상 측정" : "　"}</td>
                  ))}</tr>
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </>
  );
}

// ── 메인 ──────────────────────────────────────────────────────────────────────

type Line = { id: string; name: string };

export default function PhotoReportDashboard({ doc }: { doc: "gongga" | "sajin" | "result" }) {
  const DOC_TITLE = doc === "gongga" ? "지중설비별 공가조사표" : doc === "result" ? "맨홀 점검 결과보고서" : "맨홀점검사진대지";
  const DOC_DESC = doc === "gongga"
    ? "드라이브 폴더의 점검사진을 실시간으로 읽어 선로별 공가조사표(가로) PDF 생성"
    : doc === "result"
    ? "표지·일반점검표·검사기록표·사진대지 2장을 맨홀별로 묶어 일괄 인쇄 (공통정보는 기본값, 실측값은 미리보기에서 직접 입력)"
    : "드라이브 폴더의 점검사진을 실시간으로 읽어 맨홀점검사진대지(세로) PDF 생성";
  const [apiKey, setApiKey] = useState("");
  const [folder, setFolder] = useState("");
  const [project, setProject] = useState(DEFAULT_PROJECT);
  const [rd, setRd] = useState<ResultDefaults>(DEFAULT_RESULT);
  const [savedOk, setSavedOk] = useState(false);

  // 결과보고서: 구글시트(점검 데이터 원본) 실시간 연동
  const [sheetUrl, setSheetUrl] = useState("");
  const [sheetMap, setSheetMap] = useState<Record<string, SheetReport>>({});
  const [sheetLoading, setSheetLoading] = useState(false);
  const [sheetErr, setSheetErr] = useState<string | null>(null);

  const [lines, setLines] = useState<Line[]>([]);
  const [loadingLines, setLoadingLines] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [selected, setSelected] = useState<Line | null>(null);
  const [photoMap, setPhotoMap] = useState<Record<string, string>>({});
  const [extras, setExtras] = useState<string[]>([]);
  const [loadingPhotos, setLoadingPhotos] = useState(false);

  // 전체 일괄 인쇄
  const [mode, setMode] = useState<"single" | "all">("single");
  const [allReports, setAllReports] = useState<{ line: Line; photoMap: Record<string, string>; extras: string[] }[]>([]);
  const [loadingAll, setLoadingAll] = useState(false);
  const [allProgress, setAllProgress] = useState("");

  // 전산화번호 맵 (정규화 선로명 → 전산화번호)
  const [digitalMap, setDigitalMap] = useState<Record<string, string>>({});
  // 선로별 수동 입력값 (전산화번호·설비종류·결과보고서 실측값)
  const [overrides, setOverrides] = useState<Record<string, { digital_number?: string; equip_type?: string; report?: ReportOverride }>>({});
  const digitalOf = (lineName: string) => overrides[lineName]?.digital_number || sheetMap[normLine(lineName)]?.digital || digitalMap[normLine(lineName)] || "";
  const equipTypeOf = (lineName: string) => overrides[lineName]?.equip_type || "";
  // 시트 값(base) 위에 수동입력(override)을 덮어씀 → 수동 수정이 우선
  const reportOf = (lineName: string): ReportOverride => {
    const base = sheetMap[normLine(lineName)] ?? {};
    const manual = overrides[lineName]?.report ?? {};
    return { ...base, ...manual };
  };
  async function saveOverride(lineName: string, field: "digital_number" | "equip_type", value: string) {
    setOverrides((prev) => ({ ...prev, [lineName]: { ...prev[lineName], [field]: value } }));
    await sba.from("line_overrides").upsert({ line_name: lineName, [field]: value, updated_at: new Date().toISOString() });
  }
  async function saveReport(lineName: string, patch: Partial<ReportOverride>) {
    const next = { ...(overrides[lineName]?.report ?? {}), ...patch };
    setOverrides((prev) => ({ ...prev, [lineName]: { ...prev[lineName], report: next } }));
    await sba.from("line_overrides").upsert({ line_name: lineName, report: next, updated_at: new Date().toISOString() });
  }

  // 설정 로드 (Supabase) → 값이 있으면 선로 목록 자동 로드 + 전산화번호 맵 로드
  useEffect(() => {
    (async () => {
      const { data }: SbaRes = await sba.from("app_settings").select("key,value");
      const rows = (data as { key: string; value: string }[]) ?? [];
      const get = (k: string) => rows.find((r) => r.key === k)?.value ?? "";
      const k = get(K_API), f = get(K_FOLDER), p = get(K_PROJECT) || DEFAULT_PROJECT;
      setApiKey(k); setFolder(f); setProject(p);
      const rdRaw = get(K_RESULT_DEFAULTS);
      if (rdRaw) { try { setRd({ ...DEFAULT_RESULT, ...JSON.parse(rdRaw) }); } catch { /* ignore */ } }
      const sh = get(K_SHEET); setSheetUrl(sh);
      if (k.trim() && f.trim()) loadLinesWith(k, f);
      if (doc === "result" && k.trim() && sh.trim()) loadSheet(k, sh);
    })();
    // 전산화번호 매핑 (manhole_works)
    (async () => {
      const { data }: SbaRes = await sba.from("manhole_works").select("line_name,digital_number");
      const rows = (data as { line_name: string | null; digital_number: string | null }[]) ?? [];
      const m: Record<string, string> = {};
      for (const r of rows) {
        if (r.line_name && r.digital_number && !m[normLine(r.line_name)]) {
          m[normLine(r.line_name)] = r.digital_number;
        }
      }
      // 별도 전산화번호 매핑표(엑셀 업로드분)를 위에 덮어씀
      const { data: dm }: SbaRes = await sba.from("digital_map").select("line_name,digital_number");
      for (const r of (dm as { line_name: string; digital_number: string }[]) ?? []) {
        if (r.line_name && r.digital_number) m[normLine(r.line_name)] = r.digital_number;
      }
      setDigitalMap(m);
    })();
    // 선로별 수동 입력값 로드
    (async () => {
      const { data }: SbaRes = await sba.from("line_overrides").select("line_name,digital_number,equip_type");
      const rows = (data as { line_name: string; digital_number: string | null; equip_type: string | null }[]) ?? [];
      const o: Record<string, { digital_number?: string; equip_type?: string; report?: ReportOverride }> = {};
      for (const r of rows) o[r.line_name] = { digital_number: r.digital_number ?? undefined, equip_type: r.equip_type ?? undefined };
      // report는 신규 jsonb 컬럼 — 마이그레이션 전이면 select가 실패하므로 별도 조회 후 있으면 병합
      const rep: SbaRes = await sba.from("line_overrides").select("line_name,report");
      if (!rep.error) {
        for (const r of (rep.data as { line_name: string; report: ReportOverride | null }[]) ?? []) {
          o[r.line_name] = { ...o[r.line_name], report: r.report ?? undefined };
        }
      }
      setOverrides(o);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 문서별 따로 인쇄 (공가조사표=가로 / 사진대지·결과보고서=세로)
  const [preparing, setPreparing] = useState(false);
  async function doPrint(kind: "gongga" | "sajin" | "result") {
    // 인쇄 전에 해당 문서의 모든 사진 로딩 완료를 대기 (전체 인쇄 시 사진 누락 방지)
    setPreparing(true);
    const sel = kind === "gongga" ? ".gongga-doc img" : kind === "result" ? ".result-doc img" : ".sajin-doc img";
    const imgs = Array.from(document.querySelectorAll<HTMLImageElement>(`.sd-print ${sel}`));
    await Promise.all(imgs.map((img) => {
      if (img.complete && img.naturalWidth > 0) return Promise.resolve();
      return new Promise<void>((resolve) => {
        const done = () => resolve();
        img.addEventListener("load", done, { once: true });
        img.addEventListener("error", done, { once: true });
        // 안전장치: 8초 내 미로딩 시 진행
        setTimeout(done, 8000);
      });
    }));
    setPreparing(false);

    document.getElementById("print-page-style")?.remove();
    const style = document.createElement("style");
    style.id = "print-page-style";
    style.textContent = `@page{size:A4 ${kind === "gongga" ? "landscape" : "portrait"};margin:${kind === "result" ? "0" : "8mm"}}`;
    document.head.appendChild(style);
    document.body.classList.add(`printing-${kind}`);
    const cleanup = () => {
      document.body.classList.remove("printing-gongga", "printing-sajin", "printing-result");
      document.getElementById("print-page-style")?.remove();
      window.removeEventListener("afterprint", cleanup);
    };
    window.addEventListener("afterprint", cleanup);
    window.print();
  }

  const saveSettings = async () => {
    const rows = [
      { key: K_FOLDER, value: folder.trim() },
      { key: K_PROJECT, value: project.trim() || DEFAULT_PROJECT },
    ];
    if (doc === "result") {
      rows.push({ key: K_RESULT_DEFAULTS, value: JSON.stringify(rd) });
      rows.push({ key: K_SHEET, value: sheetUrl.trim() });
    }
    const { error }: SbaRes = await sba.from("app_settings").upsert(rows);
    if (error) { setErr("설정 저장 실패: " + (error as { message: string }).message); return; }
    setSavedOk(true);
    setTimeout(() => setSavedOk(false), 1800);
    if (doc === "result" && apiKey.trim() && sheetUrl.trim()) loadSheet(apiKey, sheetUrl);
  };

  // 구글시트(점검 데이터 원본) 로드 → 맨홀별 자동채움 맵
  async function loadSheet(key: string, sheetInput: string) {
    const id = extractSheetId(sheetInput);
    if (!key.trim() || !id) { setSheetErr("API 키와 구글시트 링크를 먼저 입력·저장하세요."); return; }
    setSheetLoading(true); setSheetErr(null);
    try {
      const titles = await sheetTitles(id, key.trim());
      const wanted = titles.filter((t) => t.startsWith("맨홀점검표") || t.startsWith("정기검사시스템"));
      if (wanted.length === 0) { setSheetErr("시트에서 '맨홀점검표_*' · '정기검사시스템_*' 탭을 찾지 못했습니다."); setSheetMap({}); return; }
      const vrs = await sheetsBatch(id, key.trim(), wanted);
      setSheetMap(parseInspectSheets(vrs));
    } catch (e) {
      setSheetErr((e as Error).message + " (구글 클라우드에서 Google Sheets API가 켜져 있고, 시트가 ‘링크가 있는 모든 사용자·뷰어’로 공개돼야 합니다.)");
    } finally {
      setSheetLoading(false);
    }
  }

  // 선로 목록 로드 (key/folder를 인자로 받아 자동 로드에도 사용)
  async function loadLinesWith(key: string, folderInput: string) {
    if (!key.trim() || !folderInput.trim()) { setErr("API 키와 폴더 링크를 먼저 입력·저장하세요."); return; }
    setErr(null); setLoadingLines(true); setLines([]); setSelected(null); setPhotoMap({});
    try {
      const fid = extractFolderId(folderInput);
      const items = await driveList(fid, key.trim());
      const subFolders = items.filter(isFolder);
      if (subFolders.length > 0) {
        // 상위(경남본부) 폴더 → 하위 선로 폴더 목록
        const sorted = subFolders
          .map((f) => ({ id: f.id, name: f.name }))
          .sort((a, b) => a.name.localeCompare(b.name, "ko", { numeric: true }));
        setLines(sorted);
      } else if (items.some(isImage)) {
        // 입력한 폴더 자체가 선로 폴더(이미지 직접 보유)
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

  // 선로 선택 → 사진 매핑 (단일)
  async function openLine(line: Line) {
    setMode("single"); setSelected(line); setLoadingPhotos(true); setPhotoMap({}); setExtras([]); setErr(null);
    try {
      const files = await driveList(line.id, apiKey.trim());
      const { map, extras } = buildPhotoMap(files);
      setPhotoMap(map);
      setExtras(extras);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setLoadingPhotos(false);
    }
  }

  // 전체 선로 일괄 로드 → 미리보기/인쇄
  async function loadAll() {
    if (lines.length === 0 || !apiKey.trim()) return;
    setErr(null); setLoadingAll(true); setMode("all"); setSelected(null); setAllReports([]);
    const reports: { line: Line; photoMap: Record<string, string>; extras: string[] }[] = [];
    try {
      for (let i = 0; i < lines.length; i++) {
        setAllProgress(`${i + 1} / ${lines.length}`);
        const files = await driveList(lines[i].id, apiKey.trim());
        const { map, extras } = buildPhotoMap(files);
        reports.push({ line: lines[i], photoMap: map, extras });
      }
      setAllReports(reports);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setLoadingAll(false); setAllProgress("");
    }
  }

  const matched = Object.keys(photoMap).length;
  const thermalCount = Object.keys(photoMap).filter((k) => /^TH\d+$/.test(k)).length;
  const canPrint = mode === "all" ? allReports.length > 0 : matched > 0;

  return (
    <>
      <div className="apage-head no-print">
        <div><h1>{DOC_TITLE}</h1><p>{DOC_DESC}</p></div>
        {lines.length > 0 && (
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn--ghost btn--sm" type="button" onClick={loadAll} disabled={loadingAll}>
              {loadingAll ? `불러오는 중 ${allProgress}` : `전체 ${lines.length}개 인쇄`}
            </button>
            {mode === "single" && selected && (
              <button className="btn btn--ghost btn--sm" type="button" onClick={() => openLine(selected)}>새로고침</button>
            )}
            <button className="btn btn--sm" type="button" onClick={() => doPrint(doc)} disabled={loadingPhotos || loadingAll || preparing || !canPrint}>{preparing ? "이미지 준비 중…" : "🖨 인쇄 · PDF 저장"}</button>
          </div>
        )}
      </div>

      {/* 설정 */}
      <details className="panel no-print" style={{ marginBottom: 16 }} open={!folder}>
        <summary style={{ cursor: "pointer", padding: "14px 20px", fontWeight: 700, fontSize: 14 }}>⚙ 폴더 설정</summary>
        <div className="panel-body" style={{ borderTop: "1px solid var(--line-2)", display: "grid", gap: 12 }}>
          <div className="field">
            <label>구글 드라이브 폴더 링크</label>
            <input className="input" placeholder="https://drive.google.com/drive/folders/..." value={folder} onChange={(e) => setFolder(e.target.value)} />
          </div>
          <div className="field">
            <label>공사명 (사진대지 머리말)</label>
            <input className="input" value={project} onChange={(e) => setProject(e.target.value)} />
          </div>
          {doc === "result" && (
            <div style={{ border: "1px solid var(--line-2)", borderRadius: 8, padding: "14px 16px", display: "grid", gap: 10 }}>
              <div className="field">
                <label>점검 데이터 구글시트 링크 <span style={{ fontWeight: 400, color: "var(--muted)" }}>· 맨홀점검표·정기검사시스템 값을 실시간으로 읽어 자동 채움</span></label>
                <input className="input" placeholder="https://docs.google.com/spreadsheets/d/..." value={sheetUrl} onChange={(e) => setSheetUrl(e.target.value)} />
                <div style={{ fontSize: 12, color: sheetErr ? "#b3261e" : "var(--muted)", marginTop: 4 }}>
                  {sheetLoading ? "시트 불러오는 중…" : sheetErr ? `⚠ ${sheetErr}` : Object.keys(sheetMap).length > 0 ? `✓ 시트에서 맨홀 ${Object.keys(sheetMap).length}개 데이터 연동됨` : "저장하면 시트를 읽어 자동 채웁니다. (Google Sheets API 활성화 + 시트 링크공개 필요)"}
                </div>
              </div>
              <div style={{ fontWeight: 700, fontSize: 13 }}>결과보고서 공통정보 <span style={{ fontWeight: 400, color: "var(--muted)" }}>· 시트에 없는 값의 기본값 (맨홀별 값은 미리보기에서 직접 수정 가능)</span></div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {([
                  ["coverProject", "표지 공사명"], ["coverCompany", "표지 회사명"], ["inspectDate", "정기점검일·검사일자"],
                  ["bonbu", "본부"], ["saeopso", "사업소"],
                  ["inspectorOrg", "점검자 소속"], ["inspectorName", "점검자 성명"],
                  ["checkerOrg", "검사자 소속"], ["installPos", "설치위치"],
                  ["overall", "종합판정"],
                ] as [keyof ResultDefaults, string][]).map(([key, label]) => (
                  <div className="field" key={key}>
                    <label>{label}</label>
                    <input className="input" value={rd[key]} onChange={(e) => setRd((prev) => ({ ...prev, [key]: e.target.value }))} />
                  </div>
                ))}
              </div>
            </div>
          )}
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button className="btn btn--sm" type="button" onClick={saveSettings}>저장</button>
            <button className="btn btn--ghost btn--sm" type="button" onClick={() => loadLinesWith(apiKey, folder)}>선로 목록 불러오기</button>
            {savedOk && <span style={{ fontSize: 13, color: "#1f7a3d" }}>✓ 저장됨</span>}
          </div>
          <p style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.6, margin: 0 }}>
            · 경남본부(상위) 폴더 링크를 붙여넣으면 하위 선로 폴더가 자동으로 목록에 표시됩니다.<br />
            · 드라이브에서 해당 폴더를 “링크가 있는 모든 사용자 · 뷰어”로 공개해야 합니다.<br />
            · 사진 파일명은 매뉴얼대로 <strong>01~12</strong>로 시작해야 자동 배치됩니다. (접지측정=12, 열화상=<strong>#1</strong>·#2 이상은 추가 페이지, 기타=공N)
          </p>
        </div>
      </details>

      {err && <div className="panel no-print" style={{ marginBottom: 16, padding: "12px 18px", color: "#b3261e", fontSize: 13, borderColor: "rgba(179,38,30,.3)" }}>⚠ {err}</div>}

      {/* 본문: 좌 선로목록 / 우 미리보기 */}
      <div style={{ display: "grid", gridTemplateColumns: lines.length > 0 ? "260px 1fr" : "1fr", gap: 16 }}>
        {/* 선로 목록 */}
        {lines.length > 0 && (
          <div className="panel no-print" style={{ alignSelf: "start", maxHeight: "80vh", overflowY: "auto" }}>
            <div className="panel-body" style={{ borderBottom: "1px solid var(--line-2)", fontWeight: 700, fontSize: 13, position: "sticky", top: 0, background: "var(--paper)" }}>
              선로 {lines.length}개
            </div>
            <div style={{ padding: 8 }}>
              {lines.map((l) => (
                <button key={l.id} type="button" onClick={() => openLine(l)}
                  style={{
                    display: "block", width: "100%", textAlign: "left", padding: "9px 12px", borderRadius: 6,
                    border: "1px solid " + (selected?.id === l.id ? "var(--ink)" : "transparent"),
                    background: selected?.id === l.id ? "var(--ink)" : "transparent",
                    color: selected?.id === l.id ? "var(--paper)" : "inherit",
                    cursor: "pointer", fontSize: 13, fontWeight: selected?.id === l.id ? 700 : 400, marginBottom: 2,
                  }}>
                  {l.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 미리보기 */}
        <div>
          {mode === "single" && !selected && lines.length === 0 && !loadingLines && (
            <div className="panel no-print" style={{ padding: "60px 20px", textAlign: "center", color: "var(--muted)" }}>
              <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>폴더를 먼저 설정하세요</div>
              <div style={{ fontSize: 13 }}>위 ⚙ 폴더 설정에서 드라이브 폴더 링크를 입력하고 “선로 목록 불러오기”를 누르세요.</div>
            </div>
          )}
          {loadingLines && <div className="panel no-print" style={{ padding: "40px", textAlign: "center", color: "var(--muted)" }}>선로 목록 불러오는 중…</div>}

          {/* 단일 선로 */}
          {mode === "single" && selected && (
            <>
              <div className="no-print" style={{ marginBottom: 10, fontSize: 13, color: "var(--muted)" }}>
                {loadingPhotos ? "사진 불러오는 중…" : (
                  <>
                    <strong style={{ color: "var(--ink)" }}>{selected.name}</strong> · 매칭 {matched}장
                    {thermalCount > 0 ? ` · 열화상(#) ${thermalCount}장` : ""}
                    {extras.length > 0 ? ` · 기타(공) ${extras.length}장` : ""}
                    {doc === "gongga" ? " · 공가조사표(가로)" : doc === "result" ? " · 결과보고서 4종(표지+점검표2+사진대지2)" : " · 사진대지 2장(세로)"}
                    {doc === "result" && (sheetMap[normLine(selected.name)] ? " · 📋 시트 자동채움됨" : " · 시트 데이터 없음(직접 입력)")}
                  </>
                )}
              </div>
              <div className="sd-print">
                {doc === "result" && <CoverPage project={rd.coverProject} company={rd.coverCompany} />}
                <LineReport doc={doc} project={project} lineName={selected.name} digital={digitalOf(selected.name)} equipType={equipTypeOf(selected.name)} onOverride={(f, v) => saveOverride(selected.name, f, v)} photoMap={photoMap} extras={extras} rd={rd} report={reportOf(selected.name)} onReport={(patch) => saveReport(selected.name, patch)} />
              </div>
            </>
          )}

          {/* 전체 일괄 */}
          {mode === "all" && (
            loadingAll ? (
              <div className="panel no-print" style={{ padding: "40px", textAlign: "center", color: "var(--muted)" }}>
                전체 사진 불러오는 중… {allProgress}
              </div>
            ) : (
              <>
                <div className="no-print" style={{ marginBottom: 10, fontSize: 13, color: "var(--muted)" }}>
                  전체 <strong style={{ color: "var(--ink)" }}>{allReports.length}개</strong> 선로 · “🖨 인쇄·PDF 저장”을 누르면 {DOC_TITLE}가 한 번에 출력됩니다.
                </div>
                <div className="sd-print">
                  {doc === "result" && <CoverPage project={rd.coverProject} company={rd.coverCompany} />}
                  {allReports.map((r) => (
                    <Fragment key={r.line.id}>
                      <LineReport doc={doc} project={project} lineName={r.line.name} digital={digitalOf(r.line.name)} equipType={equipTypeOf(r.line.name)} onOverride={(f, v) => saveOverride(r.line.name, f, v)} photoMap={r.photoMap} extras={r.extras} rd={rd} report={reportOf(r.line.name)} onReport={(patch) => saveReport(r.line.name, patch)} />
                    </Fragment>
                  ))}
                </div>
              </>
            )
          )}
        </div>
      </div>
    </>
  );
}

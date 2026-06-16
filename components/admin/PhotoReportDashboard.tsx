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
  { no: "01", label: "번호찰" },
  { no: "02", label: "전경" },
  { no: "03", label: "맨홀뚜껑" },
  { no: "04", label: "침수높이" },
  { no: "05", label: "양수전" },
  { no: "06", label: "양수후" },
];
const PAGE2: Slot[] = [
  { no: "07", label: "1번 벽면(서)" },
  { no: "08", label: "2번 벽면(동)" },
  { no: "09", label: "3번 벽면(북)" },
  { no: "10", label: "4번 벽면(남)" },
  { no: "11", label: "열화상 측정" },
  { no: "12", label: "접지측정" },
];

const DEFAULT_PROJECT = "2026년 경남본부 배전맨홀 점검공사(차도)";

// Supabase app_settings 키 (관리자 전용, 모든 기기에서 공유)
const K_API = "drive_api_key";
const K_FOLDER = "report_folder";
const K_PROJECT = "report_project";

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

// 폴더 파일 목록 → 01~12 사진 매핑 + 예비(공N 등) 목록
function buildPhotoMap(files: DriveFile[]): { map: Record<string, string>; extras: string[] } {
  const map: Record<string, string> = {};
  const extras: { name: string; url: string }[] = [];
  for (const f of files.filter(isImage)) {
    const s = slotNumOf(f.name);
    if (s && !map[s]) map[s] = driveImg(f.id);
    else extras.push({ name: f.name, url: driveImg(f.id) });
  }
  // 예비사진은 파일명 자연정렬 후 URL만
  extras.sort((a, b) => a.name.localeCompare(b.name, "ko", { numeric: true }));
  return { map, extras: extras.map((e) => e.url) };
}

// 공가조사표 전개도(십자형) 배치 — 9칸 중 모서리는 빈칸
const CROSS: (Slot | null)[] = [
  null, { no: "09", label: "No.3 (북)" }, null,
  { no: "07", label: "No.1 (서)" }, { no: "02", label: "전경" }, { no: "08", label: "No.2 (동)" },
  null, { no: "10", label: "No.4 (남)" }, null,
];

// ── 공가조사표 페이지 (헤더 + 전개도 + 기타사진) ─────────────────────────────

function GonggaPage({ lineName, photoMap, extras }: {
  lineName: string; photoMap: Record<string, string>; extras: string[];
}) {
  const firstExtras = extras.slice(0, 3); // 첫 장에는 공1~공3
  return (
    <div className="sd-page">
      <div className="gg-htitle">지 중 설 비 별 공 가 조 사 표</div>
      <table className="gg-htable">
        <tbody>
          <tr>
            <th style={{ width: "12%" }}>사업소명</th>
            <th style={{ width: "13%" }}>전산화번호</th>
            <th style={{ width: "13%" }}>선로명</th>
            <th style={{ width: "12%" }}>선로번호</th>
            <th style={{ width: "8%" }}>회선수</th>
            <th>비고</th>
          </tr>
          <tr>
            <td></td><td></td><td>{lineName}</td><td></td><td></td><td></td>
          </tr>
        </tbody>
      </table>

      <div className="gg-sec">맨홀 전개도</div>
      <div className="gg-cross">
        {CROSS.map((s, i) => {
          if (!s) return <div key={i} className="gg-cell gg-blank" />;
          return (
            <div key={i} className="gg-cell">
              {photoMap[s.no]
                ? <img src={photoMap[s.no]} alt={s.label} loading="lazy" />
                : <div className="gg-empty">　</div>}
              <div className="gg-cap">{s.label}</div>
            </div>
          );
        })}
      </div>

      {firstExtras.length > 0 && (
        <>
          <div className="gg-sec">기타</div>
          <div className="gg-extra">
            {firstExtras.map((url, i) => (
              <div key={i} className="gg-cell">
                <img src={url} alt={`공${i + 1}`} loading="lazy" />
                <div className="gg-cap">공{i + 1}</div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// 공가조사표 기타 추가장 (공4 이후) — 한 장에 9칸(3×3)
function GonggaExtraPage({ urls, startIdx }: { urls: string[]; startIdx: number }) {
  return (
    <div className="sd-page">
      <div className="gg-sec">기타 (계속)</div>
      <div className="gg-extra">
        {urls.map((url, i) => (
          <div key={i} className="gg-cell">
            <img src={url} alt={`공${startIdx + i + 1}`} loading="lazy" />
            <div className="gg-cap">공{startIdx + i + 1}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// 한 선로 전체 출력: 공가조사표(+추가장) → 사진대지 2장
function LineReport({ project, lineName, photoMap, extras }: {
  project: string; lineName: string; photoMap: Record<string, string>; extras: string[];
}) {
  const name = lineName === "(이 폴더)" ? "" : lineName;
  // 기타: 첫 3장은 공가조사표 본장, 나머지는 9장씩 추가장
  const rest = extras.slice(3);
  const extraPages: string[][] = [];
  for (let i = 0; i < rest.length; i += 9) extraPages.push(rest.slice(i, i + 9));
  return (
    <>
      <GonggaPage lineName={name} photoMap={photoMap} extras={extras} />
      {extraPages.map((urls, pi) => (
        <GonggaExtraPage key={pi} urls={urls} startIdx={3 + pi * 9} />
      ))}
      <SajinPage project={project} lineName={name} slots={PAGE1} photoMap={photoMap} />
      <SajinPage project={project} lineName={name} slots={PAGE2} photoMap={photoMap} />
    </>
  );
}

// ── 사진대지 한 페이지 ────────────────────────────────────────────────────────

function SajinPage({ project, lineName, slots, photoMap }: {
  project: string; lineName: string; slots: Slot[]; photoMap: Record<string, string>;
}) {
  const rows = [slots.slice(0, 2), slots.slice(2, 4), slots.slice(4, 6)];
  return (
    <div className="sd-page">
      <div className="sd-title">맨 홀 점 검 사 진 대 지</div>
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
              ? <img src={photoMap[s.no]} alt={s.label} loading="lazy" />
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

// ── 메인 ──────────────────────────────────────────────────────────────────────

type Line = { id: string; name: string };

export default function PhotoReportDashboard() {
  const [apiKey, setApiKey] = useState("");
  const [folder, setFolder] = useState("");
  const [project, setProject] = useState(DEFAULT_PROJECT);
  const [savedOk, setSavedOk] = useState(false);

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

  // 설정 로드 (Supabase) → 값이 있으면 선로 목록 자동 로드
  useEffect(() => {
    (async () => {
      const { data }: SbaRes = await sba.from("app_settings").select("key,value");
      const rows = (data as { key: string; value: string }[]) ?? [];
      const get = (k: string) => rows.find((r) => r.key === k)?.value ?? "";
      const k = get(K_API), f = get(K_FOLDER), p = get(K_PROJECT) || DEFAULT_PROJECT;
      setApiKey(k); setFolder(f); setProject(p);
      if (k.trim() && f.trim()) loadLinesWith(k, f);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const saveSettings = async () => {
    const rows = [
      { key: K_FOLDER, value: folder.trim() },
      { key: K_PROJECT, value: project.trim() || DEFAULT_PROJECT },
    ];
    const { error }: SbaRes = await sba.from("app_settings").upsert(rows);
    if (error) { setErr("설정 저장 실패: " + (error as { message: string }).message); return; }
    setSavedOk(true);
    setTimeout(() => setSavedOk(false), 1800);
  };

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
  const canPrint = mode === "all" ? allReports.length > 0 : matched > 0;

  return (
    <>
      <div className="apage-head no-print">
        <div><h1>지중설비별 공가조사표 · 맨홀점검사진대지</h1><p>드라이브 폴더의 점검사진을 실시간으로 읽어 선로별 공가조사표 + 사진대지 PDF 생성</p></div>
        {lines.length > 0 && (
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn--ghost btn--sm" type="button" onClick={loadAll} disabled={loadingAll}>
              {loadingAll ? `불러오는 중 ${allProgress}` : `전체 ${lines.length}개 인쇄`}
            </button>
            {mode === "single" && selected && (
              <button className="btn btn--ghost btn--sm" type="button" onClick={() => openLine(selected)}>새로고침</button>
            )}
            <button className="btn btn--sm" type="button" onClick={() => window.print()} disabled={loadingPhotos || loadingAll || !canPrint}>🖨 인쇄 · PDF 저장</button>
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
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button className="btn btn--sm" type="button" onClick={saveSettings}>저장</button>
            <button className="btn btn--ghost btn--sm" type="button" onClick={() => loadLinesWith(apiKey, folder)}>선로 목록 불러오기</button>
            {savedOk && <span style={{ fontSize: 13, color: "#1f7a3d" }}>✓ 저장됨</span>}
          </div>
          <p style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.6, margin: 0 }}>
            · 경남본부(상위) 폴더 링크를 붙여넣으면 하위 선로 폴더가 자동으로 목록에 표시됩니다.<br />
            · 드라이브에서 해당 폴더를 “링크가 있는 모든 사용자 · 뷰어”로 공개해야 합니다.<br />
            · 사진 파일명은 매뉴얼대로 <strong>01~12</strong>로 시작해야 자동 배치됩니다. (11번 열화상은 비워둠, 공N은 제외)
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
                    <strong style={{ color: "var(--ink)" }}>{selected.name}</strong> · 매칭 {matched}/12장
                    {photoMap["11"] ? "" : " · 11번(열화상) 비움"}
                    {extras.length > 0 ? ` · 기타(공) ${extras.length}장` : ""}
                    {" · 공가조사표 + 사진대지 2장"}
                  </>
                )}
              </div>
              <div className="sd-print">
                <LineReport project={project} lineName={selected.name} photoMap={photoMap} extras={extras} />
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
                  전체 <strong style={{ color: "var(--ink)" }}>{allReports.length}개</strong> 선로 · “🖨 인쇄·PDF 저장”을 누르면 선로별 공가조사표 + 사진대지가 한 번에 출력됩니다.
                </div>
                <div className="sd-print">
                  {allReports.map((r) => (
                    <Fragment key={r.line.id}>
                      <LineReport project={project} lineName={r.line.name} photoMap={r.photoMap} extras={r.extras} />
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

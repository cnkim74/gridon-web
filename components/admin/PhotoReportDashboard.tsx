"use client";
import { useEffect, useState, useCallback } from "react";

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

// localStorage 키
const LS_KEY = "gridon_drive_apikey";
const LS_FOLDER = "gridon_drive_folder";
const LS_PROJECT = "gridon_report_project";

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
  const [loadingPhotos, setLoadingPhotos] = useState(false);
  const [extraCount, setExtraCount] = useState(0);

  // 설정 로드
  useEffect(() => {
    setApiKey(localStorage.getItem(LS_KEY) ?? "");
    setFolder(localStorage.getItem(LS_FOLDER) ?? "");
    setProject(localStorage.getItem(LS_PROJECT) ?? DEFAULT_PROJECT);
  }, []);

  const saveSettings = () => {
    localStorage.setItem(LS_KEY, apiKey.trim());
    localStorage.setItem(LS_FOLDER, folder.trim());
    localStorage.setItem(LS_PROJECT, project.trim() || DEFAULT_PROJECT);
    setSavedOk(true);
    setTimeout(() => setSavedOk(false), 1800);
  };

  // 선로 목록 로드
  const loadLines = useCallback(async () => {
    if (!apiKey.trim() || !folder.trim()) { setErr("API 키와 폴더 링크를 먼저 입력·저장하세요."); return; }
    setErr(null); setLoadingLines(true); setLines([]); setSelected(null); setPhotoMap({});
    try {
      const fid = extractFolderId(folder);
      const items = await driveList(fid, apiKey.trim());
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
  }, [apiKey, folder]);

  // 선로 선택 → 사진 매핑
  async function openLine(line: Line) {
    setSelected(line); setLoadingPhotos(true); setPhotoMap({}); setExtraCount(0); setErr(null);
    try {
      const files = await driveList(line.id, apiKey.trim());
      const imgs = files.filter(isImage);
      const map: Record<string, string> = {};
      let extra = 0;
      for (const f of imgs) {
        const slot = slotNumOf(f.name);
        if (slot && !map[slot]) map[slot] = driveImg(f.id);
        else extra++; // 공N 등 예비/중복
      }
      setPhotoMap(map);
      setExtraCount(extra);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setLoadingPhotos(false);
    }
  }

  const matched = Object.keys(photoMap).length;

  return (
    <>
      <div className="apage-head no-print">
        <div><h1>결과보고서 · 사진대지</h1><p>드라이브 폴더의 점검사진을 실시간으로 읽어 맨홀 사진대지 PDF 생성</p></div>
        {selected && (
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn--ghost btn--sm" type="button" onClick={() => openLine(selected)}>새로고침</button>
            <button className="btn btn--sm" type="button" onClick={() => window.print()} disabled={loadingPhotos || matched === 0}>🖨 인쇄 · PDF 저장</button>
          </div>
        )}
      </div>

      {/* 설정 */}
      <details className="panel no-print" style={{ marginBottom: 16 }} open={!apiKey || !folder}>
        <summary style={{ cursor: "pointer", padding: "14px 20px", fontWeight: 700, fontSize: 14 }}>⚙ 드라이브 연동 설정 (API 키 · 폴더 링크)</summary>
        <div className="panel-body" style={{ borderTop: "1px solid var(--line-2)", display: "grid", gap: 12 }}>
          <div className="field">
            <label>Google Drive API 키</label>
            <input className="input" type="password" placeholder="AIza..." value={apiKey} onChange={(e) => setApiKey(e.target.value)} />
          </div>
          <div className="field">
            <label>경남본부 폴더 링크 (또는 선로 폴더)</label>
            <input className="input" placeholder="https://drive.google.com/drive/folders/..." value={folder} onChange={(e) => setFolder(e.target.value)} />
          </div>
          <div className="field">
            <label>공사명 (사진대지 머리말)</label>
            <input className="input" value={project} onChange={(e) => setProject(e.target.value)} />
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button className="btn btn--sm" type="button" onClick={saveSettings}>설정 저장</button>
            <button className="btn btn--ghost btn--sm" type="button" onClick={loadLines}>선로 목록 불러오기</button>
            {savedOk && <span style={{ fontSize: 13, color: "#1f7a3d" }}>✓ 저장됨</span>}
          </div>
          <p style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.6, margin: 0 }}>
            · API 키는 이 브라우저에만 저장됩니다(서버 전송 없음).<br />
            · 드라이브에서 <strong>경남본부 폴더</strong>를 “링크가 있는 모든 사용자 · 뷰어”로 공개해야 합니다.<br />
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
          {!selected && lines.length === 0 && !loadingLines && (
            <div className="panel no-print" style={{ padding: "60px 20px", textAlign: "center", color: "var(--muted)" }}>
              <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>드라이브 연동을 먼저 설정하세요</div>
              <div style={{ fontSize: 13 }}>위 ⚙ 설정에서 API 키와 폴더 링크를 입력하고 “선로 목록 불러오기”를 누르세요.</div>
            </div>
          )}
          {loadingLines && <div className="panel no-print" style={{ padding: "40px", textAlign: "center", color: "var(--muted)" }}>선로 목록 불러오는 중…</div>}
          {selected && (
            <>
              <div className="no-print" style={{ marginBottom: 10, fontSize: 13, color: "var(--muted)" }}>
                {loadingPhotos ? "사진 불러오는 중…" : (
                  <>
                    <strong style={{ color: "var(--ink)" }}>{selected.name}</strong> · 매칭 {matched}/12장
                    {photoMap["11"] ? "" : " · 11번(열화상) 비움"}
                    {extraCount > 0 ? ` · 예비/기타 ${extraCount}장 제외` : ""}
                    {matched < 11 && matched > 0 ? " · 누락 칸은 빈칸 출력" : ""}
                  </>
                )}
              </div>
              <div className="sd-print">
                <SajinPage project={project} lineName={selected.name === "(이 폴더)" ? "" : selected.name} slots={PAGE1} photoMap={photoMap} />
                <SajinPage project={project} lineName={selected.name === "(이 폴더)" ? "" : selected.name} slots={PAGE2} photoMap={photoMap} />
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}

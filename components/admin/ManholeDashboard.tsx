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

type Status = "미착공" | "진행중" | "완료";

type Work = {
  id: string;
  branch: string;
  seq: number | null;
  line_name: string | null;
  digital_number: string | null;
  address: string;
  status: Status;
  photo_url: string | null;
  notes: string | null;
  created_at: string;
};

const STATUS_CYCLE: Status[] = ["미착공", "진행중", "완료"];

// ── Status badge ───────────────────────────────────────────────────────────

function StatusBadge({ status, onClick }: { status: Status; onClick?: () => void }) {
  const cls = status === "완료" ? "badge ok" : status === "진행중" ? "badge warn dotwarn" : "badge off";
  return (
    <span
      className={cls}
      onClick={onClick}
      style={{ cursor: onClick ? "pointer" : undefined, userSelect: "none", whiteSpace: "nowrap" }}
      title={onClick ? "클릭하여 상태 변경" : undefined}
    >
      {status}
    </span>
  );
}

// ── Photo cell ─────────────────────────────────────────────────────────────

function PhotoCell({ workId, url, onUploaded }: { workId: string; url: string | null; onUploaded: (url: string) => void }) {
  const { user } = useAuth();
  const ref = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function upload(file: File) {
    setUploading(true);
    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `manhole/${user?.id ?? "anon"}/${workId}.${ext}`;
    const { error } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: true });
    if (!error) {
      const photoUrl = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path}`;
      await sba.from("manhole_works").update({ photo_url: photoUrl }).eq("id", workId);
      onUploaded(photoUrl);
    }
    setUploading(false);
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      {url ? (
        <a href={url} target="_blank" rel="noreferrer">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt="현장" style={{ width: 36, height: 36, objectFit: "cover", borderRadius: 4, border: "1px solid var(--line)", cursor: "pointer" }} />
        </a>
      ) : (
        <div style={{ width: 36, height: 36, borderRadius: 4, border: "1.5px dashed var(--line-2)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
          onClick={() => ref.current?.click()}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" style={{ opacity: .4 }}>
            <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" fill="currentColor" stroke="none" /><path d="M21 15l-5-5L5 21" />
          </svg>
        </div>
      )}
      {uploading ? (
        <span style={{ fontSize: 11, color: "var(--muted)" }}>업로드…</span>
      ) : (
        <button type="button" onClick={() => ref.current?.click()}
          style={{ fontSize: 11, color: "var(--muted)", background: "none", border: "none", cursor: "pointer", textDecoration: "underline", padding: 0 }}>
          {url ? "변경" : "등록"}
        </button>
      )}
      <input ref={ref} type="file" accept="image/*"
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        capture="environment"
        style={{ display: "none" }}
        onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); }}
      />
    </div>
  );
}

// ── Map button ─────────────────────────────────────────────────────────────

function MapBtn({ address }: { address: string }) {
  return (
    <a
      href={`https://map.kakao.com/?q=${encodeURIComponent(address)}`}
      target="_blank"
      rel="noreferrer"
      style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, color: "var(--muted)", textDecoration: "none", border: "1px solid var(--line-2)", borderRadius: 6, padding: "3px 8px", whiteSpace: "nowrap" }}
    >
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
        <circle cx="12" cy="9" r="2.5" />
      </svg>
      지도
    </a>
  );
}

// ── Notes inline editor ────────────────────────────────────────────────────

function NotesCell({ workId, value, onChange }: { workId: string; value: string | null; onChange: (v: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(value ?? "");

  async function save() {
    setEditing(false);
    await sba.from("manhole_works").update({ notes: text || null }).eq("id", workId);
    onChange(text);
  }

  if (editing) {
    return (
      <input
        autoFocus
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => { if (e.key === "Enter") save(); if (e.key === "Escape") setEditing(false); }}
        style={{ width: "100%", minWidth: 80, fontSize: 12, border: "1px solid var(--line)", borderRadius: 4, padding: "2px 6px", background: "var(--paper)" }}
      />
    );
  }

  return (
    <span
      onClick={() => setEditing(true)}
      style={{ fontSize: 12, color: value ? "inherit" : "var(--muted)", cursor: "text", display: "block", minWidth: 60 }}
      title="클릭하여 입력"
    >
      {value ?? "—"}
    </span>
  );
}

// ── Excel importer ─────────────────────────────────────────────────────────

function Importer({ branch, onImport, onClose }: { branch: string; onImport: () => void; onClose: () => void }) {
  const { user } = useAuth();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [rows, setRows] = useState<any[][]>([]);
  const [importing, setImporting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function parseFile(file: File) {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(new Uint8Array(e.target?.result as ArrayBuffer), { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const data = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1, defval: "" });
        setRows(data); setErr(null);
      } catch (ex) {
        setErr(`파일을 읽을 수 없습니다. (${ex instanceof Error ? ex.message : String(ex)})`);
      }
    };
    reader.readAsArrayBuffer(file);
  }

  async function doImport() {
    if (rows.length < 2) return;
    setImporting(true); setErr(null);
    // 헤더 row 자동 감지: 순번/주소 포함 행 찾기
    const hi = rows.findIndex((r) => r.some((c: unknown) => String(c).includes("주소") || String(c) === "순번"));
    const dataRows = hi >= 0 ? rows.slice(hi + 1) : rows.slice(1);

    const records = dataRows
      .filter((r) => String(r[4] ?? "").trim())
      .map((r) => ({
        branch,
        seq: Number(r[0]) || null,
        line_name: String(r[2] ?? "").trim() || null,
        digital_number: String(r[3] ?? "").trim() || null,
        address: String(r[4] ?? "").trim(),
        status: "미착공",
      }));

    if (records.length === 0) { setErr("유효한 데이터가 없습니다. (주소 컬럼 확인 필요)"); setImporting(false); return; }

    const { error }: SbaRes = await sba.from("manhole_works").insert(records);
    setImporting(false);
    if (error) { setErr((error as { message: string }).message); return; }
    onImport();
  }

  const preview = rows.slice(0, 6);
  const dataCount = Math.max(0, rows.length - 1);

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 300, background: "rgba(0,0,0,.45)", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "40px 20px 60px", overflowY: "auto" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "var(--paper)", borderRadius: 8, padding: "28px 32px", width: "100%", maxWidth: 740, boxShadow: "0 24px 64px rgba(0,0,0,.3)" }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 6 }}>공사 리스트 엑셀 가져오기</h2>
        <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 18, lineHeight: 1.7 }}>
          컬럼 순서: <strong>순번 · 지사명 · 선로 · 전산화번호 · 주소</strong> (기존 맨홀공사리스트 양식 자동 인식)
        </p>
        <label style={{ display: "block", border: "1.5px dashed var(--line-2)", borderRadius: 6, padding: "24px 20px", textAlign: "center", cursor: "pointer", background: "var(--faint)", marginBottom: 18 }}>
          <input type="file" accept=".xlsx,.xls,.csv" style={{ display: "none" }} onChange={(e) => { const f = e.target.files?.[0]; if (f) parseFile(f); }} />
          <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 5 }}>파일 선택</div>
          <div style={{ fontSize: 13, color: "var(--muted)" }}>.xlsx · .xls · .csv</div>
        </label>
        {rows.length > 1 && (
          <>
            <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 8 }}>미리보기 · 전체 <strong>{dataCount}건</strong></div>
            <div style={{ overflowX: "auto", marginBottom: 18 }}>
              <table className="dtable" style={{ minWidth: 480 }}>
                <thead><tr>{(preview[0] ?? []).map((h: unknown, i: number) => <th key={i} style={{ fontSize: 12 }}>{String(h)}</th>)}</tr></thead>
                <tbody>{preview.slice(1).map((row, ri) => (
                  <tr key={ri}>{(row as unknown[]).map((cell, ci) => <td key={ci} style={{ fontSize: 12 }}>{String(cell)}</td>)}</tr>
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

export default function ManholeDashboard({ branch, branchLabel }: { branch: string; branchLabel: string }) {
  const [works, setWorks] = useState<Work[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<Status | "전체">("전체");
  const [showImporter, setShowImporter] = useState(false);
  const [rev, setRev] = useState(0);

  useEffect(() => {
    setLoading(true);
    sba.from("manhole_works")
      .select("*")
      .eq("branch", branch)
      .order("seq", { ascending: true })
      .then(({ data }: SbaRes) => {
        setLoading(false);
        setWorks((data as Work[]) ?? []);
      });
  }, [branch, rev]);

  // KPIs
  const total = works.length;
  const done = works.filter((w) => w.status === "완료").length;
  const inprog = works.filter((w) => w.status === "진행중").length;
  const notStarted = works.filter((w) => w.status === "미착공").length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  // Filter
  const filtered = works.filter((w) => {
    if (statusFilter !== "전체" && w.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (w.address ?? "").toLowerCase().includes(q)
        || (w.line_name ?? "").toLowerCase().includes(q)
        || (w.digital_number ?? "").toLowerCase().includes(q);
    }
    return true;
  });

  async function cycleStatus(w: Work) {
    const next = STATUS_CYCLE[(STATUS_CYCLE.indexOf(w.status) + 1) % STATUS_CYCLE.length];
    await sba.from("manhole_works").update({ status: next, updated_at: new Date().toISOString() }).eq("id", w.id);
    setWorks((prev) => prev.map((x) => x.id === w.id ? { ...x, status: next } : x));
  }

  function updateLocal(id: string, patch: Partial<Work>) {
    setWorks((prev) => prev.map((w) => w.id === id ? { ...w, ...patch } : w));
  }

  async function deleteWork(id: string) {
    if (!confirm("이 항목을 삭제하시겠습니까?")) return;
    await sba.from("manhole_works").delete().eq("id", id);
    setWorks((prev) => prev.filter((w) => w.id !== id));
  }

  const chipStyle = (active: boolean): React.CSSProperties => ({
    padding: "4px 12px", border: "1px solid var(--line-2)", borderRadius: 20, fontSize: 12, cursor: "pointer",
    background: active ? "var(--ink)" : "transparent", color: active ? "var(--paper)" : "inherit", fontWeight: active ? 700 : 400,
  });

  return (
    <>
      <div className="apage-head">
        <div>
          <h1>한전 맨홀 점검 · {branchLabel}</h1>
          <p>공사 리스트 현황 · 상태관리 · 현장사진 · 위치확인</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn--ghost btn--sm" type="button" onClick={() => setShowImporter(true)}>
            엑셀 가져오기
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="kpis">
        <div className="kpi">
          <div className="kl">총 공사 현장</div>
          <div className="kv">{total}개소</div>
        </div>
        <div className="kpi">
          <div className="kl">완료</div>
          <div className="kv" style={{ color: "#1f7a3d" }}>{done}개소</div>
          <div className="kd"><span className="muted">{pct}% 진행률</span></div>
        </div>
        <div className="kpi">
          <div className="kl">진행중</div>
          <div className="kv" style={{ color: "#9a6a1e" }}>{inprog}개소</div>
        </div>
        <div className="kpi">
          <div className="kl">미착공</div>
          <div className="kv">{notStarted}개소</div>
        </div>
      </div>

      {/* Progress bar */}
      {total > 0 && (
        <div style={{ marginBottom: 16, background: "var(--paper)", borderRadius: 8, padding: "14px 20px", border: "1px solid var(--line-2)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--muted)", marginBottom: 8 }}>
            <span>전체 진행률</span>
            <span style={{ fontWeight: 700, color: "var(--ink)" }}>{done} / {total} ({pct}%)</span>
          </div>
          <div style={{ height: 8, background: "var(--faint)", borderRadius: 4, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${pct}%`, background: "var(--ink)", borderRadius: 4, transition: "width .4s ease", opacity: .8 }} />
          </div>
        </div>
      )}

      {/* Table panel */}
      <div className="panel">
        <div className="panel-body">
          <div className="atable-tools">
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
              {(["전체", "미착공", "진행중", "완료"] as const).map((s) => (
                <button key={s} type="button" style={chipStyle(statusFilter === s)} onClick={() => setStatusFilter(s)}>{s}</button>
              ))}
            </div>
            <div className="search-mini">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.2-3.2" /></svg>
              <input placeholder="주소·선로·전산화번호 검색" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table className="dtable" style={{ minWidth: 820 }}>
            <thead>
              <tr>
                <th style={{ width: 52, textAlign: "center" }}>순번</th>
                <th style={{ width: 100 }}>선로</th>
                <th style={{ width: 110 }}>전산화번호</th>
                <th>주소</th>
                <th style={{ width: 60, textAlign: "center" }}>지도</th>
                <th style={{ width: 90, textAlign: "center" }}>상태</th>
                <th style={{ width: 110, textAlign: "center" }}>현장사진</th>
                <th style={{ width: 140 }}>비고</th>
                <th style={{ width: 44 }} />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} style={{ textAlign: "center", padding: "40px 0", color: "var(--muted)" }}>불러오는 중…</td></tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: "center", padding: "48px 0", color: "var(--muted)" }}>
                    {total === 0 ? (
                      <div>
                        <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>공사 리스트가 없습니다</div>
                        <button className="btn btn--ghost btn--sm" type="button" onClick={() => setShowImporter(true)}>엑셀 가져오기</button>
                      </div>
                    ) : "검색 결과가 없습니다."}
                  </td>
                </tr>
              ) : filtered.map((w) => (
                <tr key={w.id}>
                  <td style={{ textAlign: "center", color: "var(--muted)", fontSize: 12, fontFamily: "var(--font-mono)" }}>{w.seq ?? "—"}</td>
                  <td style={{ fontSize: 13, fontFamily: "var(--font-mono)", whiteSpace: "nowrap" }}>{w.line_name ?? "—"}</td>
                  <td style={{ fontSize: 12, fontFamily: "var(--font-mono)", whiteSpace: "nowrap", color: "var(--muted)" }}>{w.digital_number ?? "—"}</td>
                  <td style={{ fontSize: 13 }}>{w.address}</td>
                  <td style={{ textAlign: "center" }}>
                    <MapBtn address={w.address} />
                  </td>
                  <td style={{ textAlign: "center" }}>
                    <StatusBadge status={w.status} onClick={() => cycleStatus(w)} />
                  </td>
                  <td style={{ textAlign: "center" }}>
                    <PhotoCell
                      workId={w.id}
                      url={w.photo_url}
                      onUploaded={(url) => updateLocal(w.id, { photo_url: url })}
                    />
                  </td>
                  <td>
                    <NotesCell
                      workId={w.id}
                      value={w.notes}
                      onChange={(v) => updateLocal(w.id, { notes: v })}
                    />
                  </td>
                  <td>
                    <button type="button" onClick={() => deleteWork(w.id)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, color: "#b3261e", padding: 0 }}>삭제</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filtered.length > 0 && (
          <div style={{ padding: "10px 20px", borderTop: "1px solid var(--line-2)", fontSize: 13, color: "var(--muted)" }}>
            {filtered.length}건 표시 / 전체 {total}건
          </div>
        )}
      </div>

      {showImporter && (
        <Importer
          branch={branch}
          onImport={() => { setShowImporter(false); setRev((r) => r + 1); }}
          onClose={() => setShowImporter(false)}
        />
      )}
    </>
  );
}

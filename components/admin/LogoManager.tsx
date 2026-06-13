"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";

const BUCKET = "logos";
const FILE = "logo.png";
const BASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;

function getLogoUrl(bust?: number) {
  return `${BASE_URL}/storage/v1/object/public/${BUCKET}/${FILE}${bust ? `?v=${bust}` : ""}`;
}

export default function LogoManager() {
  const [exists, setExists] = useState<boolean | null>(null);
  const [bust, setBust] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function checkExists() {
    const { data } = await supabase.storage.from(BUCKET).list("", { search: FILE });
    setExists((data ?? []).some((f) => f.name === FILE));
  }

  useEffect(() => { checkExists(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function upload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { setErr("이미지 파일만 업로드 가능합니다."); return; }
    if (file.size > 5 * 1024 * 1024) { setErr("5MB 이하 파일만 업로드 가능합니다."); return; }
    setErr(null); setMsg(null); setUploading(true);
    const { error } = await supabase.storage.from(BUCKET).upload(FILE, file, {
      upsert: true,
      contentType: file.type,
    });
    setUploading(false);
    if (error) { setErr(error.message); return; }
    setBust(Date.now());
    setExists(true);
    setMsg("로고 이미지가 업로드되었습니다.");
    if (fileRef.current) fileRef.current.value = "";
  }

  async function remove() {
    if (!confirm("로고 이미지를 삭제하시겠습니까?")) return;
    setDeleting(true); setErr(null); setMsg(null);
    const { error } = await supabase.storage.from(BUCKET).remove([FILE]);
    setDeleting(false);
    if (error) { setErr(error.message); return; }
    setExists(false);
    setBust(0);
    setMsg("로고 이미지가 삭제되었습니다.");
  }

  return (
    <div style={{ padding: "32px 36px" }}>
      <div style={{ marginBottom: 28 }}>
        <h1 className="kr-d3" style={{ fontSize: 24, fontWeight: 800 }}>로고 관리</h1>
        <p className="muted" style={{ fontSize: 13.5, marginTop: 4 }}>
          증명서 등 각종 서류에 워터마크로 표시될 회사 로고를 등록합니다.
        </p>
      </div>

      <div style={{ display: "flex", gap: 32, flexWrap: "wrap", alignItems: "flex-start" }}>
        {/* Upload panel */}
        <div className="panel" style={{ flex: "0 0 auto", width: 320, padding: 28 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 20 }}>현재 로고</h2>

          {exists === null ? (
            <p className="muted">확인 중…</p>
          ) : exists ? (
            <div style={{ marginBottom: 24 }}>
              <div style={{
                width: "100%", height: 140,
                border: "1px solid var(--line-2)", borderRadius: 6,
                display: "flex", alignItems: "center", justifyContent: "center",
                background: "repeating-conic-gradient(#f0f0f0 0% 25%, #fff 0% 50%) 0 0 / 16px 16px",
                marginBottom: 12, overflow: "hidden", padding: 16,
              }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  key={bust}
                  src={getLogoUrl(bust || 1)}
                  alt="현재 로고"
                  style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
                  onError={() => setExists(false)}
                />
              </div>
              <p className="muted" style={{ fontSize: 12 }}>투명 체크 배경에서 투명도를 확인할 수 있습니다.</p>
            </div>
          ) : (
            <div style={{
              width: "100%", height: 140,
              border: "2px dashed var(--line-2)", borderRadius: 6,
              display: "flex", alignItems: "center", justifyContent: "center",
              marginBottom: 24, color: "var(--muted)", fontSize: 13,
            }}>
              등록된 로고 없음
            </div>
          )}

          {err && <div role="alert" style={{ color: "#b3261e", fontSize: 13, marginBottom: 16 }}>{err}</div>}
          {msg && <div role="status" style={{ color: "#1f7a3d", fontSize: 13, marginBottom: 16 }}>{msg}</div>}

          <div className="flex gap-s" style={{ flexWrap: "wrap" }}>
            <label className="btn btn--sm" style={{ cursor: "pointer" }}>
              {uploading ? "업로드 중…" : exists ? "로고 교체" : "로고 업로드"}
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                style={{ display: "none" }}
                onChange={upload}
                disabled={uploading}
              />
            </label>
            {exists && (
              <button
                className="btn btn--sm btn--ghost"
                onClick={remove}
                disabled={deleting}
                style={{ color: "#b3261e", borderColor: "#b3261e" }}
              >
                {deleting ? "삭제 중…" : "삭제"}
              </button>
            )}
          </div>

          <div style={{ marginTop: 20, padding: "14px 16px", background: "var(--surface-2)", borderRadius: 4, fontSize: 12.5, color: "var(--muted)", lineHeight: 1.8 }}>
            <strong style={{ color: "var(--ink)" }}>권장 사항</strong><br />
            · 투명 배경 PNG 또는 SVG 권장<br />
            · 가로형 로고 권장 (예: 400×120px)<br />
            · 5MB 이하<br />
            · 업로드 후 증명서 발급 시 자동 반영
          </div>
        </div>

        {/* Preview panel */}
        <div className="panel" style={{ flex: "1 1 360px", padding: 28 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>워터마크 미리보기</h2>
          <p className="muted" style={{ fontSize: 12.5, marginBottom: 20 }}>
            증명서 본문 중앙에 연하게 워터마크로 표시됩니다.
          </p>
          <div style={{
            position: "relative", background: "#fff",
            border: "1px solid var(--line-2)", borderRadius: 4,
            height: 280, overflow: "hidden",
            display: "flex", flexDirection: "column",
            padding: "24px 28px", gap: 10,
          }}>
            {/* simulated doc lines */}
            {[80, 60, 60, 60, 40, 40, 55].map((w, i) => (
              <div key={i} style={{ height: 9, width: `${w}%`, background: "#e8e8e8", borderRadius: 4 }} />
            ))}
            {/* watermark overlay */}
            {exists && (
              <div style={{
                position: "absolute", inset: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                pointerEvents: "none",
              }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  key={bust}
                  src={getLogoUrl(bust || 1)}
                  alt="워터마크 미리보기"
                  style={{ width: 200, maxHeight: 120, objectFit: "contain", opacity: 0.08 }}
                  onError={() => {}}
                />
              </div>
            )}
            {!exists && (
              <div style={{
                position: "absolute", inset: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "var(--muted)", fontSize: 12, pointerEvents: "none",
              }}>
                로고 업로드 후 미리보기
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

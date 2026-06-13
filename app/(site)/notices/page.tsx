"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sba = supabase as any;
type SbaRes = { data: unknown; error: { message: string } | null };

type Notice = {
  id: string;
  title: string;
  content: string;
  category: string;
  is_pinned: boolean;
  view_count: number;
  created_at: string;
};

export default function NoticesPage() {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Notice | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    sba.from("notices").select("*")
      .eq("status", "published")
      .order("is_pinned", { ascending: false })
      .order("created_at", { ascending: false })
      .then(({ data }: SbaRes) => {
        setLoading(false);
        setNotices((data as Notice[]) ?? []);
      });
  }, []);

  // Close modal on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") setSelected(null); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const q = search.toLowerCase();
  const filtered = !q ? notices : notices.filter((n) => n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q));

  return (
    <>
      <section className="invert grid-bg page-hero" data-screen-label="공지사항">
        <div className="grid-lines" />
        <div className="container" style={{ position: "relative", zIndex: 2 }}>
          <div className="crumb">
            <Link href="/">HOME</Link><span className="sep">/</span>
            <span>공지사항</span>
          </div>
          <h1>공지사항</h1>
          <div className="en">Notices &amp; Announcements</div>
          <p className="lede">점검 안내, 시스템 공지, 채용 소식 등 그리드온의 공식 안내사항입니다.</p>
        </div>
      </section>

      <section className="section">
        <div className="container">
          {/* Search */}
          <div style={{ maxWidth: 480, marginBottom: 32 }}>
            <input className="input" placeholder="공지 제목 또는 내용 검색…"
              value={search} onChange={(e) => setSearch(e.target.value)}
              style={{ width: "100%", fontSize: 15 }} />
          </div>

          {loading ? (
            <p className="muted" style={{ padding: "40px 0", textAlign: "center" }}>불러오는 중…</p>
          ) : filtered.length === 0 ? (
            <p className="muted" style={{ padding: "40px 0", textAlign: "center" }}>등록된 공지사항이 없습니다.</p>
          ) : (
            <div className="list" data-reveal>
              {filtered.map((n) => (
                <a key={n.id} href="#" onClick={(e) => { e.preventDefault(); setSelected(n); }}>
                  {n.is_pinned && (
                    <span style={{ background: "var(--fg)", color: "var(--bg)", fontSize: 10, padding: "2px 6px", borderRadius: 2, fontWeight: 800, whiteSpace: "nowrap", marginRight: -12 }}>고정</span>
                  )}
                  <span className="lc">{n.category}</span>
                  <span className="lt">{n.title}</span>
                  <span className="ld">{n.created_at.slice(0, 10)}</span>
                </a>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Detail modal */}
      {selected && (
        <div
          onClick={() => setSelected(null)}
          style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(0,0,0,.55)", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "60px 20px 40px", overflowY: "auto" }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: "var(--paper)", borderRadius: 6, padding: "32px 36px", width: "100%", maxWidth: 720, boxShadow: "0 24px 64px rgba(0,0,0,.35)" }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 11.5, color: "var(--soft)", letterSpacing: ".1em", textTransform: "uppercase" }}>{selected.category}</span>
                  {selected.is_pinned && <span style={{ background: "var(--ink)", color: "var(--paper)", fontSize: 11, padding: "1px 8px", borderRadius: 3, fontWeight: 800 }}>고정공지</span>}
                </div>
                <h2 style={{ fontSize: 22, fontWeight: 800, lineHeight: 1.4, marginBottom: 8 }}>{selected.title}</h2>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 12.5, color: "var(--soft)" }}>{selected.created_at.slice(0, 10)}</div>
              </div>
              <button onClick={() => setSelected(null)}
                style={{ background: "none", border: "none", cursor: "pointer", fontSize: 24, color: "var(--muted)", lineHeight: 1, padding: "0 0 0 20px", flexShrink: 0 }}>
                ×
              </button>
            </div>
            <div style={{ borderTop: "1px solid var(--line-2)", paddingTop: 22, fontSize: 15.5, lineHeight: 1.9, whiteSpace: "pre-wrap" }}>
              {selected.content}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sba = supabase as any;
type SbaRes = { data: unknown; error: { message: string } | null };

type GalleryItem = {
  id: string;
  title: string;
  description: string | null;
  category: string;
  client_name: string | null;
  project_year: number | null;
  cover_url: string | null;
};

const CATEGORIES = ["전체", "전기공사", "변전설비", "태양광", "송배전", "ESS", "기타"];

function ImageIcon() {
  return (
    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" style={{ opacity: .35 }}>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor" stroke="none" />
      <path d="M21 15l-5-5L5 21" />
    </svg>
  );
}

export default function GalleryPage() {
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("전체");
  const [selected, setSelected] = useState<GalleryItem | null>(null);

  useEffect(() => {
    sba.from("gallery")
      .select("id, title, description, category, client_name, project_year, cover_url")
      .eq("status", "published")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false })
      .then(({ data }: SbaRes) => {
        setLoading(false);
        setItems((data as GalleryItem[]) ?? []);
      });
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") setSelected(null); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const filtered = category === "전체" ? items : items.filter((x) => x.category === category);

  return (
    <>
      <section className="invert grid-bg page-hero" data-screen-label="실적 갤러리">
        <div className="grid-lines" />
        <div className="container" style={{ position: "relative", zIndex: 2 }}>
          <div className="crumb">
            <Link href="/">HOME</Link><span className="sep">/</span>
            <Link href="/services">사업·서비스</Link><span className="sep">/</span>
            <span>실적·갤러리</span>
          </div>
          <h1>실적·갤러리</h1>
          <div className="en">Portfolio &amp; Gallery</div>
          <p className="lede">그리드온이 완공한 전기공사 프로젝트를 소개합니다.</p>
        </div>
      </section>

      <section className="section">
        <div className="container">
          {/* Category filter */}
          <div style={{ display: "flex", gap: 8, marginBottom: 40, flexWrap: "wrap" }} data-reveal>
            {CATEGORIES.map((c) => (
              <button key={c} type="button" onClick={() => setCategory(c)}
                style={{
                  padding: "7px 20px", border: "1px solid var(--line-2)", borderRadius: 24,
                  background: category === c ? "var(--ink)" : "transparent",
                  color: category === c ? "var(--paper)" : "var(--ink)",
                  fontSize: 14, cursor: "pointer", fontWeight: category === c ? 700 : 400,
                  transition: "background .15s, color .15s",
                }}>
                {c}
              </button>
            ))}
          </div>

          {loading ? (
            <p className="muted" style={{ textAlign: "center", padding: "60px 0" }}>불러오는 중…</p>
          ) : filtered.length === 0 ? (
            <p className="muted" style={{ textAlign: "center", padding: "60px 0" }}>등록된 실적이 없습니다.</p>
          ) : (
            <div data-reveal style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(290px, 1fr))", gap: 20 }}>
              {filtered.map((item) => (
                <button key={item.id} type="button" onClick={() => setSelected(item)}
                  style={{ background: "var(--bg)", border: "1px solid var(--line)", borderRadius: 6, overflow: "hidden", cursor: "pointer", textAlign: "left", font: "inherit", color: "inherit", padding: 0, transition: "transform .18s, box-shadow .18s" }}
                  onMouseEnter={(e) => Object.assign((e.currentTarget as HTMLButtonElement).style, { transform: "translateY(-3px)", boxShadow: "0 10px 30px rgba(0,0,0,.13)" })}
                  onMouseLeave={(e) => Object.assign((e.currentTarget as HTMLButtonElement).style, { transform: "", boxShadow: "" })}>
                  {/* Cover */}
                  <div style={{ aspectRatio: "16/10", background: "var(--faint)", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {item.cover_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.cover_url} alt={item.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      <ImageIcon />
                    )}
                  </div>
                  {/* Info */}
                  <div style={{ padding: "16px 18px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--soft)" }}>{item.category}</span>
                      {item.project_year && <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--soft)" }}>{item.project_year}</span>}
                    </div>
                    <div style={{ fontWeight: 700, fontSize: 16, lineHeight: 1.4, marginBottom: 4 }}>{item.title}</div>
                    {item.client_name && <div style={{ fontSize: 13.5, color: "var(--muted)" }}>{item.client_name}</div>}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Lightbox */}
      {selected && (
        <div onClick={() => setSelected(null)} style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(0,0,0,.8)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: "var(--paper)", borderRadius: 6, overflow: "hidden", maxWidth: 820, width: "100%", boxShadow: "0 32px 80px rgba(0,0,0,.5)" }}>
            {selected.cover_url && (
              <div style={{ background: "#111", maxHeight: "58vh", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={selected.cover_url} alt={selected.title} style={{ width: "100%", maxHeight: "58vh", objectFit: "contain" }} />
              </div>
            )}
            <div style={{ padding: "24px 28px", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", gap: 12, marginBottom: 10, alignItems: "center" }}>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 11.5, color: "var(--soft)", letterSpacing: ".1em", textTransform: "uppercase" }}>{selected.category}</span>
                  {selected.project_year && <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--soft)" }}>{selected.project_year}년</span>}
                </div>
                <h3 style={{ fontSize: 21, fontWeight: 800, marginBottom: 6, lineHeight: 1.4 }}>{selected.title}</h3>
                {selected.client_name && <div style={{ color: "var(--muted)", fontSize: 14.5, marginBottom: 8 }}>발주처: {selected.client_name}</div>}
                {selected.description && <p style={{ fontSize: 14.5, lineHeight: 1.8, color: "var(--muted)", marginTop: 10, whiteSpace: "pre-wrap" }}>{selected.description}</p>}
              </div>
              <button onClick={() => setSelected(null)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 26, color: "var(--muted)", padding: "0 0 0 20px", lineHeight: 1, flexShrink: 0 }}>×</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

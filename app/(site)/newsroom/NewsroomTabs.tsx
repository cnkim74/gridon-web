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
  category: string;
  is_pinned: boolean;
  created_at: string;
};

type QnaItem = {
  id: string;
  question: string;
  answer: string;
  answered_at: string | null;
};

type GalleryItem = {
  id: string;
  title: string;
  category: string;
  client_name: string | null;
  project_year: number | null;
  cover_url: string | null;
};

type TabKey = "notices" | "qna" | "gallery";

function Chev() {
  return (
    <svg className="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function ImagePlaceholder() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" style={{ opacity: 0.3 }}>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor" stroke="none" />
      <path d="M21 15l-5-5L5 21" />
    </svg>
  );
}

export default function NewsroomTabs() {
  const [tab, setTab] = useState<TabKey>("notices");
  const [notices, setNotices] = useState<Notice[]>([]);
  const [qnas, setQnas] = useState<QnaItem[]>([]);
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const h = window.location.hash.slice(1);
    if (h === "notices" || h === "qna" || h === "gallery") setTab(h as TabKey);
  }, []);

  useEffect(() => {
    const p1 = sba.from("notices")
      .select("id, title, category, is_pinned, created_at")
      .eq("status", "published")
      .order("is_pinned", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(10)
      .then(({ data }: SbaRes) => setNotices((data as Notice[]) ?? []));

    const p2 = sba.from("qna")
      .select("id, question, answer, answered_at")
      .eq("status", "answered")
      .eq("is_public", true)
      .order("answered_at", { ascending: false })
      .limit(8)
      .then(({ data }: SbaRes) => setQnas((data as QnaItem[]) ?? []));

    const p3 = sba.from("gallery")
      .select("id, title, category, client_name, project_year, cover_url")
      .eq("status", "published")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false })
      .limit(6)
      .then(({ data }: SbaRes) => setGallery((data as GalleryItem[]) ?? []));

    Promise.all([p1, p2, p3]).then(() => setLoading(false));
  }, []);

  function fmtDate(s: string) {
    return s.slice(0, 10).replace(/-/g, ".");
  }

  return (
    <>
      <div className="tab-bar" data-reveal>
        <button className={`tab${tab === "notices" ? " active" : ""}`} onClick={() => setTab("notices")} id="notices">공지사항</button>
        <button className={`tab${tab === "qna" ? " active" : ""}`} onClick={() => setTab("qna")} id="qna">질의응답</button>
        <button className={`tab${tab === "gallery" ? " active" : ""}`} onClick={() => setTab("gallery")} id="gallery">실적</button>
      </div>

      {/* 공지사항 */}
      <div className={`tab-panel${tab === "notices" ? " active" : ""}`}>
        {loading ? (
          <p className="muted" style={{ padding: "32px 0" }}>불러오는 중…</p>
        ) : notices.length === 0 ? (
          <p className="muted" style={{ padding: "32px 0" }}>등록된 공지사항이 없습니다.</p>
        ) : (
          <>
            <div className="list" data-reveal>
              {notices.map((n) => (
                <Link key={n.id} href="/notices">
                  {n.is_pinned && (
                    <span style={{ background: "var(--fg)", color: "var(--bg)", fontSize: 10, padding: "2px 6px", borderRadius: 2, fontWeight: 800, whiteSpace: "nowrap", marginRight: -12 }}>고정</span>
                  )}
                  <span className="lc">{n.category}</span>
                  <span className="lt">{n.title}</span>
                  <span className="ld">{fmtDate(n.created_at)}</span>
                </Link>
              ))}
            </div>
            <div style={{ marginTop: 20, textAlign: "right" }}>
              <Link href="/notices" style={{ fontSize: 14, color: "var(--muted)", borderBottom: "1px solid var(--line-2)", paddingBottom: 2 }}>
                전체 공지사항 보기 →
              </Link>
            </div>
          </>
        )}
      </div>

      {/* 질의응답 */}
      <div className={`tab-panel${tab === "qna" ? " active" : ""}`}>
        {loading ? (
          <p className="muted" style={{ padding: "32px 0" }}>불러오는 중…</p>
        ) : qnas.length === 0 ? (
          <p className="muted" style={{ padding: "32px 0" }}>등록된 답변이 없습니다.</p>
        ) : (
          <>
            <div className="acc" data-reveal>
              {qnas.map((q) => (
                <details key={q.id}>
                  <summary>
                    <span className="q"><span className="qmark">Q</span>{q.question}</span>
                    <Chev />
                  </summary>
                  <div className="a">
                    <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.85 }}>{q.answer}</div>
                    {q.answered_at && (
                      <div style={{ marginTop: 8, fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--soft)" }}>
                        {q.answered_at.slice(0, 10)}
                      </div>
                    )}
                  </div>
                </details>
              ))}
            </div>
            <div style={{ marginTop: 20, textAlign: "right" }}>
              <Link href="/qna" style={{ fontSize: 14, color: "var(--muted)", borderBottom: "1px solid var(--line-2)", paddingBottom: 2 }}>
                질문하기 / 전체 Q&amp;A →
              </Link>
            </div>
          </>
        )}
      </div>

      {/* 실적 */}
      <div className={`tab-panel${tab === "gallery" ? " active" : ""}`}>
        {loading ? (
          <p className="muted" style={{ padding: "32px 0" }}>불러오는 중…</p>
        ) : gallery.length === 0 ? (
          <p className="muted" style={{ padding: "32px 0" }}>등록된 실적이 없습니다.</p>
        ) : (
          <>
            <div data-reveal style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16, marginTop: 8 }}>
              {gallery.map((item) => (
                <Link
                  key={item.id}
                  href="/gallery"
                  style={{ display: "block", background: "var(--bg)", border: "1px solid var(--line)", borderRadius: 6, overflow: "hidden", textDecoration: "none", color: "inherit" }}
                >
                  <div style={{ aspectRatio: "16/10", background: "var(--faint)", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {item.cover_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.cover_url} alt={item.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      <ImagePlaceholder />
                    )}
                  </div>
                  <div style={{ padding: "14px 16px" }}>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--soft)", marginBottom: 6 }}>
                      {item.category}{item.project_year ? ` · ${item.project_year}` : ""}
                    </div>
                    <div style={{ fontWeight: 700, fontSize: 15, lineHeight: 1.4 }}>{item.title}</div>
                    {item.client_name && (
                      <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 4 }}>{item.client_name}</div>
                    )}
                  </div>
                </Link>
              ))}
            </div>
            <div style={{ marginTop: 20, textAlign: "right" }}>
              <Link href="/gallery" style={{ fontSize: 14, color: "var(--muted)", borderBottom: "1px solid var(--line-2)", paddingBottom: 2 }}>
                전체 실적·갤러리 보기 →
              </Link>
            </div>
          </>
        )}
      </div>
    </>
  );
}

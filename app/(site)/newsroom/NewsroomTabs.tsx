"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sba = supabase as any;
type SbaRes = { data: unknown; error: { message: string } | null };

type Post = {
  id: string;
  category: "보도자료" | "공지사항" | "미디어";
  title: string;
  media_url: string | null;
  thumbnail: string | null;
  author: string | null;
  created_at: string;
  updated_at: string;
};

type TabKey = "press" | "notice" | "media";

function PlayIcon() {
  return (
    <svg className="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.1">
      <circle cx="12" cy="12" r="9" />
      <path d="M10 9l5 3-5 3z" fill="currentColor" stroke="none" />
    </svg>
  );
}

export default function NewsroomTabs() {
  const [tab, setTab] = useState<TabKey>("press");
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const h = window.location.hash.slice(1);
    if (h === "press" || h === "notice" || h === "media") setTab(h);
  }, []);

  useEffect(() => {
    sba.from("posts")
      .select("id, category, title, media_url, thumbnail, author, created_at, updated_at")
      .order("created_at", { ascending: false })
      .then(({ data }: SbaRes) => {
        setLoading(false);
        setPosts((data as Post[]) ?? []);
      });
  }, []);

  const press = posts.filter((p) => p.category === "보도자료");
  const notice = posts.filter((p) => p.category === "공지사항");
  const media = posts.filter((p) => p.category === "미디어");

  function fmtDate(s: string) {
    return s.slice(0, 10).replace(/-/g, ".");
  }

  return (
    <>
      <div className="tab-bar" data-reveal>
        <button className={`tab${tab === "press" ? " active" : ""}`} onClick={() => setTab("press")} id="press">보도자료</button>
        <button className={`tab${tab === "notice" ? " active" : ""}`} onClick={() => setTab("notice")} id="notice">공지사항</button>
        <button className={`tab${tab === "media" ? " active" : ""}`} onClick={() => setTab("media")} id="media">미디어</button>
      </div>

      {/* press */}
      <div className={`tab-panel${tab === "press" ? " active" : ""}`}>
        {loading ? (
          <p className="muted" style={{ padding: "32px 0" }}>불러오는 중…</p>
        ) : press.length === 0 ? (
          <p className="muted" style={{ padding: "32px 0" }}>등록된 보도자료가 없습니다.</p>
        ) : (
          <div className="list" data-reveal>
            {press.map((p) => (
              <a key={p.id} href="#">
                <span className="lc">{p.author ?? "보도자료"}</span>
                <span className="lt">{p.title}</span>
                <span className="ld">{fmtDate(p.created_at)}</span>
              </a>
            ))}
          </div>
        )}
      </div>

      {/* notice */}
      <div className={`tab-panel${tab === "notice" ? " active" : ""}`}>
        {loading ? (
          <p className="muted" style={{ padding: "32px 0" }}>불러오는 중…</p>
        ) : notice.length === 0 ? (
          <p className="muted" style={{ padding: "32px 0" }}>등록된 공지사항이 없습니다.</p>
        ) : (
          <div className="list">
            {notice.map((p) => (
              <a key={p.id} href="#">
                <span className="lc">{p.author ?? "공지"}</span>
                <span className="lt">{p.title}</span>
                <span className="ld">{fmtDate(p.created_at)}</span>
              </a>
            ))}
          </div>
        )}
      </div>

      {/* media */}
      <div className={`tab-panel${tab === "media" ? " active" : ""}`}>
        {loading ? (
          <p className="muted" style={{ padding: "32px 0" }}>불러오는 중…</p>
        ) : media.length === 0 ? (
          <p className="muted" style={{ padding: "32px 0" }}>등록된 미디어가 없습니다.</p>
        ) : (
          <div
            className="news"
            data-reveal
            style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 1, background: "var(--line)", border: "1px solid var(--line)", marginTop: 24 }}
          >
            {media.map((p) => (
              <a
                className="news-card"
                href={p.media_url ?? "#"}
                key={p.id}
                target={p.media_url ? "_blank" : undefined}
                rel={p.media_url ? "noopener noreferrer" : undefined}
              >
                <div className="media-box" style={{ aspectRatio: "16/10", margin: "-1px -1px 0", border: 0, overflow: "hidden" }}>
                  {p.thumbnail ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.thumbnail} alt={p.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <PlayIcon />
                  )}
                </div>
                <div className="cat" style={{ marginTop: 18 }}>{p.author ?? "미디어"}</div>
                <div className="nt">{p.title}</div>
              </a>
            ))}
          </div>
        )}
      </div>

      <div className="pager" style={{ marginTop: 28 }}>
        <button className="active">1</button>
      </div>
    </>
  );
}

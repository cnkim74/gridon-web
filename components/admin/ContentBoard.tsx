"use client";
import { useState } from "react";
import NoticeBoard from "@/components/admin/NoticeBoard";
import QnaBoard from "@/components/admin/QnaBoard";
import GalleryBoard from "@/components/admin/GalleryBoard";

type Tab = "notices" | "qna" | "gallery";

const TABS: { key: Tab; label: string }[] = [
  { key: "notices", label: "공지사항" },
  { key: "qna", label: "질의응답" },
  { key: "gallery", label: "실적·갤러리" },
];

const tabBtn = (active: boolean): React.CSSProperties => ({
  padding: "11px 26px",
  background: "none",
  border: "none",
  borderBottom: active ? "2px solid var(--ink)" : "2px solid transparent",
  marginBottom: -1,
  fontWeight: active ? 700 : 400,
  color: active ? "var(--ink)" : "var(--muted)",
  cursor: "pointer",
  fontSize: 15,
  font: "inherit",
  transition: "color .15s",
});

export default function ContentBoard() {
  const [tab, setTab] = useState<Tab>("notices");

  return (
    <>
      <div style={{ borderBottom: "1px solid var(--line)", marginBottom: 28, display: "flex", gap: 0 }}>
        {TABS.map(({ key, label }) => (
          <button key={key} type="button" style={tabBtn(tab === key)} onClick={() => setTab(key)}>
            {label}
          </button>
        ))}
      </div>

      {tab === "notices" && <NoticeBoard />}
      {tab === "qna" && <QnaBoard />}
      {tab === "gallery" && <GalleryBoard />}
    </>
  );
}

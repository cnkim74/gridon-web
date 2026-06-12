import type { Metadata } from "next";
import SegFilter from "@/components/SegFilter";

export const metadata: Metadata = { title: "콘텐츠 관리" };

type Row = {
  cat: string;
  title: string;
  author: string;
  status: "게시중" | "예약" | "임시저장";
  date: string;
};

const ROWS: Row[] = [
  { cat: "보도자료", title: "차세대 AI 수요예측 플랫폼 ‘펄스’ 가동", author: "홍보팀", status: "게시중", date: "2026.05.28" },
  { cat: "공지사항", title: "6월 정기 설비 점검 안내", author: "운영팀", status: "게시중", date: "2026.06.03" },
  { cat: "보도자료", title: "동남권 2.4GW 신재생 연계 ESS 단지 준공", author: "홍보팀", status: "게시중", date: "2026.05.12" },
  { cat: "미디어", title: "브랜드 필름 — Where the Grid turns On", author: "홍보팀", status: "예약", date: "2026.06.20" },
  { cat: "공지사항", title: "하반기 계절별 차등 요금제 적용 안내", author: "요금팀", status: "임시저장", date: "—" },
  { cat: "보도자료", title: "자가복구 배전망 실증 완료", author: "기술팀", status: "게시중", date: "2026.04.21" },
  { cat: "공지사항", title: "마이페이지 요금 조회 시스템 점검", author: "IT팀", status: "게시중", date: "2026.05.30" },
];

function StatusBadge({ status }: { status: Row["status"] }) {
  if (status === "게시중") return <span className="badge ok dotok">게시중</span>;
  if (status === "예약") return <span className="badge warn dotwarn">예약</span>;
  return <span className="badge off">임시저장</span>;
}

function SearchIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.2-3.2" />
    </svg>
  );
}

export default function ContentPage() {
  return (
    <>
      <div className="apage-head">
        <div><h1>콘텐츠 관리</h1><p>보도자료·공지사항·미디어 등 사이트 게시물을 관리합니다.</p></div>
        <button className="btn btn--sm">＋ 새 글 작성</button>
      </div>

      <div className="kpis">
        <div className="kpi"><div className="kl">전체 게시물</div><div className="kv">428</div></div>
        <div className="kpi"><div className="kl">게시중</div><div className="kv">391</div></div>
        <div className="kpi"><div className="kl">임시저장</div><div className="kv">14</div></div>
        <div className="kpi"><div className="kl">예약 발행</div><div className="kv">3</div></div>
      </div>

      <div className="panel">
        <div className="panel-body">
          <div className="atable-tools">
            <SegFilter options={["전체", "보도자료", "공지사항", "미디어"]} />
            <div className="search-mini"><SearchIcon /><input placeholder="제목 검색" /></div>
          </div>
        </div>
        <table className="dtable">
          <thead>
            <tr>
              <th style={{ width: 90 }}>분류</th>
              <th>제목</th>
              <th style={{ width: 120 }}>작성자</th>
              <th style={{ width: 120 }}>상태</th>
              <th style={{ width: 130 }}>발행일</th>
              <th style={{ width: 80 }} />
            </tr>
          </thead>
          <tbody>
            {ROWS.map((r) => (
              <tr key={r.title}>
                <td><span className="badge off">{r.cat}</span></td>
                <td className="strong">{r.title}</td>
                <td className="cellsub">{r.author}</td>
                <td><StatusBadge status={r.status} /></td>
                <td className="cellsub">{r.date}</td>
                <td><a className="cellsub" href="#" style={{ borderBottom: "1px solid var(--line-2)" }}>편집</a></td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ padding: "0 22px 22px" }}>
          <div className="pager">
            <button>←</button><button className="active">1</button><button>2</button><button>3</button><button>…</button><button>62</button><button>→</button>
          </div>
        </div>
      </div>
    </>
  );
}

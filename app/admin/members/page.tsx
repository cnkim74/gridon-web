import type { Metadata } from "next";
import SegFilter from "@/components/SegFilter";

export const metadata: Metadata = { title: "회원 관리" };

type Member = {
  no: string;
  name: string;
  kind: "개인" | "기업";
  contract: string;
  joined: string;
  status: "활성" | "휴면" | "해지";
};

const MEMBERS: Member[] = [
  { no: "GO-2841093", name: "김서연", kind: "개인", contract: "주택용 저압", joined: "2026.06.13", status: "활성" },
  { no: "GO-2841088", name: "㈜대한산업", kind: "기업", contract: "산업용 고압A", joined: "2026.06.12", status: "활성" },
  { no: "GO-2840551", name: "이준호", kind: "개인", contract: "주택용 저압", joined: "2026.05.30", status: "활성" },
  { no: "GO-2839740", name: "그린에너지협동조합", kind: "기업", contract: "일반용 고압", joined: "2026.05.21", status: "활성" },
  { no: "GO-2120447", name: "박민지", kind: "개인", contract: "주택용 저압", joined: "2021.03.04", status: "휴면" },
  { no: "GO-2838219", name: "정태욱", kind: "개인", contract: "일반용 저압", joined: "2026.05.08", status: "활성" },
  { no: "GO-1904822", name: "㈜미래물류센터", kind: "기업", contract: "산업용 고압B", joined: "2019.11.27", status: "해지" },
  { no: "GO-2837004", name: "한수민", kind: "개인", contract: "주택용 저압", joined: "2026.04.19", status: "활성" },
];

function StatusBadge({ status }: { status: Member["status"] }) {
  if (status === "활성") return <span className="badge ok dotok">활성</span>;
  if (status === "휴면") return <span className="badge warn dotwarn">휴면</span>;
  return <span className="badge off">해지</span>;
}

function SearchIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.2-3.2" />
    </svg>
  );
}

export default function MembersPage() {
  return (
    <>
      <div className="apage-head">
        <div><h1>회원 관리</h1><p>개인·기업 고객 계정을 조회하고 관리합니다.</p></div>
        <div className="flex gap-s wrap">
          <button className="btn btn--sm btn--ghost">내보내기 (CSV)</button>
          <button className="btn btn--sm">＋ 회원 등록</button>
        </div>
      </div>

      <div className="kpis">
        <div className="kpi"><div className="kl">총 회원</div><div className="kv">1,842,016</div><div className="kd"><span className="up">▲ 1,284</span><span className="muted">오늘</span></div></div>
        <div className="kpi"><div className="kl">기업 회원</div><div className="kv">38,492</div><div className="kd"><span className="up">▲ 0.6%</span><span className="muted">전월</span></div></div>
        <div className="kpi"><div className="kl">신규 (이번 달)</div><div className="kv">24,108</div></div>
        <div className="kpi"><div className="kl">휴면 계정</div><div className="kv">9,640</div><div className="kd"><span className="muted">전환 대기</span></div></div>
      </div>

      <div className="panel">
        <div className="panel-body">
          <div className="atable-tools">
            <SegFilter options={["전체", "개인", "기업", "휴면"]} />
            <div className="search-mini"><SearchIcon /><input placeholder="이름·고객번호 검색" /></div>
          </div>
        </div>
        <table className="dtable">
          <thead>
            <tr>
              <th style={{ width: 130 }}>고객번호</th>
              <th>고객명</th>
              <th style={{ width: 90 }}>구분</th>
              <th>계약 종별</th>
              <th style={{ width: 120 }}>가입일</th>
              <th style={{ width: 110 }}>상태</th>
            </tr>
          </thead>
          <tbody>
            {MEMBERS.map((m) => (
              <tr key={m.no}>
                <td className="cellsub">{m.no}</td>
                <td className="strong">{m.name}</td>
                <td><span className="badge off">{m.kind}</span></td>
                <td>{m.contract}</td>
                <td className="cellsub">{m.joined}</td>
                <td><StatusBadge status={m.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ padding: "0 22px 22px" }}>
          <div className="pager">
            <button>←</button><button className="active">1</button><button>2</button><button>3</button><button>…</button><button>→</button>
          </div>
        </div>
      </div>
    </>
  );
}

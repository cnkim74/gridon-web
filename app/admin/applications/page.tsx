import type { Metadata } from "next";
import SegFilter from "@/components/SegFilter";

export const metadata: Metadata = { title: "전기 신청 처리" };

type App = {
  id: string;
  name: string;
  kind: string;
  addr: string;
  stage: "접수" | "현장확인" | "계약·시공" | "완료";
  owner: string;
};

const APPS: App[] = [
  { id: "A-260613-014", name: "㈜대한산업", kind: "계약전력 증설", addr: "경기 화성시 동탄산단로 12", stage: "현장확인", owner: "최현우" },
  { id: "A-260613-011", name: "박민지", kind: "신규 (전입)", addr: "서울 강남구 역삼로 45", stage: "접수", owner: "미배정" },
  { id: "A-260612-238", name: "정태욱", kind: "명의 변경", addr: "부산 해운대구 센텀로 9", stage: "완료", owner: "김다은" },
  { id: "A-260612-205", name: "그린에너지협동조합", kind: "신규 (고압)", addr: "전남 나주시 빛가람로 301", stage: "계약·시공", owner: "이상민" },
  { id: "A-260612-188", name: "한수민", kind: "신규 (전입)", addr: "인천 연수구 송도과학로 7", stage: "현장확인", owner: "최현우" },
  { id: "A-260611-447", name: "㈜미래물류센터", kind: "계약전력 증설", addr: "경남 김해시 한림산단로 88", stage: "접수", owner: "미배정" },
  { id: "A-260611-392", name: "김서연", kind: "신규 (전입)", addr: "대전 유성구 대학로 99", stage: "완료", owner: "김다은" },
];

function StageBadge({ stage }: { stage: App["stage"] }) {
  if (stage === "접수") return <span className="badge warn dotwarn">접수</span>;
  if (stage === "완료") return <span className="badge ok">완료</span>;
  return <span className="badge ok dotok">{stage}</span>;
}

function SearchIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.2-3.2" />
    </svg>
  );
}

export default function ApplicationsPage() {
  return (
    <>
      <div className="apage-head">
        <div><h1>전기 신청 처리</h1><p>신규·증설·명의변경 등 전기 사용 신청을 단계별로 처리합니다.</p></div>
        <button className="btn btn--sm btn--ghost">처리 기준 안내</button>
      </div>

      {/* pipeline */}
      <div className="kpis">
        <div className="kpi"><div className="kl">① 접수 대기</div><div className="kv">28</div><div className="kd"><span className="muted">신규 배정 필요</span></div></div>
        <div className="kpi"><div className="kl">② 현장 확인</div><div className="kv">24</div><div className="kd"><span className="muted">점검 진행</span></div></div>
        <div className="kpi"><div className="kl">③ 계약·시공</div><div className="kv">18</div><div className="kd"><span className="muted">공사 중</span></div></div>
        <div className="kpi"><div className="kl">④ 완료 (이번 달)</div><div className="kv">312</div><div className="kd"><span className="up">▲ 9.4%</span><span className="muted">전월</span></div></div>
      </div>

      <div className="panel">
        <div className="panel-body">
          <div className="atable-tools">
            <SegFilter options={["전체", "접수", "현장확인", "시공중", "완료"]} />
            <div className="search-mini"><SearchIcon /><input placeholder="접수번호·신청인 검색" /></div>
          </div>
        </div>
        <table className="dtable">
          <thead>
            <tr>
              <th style={{ width: 140 }}>접수번호</th>
              <th>신청인</th>
              <th style={{ width: 120 }}>신청 종류</th>
              <th>공급 주소</th>
              <th style={{ width: 130 }}>단계</th>
              <th style={{ width: 90 }}>담당</th>
            </tr>
          </thead>
          <tbody>
            {APPS.map((a) => (
              <tr key={a.id}>
                <td className="cellsub">{a.id}</td>
                <td className="strong">{a.name}</td>
                <td>{a.kind}</td>
                <td className="cellsub">{a.addr}</td>
                <td><StageBadge stage={a.stage} /></td>
                <td className="cellsub">{a.owner}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ padding: "0 22px 22px" }}>
          <div className="pager">
            <button>←</button><button className="active">1</button><button>2</button><button>3</button><button>→</button>
          </div>
        </div>
      </div>
    </>
  );
}

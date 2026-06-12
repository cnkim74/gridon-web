"use client";

import { useState } from "react";
import SegFilter from "@/components/SegFilter";

type Status = "대기" | "처리중" | "완료";
type Inquiry = {
  id: string;
  type: string;
  name: string;
  cust: string;
  when: string;
  status: Status;
  ch: string;
  title: string;
  body: string;
};

const DATA: Inquiry[] = [
  { id: "Q-260613-204", type: "요금", name: "김서연", cust: "GO-2841093", when: "10분 전", status: "대기", ch: "웹", title: "요금 누진 단계 문의", body: "5월 청구서를 보니 누진 3단계가 적용된 것 같은데, 사용량 대비 요금이 갑자기 높아진 이유를 알고 싶습니다. 누진 구간 기준과 제 사용량 내역을 확인해 주실 수 있을까요?" },
  { id: "Q-260613-198", type: "민원", name: "이준호", cust: "GO-2840551", when: "1시간 전", status: "대기", ch: "전화", title: "정전 복구 지연 항의", body: "어제 저녁 우리 동네에 정전이 발생했는데 복구까지 2시간 가까이 걸렸습니다. 복구가 왜 이렇게 지연되었는지, 재발 방지 대책이 있는지 답변 부탁드립니다." },
  { id: "Q-260613-187", type: "기술", name: "정태욱", cust: "GO-2838219", when: "3시간 전", status: "처리중", ch: "웹", title: "태양광 계통연계 절차 문의", body: "가정용 태양광 5kW를 설치했습니다. 계통연계 신청 절차와 필요한 서류, 연계까지 소요 기간이 궁금합니다." },
  { id: "Q-260612-455", type: "요금", name: "㈜대한산업", cust: "GO-2841088", when: "어제", status: "처리중", ch: "웹", title: "산업용 최대수요전력 산정 문의", body: "당월 최대수요전력이 예상보다 높게 잡혔습니다. 측정 기준 시점과 데이터를 공유해 주시면 내부 검토하겠습니다." },
  { id: "Q-260612-410", type: "신청", name: "박민지", cust: "GO-2120447", when: "어제", status: "완료", ch: "웹", title: "명의변경 처리 확인", body: "명의변경 신청이 정상 접수되었는지 확인 부탁드립니다." },
  { id: "Q-260611-389", type: "민원", name: "한수민", cust: "GO-2837004", when: "2일 전", status: "완료", ch: "전화", title: "계량기 위치 변경 요청", body: "주택 리모델링으로 계량기 위치를 옮기고 싶습니다. 가능 여부와 비용을 안내해 주세요." },
];

function StatusBadge({ status }: { status: Status }) {
  if (status === "대기") return <span className="badge warn dotwarn">대기</span>;
  if (status === "처리중") return <span className="badge ok dotok">처리중</span>;
  return <span className="badge ok">완료</span>;
}

export default function InquiriesPage() {
  const [items, setItems] = useState<Inquiry[]>(DATA);
  const [cur, setCur] = useState(0);
  const d = items[cur];

  const mutate = (status: Status) =>
    setItems((prev) => prev.map((it, i) => (i === cur ? { ...it, status } : it)));

  return (
    <>
      <div className="apage-head">
        <div><h1>문의·민원</h1><p>고객 문의와 민원을 접수·답변하고 상태를 관리합니다.</p></div>
        <div className="flex gap-s">
          <span className="badge warn dotwarn">대기 37</span>
          <span className="badge ok dotok">처리중 12</span>
        </div>
      </div>

      <div className="grid-2 inq-grid" style={{ gridTemplateColumns: "1fr 1.15fr", alignItems: "start" }}>
        {/* list */}
        <div className="panel">
          <div className="panel-body" style={{ paddingBottom: 14 }}>
            <div className="atable-tools">
              <SegFilter options={["전체", "대기", "처리중", "완료"]} />
            </div>
          </div>
          <div className="inq-list">
            {items.map((it, i) => (
              <div
                key={it.id}
                className={`inq-row${i === cur ? " sel" : ""}`}
                onClick={() => setCur(i)}
              >
                <div>
                  <div className="t">{it.title}</div>
                  <div className="m">{it.id} · {it.name} · {it.when}</div>
                </div>
                <div><StatusBadge status={it.status} /></div>
              </div>
            ))}
          </div>
        </div>

        {/* detail */}
        <div className="panel" style={{ position: "sticky", top: 84 }}>
          <div className="panel-head"><h3>{d.title}</h3><StatusBadge status={d.status} /></div>
          <div className="panel-body">
            <div className="detail-meta">
              <div><span>접수번호</span><b>{d.id}</b></div>
              <div><span>유형 · 채널</span><b>{d.type} · {d.ch}</b></div>
              <div><span>고객</span><b>{d.name} ({d.cust})</b></div>
              <div><span>접수</span><b>{d.when}</b></div>
            </div>
            <div className="qbody">{d.body}</div>
            <div className="field" style={{ marginTop: 18 }}>
              <label>답변 작성</label>
              <textarea className="textarea" placeholder="고객에게 보낼 답변을 입력하세요" style={{ minHeight: 120 }} />
            </div>
            <div className="flex gap-s wrap" style={{ marginTop: 14 }}>
              <button className="btn" onClick={() => mutate("완료")}>답변 전송 · 완료</button>
              <button className="btn btn--ghost" onClick={() => mutate("처리중")}>처리중으로</button>
              <button className="btn btn--ghost">담당자 배정</button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

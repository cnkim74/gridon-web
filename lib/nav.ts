export type MenuSub = [title: string, desc: string, href: string];
export type MenuItem = {
  key: string;
  label: string;
  href: string;
  sub?: MenuSub[];
};

/** Public site primary navigation + mega-menu data (ported from chrome.js MENU). */
export const MENU: MenuItem[] = [
  {
    key: "company",
    label: "회사소개",
    href: "/company",
    sub: [
      ["그리드온 이야기", "브랜드의 시작과 의미", "/company#story"],
      ["브랜드 가치", "안정·지능·연결·지속", "/company#values"],
      ["비전 · 전략", "2035 스마트그리드 로드맵", "/company#vision"],
      ["연혁 · 오시는 길", "발자취와 본사 위치", "/company#history"],
    ],
  },
  {
    key: "services",
    label: "사업·서비스",
    href: "/services",
    sub: [
      ["전력공급", "안정적 송·배전 운영", "/services#supply"],
      ["스마트그리드", "양방향 지능형 전력망", "/services#smartgrid"],
      ["신재생 · ESS", "태양광·풍력·저장장치", "/services#renewable"],
      ["전기공사 · 용역", "설계·시공·유지보수", "/services#epc"],
      ["실적 · 갤러리", "완공 프로젝트 포트폴리오", "/gallery"],
    ],
  },
  {
    key: "support",
    label: "고객지원",
    href: "/support",
    sub: [
      ["전기 신청", "신규·증설·명의변경", "/support#apply"],
      ["요금 안내", "요금제·조회·납부", "/support#bill"],
      ["자주 묻는 질문", "FAQ", "/support#faq"],
      ["1:1 문의", "민원·상담 접수", "/support#contact"],
      ["질의응답", "Q&A 게시판", "/qna"],
    ],
  },
  {
    key: "newsroom",
    label: "뉴스룸",
    href: "/newsroom",
    sub: [
      ["보도자료", "언론 발표", "/newsroom#press"],
      ["공지사항", "점검·안내", "/notices"],
      ["미디어", "영상·갤러리", "/newsroom#media"],
    ],
  },
  { key: "recruit", label: "채용", href: "/recruit" },
];

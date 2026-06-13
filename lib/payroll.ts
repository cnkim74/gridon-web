import type { AttendanceStatus, PayType } from "@/lib/database.types";

// 근로자 부담분 4대보험 요율 (2024 기준 · 필요 시 조정).
// 산재보험은 사업주 전액 부담이라 근로자 공제에 없음.
export const INS_RATES = {
  pension: 0.045, // 국민연금 4.5%
  health: 0.03545, // 건강보험 3.545%
  care: 0.1295, // 장기요양 = 건강보험료 × 12.95%
  employment: 0.009, // 고용보험(실업급여) 0.9%
} as const;

export const WORKED_STATUSES: AttendanceStatus[] = ["정상", "지각", "조퇴", "출장"];

// 기타소득: 소득세 8% + 지방소득세 0.8% = 8.8%
// 사업소득: 소득세 3% + 지방소득세 0.3% = 3.3%
export const FREELANCE_RATES: Partial<Record<PayType, { income: number; local: number }>> = {
  "기타소득": { income: 0.08, local: 0.008 },
  "사업소득": { income: 0.03, local: 0.003 },
};

export function isFreelance(pt: PayType): boolean {
  return pt === "기타소득" || pt === "사업소득";
}

export type AttRec = {
  status: AttendanceStatus;
  check_in: string | null;
  check_out: string | null;
};

export function won(n: number | null | undefined): string {
  return n == null ? "—" : `${Math.round(n).toLocaleString()}원`;
}

function pad(n: number) { return String(n).padStart(2, "0"); }

/** "YYYY-MM" 의 평일(월~금) 수 = 소정근무일. */
export function weekdaysInMonth(ym: string): number {
  const [y, m] = ym.split("-").map(Number);
  const last = new Date(y, m, 0).getDate();
  let c = 0;
  for (let d = 1; d <= last; d++) {
    const dow = new Date(y, m - 1, d).getDay();
    if (dow !== 0 && dow !== 6) c++;
  }
  return c;
}

function toMinutes(t: string | null): number | null {
  if (!t) return null;
  const [h, mi] = t.split(":").map(Number);
  return h * 60 + mi;
}

/** 한 직원의 월 출근 집계 + (공제 전) 지급액 계산. */
export function summarize(recs: AttRec[], scheduled: number, salary: number | null, payType: PayType) {
  const cnt: Record<AttendanceStatus, number> = { 정상: 0, 지각: 0, 조퇴: 0, 결근: 0, 휴가: 0, 출장: 0 };
  let workedHours = 0;
  recs.forEach((r) => {
    cnt[r.status] = (cnt[r.status] ?? 0) + 1;
    if (WORKED_STATUSES.includes(r.status)) {
      const a = toMinutes(r.check_in), b = toMinutes(r.check_out);
      if (a != null && b != null && b > a) workedHours += (b - a) / 60;
    }
  });
  const worked = cnt.정상 + cnt.지각 + cnt.조퇴 + cnt.출장;
  const credited = worked + cnt.휴가; // 유급 인정일(휴가 포함, 결근 제외)
  let gross = 0;
  if (salary) {
    if (payType === "월급") gross = scheduled > 0 ? Math.round((salary * credited) / scheduled) : 0;
    else if (payType === "일급") gross = worked * salary;
    else if (payType === "시급") gross = Math.round(workedHours * salary);
    else gross = salary; // 기타소득·사업소득: 기준액 그대로 (프로레이션 없음)
  }
  return { cnt, worked, credited, workedHours, gross };
}

/** 지급액·4대보험 가입여부·소득세로부터 공제 명세 계산.
 *  기타소득·사업소득은 원천징수 단일 요율만 적용 (4대보험 없음). */
export function deductions(opts: {
  gross: number;
  insPension: boolean;
  insHealth: boolean;
  insEmployment: boolean;
  incomeTax: number;
  payType?: PayType;
}) {
  const pt = opts.payType;
  if (pt === "기타소득" || pt === "사업소득") {
    const r = FREELANCE_RATES[pt]!;
    const incomeTax = Math.round(opts.gross * r.income);
    const localTax = Math.round(opts.gross * r.local);
    const total = incomeTax + localTax;
    return { pension: 0, health: 0, care: 0, employment: 0, incomeTax, localTax, total, net: opts.gross - total };
  }
  const pension = opts.insPension ? Math.round(opts.gross * INS_RATES.pension) : 0;
  const health = opts.insHealth ? Math.round(opts.gross * INS_RATES.health) : 0;
  const care = opts.insHealth ? Math.round(health * INS_RATES.care) : 0;
  const employment = opts.insEmployment ? Math.round(opts.gross * INS_RATES.employment) : 0;
  const incomeTax = Math.round(opts.incomeTax);
  const localTax = Math.round(incomeTax * 0.1);
  const total = pension + health + care + employment + incomeTax + localTax;
  return { pension, health, care, employment, incomeTax, localTax, total, net: opts.gross - total };
}

export const ym = {
  now() { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`; },
  nextStart(s: string) { const [y, m] = s.split("-").map(Number); return m === 12 ? `${y + 1}-01-01` : `${y}-${pad(m + 1)}-01`; },
  label(s: string) { const [y, m] = s.split("-"); return `${y}년 ${parseInt(m)}월`; },
};

// ── 사업주 부담 4대보험 요율 (2024 기준) ────────────────────────────────────
// 산재보험: 전기공사업 기준 2.5% (건설업 분류·근로복지공단 고지서 확인 필요)
export const EMPLOYER_RATES = {
  pension:          0.045,   // 국민연금 4.5%
  health:           0.03545, // 건강보험 3.545%
  care:             0.1295,  // 장기요양 = 건강보험료 × 12.95%
  employment_ue:    0.009,   // 고용보험 실업급여 0.9%
  employment_stab:  0.0025,  // 고용안정·직업능력개발 0.25% (150인 미만 우선지원기업)
  industrial:       0.025,   // 산재보험 2.5% (전기공사업 추정 — 고지서 확인 후 조정)
} as const;

export type InsInput = {
  pay_type: PayType;
  ins_pension: boolean;
  ins_health: boolean;
  ins_employment: boolean;
  ins_industrial: boolean;
};

export type InsResult = {
  pension:    number;
  health:     number;
  care:       number;
  employment: number; // 사업주: 실업급여+고용안정 합산 / 근로자: 실업급여만
  industrial: number;
  total:      number;
};

const ZERO_INS: InsResult = { pension: 0, health: 0, care: 0, employment: 0, industrial: 0, total: 0 };

export function calcEmployeeIns(salary: number, e: InsInput): InsResult {
  if (isFreelance(e.pay_type)) return { ...ZERO_INS };
  const pension    = e.ins_pension    ? Math.round(salary * INS_RATES.pension)    : 0;
  const health     = e.ins_health     ? Math.round(salary * INS_RATES.health)     : 0;
  const care       = e.ins_health     ? Math.round(health  * INS_RATES.care)      : 0;
  const employment = e.ins_employment ? Math.round(salary * INS_RATES.employment) : 0;
  const total = pension + health + care + employment;
  return { pension, health, care, employment, industrial: 0, total };
}

export function calcEmployerIns(salary: number, e: InsInput): InsResult {
  if (isFreelance(e.pay_type)) return { ...ZERO_INS };
  const pension    = e.ins_pension    ? Math.round(salary * EMPLOYER_RATES.pension) : 0;
  const health     = e.ins_health     ? Math.round(salary * EMPLOYER_RATES.health)  : 0;
  const care       = e.ins_health     ? Math.round(health  * EMPLOYER_RATES.care)   : 0;
  const employment = e.ins_employment ? Math.round(salary * (EMPLOYER_RATES.employment_ue + EMPLOYER_RATES.employment_stab)) : 0;
  const industrial = e.ins_industrial ? Math.round(salary * EMPLOYER_RATES.industrial) : 0;
  const total = pension + health + care + employment + industrial;
  return { pension, health, care, employment, industrial, total };
}

export function addIns(a: InsResult, b: InsResult): InsResult {
  return {
    pension:    a.pension    + b.pension,
    health:     a.health     + b.health,
    care:       a.care       + b.care,
    employment: a.employment + b.employment,
    industrial: a.industrial + b.industrial,
    total:      a.total      + b.total,
  };
}

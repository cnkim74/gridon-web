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
    else gross = Math.round(workedHours * salary); // 시급
  }
  return { cnt, worked, credited, workedHours, gross };
}

/** 지급액·4대보험 가입여부·소득세로부터 공제 명세 계산. */
export function deductions(opts: {
  gross: number;
  insPension: boolean;
  insHealth: boolean;
  insEmployment: boolean;
  incomeTax: number;
}) {
  const pension = opts.insPension ? Math.round(opts.gross * INS_RATES.pension) : 0;
  const health = opts.insHealth ? Math.round(opts.gross * INS_RATES.health) : 0;
  const care = opts.insHealth ? Math.round(health * INS_RATES.care) : 0;
  const employment = opts.insEmployment ? Math.round(opts.gross * INS_RATES.employment) : 0;
  const incomeTax = Math.round(opts.incomeTax);
  const localTax = Math.round(incomeTax * 0.1); // 지방소득세 = 소득세 10%
  const total = pension + health + care + employment + incomeTax + localTax;
  return { pension, health, care, employment, incomeTax, localTax, total, net: opts.gross - total };
}

export const ym = {
  now() { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`; },
  nextStart(s: string) { const [y, m] = s.split("-").map(Number); return m === 12 ? `${y + 1}-01-01` : `${y}-${pad(m + 1)}-01`; },
};

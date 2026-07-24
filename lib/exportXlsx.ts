// 보고서 데이터(값)를 .xlsx로 저장. xlsx는 클릭 시에만 동적 로드(번들 절약).
export type XlsxSheet = { name: string; aoa: (string | number)[][] };

export async function downloadXlsx(filename: string, sheets: XlsxSheet[]) {
  const XLSX = await import("xlsx");
  const wb = XLSX.utils.book_new();
  for (const s of sheets) {
    const ws = XLSX.utils.aoa_to_sheet(s.aoa);
    // 시트 탭 이름은 31자 제한 + 금지문자 제거
    const safe = (s.name || "Sheet").replace(/[\\/?*[\]:]/g, " ").slice(0, 31) || "Sheet";
    XLSX.utils.book_append_sheet(wb, ws, safe);
  }
  XLSX.writeFile(wb, filename);
}

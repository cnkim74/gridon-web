import type { Metadata } from "next";
import HrReport from "@/components/admin/HrReport";

export const metadata: Metadata = { title: "직원 종합현황" };

export default function HrReportPage() {
  return <HrReport />;
}

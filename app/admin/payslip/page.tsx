import type { Metadata } from "next";
import PayslipView from "@/components/admin/PayslipView";

export const metadata: Metadata = { title: "급여명세서" };

export default function PayslipPage() {
  return <PayslipView />;
}

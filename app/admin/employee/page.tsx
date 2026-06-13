import type { Metadata } from "next";
import { Suspense } from "react";
import EmployeeDetail from "@/components/admin/EmployeeDetail";

export const metadata: Metadata = { title: "직원 상세" };

export default function EmployeeDetailPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40 }} className="cellsub">불러오는 중…</div>}>
      <EmployeeDetail />
    </Suspense>
  );
}

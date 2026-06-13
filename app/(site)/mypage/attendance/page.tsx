import type { Metadata } from "next";
import { Suspense } from "react";
import MyAttendance from "@/components/MyAttendance";

export const metadata: Metadata = { title: "내 출근부" };

export default function MyAttendancePage() {
  return (
    <Suspense fallback={<div style={{ padding: 40 }} className="cellsub">불러오는 중…</div>}>
      <MyAttendance />
    </Suspense>
  );
}

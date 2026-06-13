import type { Metadata } from "next";
import AttendanceTable from "@/components/admin/AttendanceTable";

export const metadata: Metadata = { title: "출근부" };

export default function AttendancePage() {
  return <AttendanceTable />;
}

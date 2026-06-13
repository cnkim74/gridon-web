import type { Metadata } from "next";
import EmployeesTable from "@/components/admin/EmployeesTable";

export const metadata: Metadata = { title: "직원 현황" };

export default function EmployeesPage() {
  return <EmployeesTable />;
}

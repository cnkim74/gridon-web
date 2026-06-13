import type { Metadata } from "next";
import MembersTable from "@/components/admin/MembersTable";

export const metadata: Metadata = { title: "회원 관리" };

export default function MembersPage() {
  return <MembersTable />;
}

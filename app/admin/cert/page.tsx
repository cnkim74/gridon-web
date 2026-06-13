import type { Metadata } from "next";
import CertRequests from "@/components/admin/CertRequests";

export const metadata: Metadata = { title: "증명서 관리" };

export default function CertPage() {
  return <CertRequests />;
}

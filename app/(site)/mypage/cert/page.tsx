import type { Metadata } from "next";
import { Suspense } from "react";
import MyCert from "@/components/MyCert";

export const metadata: Metadata = { title: "증명서 발급" };

export default function MyCertPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40 }} className="cellsub">불러오는 중…</div>}>
      <MyCert />
    </Suspense>
  );
}

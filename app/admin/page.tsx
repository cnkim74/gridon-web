"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

// Client-side redirect so this works under static export (server redirect() is
// unsupported with output: "export"). Falls back to a link if JS is disabled.
export default function AdminIndex() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/admin/dashboard");
  }, [router]);

  return (
    <div style={{ padding: 40 }}>
      <Link href="/admin/dashboard" className="btn btn--sm">
        대시보드로 이동
      </Link>
    </div>
  );
}

"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function PhotoReportRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace("/admin/report/gongga"); }, [router]);
  return null;
}

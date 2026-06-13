"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";

// OAuth (Google) redirect lands here. The Supabase client processes the URL on
// load (detectSessionInUrl) and AuthProvider picks up the new session; we just
// wait for that to settle, then route the user onward. Works under static
// export — no server callback needed.
export default function AuthCallbackPage() {
  const router = useRouter();
  const { loading, session } = useAuth();

  useEffect(() => {
    if (loading) return;
    router.replace(session ? "/" : "/login");
  }, [loading, session, router]);

  return (
    <div
      style={{
        minHeight: "60vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "var(--muted)",
        fontWeight: 600,
      }}
    >
      로그인 처리 중…
    </div>
  );
}

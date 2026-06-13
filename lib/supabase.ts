import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

// This is a fully static site (next.config.ts → output: "export"), so there is
// no server runtime. Auth runs entirely in the browser with the public anon
// key; the session is persisted to localStorage and refreshed automatically.
//
// Both values are NEXT_PUBLIC_* and inlined at build time. They are *public* by
// design — the anon key only grants access allowed by Row Level Security.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Supabase 환경변수가 설정되지 않았습니다. .env.local(로컬) 및 GitHub Actions 시크릿에 " +
      "NEXT_PUBLIC_SUPABASE_URL 와 NEXT_PUBLIC_SUPABASE_ANON_KEY 를 추가하세요.",
  );
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

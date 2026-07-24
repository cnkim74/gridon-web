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
    // 탭 간 인증 Web Lock 비활성화. 기본 navigatorLock은 다른 탭/복원된 세션이
    // 잠금을 물고 놓지 않으면 signInWithPassword 등이 요청도 못 보내고 무한 대기하는
    // 데드락을 유발한다(로그인 버튼이 아무 반응 없음). 클라이언트 전용 정적 SPA라
    // 탭 간 잠금이 필요 없으므로 통과형 lock으로 대체한다.
    lock: async (_name, _acquireTimeout, fn) => fn(),
  },
});

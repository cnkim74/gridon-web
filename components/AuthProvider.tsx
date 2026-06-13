"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import type { MemberType } from "@/lib/database.types";

export type Profile = {
  id: string;
  email: string | null;
  name: string | null;
  member_type: MemberType;
};

type AuthState = {
  /** True until the initial session check resolves. */
  loading: boolean;
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

  // Track the current session (initial load + every auth change: login, logout,
  // token refresh, cross-tab) and keep the matching profile row in sync. All
  // state writes happen inside async callbacks — never synchronously in the
  // effect body — so we don't trigger cascading renders.
  const loadedUidRef = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    let active = true;

    async function loadProfile(uid: string) {
      const { data } = await supabase
        .from("profiles")
        .select("id, email, name, member_type")
        .eq("id", uid)
        .maybeSingle();
      if (active) setProfile((data as Profile) ?? null);
    }

    function applySession(next: Session | null) {
      if (!active) return;
      setSession(next);
      setLoading(false);

      const uid = next?.user?.id ?? null;
      if (uid === loadedUidRef.current) return; // same user → keep profile
      loadedUidRef.current = uid;
      if (uid) loadProfile(uid);
      else setProfile(null);
    }

    supabase.auth.getSession().then(({ data }) => applySession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) =>
      applySession(next),
    );

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      loading,
      session,
      user: session?.user ?? null,
      profile,
      signOut,
    }),
    [loading, session, profile, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth는 <AuthProvider> 내부에서만 사용할 수 있습니다.");
  }
  return ctx;
}

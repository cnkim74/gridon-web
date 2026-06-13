"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth, type Profile } from "@/components/AuthProvider";
import { supabase } from "@/lib/supabase";

const MAX_BYTES = 5 * 1024 * 1024; // 5MB

function Loading({ text = "불러오는 중…" }: { text?: string }) {
  return (
    <div style={{ minHeight: "50vh", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted)" }}>
      {text}
    </div>
  );
}

export default function MyPage() {
  const router = useRouter();
  const { loading, user, profile, refreshProfile } = useAuth();

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  if (loading || !user) return <Loading />;
  if (!profile) return <Loading text="프로필 불러오는 중…" />;

  // key={profile.id}: the editor's state initializes from the profile once,
  // without a sync effect. (Re-mounts only if the signed-in user changes.)
  return <ProfileEditor key={profile.id} userId={user.id} profile={profile} onSaved={refreshProfile} />;
}

function ProfileEditor({
  userId,
  profile,
  onSaved,
}: {
  userId: string;
  profile: Profile;
  onSaved: () => Promise<void>;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(profile.name ?? "");
  const [phone, setPhone] = useState(profile.phone ?? "");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(profile.avatar_url ?? null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function handleAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file
    if (!file) return;
    setErr(null);
    setMsg(null);
    if (file.size > MAX_BYTES) {
      setErr("파일이 너무 큽니다 (5MB 이하).");
      return;
    }

    setUploading(true);
    const ext = (file.name.split(".").pop() || "png").toLowerCase();
    const path = `${userId}/avatar.${ext}`;

    const up = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true, contentType: file.type });
    if (up.error) {
      setErr(`업로드 오류: ${up.error.message}`);
      setUploading(false);
      return;
    }

    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    const url = `${data.publicUrl}?v=${Date.now()}`;

    const upd = await supabase.from("profiles").update({ avatar_url: url }).eq("id", userId);
    if (upd.error) {
      setErr(`저장 오류: ${upd.error.message}`);
      setUploading(false);
      return;
    }

    setAvatarUrl(url);
    await onSaved();
    setUploading(false);
    setMsg("프로필 사진이 변경되었습니다.");
  }

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(null);
    setMsg(null);
    setSaving(true);

    const { error } = await supabase
      .from("profiles")
      .update({ name: name.trim(), phone: phone.trim() || null })
      .eq("id", userId);

    if (error) {
      setErr(`저장 오류: ${error.message}`);
      setSaving(false);
      return;
    }
    await onSaved();
    setSaving(false);
    setMsg("저장되었습니다.");
  }

  const initial = (name || profile.email || "회").slice(0, 1);

  return (
    <div style={{ maxWidth: 560, margin: "0 auto", padding: "56px 20px 80px" }}>
      <h1 className="kr-d3" style={{ fontSize: 28 }}>마이페이지</h1>
      <p className="muted" style={{ marginTop: 6 }}>계정 정보와 프로필 사진을 관리합니다.</p>

      <div style={{ display: "flex", alignItems: "center", gap: 18, margin: "28px 0 8px" }}>
        <div
          aria-hidden
          style={{
            width: 76, height: 76, borderRadius: "50%", flex: "none", overflow: "hidden",
            background: "var(--ink)", color: "var(--paper)", display: "flex",
            alignItems: "center", justifyContent: "center", fontSize: 30, fontWeight: 800,
          }}
        >
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt="프로필 사진" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            initial
          )}
        </div>
        <div>
          <button type="button" className="btn btn--sm btn--ghost" onClick={() => fileRef.current?.click()} disabled={uploading}>
            {uploading ? "업로드 중…" : "사진 변경"}
          </button>
          <input ref={fileRef} type="file" accept="image/*" onChange={handleAvatar} style={{ display: "none" }} />
          <p className="muted" style={{ fontSize: 12, marginTop: 6 }}>JPG·PNG, 5MB 이하</p>
        </div>
      </div>

      <form className="form" onSubmit={handleSave} style={{ marginTop: 20 }}>
        <div className="field">
          <label>이메일</label>
          <input className="input" type="email" value={profile.email ?? ""} disabled readOnly />
        </div>
        <div className="field">
          <label>이름 / 회사명</label>
          <input className="input" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="홍길동" />
        </div>
        <div className="field">
          <label>회원 구분</label>
          <input className="input" type="text" value={profile.member_type} disabled readOnly />
        </div>
        <div className="field">
          <label>휴대전화</label>
          <input className="input" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="010-1234-5678" autoComplete="tel" />
        </div>

        {err && (
          <div role="alert" style={{ display: "flex", alignItems: "center", gap: 8, border: "1px solid var(--line-2)", color: "#b3261e", padding: "12px 14px", fontSize: 14, fontWeight: 600 }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#b3261e", flex: "none" }} />
            {err}
          </div>
        )}
        {msg && (
          <div role="status" style={{ display: "flex", alignItems: "center", gap: 8, border: "1px solid var(--line-2)", color: "var(--fg)", padding: "12px 14px", fontSize: 14, fontWeight: 600 }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#1f7a3d", flex: "none" }} />
            {msg}
          </div>
        )}

        <button className="btn btn--lg btn--block" type="submit" disabled={saving}>
          {saving ? "저장 중…" : "저장"}
        </button>
      </form>
    </div>
  );
}

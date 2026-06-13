-- gridon · 프로필 확장: 휴대전화 + 프로필 사진
--
-- email 은 이미 profiles 에 있으므로 phone / avatar_url 만 추가한다.
-- 사진 파일은 Storage 의 공개 버킷 `avatars` 에 사용자별 폴더(uid/...)로 저장하고,
-- profiles.avatar_url 에 공개 URL 을 기록한다.

alter table public.profiles add column if not exists phone text;
alter table public.profiles add column if not exists avatar_url text;

-- 본인이 수정할 수 있는 컬럼에 phone / avatar_url 추가
-- (0002 에서 테이블 UPDATE 를 회수하고 컬럼 단위로 부여했으므로 다시 grant)
grant update (name, member_type, phone, avatar_url) on public.profiles to authenticated;

-- ── Storage: avatars 버킷(공개 읽기) ──────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- 공개 읽기
drop policy if exists "Avatar public read" on storage.objects;
create policy "Avatar public read"
  on storage.objects for select
  using (bucket_id = 'avatars');

-- 본인 폴더(uid/...)에만 업로드/수정/삭제 가능
drop policy if exists "Avatar owner insert" on storage.objects;
create policy "Avatar owner insert"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Avatar owner update" on storage.objects;
create policy "Avatar owner update"
  on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Avatar owner delete" on storage.objects;
create policy "Avatar owner delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

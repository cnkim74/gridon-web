-- gridon · 관리자 역할 + 슈퍼관리자 시드
--
-- profiles.role 로 권한을 구분한다(member/admin/superadmin). 핵심은 일반 회원이
-- 스스로 role 을 바꿔 권한 상승하지 못하게 막는 것: 테이블 단위 UPDATE 권한을
-- 회수하고, 본인이 바꿔도 되는 컬럼(name/member_type)만 컬럼 단위로 다시 부여한다.
-- (RLS 정책 auth.uid() = id 와 별개로 작동하는 2중 방어.)

alter table public.profiles
  add column if not exists role text not null default 'member'
  check (role in ('member', 'admin', 'superadmin'));

-- role(및 email) 컬럼 자체 수정 차단 → 클라이언트는 name/member_type 만 수정 가능
revoke update on public.profiles from authenticated;
grant update (name, member_type) on public.profiles to authenticated;

-- 가입 트리거 갱신:
--  - 이름은 이메일 가입(name) 또는 Google 가입(full_name/name) 모두에서 채움
--  - gridonenc@gmail.com 은 가입 즉시 superadmin
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, name, member_type, role)
  values (
    new.id,
    new.email,
    coalesce(
      nullif(new.raw_user_meta_data ->> 'name', ''),
      new.raw_user_meta_data ->> 'full_name',
      ''
    ),
    case
      when new.raw_user_meta_data ->> 'member_type' in ('개인', '기업')
        then new.raw_user_meta_data ->> 'member_type'
      else '개인'
    end,
    case when new.email = 'gridonenc@gmail.com' then 'superadmin' else 'member' end
  );
  return new;
end;
$$;

-- 이미 가입된 행이 있으면 승격(예: 미리 가입한 경우)
update public.profiles set role = 'superadmin' where email = 'gridonenc@gmail.com';

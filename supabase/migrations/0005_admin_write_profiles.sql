-- gridon · 관리자 전체 회원 수정 권한
--
-- 관리자(admin/superadmin)는 모든 회원의 모든 컬럼을 수정할 수 있어야 한다.
-- 단, 컬럼 단위 grant 는 authenticated 역할 전체에 적용되므로 "관리자만 role 변경"
-- 을 grant 로는 표현할 수 없다 → authenticated 에 전체 UPDATE 를 부여하고,
-- 일반 회원의 권한상승은 BEFORE UPDATE 트리거로 막는다(role 변경은 관리자만).

-- 1) 관리자는 임의의 행을 수정/삭제 가능 (기존 "본인 행" 정책과 OR 로 합쳐짐)
drop policy if exists "Admins can update all profiles" on public.profiles;
create policy "Admins can update all profiles"
  on public.profiles for update
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Admins can delete profiles" on public.profiles;
create policy "Admins can delete profiles"
  on public.profiles for delete
  using (public.is_admin());

-- 2) 컬럼 제한 해제 (role 포함 전체) — 보호는 아래 트리거가 담당
grant update on public.profiles to authenticated;

-- 3) 권한상승 가드: 로그인한 "비관리자"가 role 을 바꾸면 원래 값으로 되돌린다.
--    auth.uid() 가 null 인 백엔드 컨텍스트(서비스롤/관리 API)는 그대로 허용.
create or replace function public.guard_profile_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role
     and auth.uid() is not null
     and not public.is_admin() then
    new.role := old.role;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_guard_role on public.profiles;
create trigger profiles_guard_role
  before update on public.profiles
  for each row execute function public.guard_profile_role();

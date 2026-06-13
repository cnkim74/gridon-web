-- gridon · 관리자 전체 회원 조회 허용
--
-- 기본 RLS 는 "본인 행만" 조회 가능이라, 관리자 콘솔에서 전체 회원이 안 보인다.
-- admin/superadmin 이면 모든 profiles 를 SELECT 할 수 있는 정책을 추가한다.
-- 정책이 profiles 를 다시 참조하면 RLS 재귀가 생기므로, 역할 확인은
-- SECURITY DEFINER 함수(RLS 우회)로 처리한다.

create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('admin', 'superadmin')
  );
$$;

drop policy if exists "Admins can view all profiles" on public.profiles;
create policy "Admins can view all profiles"
  on public.profiles for select
  using (public.is_admin());

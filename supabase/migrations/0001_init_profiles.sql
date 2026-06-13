-- gridon · 회원 프로필 + 가입 트리거
--
-- public.profiles 는 auth.users 를 1:1로 보강한다. 가입 시점에
-- handle_new_user 트리거가 auth.users.raw_user_meta_data 의 name / member_type
-- 을 읽어 자동으로 한 행을 만든다. (이메일 인증은 현재 꺼져 있어 가입 즉시
-- 세션이 발급된다.)

create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text,
  name        text,
  member_type text not null default '개인' check (member_type in ('개인', '기업')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table public.profiles is 'gridon 회원 프로필 (auth.users 1:1 보강)';

-- Row Level Security: 본인 행만 조회·수정 가능. INSERT 는 트리거(security
-- definer)가 담당하므로 클라이언트용 insert 정책은 두지 않는다.
alter table public.profiles enable row level security;

drop policy if exists "Profiles are viewable by owner" on public.profiles;
create policy "Profiles are viewable by owner"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "Profiles are updatable by owner" on public.profiles;
create policy "Profiles are updatable by owner"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- 가입 시 프로필 자동 생성
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, name, member_type)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'name', ''),
    case
      when new.raw_user_meta_data ->> 'member_type' in ('개인', '기업')
        then new.raw_user_meta_data ->> 'member_type'
      else '개인'
    end
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- updated_at 자동 갱신
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

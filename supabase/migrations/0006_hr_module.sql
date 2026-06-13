-- gridon · 인사(HR) 모듈: 직원 현황 / 출근부 / 계약서
--
-- 회원(profiles=고객)과 무관한 사내 HR 데이터. 전부 관리자(admin/superadmin)
-- 전용이며 RLS 로 is_admin() 인 경우만 접근 가능. 계약서 파일은 비공개 스토리지
-- 버킷 `contracts` 에 저장하고 조회 시 signed URL 을 발급한다.

-- ── 직원 현황 ────────────────────────────────────────────────────────────────
create table if not exists public.employees (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  position        text,                       -- 직급/직책
  department      text,                       -- 부서
  phone           text,
  email           text,
  hire_date       date,                       -- 입사일
  employment_type text not null default '정규직' check (employment_type in ('정규직','계약직','일용직','파견')),
  status          text not null default '재직' check (status in ('재직','휴직','퇴사')),
  memo            text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ── 출근부 (직원·일자별 1행) ─────────────────────────────────────────────────
create table if not exists public.attendance (
  id          uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  work_date   date not null,
  check_in    time,
  check_out   time,
  status      text not null default '정상' check (status in ('정상','지각','조퇴','결근','휴가','출장')),
  note        text,
  created_at  timestamptz not null default now(),
  unique (employee_id, work_date)
);
create index if not exists attendance_date_idx on public.attendance (work_date);

-- ── 계약서 (직원별 파일 메타) ────────────────────────────────────────────────
create table if not exists public.contracts (
  id          uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  title       text not null,
  file_path   text not null,                  -- contracts 버킷 내 경로
  mime_type   text,
  size_bytes  bigint,
  uploaded_at timestamptz not null default now()
);

-- updated_at 자동 갱신 (employees)
drop trigger if exists employees_set_updated_at on public.employees;
create trigger employees_set_updated_at
  before update on public.employees
  for each row execute function public.set_updated_at();

-- ── RLS: 전부 관리자 전용 ────────────────────────────────────────────────────
alter table public.employees enable row level security;
alter table public.attendance enable row level security;
alter table public.contracts enable row level security;

drop policy if exists "employees admin all" on public.employees;
create policy "employees admin all" on public.employees for all
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "attendance admin all" on public.attendance;
create policy "attendance admin all" on public.attendance for all
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "contracts admin all" on public.contracts;
create policy "contracts admin all" on public.contracts for all
  using (public.is_admin()) with check (public.is_admin());

-- ── Storage: contracts (비공개) ──────────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('contracts', 'contracts', false)
on conflict (id) do nothing;

drop policy if exists "contracts file read" on storage.objects;
create policy "contracts file read" on storage.objects for select to authenticated
  using (bucket_id = 'contracts' and public.is_admin());

drop policy if exists "contracts file insert" on storage.objects;
create policy "contracts file insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'contracts' and public.is_admin());

drop policy if exists "contracts file update" on storage.objects;
create policy "contracts file update" on storage.objects for update to authenticated
  using (bucket_id = 'contracts' and public.is_admin());

drop policy if exists "contracts file delete" on storage.objects;
create policy "contracts file delete" on storage.objects for delete to authenticated
  using (bucket_id = 'contracts' and public.is_admin());

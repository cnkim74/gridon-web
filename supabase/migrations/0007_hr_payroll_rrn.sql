-- gridon · 직원 확장: 사진 / 주민번호(암호화) / 급여 / 4대보험
--
-- 주민등록번호는 개인정보보호법상 암호화 의무 대상 → pgcrypto + Vault 키로 암호화
-- 저장하고, 복호화/마스킹은 관리자(is_admin) 전용 SECURITY DEFINER 함수로만 한다.
-- 클라이언트는 rrn_enc(bytea)를 직접 읽지 않고 rrn_masked(표시용)만 읽으며,
-- 전체 번호가 필요할 때 get_employee_rrn() RPC 를 호출한다.

create extension if not exists pgcrypto;
create extension if not exists supabase_vault;

-- RRN 암호화 키(없으면 1회 생성) — Vault 가 루트키로 보호
do $$
begin
  if not exists (select 1 from vault.secrets where name = 'gridon_rrn_key') then
    perform vault.create_secret(encode(gen_random_bytes(32), 'hex'), 'gridon_rrn_key', 'gridon RRN encryption key');
  end if;
end $$;

alter table public.employees
  add column if not exists photo_url      text,
  add column if not exists rrn_enc        bytea,
  add column if not exists rrn_masked     text,
  add column if not exists salary         numeric(14,0),
  add column if not exists pay_type       text not null default '월급' check (pay_type in ('월급','일급','시급')),
  add column if not exists ins_pension    boolean not null default false,  -- 국민연금
  add column if not exists ins_health     boolean not null default false,  -- 건강보험
  add column if not exists ins_employment boolean not null default false,  -- 고용보험
  add column if not exists ins_industrial boolean not null default false;  -- 산재보험

-- 주민번호 저장(암호화) — 관리자만
create or replace function public.save_employee_rrn(p_emp uuid, p_rrn text)
returns void
language plpgsql
security definer
set search_path = public, vault, extensions
as $$
declare k text; d text; masked text;
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  d := regexp_replace(coalesce(p_rrn, ''), '\D', '', 'g');
  if d = '' then
    update public.employees set rrn_enc = null, rrn_masked = null where id = p_emp;
    return;
  end if;
  select decrypted_secret into k from vault.decrypted_secrets where name = 'gridon_rrn_key';
  masked := case when length(d) >= 7 then substr(d,1,6) || '-' || substr(d,7,1) || '******' else d end;
  update public.employees set rrn_enc = pgp_sym_encrypt(d, k), rrn_masked = masked where id = p_emp;
end;
$$;

-- 주민번호 복호화(전체 보기) — 관리자만
create or replace function public.get_employee_rrn(p_emp uuid)
returns text
language plpgsql
security definer
set search_path = public, vault, extensions
as $$
declare k text; v bytea; d text;
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  select rrn_enc into v from public.employees where id = p_emp;
  if v is null then return null; end if;
  select decrypted_secret into k from vault.decrypted_secrets where name = 'gridon_rrn_key';
  d := pgp_sym_decrypt(v, k);
  if length(d) = 13 then return substr(d,1,6) || '-' || substr(d,7,7); end if;
  return d;
end;
$$;

grant execute on function public.save_employee_rrn(uuid, text) to authenticated;
grant execute on function public.get_employee_rrn(uuid) to authenticated;

-- 직원 사진 버킷(공개 읽기, 관리자 쓰기)
insert into storage.buckets (id, name, public)
values ('employee-photos', 'employee-photos', true)
on conflict (id) do nothing;

drop policy if exists "emp photo read" on storage.objects;
create policy "emp photo read" on storage.objects for select
  using (bucket_id = 'employee-photos');
drop policy if exists "emp photo insert" on storage.objects;
create policy "emp photo insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'employee-photos' and public.is_admin());
drop policy if exists "emp photo update" on storage.objects;
create policy "emp photo update" on storage.objects for update to authenticated
  using (bucket_id = 'employee-photos' and public.is_admin());
drop policy if exists "emp photo delete" on storage.objects;
create policy "emp photo delete" on storage.objects for delete to authenticated
  using (bucket_id = 'employee-photos' and public.is_admin());

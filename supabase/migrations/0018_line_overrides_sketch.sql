-- 공가조사표(통신설비) 약도: 손그림(약도)을 line_overrides.sketch(text, PNG data URL)에 저장.
-- 키는 line_name = "약도:<선로명> <선로번호>" 형태. 기존 RLS 정책을 그대로 상속한다.

alter table if exists public.line_overrides
  add column if not exists sketch text;

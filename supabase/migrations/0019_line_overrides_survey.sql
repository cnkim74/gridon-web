-- 공가조사표(통신설비): 시트 자동채움 위에 셀별 수정본(빈칸 입력·정정)을 line_overrides.survey(jsonb)에 저장.
-- 키는 line_name = "공가:<선로명> <선로번호>", 값은 { "<셀ID>": "<값>" } (예: {"bigo":"...", "t0_3":"KT", "s2_6":"..."}).
-- 기존 RLS 정책을 그대로 상속한다.

alter table if exists public.line_overrides
  add column if not exists survey jsonb;

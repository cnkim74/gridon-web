-- 맨홀 점검 결과보고서: 선로(맨홀)별 수동입력 실측값을 line_overrides.report(jsonb)에 저장.
-- report 예: { "floodHeight":"75", "step":"0", "jointCount":"6/3", "dlCount":3,
--             "temps":[{"a":"22.3℃","b":"22.3℃","c":"22.3℃"}], "overall":"양호", "special":"" }
-- line_overrides 테이블은 기존 원격 DB에 이미 존재하며, 신규 컬럼은 기존 RLS 정책을 그대로 상속한다.

alter table if exists public.line_overrides
  add column if not exists report jsonb;

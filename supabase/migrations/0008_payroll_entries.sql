-- 0008_payroll_entries.sql
-- 직원별 월별 급여 지급 기준액 저장 + 기타소득/사업소득 pay_type 추가

CREATE TABLE IF NOT EXISTS payroll_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  year_month text NOT NULL CHECK (year_month ~ '^\d{4}-\d{2}$'),
  base_salary numeric NOT NULL CHECK (base_salary >= 0),
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (employee_id, year_month)
);

ALTER TABLE payroll_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage payroll_entries"
  ON payroll_entries FOR ALL USING (is_admin());

CREATE TRIGGER set_payroll_entries_updated_at
  BEFORE UPDATE ON payroll_entries
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- employees.pay_type 체크 제약 확장 (기타소득, 사업소득 추가)
DO $$
DECLARE
  cname TEXT;
BEGIN
  FOR cname IN
    SELECT con.conname
    FROM pg_constraint con
    JOIN pg_class cls ON cls.oid = con.conrelid
    WHERE cls.relname = 'employees'
      AND con.contype = 'c'
      AND pg_get_constraintdef(con.oid) LIKE '%pay_type%'
  LOOP
    EXECUTE format('ALTER TABLE employees DROP CONSTRAINT %I', cname);
  END LOOP;
END $$;

ALTER TABLE employees
  ADD CONSTRAINT employees_pay_type_check
  CHECK (pay_type IN ('월급', '일급', '시급', '기타소득', '사업소득'));

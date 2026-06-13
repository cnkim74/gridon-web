-- 0009_employee_profile_link.sql
-- profiles.member_type에 '직원' 추가, employees-profiles 연결, 직원 자체 출근 조회 RLS

-- 1. profiles.member_type 체크 제약 갱신 (직원 추가)
DO $$
DECLARE cname TEXT;
BEGIN
  FOR cname IN
    SELECT con.conname FROM pg_constraint con
    JOIN pg_class cls ON cls.oid = con.conrelid
    WHERE cls.relname = 'profiles' AND con.contype = 'c'
      AND pg_get_constraintdef(con.oid) LIKE '%member_type%'
  LOOP
    EXECUTE format('ALTER TABLE profiles DROP CONSTRAINT %I', cname);
  END LOOP;
END $$;

ALTER TABLE profiles
  ADD CONSTRAINT profiles_member_type_check
  CHECK (member_type IN ('개인', '기업', '직원'));

-- 2. employees에 profile_id 추가 (profiles.id FK, 계정 1:1 매핑)
ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS profile_id uuid REFERENCES profiles(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS employees_profile_id_idx
  ON employees(profile_id) WHERE profile_id IS NOT NULL;

-- 3. 현재 로그인 유저의 employee_id 반환 (RLS용)
CREATE OR REPLACE FUNCTION my_employee_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM employees WHERE profile_id = auth.uid() LIMIT 1;
$$;

-- 4. 직원이 자신의 employees 레코드 조회 허용
CREATE POLICY "Employee reads own record"
  ON employees FOR SELECT
  USING (profile_id = auth.uid());

-- 5. 직원이 자신의 출근 기록 조회 허용
CREATE POLICY "Employee reads own attendance"
  ON attendance FOR SELECT
  USING (employee_id = my_employee_id());

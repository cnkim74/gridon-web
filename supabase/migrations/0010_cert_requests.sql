-- 0010_cert_requests.sql
-- 재직·경력 증명서 신청 및 발급 관리

CREATE TABLE IF NOT EXISTS cert_requests (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id   uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  cert_type     text NOT NULL CHECK (cert_type IN ('재직증명서', '경력증명서')),
  purpose       text,                         -- 발급 목적 (제출처)
  status        text NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'approved', 'rejected')),
  reject_reason text,                         -- 반려 사유
  exit_date     date,                         -- 경력증명서용 퇴사일 (승인 시 입력)
  issued_at     timestamptz,                  -- 승인(발급) 시각
  approved_by   uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER set_cert_requests_updated_at
  BEFORE UPDATE ON cert_requests
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE cert_requests ENABLE ROW LEVEL SECURITY;

-- 관리자: 전체 권한
CREATE POLICY "Admins manage cert_requests"
  ON cert_requests FOR ALL USING (is_admin());

-- 직원: 자신의 신청 내역 조회
CREATE POLICY "Employee reads own cert_requests"
  ON cert_requests FOR SELECT
  USING (employee_id = my_employee_id());

-- 직원: 자신의 신청 등록
CREATE POLICY "Employee inserts own cert_requests"
  ON cert_requests FOR INSERT
  WITH CHECK (employee_id = my_employee_id());

-- 수입·지출 관리

CREATE TABLE IF NOT EXISTS public.tx_categories (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type       text NOT NULL CHECK (type IN ('income','expense')),
  name       text NOT NULL,
  color      text NOT NULL DEFAULT '#888888',
  sort_order integer NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.transactions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type         text NOT NULL CHECK (type IN ('income','expense')),
  category_id  uuid REFERENCES public.tx_categories(id) ON DELETE SET NULL,
  amount       numeric(14,0) NOT NULL CHECK (amount > 0),
  tx_date      date NOT NULL,
  description  text NOT NULL,
  vendor_client text,
  quote_id     uuid REFERENCES public.quotes(id) ON DELETE SET NULL,
  note         text,
  created_by   uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.tx_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage tx_categories" ON public.tx_categories FOR ALL USING (is_admin());
CREATE POLICY "Admins manage transactions"  ON public.transactions  FOR ALL USING (is_admin());

CREATE TRIGGER set_transactions_updated_at
  BEFORE UPDATE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 기본 카테고리
INSERT INTO public.tx_categories (type, name, color, sort_order) VALUES
  ('income',  '공사 대금',   '#1a7f4b', 1),
  ('income',  '용역 대금',   '#2ecc71', 2),
  ('income',  '기타 수입',   '#27ae60', 3),
  ('expense', '인건비',      '#b3261e', 1),
  ('expense', '4대보험',     '#e74c3c', 2),
  ('expense', '재료·부품비', '#f39c12', 3),
  ('expense', '차량·유류비', '#e67e22', 4),
  ('expense', '임대료',      '#9b59b6', 5),
  ('expense', '통신·인터넷', '#8e44ad', 6),
  ('expense', '기타 경비',   '#95a5a6', 7)
ON CONFLICT DO NOTHING;

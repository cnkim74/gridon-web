-- 지출 관리 테이블
CREATE TABLE IF NOT EXISTS public.expenses (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tx_date        date        NOT NULL,
  amount         integer     NOT NULL CHECK (amount >= 0),
  category       text        NOT NULL DEFAULT '기타',
  vendor         text,
  description    text,
  payment_method text,
  receipt_url    text,
  source         text        NOT NULL DEFAULT 'manual',
  created_by     uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "exp_sel" ON public.expenses FOR SELECT USING (is_admin());
CREATE POLICY "exp_ins" ON public.expenses FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "exp_upd" ON public.expenses FOR UPDATE USING (is_admin());
CREATE POLICY "exp_del" ON public.expenses FOR DELETE USING (is_admin());

CREATE TRIGGER set_expenses_updated_at
  BEFORE UPDATE ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 영수증 스토리지 버킷
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
SELECT 'receipts', 'receipts', true, 10485760,
       ARRAY['image/jpeg','image/png','image/webp','image/gif','image/heic','application/pdf']
WHERE NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'receipts');

CREATE POLICY "receipts_pub_read"   ON storage.objects FOR SELECT USING (bucket_id = 'receipts');
CREATE POLICY "receipts_admin_ins"  ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'receipts' AND is_admin());
CREATE POLICY "receipts_admin_del"  ON storage.objects FOR DELETE USING (bucket_id = 'receipts' AND is_admin());

-- 견적서 시스템
-- quotes: 견적서 헤더 / quote_items: 품목 라인

CREATE TABLE IF NOT EXISTS public.quotes (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_no       text NOT NULL UNIQUE,            -- GR-YYYY-NNN
  client_name    text NOT NULL,                   -- 수신자 이름
  client_company text,                            -- 수신처 회사명
  client_tel     text,
  client_email   text,
  client_address text,
  status         text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','sent','accepted','rejected','expired')),
  valid_until    date,                            -- 유효기간
  note           text,                            -- 비고/특기사항
  created_by     uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.quote_items (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id    uuid NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
  sort_order  integer NOT NULL DEFAULT 0,
  description text NOT NULL,
  quantity    numeric(12,2) NOT NULL DEFAULT 1,
  unit        text NOT NULL DEFAULT '식',
  unit_price  numeric(14,0) NOT NULL DEFAULT 0,
  vat_rate    numeric(5,4) NOT NULL DEFAULT 0.1,  -- 부가세율 10%
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.quotes      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage quotes"      ON public.quotes      FOR ALL USING (is_admin());
CREATE POLICY "Admins manage quote_items" ON public.quote_items FOR ALL USING (is_admin());

CREATE TRIGGER set_quotes_updated_at
  BEFORE UPDATE ON public.quotes
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 자동 채번: GR-YYYY-NNN (연도별 001부터 순번)
CREATE OR REPLACE FUNCTION public.next_quote_no()
RETURNS text
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  yr  text := to_char(now() AT TIME ZONE 'Asia/Seoul', 'YYYY');
  seq integer;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT COALESCE(MAX(CAST(RIGHT(quote_no, 3) AS integer)), 0) + 1
    INTO seq
    FROM public.quotes
   WHERE quote_no LIKE 'GR-' || yr || '-%';
  RETURN 'GR-' || yr || '-' || LPAD(seq::text, 3, '0');
END;
$$;
GRANT EXECUTE ON FUNCTION public.next_quote_no() TO authenticated;

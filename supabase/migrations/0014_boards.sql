-- ── 공지사항 ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.notices (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  title       text        NOT NULL,
  content     text        NOT NULL DEFAULT '',
  category    text        NOT NULL DEFAULT '일반',
  is_pinned   boolean     NOT NULL DEFAULT false,
  status      text        NOT NULL DEFAULT 'draft'
              CHECK (status IN ('draft','published')),
  view_count  integer     NOT NULL DEFAULT 0,
  created_by  uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- ── 질의응답 ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.qna (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  question         text        NOT NULL,
  questioner_name  text        NOT NULL,
  questioner_email text,
  is_public        boolean     NOT NULL DEFAULT true,
  status           text        NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending','answered','closed')),
  answer           text,
  answered_at      timestamptz,
  answered_by      uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_by       uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at       timestamptz NOT NULL DEFAULT now()
);

-- ── 실적·갤러리 ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.gallery (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  title        text        NOT NULL,
  description  text,
  category     text        NOT NULL DEFAULT '전기공사',
  client_name  text,
  project_year integer,
  cover_url    text,
  status       text        NOT NULL DEFAULT 'draft'
               CHECK (status IN ('draft','published')),
  sort_order   integer     NOT NULL DEFAULT 0,
  created_by   uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

-- ── RLS 활성화 ──────────────────────────────────────────────────────────────
ALTER TABLE public.notices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qna     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gallery ENABLE ROW LEVEL SECURITY;

-- notices: 게시중 → 전체 공개, 관리자 → 전체 권한
CREATE POLICY "notices_sel" ON public.notices FOR SELECT
  USING (status = 'published' OR is_admin());
CREATE POLICY "notices_ins" ON public.notices FOR INSERT
  WITH CHECK (is_admin());
CREATE POLICY "notices_upd" ON public.notices FOR UPDATE
  USING (is_admin());
CREATE POLICY "notices_del" ON public.notices FOR DELETE
  USING (is_admin());

-- qna: 답변완료+공개 → 전체 공개, 등록 → 누구나, 관리자 → 전체 권한
CREATE POLICY "qna_sel" ON public.qna FOR SELECT
  USING ((status = 'answered' AND is_public = true) OR is_admin());
CREATE POLICY "qna_ins" ON public.qna FOR INSERT
  WITH CHECK (true);
CREATE POLICY "qna_upd" ON public.qna FOR UPDATE
  USING (is_admin());
CREATE POLICY "qna_del" ON public.qna FOR DELETE
  USING (is_admin());

-- gallery: 게시중 → 전체 공개, 관리자 → 전체 권한
CREATE POLICY "gallery_sel" ON public.gallery FOR SELECT
  USING (status = 'published' OR is_admin());
CREATE POLICY "gallery_ins" ON public.gallery FOR INSERT
  WITH CHECK (is_admin());
CREATE POLICY "gallery_upd" ON public.gallery FOR UPDATE
  USING (is_admin());
CREATE POLICY "gallery_del" ON public.gallery FOR DELETE
  USING (is_admin());

-- ── Triggers ─────────────────────────────────────────────────────────────────
CREATE TRIGGER set_notices_updated_at
  BEFORE UPDATE ON public.notices
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_gallery_updated_at
  BEFORE UPDATE ON public.gallery
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

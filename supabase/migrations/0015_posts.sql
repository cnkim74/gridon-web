-- 뉴스룸 콘텐츠(보도자료·공지사항·미디어) 테이블
CREATE TABLE IF NOT EXISTS public.posts (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  category    text        NOT NULL CHECK (category IN ('보도자료', '공지사항', '미디어')),
  title       text        NOT NULL,
  content     text        NOT NULL DEFAULT '',
  media_url   text,
  thumbnail   text,
  author      text,
  status      text        NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'scheduled')),
  publish_at  timestamptz,
  created_by  uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

-- 공개 SELECT: 게시중 또는 예약시간 경과 / 관리자는 전체
CREATE POLICY "posts_sel" ON public.posts FOR SELECT USING (
  (status = 'published' OR (status = 'scheduled' AND publish_at <= now()))
  OR is_admin()
);
CREATE POLICY "posts_ins" ON public.posts FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "posts_upd" ON public.posts FOR UPDATE USING (is_admin());
CREATE POLICY "posts_del" ON public.posts FOR DELETE USING (is_admin());

CREATE TRIGGER set_posts_updated_at
  BEFORE UPDATE ON public.posts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

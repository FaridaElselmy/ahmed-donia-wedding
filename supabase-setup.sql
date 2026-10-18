-- Backblaze stores media; this table stores captions, guest names, and file keys only.
-- Safe to run if you already have a public.moments table with the same columns.
CREATE TABLE IF NOT EXISTS public.moments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  name text,
  text text,
  kind text NOT NULL CHECK (kind IN ('photo','video','note')),
  path text,
  thumb text,
  ratio real
);
ALTER TABLE public.moments ENABLE ROW LEVEL SECURITY;
-- Anyone with the album URL may view/submit a moment. This is a public guest album.
GRANT SELECT, INSERT ON TABLE public.moments TO anon, authenticated;
DROP POLICY IF EXISTS "Anyone can view moments" ON public.moments;
CREATE POLICY "Anyone can view moments" ON public.moments
  FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "Anyone can add moments" ON public.moments;
CREATE POLICY "Anyone can add moments" ON public.moments
  FOR INSERT TO anon, authenticated WITH CHECK (true);
-- If you have older policies, retain them unless you understand their effect.

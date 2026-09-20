-- Safe, additive migration for document media support.
-- The guarded constraint replacement preserves existing image/video/audio rows.
DO $$
BEGIN
  IF to_regclass('public.media') IS NOT NULL THEN
    ALTER TABLE public.media DROP CONSTRAINT IF EXISTS media_type_check;
    ALTER TABLE public.media
      ADD CONSTRAINT media_type_check
      CHECK (type IN ('image', 'video', 'audio', 'document'));
  END IF;
END $$;

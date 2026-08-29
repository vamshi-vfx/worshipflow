-- WorshipFlow Bible Database Schema
-- Run this in Supabase SQL Editor or via CLI migrations
-- Creates: bible_translations, bible_books, bible_chapters, bible_verses

-- ─── 1. Translations ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bible_translations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code            TEXT NOT NULL UNIQUE,        -- e.g. "telugu-irv", "telugu-ob"
  name            TEXT NOT NULL,               -- e.g. "Indian Revised Version (Telugu)"
  language        TEXT NOT NULL DEFAULT 'telugu',
  is_default      BOOLEAN NOT NULL DEFAULT false,
  source_url      TEXT,
  license         TEXT DEFAULT 'Public Domain',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed the primary Telugu translation
INSERT INTO bible_translations (code, name, language, is_default, license)
VALUES ('telugu-irv', 'Telugu Bible (Indian Revised Version)', 'telugu', true, 'Public Domain')
ON CONFLICT (code) DO NOTHING;

-- ─── 2. Books ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bible_books (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  translation_id  UUID NOT NULL REFERENCES bible_translations(id) ON DELETE CASCADE,
  book_number     INT NOT NULL CHECK (book_number BETWEEN 1 AND 66),
  name            TEXT NOT NULL,               -- Telugu name, e.g. "ఆదికాండము"
  name_english    TEXT,                        -- English name, e.g. "Genesis"
  name_short      TEXT,                        -- e.g. "Gen"
  testament       TEXT NOT NULL CHECK (testament IN ('old', 'new')),
  chapter_count   INT NOT NULL DEFAULT 0,
  verse_count     INT NOT NULL DEFAULT 0,
  UNIQUE (translation_id, book_number)
);
CREATE INDEX IF NOT EXISTS idx_bible_books_translation ON bible_books(translation_id);
CREATE INDEX IF NOT EXISTS idx_bible_books_testament   ON bible_books(translation_id, testament);

-- ─── 3. Chapters ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bible_chapters (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id         UUID NOT NULL REFERENCES bible_books(id) ON DELETE CASCADE,
  chapter_number  INT NOT NULL CHECK (chapter_number >= 1),
  verse_count     INT NOT NULL DEFAULT 0,
  UNIQUE (book_id, chapter_number)
);
CREATE INDEX IF NOT EXISTS idx_bible_chapters_book ON bible_chapters(book_id);

-- ─── 4. Verses ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bible_verses (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id      UUID NOT NULL REFERENCES bible_chapters(id) ON DELETE CASCADE,
  book_id         UUID NOT NULL REFERENCES bible_books(id) ON DELETE CASCADE,
  translation_id  UUID NOT NULL REFERENCES bible_translations(id) ON DELETE CASCADE,
  verse_number    INT NOT NULL CHECK (verse_number >= 1),
  text            TEXT NOT NULL,
  UNIQUE (chapter_id, verse_number)
);
CREATE INDEX IF NOT EXISTS idx_bible_verses_chapter     ON bible_verses(chapter_id);
CREATE INDEX IF NOT EXISTS idx_bible_verses_book        ON bible_verses(book_id);
CREATE INDEX IF NOT EXISTS idx_bible_verses_translation ON bible_verses(translation_id);
-- Full-text search index on verse text
CREATE INDEX IF NOT EXISTS idx_bible_verses_fts ON bible_verses USING gin(to_tsvector('simple', text));

-- ─── 5. Row-Level Security ────────────────────────────────────────────────────
ALTER TABLE bible_translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE bible_books        ENABLE ROW LEVEL SECURITY;
ALTER TABLE bible_chapters     ENABLE ROW LEVEL SECURITY;
ALTER TABLE bible_verses       ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read Bible data
CREATE POLICY "bible_translations_read" ON bible_translations FOR SELECT TO authenticated USING (true);
CREATE POLICY "bible_books_read"        ON bible_books        FOR SELECT TO authenticated USING (true);
CREATE POLICY "bible_chapters_read"     ON bible_chapters     FOR SELECT TO authenticated USING (true);
CREATE POLICY "bible_verses_read"       ON bible_verses       FOR SELECT TO authenticated USING (true);

-- Allow anon reads (for client-side usage without auth)
CREATE POLICY "bible_translations_anon" ON bible_translations FOR SELECT TO anon USING (true);
CREATE POLICY "bible_books_anon"        ON bible_books        FOR SELECT TO anon USING (true);
CREATE POLICY "bible_chapters_anon"     ON bible_chapters     FOR SELECT TO anon USING (true);
CREATE POLICY "bible_verses_anon"       ON bible_verses       FOR SELECT TO anon USING (true);

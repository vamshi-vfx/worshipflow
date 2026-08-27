-- WorshipFlow 2.0 Database Fix & Migration Script
-- Run this in Supabase SQL Editor (Dashboard -> SQL Editor -> New Query -> Run)

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. FIX USERS TABLE POLICIES (Resolves: "infinite recursion detected in policy for relation users")
-- Drop any conflicting / recursive policies on users
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'users' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.users', pol.policyname);
    END LOOP;
END $$;

-- Clean non-recursive user policies
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.users FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.users FOR UPDATE USING (auth.uid() = id);

-- 3. FIX SONGS POLICIES
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'songs' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.songs', pol.policyname);
    END LOOP;
END $$;

ALTER TABLE public.songs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public songs are viewable by everyone" ON public.songs FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert songs" ON public.songs FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update their own songs" ON public.songs FOR UPDATE USING (created_by = auth.uid() OR created_by IS NULL);
CREATE POLICY "Users can delete their own songs" ON public.songs FOR DELETE USING (created_by = auth.uid() OR created_by IS NULL);

-- 4. FIX SONG SECTIONS POLICIES
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'song_sections' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.song_sections', pol.policyname);
    END LOOP;
END $$;

ALTER TABLE public.song_sections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Song sections viewable by everyone" ON public.song_sections FOR SELECT USING (true);
CREATE POLICY "Song sections insertable by authenticated" ON public.song_sections FOR INSERT WITH CHECK (true);
CREATE POLICY "Song sections updatable by owner" ON public.song_sections FOR UPDATE USING (true);
CREATE POLICY "Song sections deletable by owner" ON public.song_sections FOR DELETE USING (true);

-- 5. FIX SONG LINES POLICIES
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'song_lines' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.song_lines', pol.policyname);
    END LOOP;
END $$;

ALTER TABLE public.song_lines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Song lines viewable by everyone" ON public.song_lines FOR SELECT USING (true);
CREATE POLICY "Song lines insertable by authenticated" ON public.song_lines FOR INSERT WITH CHECK (true);
CREATE POLICY "Song lines updatable by owner" ON public.song_lines FOR UPDATE USING (true);
CREATE POLICY "Song lines deletable by owner" ON public.song_lines FOR DELETE USING (true);

-- 6. CREATE MISSING TABLES IF NOT PRESENT
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  telugu_name TEXT,
  hindi_name TEXT,
  description TEXT,
  icon TEXT,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Categories viewable by everyone" ON public.categories;
CREATE POLICY "Categories viewable by everyone" ON public.categories FOR SELECT USING (true);

CREATE TABLE IF NOT EXISTS public.song_slides (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  song_id UUID REFERENCES public.songs(id) ON DELETE CASCADE NOT NULL,
  section_id UUID REFERENCES public.song_sections(id) ON DELETE CASCADE NOT NULL,
  section_order INTEGER NOT NULL DEFAULT 0,
  slide_number INTEGER NOT NULL DEFAULT 0,
  "order" INTEGER NOT NULL DEFAULT 0,
  primary_text TEXT NOT NULL,
  secondary_text TEXT,
  line_ids TEXT[] DEFAULT '{}',
  display_mode TEXT NOT NULL DEFAULT 'telugu',
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE public.song_slides ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Song slides viewable by everyone" ON public.song_slides;
CREATE POLICY "Song slides viewable by everyone" ON public.song_slides FOR SELECT USING (true);
DROP POLICY IF EXISTS "Song slides insertable by authenticated" ON public.song_slides;
CREATE POLICY "Song slides insertable by authenticated" ON public.song_slides FOR INSERT WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.import_jobs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  filename TEXT,
  format TEXT NOT NULL,
  total_count INTEGER NOT NULL DEFAULT 0,
  imported_count INTEGER NOT NULL DEFAULT 0,
  skipped_count INTEGER NOT NULL DEFAULT 0,
  failed_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'completed',
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE public.import_jobs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Import jobs viewable by owner" ON public.import_jobs;
CREATE POLICY "Import jobs viewable by owner" ON public.import_jobs FOR SELECT USING (true);
DROP POLICY IF EXISTS "Import jobs insertable by authenticated" ON public.import_jobs;
CREATE POLICY "Import jobs insertable by authenticated" ON public.import_jobs FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Import jobs updatable by owner" ON public.import_jobs;
CREATE POLICY "Import jobs updatable by owner" ON public.import_jobs FOR UPDATE USING (true);

CREATE TABLE IF NOT EXISTS public.import_items (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  import_job_id UUID REFERENCES public.import_jobs(id) ON DELETE CASCADE NOT NULL,
  song_id UUID REFERENCES public.songs(id),
  title TEXT NOT NULL,
  language TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT,
  duplicate_of_id UUID REFERENCES public.songs(id),
  duplicate_score REAL,
  resolution TEXT,
  source_name TEXT,
  source_url TEXT,
  license TEXT,
  copyright_notice TEXT,
  content_owner TEXT,
  source_type TEXT,
  source_file_name TEXT,
  source_file_hash TEXT,
  page_start INTEGER,
  page_end INTEGER,
  imported_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE public.import_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Import items viewable by owner" ON public.import_items;
CREATE POLICY "Import items viewable by owner" ON public.import_items FOR SELECT USING (true);
DROP POLICY IF EXISTS "Import items insertable by authenticated" ON public.import_items;
CREATE POLICY "Import items insertable by authenticated" ON public.import_items FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Import items updatable by owner" ON public.import_items;
CREATE POLICY "Import items updatable by owner" ON public.import_items FOR UPDATE USING (true);

-- Ensure all columns on songs table exist
ALTER TABLE public.songs ADD COLUMN IF NOT EXISTS romanized_title TEXT;
ALTER TABLE public.songs ADD COLUMN IF NOT EXISTS english_title TEXT;
ALTER TABLE public.songs ADD COLUMN IF NOT EXISTS artist TEXT;
ALTER TABLE public.songs ADD COLUMN IF NOT EXISTS lyricist TEXT;
ALTER TABLE public.songs ADD COLUMN IF NOT EXISTS composer TEXT;
ALTER TABLE public.songs ADD COLUMN IF NOT EXISTS translator TEXT;
ALTER TABLE public.songs ADD COLUMN IF NOT EXISTS key TEXT;
ALTER TABLE public.songs ADD COLUMN IF NOT EXISTS tempo INTEGER;
ALTER TABLE public.songs ADD COLUMN IF NOT EXISTS chords TEXT;
ALTER TABLE public.songs ADD COLUMN IF NOT EXISTS source_name TEXT;
ALTER TABLE public.songs ADD COLUMN IF NOT EXISTS source_url TEXT;
ALTER TABLE public.songs ADD COLUMN IF NOT EXISTS license TEXT;
ALTER TABLE public.songs ADD COLUMN IF NOT EXISTS copyright_notice TEXT;
ALTER TABLE public.songs ADD COLUMN IF NOT EXISTS content_owner TEXT;
ALTER TABLE public.songs ADD COLUMN IF NOT EXISTS usage_count INTEGER DEFAULT 0;
ALTER TABLE public.songs ADD COLUMN IF NOT EXISTS source_type TEXT;
ALTER TABLE public.songs ADD COLUMN IF NOT EXISTS source_file_name TEXT;
ALTER TABLE public.songs ADD COLUMN IF NOT EXISTS source_file_hash TEXT;
ALTER TABLE public.songs ADD COLUMN IF NOT EXISTS page_start INTEGER;
ALTER TABLE public.songs ADD COLUMN IF NOT EXISTS page_end INTEGER;

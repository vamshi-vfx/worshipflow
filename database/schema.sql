-- WorshipFlow 2.0 Database Schema
-- Run this in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Churches table
CREATE TABLE IF NOT EXISTS churches (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT DEFAULT 'viewer' NOT NULL CHECK (role IN ('owner', 'admin', 'editor', 'presenter', 'viewer')),
  church_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Songs table
CREATE TABLE IF NOT EXISTS songs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title TEXT NOT NULL,
  romanized_title TEXT,
  english_title TEXT,
  slug TEXT NOT NULL UNIQUE,
  language TEXT NOT NULL CHECK (language IN ('telugu', 'english', 'hindi', 'mixed', 'romanized')),
  secondary_language TEXT CHECK (secondary_language IN ('telugu', 'english', 'hindi', 'mixed', 'romanized')),
  category TEXT,
  author TEXT,
  artist TEXT,
  composer TEXT,
  lyricist TEXT,
  translator TEXT,
  key TEXT,
  tempo INTEGER,
  source TEXT,
  source_name TEXT,
  source_url TEXT,
  license TEXT,
  copyright TEXT,
  copyright_year INTEGER,
  copyright_notice TEXT,
  content_owner TEXT,
  lyrics TEXT,
  chords TEXT,
  tags TEXT[] DEFAULT '{}',
  audio_url TEXT,
  thumbnail_url TEXT,
  favorite BOOLEAN DEFAULT FALSE NOT NULL,
  usage_count INTEGER DEFAULT 0 NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  created_by UUID
);

-- Schema Migrations (Add missing columns if table already existed)
ALTER TABLE songs ADD COLUMN IF NOT EXISTS romanized_title TEXT;
ALTER TABLE songs ADD COLUMN IF NOT EXISTS english_title TEXT;
ALTER TABLE songs ADD COLUMN IF NOT EXISTS artist TEXT;
ALTER TABLE songs ADD COLUMN IF NOT EXISTS lyricist TEXT;
ALTER TABLE songs ADD COLUMN IF NOT EXISTS translator TEXT;
ALTER TABLE songs ADD COLUMN IF NOT EXISTS key TEXT;
ALTER TABLE songs ADD COLUMN IF NOT EXISTS tempo INTEGER;
ALTER TABLE songs ADD COLUMN IF NOT EXISTS chords TEXT;
ALTER TABLE songs ADD COLUMN IF NOT EXISTS source_name TEXT;
ALTER TABLE songs ADD COLUMN IF NOT EXISTS source_url TEXT;
ALTER TABLE songs ADD COLUMN IF NOT EXISTS license TEXT;
ALTER TABLE songs ADD COLUMN IF NOT EXISTS copyright_notice TEXT;
ALTER TABLE songs ADD COLUMN IF NOT EXISTS content_owner TEXT;
ALTER TABLE songs ADD COLUMN IF NOT EXISTS usage_count INTEGER DEFAULT 0;
ALTER TABLE songs ADD COLUMN IF NOT EXISTS source_type TEXT;
ALTER TABLE songs ADD COLUMN IF NOT EXISTS source_file_name TEXT;
ALTER TABLE songs ADD COLUMN IF NOT EXISTS source_file_hash TEXT;
ALTER TABLE songs ADD COLUMN IF NOT EXISTS page_start INTEGER;
ALTER TABLE songs ADD COLUMN IF NOT EXISTS page_end INTEGER;

-- Categories table
CREATE TABLE IF NOT EXISTS categories (
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

-- Seed Default Categories
INSERT INTO categories (slug, name, telugu_name, hindi_name, display_order)
VALUES
  ('worship', 'Worship', 'ఆరాధన', 'आराधना', 1),
  ('praise', 'Praise', 'స్తుతి', 'स्तुति', 2),
  ('prayer', 'Prayer', 'ప్రార్థన', 'प्रार्थना', 3),
  ('gospel', 'Gospel', 'సువార్త', 'सुसमाचार', 4),
  ('encouragement', 'Encouragement', 'ధైర్యము', 'प्रोत्साहन', 5),
  ('hope', 'Hope', 'నిరీక్షణ', 'आशा', 6),
  ('comfort', 'Comfort', 'ఓదార్పు', 'शांति', 7),
  ('christmas', 'Christmas', 'క్రిస్మస్', 'क्रिसमस', 8),
  ('good-friday', 'Good Friday', 'గుడ్ ఫ్రైడే', 'गुड फ्राइडे', 9),
  ('thanksgiving', 'Thanksgiving', 'కృతజ్ఞత', 'धन्यवाद', 10),
  ('repentance', 'Repentance', 'మారుమనస్సు', 'पश्चाताप', 11),
  ('commitment', 'Commitment', 'సమర్పణ', 'समर्पण', 12),
  ('marriage', 'Marriage', 'వివాహం', 'विवाह', 13),
  ('second-coming', 'Second Coming', 'రెండవ రాకడ', 'पुनरागमन', 14),
  ('children', 'Children', 'పిల్లల పాటలు', 'बच्चों के गीत', 15),
  ('youth', 'Youth', 'యౌవనస్థులు', 'युवा', 16),
  ('special', 'Special Songs', 'ప్రత్యేక పాటలు', 'विशेष गीत', 17)
ON CONFLICT (slug) DO NOTHING;

-- Song sections table
CREATE TABLE IF NOT EXISTS song_sections (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  song_id UUID REFERENCES songs(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('verse', 'chorus', 'bridge', 'intro', 'outro', 'tag', 'pre-chorus', 'custom')),
  label TEXT NOT NULL,
  "order" INTEGER NOT NULL DEFAULT 0,
  repeat_count INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Song lines table
CREATE TABLE IF NOT EXISTS song_lines (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  section_id UUID REFERENCES song_sections(id) ON DELETE CASCADE NOT NULL,
  "order" INTEGER NOT NULL DEFAULT 0,
  primary_text TEXT NOT NULL,
  secondary_text TEXT,
  chords TEXT,
  language TEXT NOT NULL CHECK (language IN ('telugu', 'english', 'hindi', 'mixed', 'romanized')),
  display_mode TEXT NOT NULL DEFAULT 'telugu' CHECK (display_mode IN ('telugu', 'english', 'transliteration', 'mixed', 'both')),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Song slides table
CREATE TABLE IF NOT EXISTS song_slides (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  song_id UUID REFERENCES songs(id) ON DELETE CASCADE NOT NULL,
  section_id UUID REFERENCES song_sections(id) ON DELETE CASCADE NOT NULL,
  section_order INTEGER NOT NULL DEFAULT 0,
  slide_number INTEGER NOT NULL DEFAULT 0,
  "order" INTEGER NOT NULL DEFAULT 0,
  primary_text TEXT NOT NULL,
  secondary_text TEXT,
  line_ids TEXT[] DEFAULT '{}',
  display_mode TEXT NOT NULL DEFAULT 'telugu' CHECK (display_mode IN ('telugu', 'english', 'transliteration', 'mixed', 'both')),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Services table
CREATE TABLE IF NOT EXISTS services (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  date DATE NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'ready', 'live', 'completed', 'archived')),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  created_by UUID
);

-- Service items table
CREATE TABLE IF NOT EXISTS service_items (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  service_id UUID REFERENCES services(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('song', 'bible', 'announcement', 'custom')),
  song_id UUID REFERENCES songs(id),
  bible_reference TEXT,
  bible_text TEXT,
  announcement_id UUID,
  "order" INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Bible presentations table
CREATE TABLE IF NOT EXISTS bible_presentations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  book TEXT NOT NULL,
  chapter INTEGER NOT NULL,
  verse_start INTEGER NOT NULL,
  verse_end INTEGER NOT NULL,
  translation TEXT NOT NULL DEFAULT 'ESV',
  text TEXT NOT NULL,
  telugu_text TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  created_by UUID
);

-- Announcements table
CREATE TABLE IF NOT EXISTS announcements (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  date DATE,
  time TIME,
  location TEXT,
  image_url TEXT,
  cta_text TEXT,
  cta_link TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  created_by UUID
);

-- Themes table
CREATE TABLE IF NOT EXISTS themes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  background JSONB NOT NULL,
  font JSONB NOT NULL,
  alignment TEXT NOT NULL DEFAULT 'center',
  vertical_align TEXT NOT NULL DEFAULT 'center',
  letter_spacing REAL NOT NULL DEFAULT 0,
  line_spacing REAL NOT NULL DEFAULT 1.5,
  shadow BOOLEAN NOT NULL DEFAULT TRUE,
  overlay JSONB,
  logo JSONB,
  is_default BOOLEAN DEFAULT FALSE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  created_by UUID
);

-- Media table
CREATE TABLE IF NOT EXISTS media (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('image', 'video', 'audio')),
  url TEXT NOT NULL,
  thumbnail_url TEXT,
  size INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  created_by UUID
);

-- Import Jobs table
CREATE TABLE IF NOT EXISTS import_jobs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  filename TEXT,
  format TEXT NOT NULL,
  total_count INTEGER NOT NULL DEFAULT 0,
  imported_count INTEGER NOT NULL DEFAULT 0,
  skipped_count INTEGER NOT NULL DEFAULT 0,
  failed_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'completed',
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Import Items table for per-song tracking within a batch
CREATE TABLE IF NOT EXISTS import_items (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  import_job_id UUID REFERENCES import_jobs(id) ON DELETE CASCADE NOT NULL,
  song_id UUID REFERENCES songs(id),
  title TEXT NOT NULL,
  language TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','valid','duplicate','imported','failed','needs_review')),
  error_message TEXT,
  duplicate_of_id UUID REFERENCES songs(id),
  duplicate_score REAL,
  resolution TEXT CHECK (resolution IN ('skip','merge','create_new','review')),
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

-- Authorized content sources registry
CREATE TABLE IF NOT EXISTS content_sources (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  url TEXT,
  api_url TEXT,
  license TEXT NOT NULL,
  content_owner TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive','error')),
  last_sync_at TIMESTAMPTZ,
  sync_frequency TEXT CHECK (sync_frequency IN ('manual','daily','weekly','monthly')),
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_import_jobs_created_by ON import_jobs(created_by);
CREATE INDEX IF NOT EXISTS idx_import_jobs_status ON import_jobs(status);
CREATE INDEX IF NOT EXISTS idx_import_items_import_job_id ON import_items(import_job_id);
CREATE INDEX IF NOT EXISTS idx_import_items_status ON import_items(status);
CREATE INDEX IF NOT EXISTS idx_content_sources_status ON content_sources(status);

-- Indexes for maximum performance
CREATE INDEX IF NOT EXISTS idx_songs_title ON songs(title);
CREATE INDEX IF NOT EXISTS idx_songs_romanized_title ON songs(romanized_title);
CREATE INDEX IF NOT EXISTS idx_songs_artist ON songs(artist);
CREATE INDEX IF NOT EXISTS idx_songs_language ON songs(language);
CREATE INDEX IF NOT EXISTS idx_songs_category ON songs(category);
CREATE INDEX IF NOT EXISTS idx_songs_tags ON songs USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_songs_favorite ON songs(favorite);
CREATE INDEX IF NOT EXISTS idx_songs_created_at ON songs(created_at);
CREATE INDEX IF NOT EXISTS idx_songs_usage_count ON songs(usage_count);
CREATE INDEX IF NOT EXISTS idx_song_sections_song_id ON song_sections(song_id);
CREATE INDEX IF NOT EXISTS idx_song_lines_section_id ON song_lines(section_id);
CREATE INDEX IF NOT EXISTS idx_services_date ON services(date);
CREATE INDEX IF NOT EXISTS idx_service_items_service_id ON service_items(service_id);

-- Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE songs ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE song_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE song_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE song_slides ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE bible_presentations ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE themes ENABLE ROW LEVEL SECURITY;
ALTER TABLE media ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Songs: Public read, authenticated create/update/delete
DROP POLICY IF EXISTS "Public songs are viewable by everyone" ON songs;
DROP POLICY IF EXISTS "Authenticated users can insert songs" ON songs;
DROP POLICY IF EXISTS "Users can update their own songs" ON songs;
DROP POLICY IF EXISTS "Users can delete their own songs" ON songs;
CREATE POLICY "Public songs are viewable by everyone" ON songs FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert songs" ON songs FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Users can update their own songs" ON songs FOR UPDATE USING (created_by = auth.uid() OR created_by IS NULL);
CREATE POLICY "Users can delete their own songs" ON songs FOR DELETE USING (created_by = auth.uid() OR created_by IS NULL);

-- Categories: Viewable by everyone
DROP POLICY IF EXISTS "Categories viewable by everyone" ON categories;
CREATE POLICY "Categories viewable by everyone" ON categories FOR SELECT USING (true);

-- Themes: Viewable by everyone
DROP POLICY IF EXISTS "Themes viewable by everyone" ON themes;
CREATE POLICY "Themes viewable by everyone" ON themes FOR SELECT USING (true);

-- Users: authenticated users manage their own profile
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Authenticated users can view all profiles" ON users;
DROP POLICY IF EXISTS "Users can insert own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
CREATE POLICY "Users can view own profile" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON users FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid() = id);

-- Song Sections: owner can manage via parent song
DROP POLICY IF EXISTS "Song sections viewable by everyone" ON song_sections;
DROP POLICY IF EXISTS "Song sections insertable by authenticated" ON song_sections;
DROP POLICY IF EXISTS "Song sections updatable by owner" ON song_sections;
DROP POLICY IF EXISTS "Song sections deletable by owner" ON song_sections;
CREATE POLICY "Song sections viewable by everyone" ON song_sections FOR SELECT USING (true);
CREATE POLICY "Song sections insertable by authenticated" ON song_sections FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM songs WHERE songs.id = song_sections.song_id AND (songs.created_by = auth.uid() OR songs.created_by IS NULL))
);
CREATE POLICY "Song sections updatable by owner" ON song_sections FOR UPDATE USING (
  EXISTS (SELECT 1 FROM songs WHERE songs.id = song_sections.song_id AND (songs.created_by = auth.uid() OR songs.created_by IS NULL))
);
CREATE POLICY "Song sections deletable by owner" ON song_sections FOR DELETE USING (
  EXISTS (SELECT 1 FROM songs WHERE songs.id = song_sections.song_id AND (songs.created_by = auth.uid() OR songs.created_by IS NULL))
);

-- Song Lines: owner can manage via parent song
DROP POLICY IF EXISTS "Song lines viewable by everyone" ON song_lines;
DROP POLICY IF EXISTS "Song lines insertable by authenticated" ON song_lines;
DROP POLICY IF EXISTS "Song lines updatable by owner" ON song_lines;
DROP POLICY IF EXISTS "Song lines deletable by owner" ON song_lines;
CREATE POLICY "Song lines viewable by everyone" ON song_lines FOR SELECT USING (true);
CREATE POLICY "Song lines insertable by authenticated" ON song_lines FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM song_sections
    JOIN songs ON songs.id = song_sections.song_id
    WHERE song_sections.id = song_lines.section_id AND (songs.created_by = auth.uid() OR songs.created_by IS NULL)
  )
);
CREATE POLICY "Song lines updatable by owner" ON song_lines FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM song_sections
    JOIN songs ON songs.id = song_sections.song_id
    WHERE song_sections.id = song_lines.section_id AND (songs.created_by = auth.uid() OR songs.created_by IS NULL)
  )
);
CREATE POLICY "Song lines deletable by owner" ON song_lines FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM song_sections
    JOIN songs ON songs.id = song_sections.song_id
    WHERE song_sections.id = song_lines.section_id AND (songs.created_by = auth.uid() OR songs.created_by IS NULL)
  )
);

-- Song Slides: owner can manage via parent song
DROP POLICY IF EXISTS "Song slides viewable by everyone" ON song_slides;
DROP POLICY IF EXISTS "Song slides insertable by authenticated" ON song_slides;
DROP POLICY IF EXISTS "Song slides updatable by owner" ON song_slides;
DROP POLICY IF EXISTS "Song slides deletable by owner" ON song_slides;
CREATE POLICY "Song slides viewable by everyone" ON song_slides FOR SELECT USING (true);
CREATE POLICY "Song slides insertable by authenticated" ON song_slides FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM songs WHERE songs.id = song_slides.song_id AND (songs.created_by = auth.uid() OR songs.created_by IS NULL))
);
CREATE POLICY "Song slides updatable by owner" ON song_slides FOR UPDATE USING (
  EXISTS (SELECT 1 FROM songs WHERE songs.id = song_slides.song_id AND (songs.created_by = auth.uid() OR songs.created_by IS NULL))
);
CREATE POLICY "Song slides deletable by owner" ON song_slides FOR DELETE USING (
  EXISTS (SELECT 1 FROM songs WHERE songs.id = song_slides.song_id AND (songs.created_by = auth.uid() OR songs.created_by IS NULL))
);

-- Services: owner can manage
DROP POLICY IF EXISTS "Services viewable by owner" ON services;
DROP POLICY IF EXISTS "Services insertable by authenticated" ON services;
DROP POLICY IF EXISTS "Services updatable by owner" ON services;
DROP POLICY IF EXISTS "Services deletable by owner" ON services;
CREATE POLICY "Services viewable by owner" ON services FOR SELECT USING (created_by = auth.uid() OR created_by IS NULL);
CREATE POLICY "Services insertable by authenticated" ON services FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Services updatable by owner" ON services FOR UPDATE USING (created_by = auth.uid());
CREATE POLICY "Services deletable by owner" ON services FOR DELETE USING (created_by = auth.uid());

-- Service Items: owner can manage via parent service
DROP POLICY IF EXISTS "Service items viewable by owner" ON service_items;
DROP POLICY IF EXISTS "Service items insertable by authenticated" ON service_items;
DROP POLICY IF EXISTS "Service items updatable by owner" ON service_items;
DROP POLICY IF EXISTS "Service items deletable by owner" ON service_items;
CREATE POLICY "Service items viewable by owner" ON service_items FOR SELECT USING (
  EXISTS (SELECT 1 FROM services WHERE services.id = service_items.service_id AND (services.created_by = auth.uid() OR services.created_by IS NULL))
);
CREATE POLICY "Service items insertable by authenticated" ON service_items FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM services WHERE services.id = service_items.service_id AND (services.created_by = auth.uid() OR services.created_by IS NULL))
);
CREATE POLICY "Service items updatable by owner" ON service_items FOR UPDATE USING (
  EXISTS (SELECT 1 FROM services WHERE services.id = service_items.service_id AND (services.created_by = auth.uid() OR services.created_by IS NULL))
);
CREATE POLICY "Service items deletable by owner" ON service_items FOR DELETE USING (
  EXISTS (SELECT 1 FROM services WHERE services.id = service_items.service_id AND (services.created_by = auth.uid() OR services.created_by IS NULL))
);

-- Bible Presentations: owner can manage
DROP POLICY IF EXISTS "Bible presentations viewable by owner" ON bible_presentations;
DROP POLICY IF EXISTS "Bible presentations insertable by authenticated" ON bible_presentations;
DROP POLICY IF EXISTS "Bible presentations updatable by owner" ON bible_presentations;
DROP POLICY IF EXISTS "Bible presentations deletable by owner" ON bible_presentations;
CREATE POLICY "Bible presentations viewable by owner" ON bible_presentations FOR SELECT USING (created_by = auth.uid() OR created_by IS NULL);
CREATE POLICY "Bible presentations insertable by authenticated" ON bible_presentations FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Bible presentations updatable by owner" ON bible_presentations FOR UPDATE USING (created_by = auth.uid());
CREATE POLICY "Bible presentations deletable by owner" ON bible_presentations FOR DELETE USING (created_by = auth.uid());

-- Announcements: owner can manage
DROP POLICY IF EXISTS "Announcements viewable by owner" ON announcements;
DROP POLICY IF EXISTS "Announcements insertable by authenticated" ON announcements;
DROP POLICY IF EXISTS "Announcements updatable by owner" ON announcements;
DROP POLICY IF EXISTS "Announcements deletable by owner" ON announcements;
CREATE POLICY "Announcements viewable by owner" ON announcements FOR SELECT USING (created_by = auth.uid() OR created_by IS NULL);
CREATE POLICY "Announcements insertable by authenticated" ON announcements FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Announcements updatable by owner" ON announcements FOR UPDATE USING (created_by = auth.uid());
CREATE POLICY "Announcements deletable by owner" ON announcements FOR DELETE USING (created_by = auth.uid());

-- Media: owner can manage
DROP POLICY IF EXISTS "Media viewable by owner" ON media;
DROP POLICY IF EXISTS "Media insertable by authenticated" ON media;
DROP POLICY IF EXISTS "Media updatable by owner" ON media;
DROP POLICY IF EXISTS "Media deletable by owner" ON media;
CREATE POLICY "Media viewable by owner" ON media FOR SELECT USING (created_by = auth.uid() OR created_by IS NULL);
CREATE POLICY "Media insertable by authenticated" ON media FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Media updatable by owner" ON media FOR UPDATE USING (created_by = auth.uid());
CREATE POLICY "Media deletable by owner" ON media FOR DELETE USING (created_by = auth.uid());

-- Import Jobs: owner can manage
DROP POLICY IF EXISTS "Import jobs viewable by owner" ON import_jobs;
DROP POLICY IF EXISTS "Import jobs insertable by authenticated" ON import_jobs;
DROP POLICY IF EXISTS "Import jobs updatable by owner" ON import_jobs;
DROP POLICY IF EXISTS "Import jobs deletable by owner" ON import_jobs;
CREATE POLICY "Import jobs viewable by owner" ON import_jobs FOR SELECT USING (created_by = auth.uid() OR created_by IS NULL);
CREATE POLICY "Import jobs insertable by authenticated" ON import_jobs FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Import jobs updatable by owner" ON import_jobs FOR UPDATE USING (created_by = auth.uid());
CREATE POLICY "Import jobs deletable by owner" ON import_jobs FOR DELETE USING (created_by = auth.uid());

-- Import Items: owner can manage via parent job
DROP POLICY IF EXISTS "Import items viewable by owner" ON import_items;
DROP POLICY IF EXISTS "Import items insertable by authenticated" ON import_items;
DROP POLICY IF EXISTS "Import items updatable by owner" ON import_items;
DROP POLICY IF EXISTS "Import items deletable by owner" ON import_items;
CREATE POLICY "Import items viewable by owner" ON import_items FOR SELECT USING (
  EXISTS (SELECT 1 FROM import_jobs WHERE import_jobs.id = import_items.import_job_id AND (import_jobs.created_by = auth.uid() OR import_jobs.created_by IS NULL))
);
CREATE POLICY "Import items insertable by authenticated" ON import_items FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM import_jobs WHERE import_jobs.id = import_items.import_job_id AND (import_jobs.created_by = auth.uid() OR import_jobs.created_by IS NULL))
);
CREATE POLICY "Import items updatable by owner" ON import_items FOR UPDATE USING (
  EXISTS (SELECT 1 FROM import_jobs WHERE import_jobs.id = import_items.import_job_id AND (import_jobs.created_by = auth.uid() OR import_jobs.created_by IS NULL))
);
CREATE POLICY "Import items deletable by owner" ON import_items FOR DELETE USING (
  EXISTS (SELECT 1 FROM import_jobs WHERE import_jobs.id = import_items.import_job_id AND (import_jobs.created_by = auth.uid() OR import_jobs.created_by IS NULL))
);

-- Content Sources: readable by authenticated, writable by owner
DROP POLICY IF EXISTS "Content sources viewable by authenticated" ON content_sources;
DROP POLICY IF EXISTS "Content sources insertable by authenticated" ON content_sources;
DROP POLICY IF EXISTS "Content sources updatable by owner" ON content_sources;
DROP POLICY IF EXISTS "Content sources deletable by owner" ON content_sources;
CREATE POLICY "Content sources viewable by authenticated" ON content_sources FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Content sources insertable by authenticated" ON content_sources FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Content sources updatable by owner" ON content_sources FOR UPDATE USING (created_by = auth.uid());
CREATE POLICY "Content sources deletable by owner" ON content_sources FOR DELETE USING (created_by = auth.uid());

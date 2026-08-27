export type Language = "telugu" | "english" | "hindi" | "mixed" | "romanized";

export type DisplayMode = "telugu" | "english" | "hindi" | "transliteration" | "mixed" | "both";

export type SectionType = "verse" | "chorus" | "bridge" | "intro" | "outro" | "tag" | "pre-chorus" | "custom";

export type SectionLabel =
  | "Verse 1"
  | "Verse 2"
  | "Verse 3"
  | "Verse 4"
  | "Verse 5"
  | "Chorus"
  | "Bridge"
  | "Pre-Chorus"
  | "Intro"
  | "Outro"
  | "Tag"
  | string;

export interface LyricLine {
  id: string;
  order: number;
  primaryText: string;
  secondaryText?: string;
  language: Language;
  displayMode: DisplayMode;
  chords?: string;
}

export interface Slide {
  id: string;
  songId: string;
  sectionId: string;
  sectionOrder: number;
  slideNumber: number;
  order: number;
  primaryText: string;
  secondaryText?: string;
  lineIds: string[];
  displayMode: DisplayMode;
}

export interface SongSection {
  id: string;
  type: SectionType;
  label: string;
  order: number;
  repeatCount: number;
  lines: LyricLine[];
}

export interface BibleReference {
  book: string;
  chapter: number;
  verseStart: number;
  verseEnd?: number;
  text?: string;
}

export interface Song {
  id: string;
  title: string;
  romanizedTitle?: string;
  englishTitle?: string;
  slug: string;
  language: Language;
  secondaryLanguage?: Language;
  category: string;
  author?: string;
  artist?: string;
  composer?: string;
  lyricist?: string;
  translator?: string;
  key?: string;
  tempo?: number;
  source?: string;
  sourceName?: string;
  sourceUrl?: string;
  sourceType?: string;
  sourceFileName?: string;
  sourceFileHash?: string;
  pageStart?: number;
  pageEnd?: number;
  license?: string;
  copyright?: string;
  copyrightYear?: number;
  copyrightNotice?: string;
  contentOwner?: string;
  lyrics: string;
  chords?: string;
  sections: SongSection[];
  tags: string[];
  bibleReferences?: BibleReference[];
  audioUrl?: string;
  thumbnailUrl?: string;
  favorite: boolean;
  usageCount?: number;
  createdAt: string;
  updatedAt: string;
}

export type ServiceStatus = "draft" | "ready" | "live" | "completed" | "archived";

export interface ServiceItem {
  id: string;
  type: "song" | "bible" | "announcement" | "custom";
  songId?: string;
  song?: Song;
  bibleReference?: string;
  bibleText?: string;
  announcementId?: string;
  announcement?: Announcement;
  customTitle?: string;
  customContent?: string;
  order: number;
  notes?: string;
}

export interface Service {
  id: string;
  name: string;
  date: string;
  description?: string;
  status: ServiceStatus;
  items: ServiceItem[];
  createdAt: string;
  updatedAt: string;
}

export interface BiblePresentation {
  id: string;
  book: string;
  chapter: number;
  verseStart: number;
  verseEnd: number;
  translation: string;
  text: string;
  teluguText?: string;
  createdAt: string;
}

export interface Announcement {
  id: string;
  title: string;
  description?: string;
  date?: string;
  time?: string;
  location?: string;
  imageUrl?: string;
  ctaText?: string;
  ctaLink?: string;
  createdAt: string;
}

export interface Media {
  id: string;
  name: string;
  type: "image" | "video" | "audio";
  url: string;
  thumbnailUrl?: string;
  size?: number;
  createdAt: string;
}

export interface Theme {
  id: string;
  name: string;
  description?: string;
  background: {
    type: "solid" | "gradient" | "image" | "video";
    value: string;
  };
  font: {
    family: string;
    size: number;
    weight: number;
    color?: string;
  };
  alignment: "left" | "center" | "right";
  verticalAlign: "top" | "center" | "bottom";
  letterSpacing: number;
  lineSpacing: number;
  shadow: boolean;
  overlay: {
    enabled: boolean;
    color: string;
    opacity: number;
  };
  logo: {
    enabled: boolean;
    url?: string;
    position: "top-left" | "top-right" | "bottom-left" | "bottom-right";
  };
  isDefault: boolean;
}

export type PresentationMode = "full" | "one-line" | "two-line" | "smart-fit";

export interface PresentationState {
  isPresenting: boolean;
  currentSlideIndex: number;
  mode: PresentationMode;
  language: DisplayMode;
  theme: Theme;
  isBlackScreen: boolean;
  isBlankScreen: boolean;
  elapsedSeconds: number;
  service?: Service;
}

export type UserRole = "owner" | "admin" | "editor" | "presenter" | "viewer";

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  churchId?: string;
}

export interface Church {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
}

export type SlideDirection = "next" | "previous" | "jump";

// Content Ingestion & Import Models
export interface ImportItem {
  id: string;
  title: string;
  romanizedTitle?: string;
  englishTitle?: string;
  language: Language;
  category: string;
  artist?: string;
  lyricist?: string;
  translator?: string;
  lyrics: string;
  chords?: string;
  sourceName?: string;
  sourceUrl?: string;
  license?: string;
  copyrightNotice?: string;
  contentOwner?: string;
  sourceType?: string;
  sourceFileName?: string;
  sourceFileHash?: string;
  pageStart?: number;
  pageEnd?: number;
  confidence?: number;
  status: "pending" | "valid" | "duplicate" | "error" | "imported" | "failed" | "needs_review";
  errorMessage?: string;
  duplicateOfId?: string;
  duplicateScore?: number;
  resolution?: "skip" | "merge" | "create_new";
  importedAt?: string;
}

export interface ImportJob {
  id: string;
  filename?: string;
  format: "raw" | "txt" | "csv" | "json" | "docx" | "pdf" | "pptx";
  total_count: number;
  imported_count: number;
  skipped_count: number;
  failed_count?: number;
  status: string;
  created_by?: string;
  created_at: string;
}

export interface DuplicateMatch {
  songId: string;
  title: string;
  artist?: string;
  score: number; // 0 to 1
  matchType: "exact_title" | "exact_lyrics" | "fuzzy_title" | "fuzzy_lyrics";
}

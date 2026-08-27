"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Edit,
  Play,
  Copy,
  Trash2,
  Star,
  Music2,
  Loader2,
  Download,
  Share2,
  FileText,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Maximize,
  Languages,
  BookOpen,
  Volume2,
  Sliders,
  Type,
  Plus,
  Calendar,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/app/providers";
import { db } from "@/services/database";
import { useToast } from "@/components/toast";
import { ChordSheet } from "@/components/chord-sheet";
import { AudioPlayer } from "@/components/audio-player";
import { exportSongToPowerPoint, exportSongToPDF, exportSongToTXT } from "@/lib/export-generator";
import { generateSlides } from "@/lib/lyrics-parser";
import type { Song, DisplayMode } from "@/types";

type DetailTab = "lyrics" | "line-by-line" | "chords" | "audio" | "bible";

export default function SongDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const toast = useToast();

  const [song, setSong] = useState<Song | null>(null);
  const [activeTab, setActiveTab] = useState<DetailTab>("lyrics");
  const [lyricsLanguageMode, setLyricsLanguageMode] = useState<DisplayMode>("telugu");
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [slideFontSize, setSlideFontSize] = useState(36);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);

  useEffect(() => {
    if (params.id) {
      loadSong(params.id as string);
    }
  }, [params.id, user]);

  const loadSong = async (id: string) => {
    try {
      const songData = await db.getSong(id, user?.id);
      if (!songData) {
        setError("Song not found");
        return;
      }

      const sections = await db.getSongSections(id);
      const sectionsWithLines = await Promise.all(
        sections.map(async (section) => {
          const lines = await db.getSongLines(section.id);
          return {
            ...section,
            lines: lines.map((line) => ({
              id: line.id,
              order: line.order,
              primaryText: line.primary_text,
              secondaryText: line.secondary_text || "",
              chords: line.chords || "",
              language: line.language as any,
              displayMode: line.display_mode as any,
            })),
          };
        })
      );

      // If sections exist in DB, attach them; otherwise parse lyrics into sections
      const finalSections = sectionsWithLines.length > 0
        ? sectionsWithLines
        : (songData.sections || []);

      setSong({
        ...songData,
        sections: finalSections,
      });

      if (songData.language === "english") {
        setLyricsLanguageMode("english");
      } else if (songData.language === "hindi") {
        setLyricsLanguageMode("hindi");
      }
    } catch (e) {
      console.error("Failed to load song", e);
      setError("Failed to load song details");
    } finally {
      setIsLoading(false);
    }
  };

  const slides = useMemo(() => {
    if (!song || !song.sections || song.sections.length === 0) return [];
    return generateSlides(
      song.sections.map((s, idx) => ({
        id: s.id,
        type: s.type,
        label: s.label,
        lines: s.lines.map((l) => ({
          id: l.id,
          text: l.primaryText,
          language: l.language as any,
        })),
        order: idx,
        confidence: "high" as const,
      })),
      "two-line",
      48
    );
  }, [song]);

  // Keyboard navigation for line-by-line mode
  useEffect(() => {
    if (activeTab !== "line-by-line") return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === "ArrowRight" || e.key === " " || e.key === "PageDown") {
        e.preventDefault();
        setCurrentSlideIndex((prev) => Math.min(slides.length - 1, prev + 1));
      } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
        e.preventDefault();
        setCurrentSlideIndex((prev) => Math.max(0, prev - 1));
      } else if (e.key === "Home") {
        e.preventDefault();
        setCurrentSlideIndex(0);
      } else if (e.key === "End") {
        e.preventDefault();
        setCurrentSlideIndex(Math.max(0, slides.length - 1));
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeTab, slides.length]);

  const handleToggleFavorite = async () => {
    if (!song) return;
    if (!user) {
      toast.addToast("info", "Please sign in to favorite songs");
      return;
    }
    const newFav = !song.favorite;
    try {
      await db.toggleFavorite(song.id, newFav, user.id);
      setSong({ ...song, favorite: newFav });
      toast.addToast("success", newFav ? "Added to favorites" : "Removed from favorites");
    } catch (err) {
      console.error(err);
      toast.addToast("error", "Failed to update favorite");
    }
  };

  const handlePresent = () => {
    if (song) {
      localStorage.setItem("church-lyrics-current-song", JSON.stringify(song));
      router.push("/presentation");
    }
  };

  const handleAddToService = () => {
    if (song) {
      localStorage.setItem("church-lyrics-current-song", JSON.stringify(song));
      router.push("/services/new");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-brand-darker flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-brand-gold mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Loading song...</p>
        </div>
      </div>
    );
  }

  if (error || !song) {
    return (
      <div className="min-h-screen bg-brand-darker flex items-center justify-center p-6">
        <div className="glass rounded-2xl p-12 text-center max-w-md border border-white/10">
          <Music2 className="w-12 h-12 text-brand-gold opacity-40 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Song Not Found</h2>
          <p className="text-xs text-muted-foreground mb-6">The requested worship song may have been deleted or moved.</p>
          <Link
            href="/songs"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-gold text-brand-darker text-xs font-bold"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Song Library
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20">
      {/* Header Breadcrumb & Actions Bar */}
      <header className="border-b border-white/5 bg-brand-darker/80 backdrop-blur-xl py-6 sticky top-16 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            {/* Left Title Group */}
            <div className="flex items-start gap-4">
              <Link
                href="/songs"
                className="p-2 rounded-xl bg-white/5 text-muted-foreground hover:text-white hover:bg-white/10 transition-colors shrink-0 mt-1"
                title="Back to Songs"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className="px-2.5 py-0.5 rounded-full bg-brand-gold/15 text-brand-gold text-[11px] font-bold uppercase tracking-wider">
                    {song.language}
                  </span>
                  {song.category && (
                    <span className="px-2.5 py-0.5 rounded-full bg-white/5 text-muted-foreground text-[11px] font-semibold capitalize border border-white/5">
                      {song.category}
                    </span>
                  )}
                  {song.key && (
                    <span className="px-2.5 py-0.5 rounded-full bg-white/5 text-white/90 text-[11px] font-mono font-bold border border-white/5">
                      Key: {song.key}
                    </span>
                  )}
                </div>

                <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">{song.title}</h1>
                {song.romanizedTitle && (
                  <p className="text-sm text-brand-gold/80 italic mt-0.5">{song.romanizedTitle}</p>
                )}
                {song.artist && (
                  <p className="text-xs text-muted-foreground mt-1">Artist / Author: {song.artist}</p>
                )}
              </div>
            </div>

            {/* Right Quick Action Toolbar */}
            <div className="flex flex-wrap items-center gap-2 self-start lg:self-auto">
              <button
                onClick={handlePresent}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-gold text-brand-darker text-xs font-bold hover:bg-brand-goldLight shadow-lg transition-all active:scale-95"
              >
                <Play className="w-4 h-4 fill-brand-darker" />
                Present Live
              </button>

              <button
                onClick={handleAddToService}
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-semibold border border-white/10 transition-colors"
                title="Add to Service Planner"
              >
                <Calendar className="w-4 h-4 text-blue-400" />
                Add to Service
              </button>

              <button
                onClick={handleToggleFavorite}
                className={cn(
                  "p-2.5 rounded-xl border transition-colors",
                  song.favorite
                    ? "bg-brand-gold/20 border-brand-gold/40 text-brand-gold"
                    : "bg-white/5 border-white/10 text-muted-foreground hover:text-white"
                )}
                title={song.favorite ? "Favorited" : "Favorite"}
              >
                <Star className={cn("w-4 h-4", song.favorite && "fill-brand-gold")} />
              </button>

              <Link
                href={`/editor?id=${song.id}`}
                className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-white border border-white/10 transition-colors"
                title="Edit Song"
              >
                <Edit className="w-4 h-4" />
              </Link>

              {/* Export Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setExportMenuOpen(!exportMenuOpen)}
                  className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-white border border-white/10 transition-colors flex items-center gap-1.5 text-xs font-medium"
                  title="Export Song"
                >
                  <Download className="w-4 h-4" />
                  <span className="hidden sm:inline">Export</span>
                </button>

                {exportMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setExportMenuOpen(false)} />
                    <div className="absolute right-0 top-11 z-50 w-52 bg-brand-surface border border-white/10 rounded-xl shadow-2xl py-1.5 backdrop-blur-xl">
                      <button
                        onClick={() => {
                          setExportMenuOpen(false);
                          exportSongToPowerPoint(song);
                          toast.addToast("success", "Exporting PowerPoint (.pptx)...");
                        }}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs text-white hover:bg-white/5 text-left"
                      >
                        <FileText className="w-4 h-4 text-brand-gold" />
                        PowerPoint Slides (.pptx)
                      </button>
                      <button
                        onClick={() => {
                          setExportMenuOpen(false);
                          exportSongToPDF(song);
                          toast.addToast("success", "Exporting PDF...");
                        }}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs text-white hover:bg-white/5 text-left"
                      >
                        <Download className="w-4 h-4 text-blue-400" />
                        PDF Lyric Sheet
                      </button>
                      <button
                        onClick={() => {
                          setExportMenuOpen(false);
                          exportSongToTXT(song);
                          toast.addToast("success", "Exporting Plain Text (.txt)...");
                        }}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs text-white hover:bg-white/5 text-left"
                      >
                        <Download className="w-4 h-4 text-green-400" />
                        Plain Text (.txt)
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Interactive Navigation Tabs */}
          <div className="flex items-center gap-2 mt-6 border-b border-white/5 pb-px overflow-x-auto">
            {[
              { id: "lyrics", label: "Lyrics", icon: FileText },
              { id: "line-by-line", label: "Line by Line", icon: Maximize },
              { id: "chords", label: "Chords", icon: Music2 },
              { id: "audio", label: "Audio", icon: Volume2 },
              { id: "bible", label: "Bible References", icon: BookOpen },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as DetailTab)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2.5 rounded-t-lg text-xs font-bold transition-all border-b-2 whitespace-nowrap",
                  activeTab === tab.id
                    ? "text-brand-gold border-brand-gold bg-brand-gold/5"
                    : "text-muted-foreground border-transparent hover:text-white hover:bg-white/5"
                )}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Main Tab Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-8">
        {/* TAB 1: FULL LYRICS VIEW */}
        {activeTab === "lyrics" && (
          <div className="space-y-6 max-w-4xl">
            {/* Language Switcher Bar */}
            <div className="glass rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 border border-white/5">
              <div className="flex items-center gap-2">
                <Languages className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs font-semibold text-white">Display Language:</span>
              </div>
              <div className="flex items-center gap-1 bg-white/5 rounded-lg p-0.5">
                {(["telugu", "english", "hindi", "both"] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setLyricsLanguageMode(mode)}
                    className={cn(
                      "px-3 py-1 rounded-md text-xs font-medium capitalize transition-all",
                      lyricsLanguageMode === mode ? "bg-brand-gold text-brand-darker font-bold" : "text-muted-foreground hover:text-white"
                    )}
                  >
                    {mode === "both" ? "Bilingual" : mode}
                  </button>
                ))}
              </div>
            </div>

            {/* Song Sections & Lines */}
            <div className="space-y-8">
              {song.sections && song.sections.length > 0 ? (
                song.sections.map((section) => (
                  <div key={section.id} className="glass rounded-2xl p-6 border border-white/5 space-y-4">
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1 rounded-full bg-brand-gold/15 text-brand-gold text-xs font-bold uppercase tracking-wider">
                        {section.label}
                      </span>
                    </div>

                    <div className="space-y-3 font-sans">
                      {section.lines.map((line) => (
                        <div key={line.id} className="space-y-1">
                          {(lyricsLanguageMode === "telugu" || lyricsLanguageMode === "both") && (
                            <p className="text-xl sm:text-2xl text-white font-medium telugu-text leading-relaxed">
                              {line.primaryText}
                            </p>
                          )}
                          {(lyricsLanguageMode === "english" || lyricsLanguageMode === "both") && line.secondaryText && (
                            <p className="text-base text-brand-gold/90 italic font-sans">
                              {line.secondaryText}
                            </p>
                          )}
                          {lyricsLanguageMode === "english" && !line.secondaryText && (
                            <p className="text-xl sm:text-2xl text-white font-medium">
                              {line.primaryText}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                /* Fallback if unstructured text */
                <div className="glass rounded-2xl p-8 whitespace-pre-line text-lg leading-relaxed text-white/90">
                  {song.lyrics || "No lyrics provided."}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: LINE-BY-LINE SLIDE PREVIEW */}
        {activeTab === "line-by-line" && (
          <div className="space-y-6 max-w-4xl mx-auto">
            {/* Slide Toolbar */}
            <div className="glass rounded-xl p-4 flex flex-wrap items-center justify-between gap-4 border border-white/5">
              <div className="flex items-center gap-3">
                <span className="text-xs font-mono font-bold text-brand-gold">
                  Slide {currentSlideIndex + 1} of {slides.length}
                </span>
                <div className="w-32 bg-white/10 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-brand-gold h-full transition-all"
                    style={{ width: `${((currentSlideIndex + 1) / Math.max(1, slides.length)) * 100}%` }}
                  />
                </div>
              </div>

              {/* Font Size Adjuster */}
              <div className="flex items-center gap-2">
                <Type className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Size:</span>
                <input
                  type="range"
                  min={24}
                  max={60}
                  value={slideFontSize}
                  onChange={(e) => setSlideFontSize(parseInt(e.target.value))}
                  className="w-24 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-brand-gold"
                />
                <span className="text-xs font-mono text-white">{slideFontSize}px</span>
              </div>
            </div>

            {/* Simulated Live Slide Display */}
            {slides.length > 0 ? (
              <div className="aspect-[16/9] w-full rounded-2xl bg-black border border-white/15 p-8 sm:p-12 flex flex-col justify-between items-center text-center shadow-2xl relative select-none">
                <div className="w-full flex justify-between items-center text-xs font-mono text-muted-foreground">
                  <span className="text-brand-gold font-bold">{song.title}</span>
                  <span>{currentSlideIndex + 1} / {slides.length}</span>
                </div>

                <div className="my-auto space-y-4 max-w-3xl">
                  <p
                    className="font-bold text-white text-balance leading-relaxed"
                    style={{ fontSize: `${slideFontSize}px` }}
                  >
                    {slides[currentSlideIndex]?.primaryText}
                  </p>
                  {slides[currentSlideIndex]?.secondaryText && (
                    <p
                      className="text-brand-gold italic text-balance"
                      style={{ fontSize: `${Math.max(18, slideFontSize * 0.65)}px` }}
                    >
                      {slides[currentSlideIndex]?.secondaryText}
                    </p>
                  )}
                </div>

                <div className="text-[11px] text-muted-foreground">
                  Press <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-white font-mono">Space</kbd> or <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-white font-mono">→</kbd> to step next
                </div>
              </div>
            ) : (
              <div className="glass rounded-xl p-12 text-center text-muted-foreground">
                No slides generated. Please edit song lyrics to create sections.
              </div>
            )}

            {/* Stepper Navigation */}
            <div className="flex items-center justify-between gap-4">
              <button
                onClick={() => setCurrentSlideIndex((prev) => Math.max(0, prev - 1))}
                disabled={currentSlideIndex === 0}
                className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 disabled:opacity-30 text-white font-semibold text-xs flex items-center justify-center gap-2 border border-white/10 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" /> Previous Slide
              </button>
              <button
                onClick={() => setCurrentSlideIndex((prev) => Math.min(slides.length - 1, prev + 1))}
                disabled={currentSlideIndex >= slides.length - 1}
                className="flex-1 py-3 rounded-xl bg-brand-gold text-brand-darker hover:bg-brand-goldLight disabled:opacity-30 font-bold text-xs flex items-center justify-center gap-2 transition-all shadow"
              >
                Next Slide <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Thumbnail Slide Strip */}
            <div className="flex gap-2 overflow-x-auto pb-3 pt-2">
              {slides.map((s, idx) => (
                <div
                  key={s.id}
                  onClick={() => setCurrentSlideIndex(idx)}
                  className={cn(
                    "min-w-[120px] aspect-[16/9] rounded-lg p-2 bg-black border text-[9px] flex flex-col justify-between cursor-pointer transition-all shrink-0",
                    currentSlideIndex === idx
                      ? "border-brand-gold ring-2 ring-brand-gold/40 scale-105"
                      : "border-white/10 hover:border-white/30 opacity-70 hover:opacity-100"
                  )}
                >
                  <span className="font-mono text-muted-foreground">{idx + 1}</span>
                  <p className="line-clamp-2 text-white font-medium">{s.primaryText}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: CHORDS VIEW */}
        {activeTab === "chords" && (
          <div className="max-w-4xl space-y-6">
            <ChordSheet rawChords={song.chords || ""} originalKey={song.key} />
          </div>
        )}

        {/* TAB 4: AUDIO VIEW */}
        {activeTab === "audio" && (
          <div className="max-w-2xl mx-auto space-y-6">
            <AudioPlayer audioUrl={song.audioUrl} songTitle={song.title} artist={song.artist} />
          </div>
        )}

        {/* TAB 5: BIBLE REFERENCES VIEW */}
        {activeTab === "bible" && (
          <div className="max-w-4xl space-y-6">
            <div className="glass rounded-2xl p-6 border border-white/5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-brand-gold" />
                  <h3 className="text-lg font-bold text-white">Scripture References</h3>
                </div>
                <Link
                  href="/bible"
                  className="text-xs text-brand-gold hover:underline"
                >
                  Open Scripture Database →
                </Link>
              </div>

              {song.bibleReferences && song.bibleReferences.length > 0 ? (
                <div className="space-y-4">
                  {song.bibleReferences.map((ref, idx) => (
                    <div key={idx} className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-brand-gold text-sm">
                          {ref.book} {ref.chapter}:{ref.verseStart}{ref.verseEnd ? `-${ref.verseEnd}` : ""}
                        </span>
                        <button
                          onClick={() => {
                            const bPres = {
                              id: crypto.randomUUID(),
                              book: ref.book,
                              chapter: ref.chapter,
                              verseStart: ref.verseStart,
                              verseEnd: ref.verseEnd || ref.verseStart,
                              translation: "ESV",
                              text: ref.text || `${ref.book} ${ref.chapter}:${ref.verseStart}`,
                              createdAt: new Date().toISOString(),
                            };
                            localStorage.setItem("church-lyrics-current-bible", JSON.stringify(bPres));
                            router.push("/presentation");
                          }}
                          className="px-3 py-1 rounded-lg bg-brand-gold/15 text-brand-gold text-xs font-semibold hover:bg-brand-gold hover:text-brand-darker transition-colors"
                        >
                          Present Verse
                        </button>
                      </div>
                      {ref.text && <p className="text-sm text-white/90 italic">{ref.text}</p>}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10 text-muted-foreground">
                  <BookOpen className="w-10 h-10 mx-auto mb-2 opacity-30 text-brand-gold" />
                  <p className="text-sm text-white font-medium">No Bible references attached yet</p>
                  <p className="text-xs">You can link scriptures to this song in the Song Editor.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Search,
  Star,
  Music2,
  Play,
  Copy,
  Trash2,
  MoreVertical,
  Heart,
  Clock,
  X,
  Loader2,
  Tag,
  SlidersHorizontal,
  Sparkles,
  ArrowRight,
  UploadCloud,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/app/providers";
import { db } from "@/services/database";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/toast";
import type { Song, Language } from "@/types";
import { Calendar } from "lucide-react";

const LANGUAGES = [
  { code: "all", label: "All", script: "" },
  { code: "telugu", label: "తెలుగు", script: "telugu" },
  { code: "english", label: "English", script: "english" },
  { code: "hindi", label: "हिन्दी", script: "hindi" },
];

export default function SongsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const toast = useToast();
  const [songs, setSongs] = useState<Song[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [languageFilter, setLanguageFilter] = useState<Language | "all">("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"title" | "updated_at" | "created_at">("updated_at");
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showRecentlyUsed, setShowRecentlyUsed] = useState(false);

  useEffect(() => {
    if (!user) return;
    loadSongs();
  }, [user]);

  const loadSongs = async () => {
    if (!user) return;
    try {
      const data = await db.getSongs(user.id);
      setSongs(data as Song[]);
    } catch (e) {
      console.error("Failed to load songs", e);
      setError("Failed to load songs");
    } finally {
      setIsLoading(false);
    }
  };

  const filteredSongs = useMemo(() => {
    let result = songs;
    if (showRecentlyUsed) {
      result = result.filter((s) => s.updatedAt && new Date(s.updatedAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));
    }
    return result
      .filter((song) => {
        const matchesSearch =
          searchQuery === "" ||
          song.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (song.romanizedTitle && song.romanizedTitle.toLowerCase().includes(searchQuery.toLowerCase())) ||
          (song.lyrics && song.lyrics.toLowerCase().includes(searchQuery.toLowerCase())) ||
          (song.tags && song.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase())));
        const matchesLanguage = languageFilter === "all" || song.language === languageFilter;
        const matchesCategory = categoryFilter === "all" || song.category === categoryFilter;
        const matchesFavorites = !showFavoritesOnly || song.favorite;
        return matchesSearch && matchesLanguage && matchesCategory && matchesFavorites;
      })
      .sort((a, b) => {
        if (sortBy === "title") return a.title.localeCompare(b.title);
        if (sortBy === "updated_at")
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }, [songs, searchQuery, languageFilter, categoryFilter, sortBy, showFavoritesOnly, showRecentlyUsed]);

  const categories = useMemo(() => {
    const cats = new Set<string>();
    songs.forEach((s) => { if (s.category) cats.add(s.category); });
    return Array.from(cats).sort();
  }, [songs]);

  const deleteSong = async (id: string) => {
    if (!user) return;
    try {
      const { data: serviceItems, error: countError } = await supabase
        .from("service_items")
        .select("id", { count: "exact", head: true })
        .eq("song_id", id);

      if (countError) throw countError;

      const usageCount = serviceItems?.length || 0;
      if (usageCount > 0) {
        const confirmed = confirm(
          `This song is used in ${usageCount} service${usageCount === 1 ? "" : "s"}.\n\nDeleting it will remove it from those services.\n\nAre you sure you want to delete this song?`
        );
        if (!confirmed) return;
      } else if (!confirm("Are you sure you want to delete this song?")) {
        return;
      }

      await db.deleteSong(id, user.id);
      setSongs((prev) => prev.filter((s) => s.id !== id));
      setMenuOpenId(null);
      toast.addToast("success", "Song deleted");
    } catch (e) {
      console.error("Failed to delete song", e);
      toast.addToast("error", "Failed to delete song");
    }
  };

  const toggleFavorite = async (id: string) => {
    if (!user) return;
    const song = songs.find((s) => s.id === id);
    if (!song) return;
    try {
      const updated = await db.updateSong(id, { favorite: !song.favorite }, user.id);
      setSongs((prev) =>
        prev.map((s) => (s.id === id ? { ...s, favorite: !s.favorite, updatedAt: updated.updatedAt || s.updatedAt } : s))
      );
      toast.addToast("success", updated.favorite ? "Added to favorites" : "Removed from favorites");
    } catch (e) {
      console.error("Failed to toggle favorite", e);
      toast.addToast("error", "Failed to update favorite");
    }
  };

  const duplicateSong = async (song: Song) => {
    if (!user) return;
    try {
      const { data: newSong } = await supabase
        .from("songs")
        .insert([{
          title: `${song.title} (Copy)`,
          romanized_title: song.romanizedTitle,
          english_title: song.englishTitle,
          slug: `${song.slug}-copy`,
          language: song.language,
          secondary_language: song.secondaryLanguage,
          category: song.category,
          author: song.author,
          composer: song.composer,
          lyricist: song.lyricist,
          translator: song.translator,
          source: song.source,
          copyright: song.copyright,
          copyright_year: song.copyrightYear,
          lyrics: song.lyrics,
          tags: song.tags,
          audio_url: song.audioUrl,
          thumbnail_url: song.thumbnailUrl,
          favorite: false,
          created_by: user.id,
        }])
        .select()
        .single();

      if (newSong) {
        const originalSections = await db.getSongSections(song.id);
        const sectionIdMap: Record<string, string> = {};

        if (originalSections.length > 0) {
          const createdSections = await db.createSongSections(
            originalSections.map((s) => ({
              song_id: newSong.id,
              type: s.type,
              label: s.label,
              order: s.order,
              repeat_count: s.repeat_count,
            }))
          );

          for (let i = 0; i < originalSections.length; i++) {
            sectionIdMap[originalSections[i].id] = createdSections[i].id;
          }

          const allLines: Record<string, unknown>[] = [];
          const sectionIds = originalSections.map((s) => s.id);
          const originalLinesMap = new Map<string, any[]>();
          
          for (const section of originalSections) {
            const lines = await db.getSongLines(section.id);
            originalLinesMap.set(section.id, lines);
          }

          for (const section of originalSections) {
            const newSectionId = sectionIdMap[section.id];
            const lines = originalLinesMap.get(section.id) || [];
            allLines.push(...lines.map((line) => ({
              section_id: newSectionId,
              order: line.order,
              primary_text: line.primary_text,
              secondary_text: line.secondary_text || "",
              language: line.language,
              display_mode: line.display_mode,
            })));
          }

          if (allLines.length > 0) {
            await db.createSongLines(allLines);
          }
        }

        const originalSlides = await db.getSongSlides(song.id);
        if (originalSlides.length > 0) {
          await db.createSongSlides(
            originalSlides
              .map((slide) => {
                const newSectionId = sectionIdMap[slide.section_id];
                if (!newSectionId) return null;
                return {
                  song_id: newSong.id,
                  section_id: newSectionId,
                  section_order: slide.section_order,
                  slide_number: slide.slide_number,
                  order: slide.order,
                  primary_text: slide.primary_text,
                  secondary_text: slide.secondary_text || "",
                  line_ids: slide.line_ids,
                  display_mode: slide.display_mode,
                };
              })
              .filter(Boolean) as Record<string, unknown>[]
          );
        }

        setSongs((prev) => [newSong as Song, ...prev]);
        toast.addToast("success", "Song duplicated");
      }
      setMenuOpenId(null);
    } catch (e) {
      console.error("Failed to duplicate song", e);
      toast.addToast("error", "Failed to duplicate song");
    }
  };

  const presentSong = (song: Song) => {
    localStorage.setItem("church-lyrics-current-song", JSON.stringify(song));
    router.push("/presentation");
  };

  return (
    <div className="min-h-screen">
      {/* Hero Header */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-brand-gold/5 to-transparent" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 pt-8 pb-6">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 mb-6">
            <div>
              <h1 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-white mb-2">
                Song Library
              </h1>
              <p className="text-sm text-muted-foreground">
                {songs.length} songs in your worship collection
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/admin/import"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm font-semibold hover:bg-white/10 transition-colors"
              >
                <UploadCloud className="w-4 h-4 text-brand-gold" />
                Bulk Import
              </Link>
              <Link
                href="/smart-import"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm font-semibold hover:bg-white/10 transition-colors"
              >
                <Sparkles className="w-4 h-4 text-brand-gold" />
                Import Lyrics
              </Link>
              <Link
                href="/songs/new"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-gold text-brand-darker text-sm font-bold hover:bg-brand-goldLight shadow-lg shadow-brand-gold/20 transition-colors"
              >
                <Music2 className="w-4 h-4" />
                New Song
              </Link>
            </div>
          </div>

          {/* Search & Filters */}
          <div className="flex flex-col lg:flex-row lg:items-center gap-3">
            <div className="relative flex-1 max-w-2xl">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search songs, lyrics, artists..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand-gold/50 focus:border-transparent"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                >
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center bg-white/5 rounded-xl p-1 border border-white/10">
                {LANGUAGES.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => setLanguageFilter(lang.code as Language | "all")}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                      languageFilter === lang.code
                        ? "bg-brand-gold text-brand-darker shadow"
                        : "text-muted-foreground hover:text-white"
                    )}
                  >
                    {lang.label}
                  </button>
                ))}
              </div>

              {categories.length > 0 && (
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:ring-1 focus:ring-brand-gold/50"
                >
                  <option value="all">All Categories</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              )}

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                className="px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:ring-1 focus:ring-brand-gold/50"
              >
                <option value="updated_at">Recently Updated</option>
                <option value="title">Title A-Z</option>
                <option value="created_at">Date Created</option>
              </select>

              <button
                onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
                className={cn(
                  "p-2.5 rounded-xl transition-colors",
                  showFavoritesOnly
                    ? "bg-brand-gold/10 text-brand-gold border border-brand-gold/20"
                    : "bg-white/5 border border-white/10 text-muted-foreground hover:text-white"
                )}
              >
                <Star className="w-4 h-4" />
              </button>
              <button
                onClick={() => setShowRecentlyUsed(!showRecentlyUsed)}
                className={cn(
                  "p-2.5 rounded-xl transition-colors",
                  showRecentlyUsed
                    ? "bg-brand-gold/10 text-brand-gold border border-brand-gold/20"
                    : "bg-white/5 border border-white/10 text-muted-foreground hover:text-white"
                )}
              >
                <Clock className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Songs List */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-400">
            {error}
          </div>
        )}

        {isLoading ? (
          <div className="text-center py-20 text-muted-foreground">
            <Loader2 className="w-8 h-8 animate-spin text-brand-gold mx-auto mb-4" />
            <p>Loading your song library...</p>
          </div>
        ) : filteredSongs.length === 0 ? (
          <div className="glass rounded-2xl p-16 text-center">
            <Music2 className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-40" />
            <h3 className="text-lg font-semibold text-white mb-2">
              {songs.length === 0 ? "No songs yet" : "No songs match your filters"}
            </h3>
            <p className="text-sm text-muted-foreground mb-6">
              {songs.length === 0
                ? "Import your first worship song to get started."
                : "Try adjusting your search or filters."}
            </p>
            {songs.length === 0 && (
              <Link
                href="/smart-import"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-gold text-brand-darker font-bold rounded-xl hover:bg-brand-goldLight transition-colors"
              >
                <Sparkles className="w-4 h-4" />
                Import Lyrics
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredSongs.map((song) => (
              <div
                key={song.id}
                className="group glass rounded-2xl p-5 hover:bg-white/[0.07] transition-all duration-300 relative"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1 min-w-0">
                    <Link href={`/songs/${song.id}`} className="block">
                      <h3 className="font-semibold text-white group-hover:text-brand-gold transition-colors truncate">
                        {song.title}
                      </h3>
                    </Link>
                    {song.romanizedTitle && (
                      <p className="text-sm text-muted-foreground mt-1 truncate">{song.romanizedTitle}</p>
                    )}
                  </div>
                  <div className="relative ml-3">
                    <button
                      onClick={() =>
                        setMenuOpenId(menuOpenId === song.id ? null : song.id)
                      }
                      className="p-1.5 rounded-lg hover:bg-white/10 text-muted-foreground hover:text-white transition-colors"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                    {menuOpenId === song.id && (
                      <>
                        <div className="fixed inset-0 z-30" onClick={() => setMenuOpenId(null)} />
                        <div className="absolute right-0 top-8 z-40 w-48 bg-brand-surface border border-white/10 rounded-xl shadow-2xl py-1.5">
                          <button
                            onClick={() => {
                              router.push(`/songs/${song.id}`);
                              setMenuOpenId(null);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-white hover:bg-white/5 text-left"
                          >
                            <Play className="w-3.5 h-3.5 text-brand-gold" />
                            Open
                          </button>
                          <button
                            onClick={() => {
                              presentSong(song);
                              setMenuOpenId(null);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-white hover:bg-white/5 text-left"
                          >
                            <Play className="w-3.5 h-3.5 text-green-400" />
                            Present
                          </button>
                          <button
                            onClick={() => {
                              router.push(`/editor?id=${song.id}`);
                              setMenuOpenId(null);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-white hover:bg-white/5 text-left"
                          >
                            <Music2 className="w-3.5 h-3.5 text-blue-400" />
                            Edit
                          </button>
                          <button
                            onClick={() => {
                              router.push(`/services/new?songId=${song.id}`);
                              setMenuOpenId(null);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-white hover:bg-white/5 text-left"
                          >
                            <Calendar className="w-3.5 h-3.5 text-purple-400" />
                            Add to Service
                          </button>
                          <div className="my-1 border-t border-white/5" />
                          <button
                            onClick={() => {
                              setMenuOpenId(null);
                              toggleFavorite(song.id);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-white hover:bg-white/5 text-left"
                          >
                            <Heart className="w-3.5 h-3.5 text-brand-gold" />
                            {song.favorite ? "Unfavorite" : "Favorite"}
                          </button>
                          <button
                            onClick={() => {
                              setMenuOpenId(null);
                              duplicateSong(song);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-white hover:bg-white/5 text-left"
                          >
                            <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                            Duplicate
                          </button>
                          <div className="my-1 border-t border-white/5" />
                          <button
                            onClick={() => deleteSong(song.id)}
                            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-400 hover:bg-red-500/10 text-left"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Delete
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 mb-4">
                  <span className="px-2.5 py-1 rounded-full bg-white/5 text-[11px] text-muted-foreground capitalize font-medium">
                    {song.language}
                  </span>
                  {song.category && (
                    <span className="px-2.5 py-1 rounded-full bg-white/5 text-[11px] text-muted-foreground capitalize font-medium">
                      {song.category}
                    </span>
                  )}
                </div>

                {song.tags && song.tags.length > 0 && (
                  <div className="flex items-center gap-1 mb-3 flex-wrap">
                    <Tag className="w-3 h-3 text-muted-foreground" />
                    {song.tags.slice(0, 3).map((tag) => (
                      <span key={tag} className="px-1.5 py-0.5 bg-white/5 text-[10px] text-muted-foreground rounded">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-between pt-3 border-t border-white/5">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    {song.sections?.length || 0} sections
                  </div>
                  <div className="flex items-center gap-2">
                    {song.favorite && (
                      <Star className="w-4 h-4 text-brand-gold fill-brand-gold" />
                    )}
                    <button
                      onClick={() => presentSong(song)}
                      className="p-1.5 rounded-lg bg-brand-gold/10 text-brand-gold hover:bg-brand-gold/20 transition-colors"
                    >
                      <Play className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

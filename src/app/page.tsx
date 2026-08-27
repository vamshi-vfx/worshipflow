"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Search,
  Play,
  Heart,
  Clock,
  Sparkles,
  BookOpen,
  Music2,
  ChevronRight,
  Languages,
  Flame,
  Star,
  Calendar,
  FolderOpen,
  Plus,
  Quote,
  Radio,
  SlidersHorizontal,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/app/providers";
import { db } from "@/services/database";
import { LetterBrowser } from "@/components/letter-browser";
import { getVerseOfTheDay } from "@/lib/bible-data";
import type { Song, Service } from "@/types";

const LANGUAGES = [
  { code: "all", label: "All Languages", script: "" },
  { code: "telugu", label: "తెలుగు (Telugu)", script: "telugu" },
  { code: "english", label: "English", script: "english" },
  { code: "hindi", label: "हिन्दी (Hindi)", script: "hindi" },
];

const INITIAL_CATEGORIES = [
  { slug: "worship", name: "Worship", count: 0, icon: "🙏" },
  { slug: "praise", name: "Praise", count: 0, icon: "🙌" },
  { slug: "prayer", name: "Prayer", count: 0, icon: "🕊️" },
  { slug: "gospel", name: "Gospel", count: 0, icon: "📖" },
  { slug: "encouragement", name: "Encouragement", count: 0, icon: "✨" },
  { slug: "hope", name: "Hope", count: 0, icon: "⚓" },
  { slug: "comfort", name: "Comfort", count: 0, icon: "🌿" },
  { slug: "christmas", name: "Christmas", count: 0, icon: "⭐" },
  { slug: "good-friday", name: "Good Friday", count: 0, icon: "✝️" },
  { slug: "thanksgiving", name: "Thanksgiving", count: 0, icon: "🌾" },
  { slug: "repentance", name: "Repentance", count: 0, icon: "💧" },
  { slug: "commitment", name: "Commitment", count: 0, icon: "🔥" },
  { slug: "marriage", name: "Marriage", count: 0, icon: "💍" },
  { slug: "second-coming", name: "Second Coming", count: 0, icon: "👑" },
  { slug: "children", name: "Children", count: 0, icon: "🎈" },
  { slug: "youth", name: "Youth", count: 0, icon: "⚡" },
  { slug: "special", name: "Special Songs", count: 0, icon: "🎶" },
];

export default function HomePage() {
  const router = useRouter();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [languageFilter, setLanguageFilter] = useState("all");
  const [selectedLetter, setSelectedLetter] = useState<string | null>(null);
  const [songs, setSongs] = useState<Song[]>([]);
  const [upcomingService, setUpcomingService] = useState<Service | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const verseOfTheDay = useMemo(() => getVerseOfTheDay(), []);

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    try {
      const [songsData, servicesData] = await Promise.all([
        db.getSongs(user.id),
        db.getServices(user.id),
      ]);
      setSongs(songsData as Song[]);

      const today = new Date().toISOString().split("T")[0];
      const upcoming = servicesData
        .filter((s: any) => s.date >= today && s.status !== "archived")
        .sort((a, b) => a.date.localeCompare(b.date))[0] || null;
      setUpcomingService(upcoming as Service | null);
    } catch (e) {
      console.error("Failed to load home data", e);
    } finally {
      setIsLoading(false);
    }
  };

  // Multilingual, fuzzy, letter-filtered search
  const filteredSongs = useMemo(() => {
    return songs.filter((song) => {
      // 1. Language Filter
      if (languageFilter !== "all" && song.language !== languageFilter) {
        return false;
      }

      // 2. Letter Filter
      if (selectedLetter) {
        const letter = selectedLetter.toLowerCase();
        const startsWithTitle = song.title.toLowerCase().startsWith(letter);
        const startsWithRom = song.romanizedTitle ? song.romanizedTitle.toLowerCase().startsWith(letter) : false;
        const startsWithEng = song.englishTitle ? song.englishTitle.toLowerCase().startsWith(letter) : false;
        if (!startsWithTitle && !startsWithRom && !startsWithEng) {
          return false;
        }
      }

      // 3. Search Query (Telugu, English, Hindi, Romanized, Lyrics, Artist, Lyricist, Tags)
      if (searchQuery.trim() !== "") {
        const q = searchQuery.toLowerCase();
        const matchTitle = song.title.toLowerCase().includes(q);
        const matchRom = song.romanizedTitle ? song.romanizedTitle.toLowerCase().includes(q) : false;
        const matchEng = song.englishTitle ? song.englishTitle.toLowerCase().includes(q) : false;
        const matchLyrics = song.lyrics ? song.lyrics.toLowerCase().includes(q) : false;
        const matchArtist = song.artist ? song.artist.toLowerCase().includes(q) : false;
        const matchLyricist = song.lyricist ? song.lyricist.toLowerCase().includes(q) : false;
        const matchTags = song.tags ? song.tags.some((t) => t.toLowerCase().includes(q)) : false;

        if (!matchTitle && !matchRom && !matchEng && !matchLyrics && !matchArtist && !matchLyricist && !matchTags) {
          return false;
        }
      }

      return true;
    });
  }, [songs, searchQuery, languageFilter, selectedLetter]);

  const favorites = useMemo(() => songs.filter((s) => s.favorite).slice(0, 6), [songs]);
  const recentlyAdded = useMemo(() => [...songs].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 6), [songs]);
  const popularSongs = useMemo(() => [...songs].sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0)).slice(0, 6), [songs]);
  const songOfTheDay = useMemo(() => (songs.length > 0 ? songs[0] : null), [songs]);

  // Dynamic Category Song Counts
  const categoriesWithCounts = useMemo(() => {
    return INITIAL_CATEGORIES.map((cat) => {
      const count = songs.filter((s) => s.category?.toLowerCase() === cat.slug.toLowerCase()).length;
      return { ...cat, count };
    });
  }, [songs]);

  const handlePresentSong = (song: Song) => {
    localStorage.setItem("church-lyrics-current-song", JSON.stringify(song));
    router.push("/presentation");
  };

  const handlePresentVerse = () => {
    const biblePres = {
      id: crypto.randomUUID(),
      book: verseOfTheDay.book,
      chapter: verseOfTheDay.chapter,
      verseStart: parseInt(verseOfTheDay.verse.split("-")[0]) || 1,
      verseEnd: parseInt(verseOfTheDay.verse.split("-")[1] || verseOfTheDay.verse) || 1,
      translation: "Telugu / English",
      text: `${verseOfTheDay.teluguText}\n\n${verseOfTheDay.englishText}`,
      createdAt: new Date().toISOString(),
    };
    localStorage.setItem("church-lyrics-current-bible", JSON.stringify(biblePres));
    router.push("/presentation");
  };

  return (
    <div className="min-h-screen pb-20">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-8 pb-12 border-b border-white/5 bg-gradient-to-b from-brand-gold/10 via-brand-darker to-brand-darker">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-3xl mx-auto mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-gold/10 border border-brand-gold/30 text-brand-gold text-xs font-semibold uppercase tracking-wider mb-4 animate-fade-in">
              <Sparkles className="w-3.5 h-3.5" />
              Smart Church Lyrics & Worship Presentation Platform
            </div>

            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white mb-4">
              Worship with <span className="text-brand-gold underline decoration-brand-gold/30 underline-offset-8">Precision</span>
            </h1>
            <p className="text-base sm:text-lg text-muted-foreground">
              Search Christian lyrics across Telugu, Romanized Telugu, English, and Hindi. Present seamlessly to dual displays and HDMI screens.
            </p>
          </div>

          {/* Unified Global Search Bar */}
          <div className="max-w-3xl mx-auto relative mb-6">
            <div className="relative flex items-center">
              <Search className="absolute left-4 w-5 h-5 text-brand-gold" />
              <input
                type="text"
                placeholder="Search songs, lyrics, artists, lyricist, chords..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-28 py-4 bg-white/5 border border-white/15 rounded-2xl text-base text-white placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand-gold/50 focus:border-brand-gold/50 backdrop-blur-xl shadow-2xl transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-20 text-xs text-muted-foreground hover:text-white px-2 py-1"
                >
                  Clear
                </button>
              )}
              <div className="absolute right-3.5 flex items-center gap-1.5">
                <span className="hidden sm:inline-block px-2 py-1 rounded-md bg-white/10 text-[11px] font-mono text-muted-foreground">
                  {filteredSongs.length} found
                </span>
              </div>
            </div>
          </div>

          {/* Language Selector Pills */}
          <div className="flex flex-wrap items-center justify-center gap-2 mb-6">
            <Languages className="w-4 h-4 text-muted-foreground mr-1" />
            {LANGUAGES.map((lang) => (
              <button
                key={lang.code}
                onClick={() => setLanguageFilter(lang.code)}
                className={cn(
                  "px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-200",
                  languageFilter === lang.code
                    ? "bg-brand-gold text-brand-darker shadow-lg scale-105"
                    : "bg-white/5 text-muted-foreground hover:text-white hover:bg-white/10 border border-white/5"
                )}
              >
                {lang.label}
              </button>
            ))}
          </div>

          {/* Browse by Letter Bar */}
          <div className="max-w-4xl mx-auto">
            <LetterBrowser
              selectedLetter={selectedLetter}
              onSelectLetter={setSelectedLetter}
              language={languageFilter as any}
            />
          </div>
        </div>
      </section>

      {/* Main Content Hub */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-10 space-y-12">
        {/* Quick Launch Buttons */}
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <Link
            href="/smart-import"
            className="glass rounded-xl p-4 sm:p-5 border border-white/5 hover:border-brand-gold/40 hover:bg-white/[0.07] transition-all group shadow-md"
          >
            <div className="w-9 h-9 rounded-lg bg-brand-gold/15 text-brand-gold flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <Sparkles className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-white group-hover:text-brand-gold transition-colors">Smart Import</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Paste & auto-format slides</p>
          </Link>

          <Link
            href="/presentation"
            className="glass rounded-xl p-4 sm:p-5 border border-white/5 hover:border-brand-gold/40 hover:bg-white/[0.07] transition-all group shadow-md"
          >
            <div className="w-9 h-9 rounded-lg bg-purple-500/15 text-purple-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <Play className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-white group-hover:text-brand-gold transition-colors">Live Present</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Dual-screen HDMI engine</p>
          </Link>

          <Link
            href="/services/new"
            className="glass rounded-xl p-4 sm:p-5 border border-white/5 hover:border-brand-gold/40 hover:bg-white/[0.07] transition-all group shadow-md"
          >
            <div className="w-9 h-9 rounded-lg bg-blue-500/15 text-blue-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <Calendar className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-white group-hover:text-brand-gold transition-colors">Service Planner</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Build worship setlists</p>
          </Link>

          <Link
            href="/admin/import"
            className="glass rounded-xl p-4 sm:p-5 border border-white/5 hover:border-brand-gold/40 hover:bg-white/[0.07] transition-all group shadow-md"
          >
            <div className="w-9 h-9 rounded-lg bg-green-500/15 text-green-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <FolderOpen className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-white group-hover:text-brand-gold transition-colors">Bulk Content Import</h3>
            <p className="text-xs text-muted-foreground mt-0.5">CSV, JSON, text ingestion</p>
          </Link>
        </section>

        {/* Featured Row: Song of the Day & Verse of the Day */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Song of the Day */}
          {songOfTheDay && (
            <div className="glass rounded-2xl p-6 border border-brand-gold/20 relative overflow-hidden flex flex-col justify-between shadow-xl">
              <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-brand-gold/5 rounded-full blur-2xl pointer-events-none" />

              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-gold/15 text-brand-gold text-xs font-bold uppercase tracking-wider">
                    <Sparkles className="w-3.5 h-3.5" />
                    Song of the Day
                  </span>
                  <span className="text-xs text-muted-foreground capitalize">{songOfTheDay.language}</span>
                </div>

                <h3 className="text-xl sm:text-2xl font-bold text-white mb-1 hover:text-brand-gold transition-colors">
                  <Link href={`/songs/${songOfTheDay.id}`}>{songOfTheDay.title}</Link>
                </h3>
                {songOfTheDay.romanizedTitle && (
                  <p className="text-sm text-brand-gold/80 italic mb-3">{songOfTheDay.romanizedTitle}</p>
                )}

                {songOfTheDay.artist && (
                  <p className="text-xs text-muted-foreground mb-4">By {songOfTheDay.artist}</p>
                )}
              </div>

              <div className="flex items-center gap-3 pt-4 border-t border-white/5">
                <button
                  onClick={() => handlePresentSong(songOfTheDay)}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-brand-gold text-brand-darker text-xs font-bold hover:bg-brand-goldLight transition-all"
                >
                  <Play className="w-4 h-4 fill-brand-darker" />
                  Present Song
                </button>
                <Link
                  href={`/songs/${songOfTheDay.id}`}
                  className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-semibold border border-white/10 transition-colors"
                >
                  View Details
                </Link>
              </div>
            </div>
          )}

          {/* Verse of the Day */}
          <div className="glass rounded-2xl p-6 border border-white/10 relative overflow-hidden flex flex-col justify-between shadow-xl">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/15 text-blue-400 text-xs font-bold uppercase tracking-wider">
                  <Quote className="w-3.5 h-3.5" />
                  Verse of the Day
                </span>
                <span className="text-xs font-mono font-bold text-brand-gold">{verseOfTheDay.reference}</span>
              </div>

              <p className="text-base text-white/95 leading-relaxed font-medium mb-3">
                {verseOfTheDay.teluguText}
              </p>
              <p className="text-xs text-muted-foreground italic mb-4">
                &ldquo;{verseOfTheDay.englishText}&rdquo;
              </p>
            </div>

            <div className="flex items-center gap-3 pt-4 border-t border-white/5">
              <button
                onClick={handlePresentVerse}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-colors border border-white/10"
              >
                <Play className="w-4 h-4" />
                Present Scripture
              </button>
              <Link
                href="/bible"
                className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-white text-xs font-semibold transition-colors"
              >
                Open Bible
              </Link>
            </div>
          </div>
        </section>

        {/* Filtered Search Results / Letter Filter Results */}
        {(searchQuery || selectedLetter) && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Search className="w-5 h-5 text-brand-gold" />
                Matching Songs ({filteredSongs.length})
              </h2>
              <button
                onClick={() => {
                  setSearchQuery("");
                  setSelectedLetter(null);
                }}
                className="text-xs text-brand-gold hover:underline"
              >
                Reset Filters
              </button>
            </div>

            {filteredSongs.length === 0 ? (
              <div className="glass rounded-xl p-12 text-center text-muted-foreground">
                <Music2 className="w-12 h-12 mx-auto mb-3 opacity-30 text-brand-gold" />
                <p className="text-white font-medium mb-1">No songs matched your query</p>
                <p className="text-xs mb-4">Try searching with a different keyword or language</p>
                <Link
                  href="/smart-import"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brand-gold text-brand-darker text-xs font-bold"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Import This Song
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredSongs.slice(0, 12).map((song) => (
                  <div
                    key={song.id}
                    className="glass rounded-xl p-5 hover:bg-white/[0.07] border border-white/5 hover:border-brand-gold/30 transition-all flex flex-col justify-between group"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <Link href={`/songs/${song.id}`} className="font-bold text-white group-hover:text-brand-gold transition-colors text-base truncate">
                          {song.title}
                        </Link>
                        {song.favorite && <Star className="w-4 h-4 text-brand-gold fill-brand-gold shrink-0" />}
                      </div>
                      {song.romanizedTitle && (
                        <p className="text-xs text-brand-gold/70 italic mb-2 truncate">{song.romanizedTitle}</p>
                      )}
                      {song.artist && (
                        <p className="text-xs text-muted-foreground mb-3 truncate">By {song.artist}</p>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-white/5">
                      <span className="px-2 py-0.5 rounded bg-white/5 text-[11px] text-muted-foreground uppercase">
                        {song.language}
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handlePresentSong(song)}
                          className="p-1.5 rounded-lg bg-brand-gold/10 text-brand-gold hover:bg-brand-gold hover:text-brand-darker transition-colors"
                          title="Present Now"
                        >
                          <Play className="w-3.5 h-3.5" />
                        </button>
                        <Link
                          href={`/songs/${song.id}`}
                          className="text-xs font-semibold text-white/80 hover:text-white"
                        >
                          View →
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Categories Explorer Grid */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <FolderOpen className="w-5 h-5 text-brand-gold" />
                Worship Categories
              </h2>
              <p className="text-xs text-muted-foreground">Browse songs organized by theme, event, and liturgy</p>
            </div>
            <Link href="/categories" className="text-xs font-semibold text-brand-gold hover:underline flex items-center gap-1">
              View All Categories <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {categoriesWithCounts.slice(0, 12).map((cat) => (
              <Link
                key={cat.slug}
                href={`/songs?category=${cat.slug}`}
                className="glass rounded-xl p-4 border border-white/5 hover:border-brand-gold/40 hover:bg-white/[0.08] transition-all group flex flex-col items-center text-center"
              >
                <span className="text-2xl mb-2 group-hover:scale-110 transition-transform">{cat.icon}</span>
                <p className="text-xs font-bold text-white group-hover:text-brand-gold transition-colors">{cat.name}</p>
                <span className="text-[11px] text-muted-foreground mt-1">{cat.count} songs</span>
              </Link>
            ))}
          </div>
        </section>

        {/* Popular & Favorites Row */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Popular Songs */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Flame className="w-4 h-4 text-orange-400" />
                Popular Songs
              </h2>
              <Link href="/songs" className="text-xs text-muted-foreground hover:text-white">
                View All
              </Link>
            </div>

            <div className="space-y-2.5">
              {popularSongs.map((song, i) => (
                <div
                  key={song.id}
                  className="glass rounded-xl p-3.5 border border-white/5 hover:bg-white/[0.06] transition-colors flex items-center justify-between gap-3 group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="font-mono text-xs font-bold text-muted-foreground w-4">{i + 1}</span>
                    <div className="min-w-0">
                      <Link href={`/songs/${song.id}`} className="text-xs font-bold text-white group-hover:text-brand-gold truncate block">
                        {song.title}
                      </Link>
                      {song.romanizedTitle && (
                        <p className="text-[11px] text-muted-foreground truncate">{song.romanizedTitle}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handlePresentSong(song)}
                      className="p-1.5 rounded-md bg-white/5 hover:bg-brand-gold hover:text-brand-darker text-muted-foreground transition-colors"
                      title="Present"
                    >
                      <Play className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Favorites */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Star className="w-4 h-4 text-brand-gold fill-brand-gold" />
                Quick Favorites
              </h2>
              <Link href="/favorites" className="text-xs text-brand-gold hover:underline">
                Manage Favorites
              </Link>
            </div>

            {favorites.length === 0 ? (
              <div className="glass rounded-xl p-8 text-center text-muted-foreground border border-white/5">
                <Star className="w-8 h-8 mx-auto mb-2 opacity-30 text-brand-gold" />
                <p className="text-xs font-medium text-white">No favorites marked yet</p>
                <p className="text-[11px]">Click the star on any song to access it quickly here.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {favorites.map((song) => (
                  <div
                    key={song.id}
                    className="glass rounded-xl p-3.5 border border-white/5 hover:bg-white/[0.06] transition-colors flex items-center justify-between gap-3 group"
                  >
                    <div className="min-w-0">
                      <Link href={`/songs/${song.id}`} className="text-xs font-bold text-white group-hover:text-brand-gold truncate block">
                        {song.title}
                      </Link>
                      {song.romanizedTitle && (
                        <p className="text-[11px] text-muted-foreground truncate">{song.romanizedTitle}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handlePresentSong(song)}
                        className="p-1.5 rounded-md bg-brand-gold/15 text-brand-gold hover:bg-brand-gold hover:text-brand-darker transition-colors"
                        title="Present"
                      >
                        <Play className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Upcoming Service Run Sheet Banner */}
        {upcomingService && (
          <section className="glass rounded-2xl p-6 border border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-green-500/15 text-green-400 flex items-center justify-center shrink-0">
                <Calendar className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-green-400">Next Service</span>
                <h3 className="text-lg font-bold text-white">{upcomingService.name}</h3>
                <p className="text-xs text-muted-foreground">
                  {new Date(upcomingService.date).toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })} • {upcomingService.items?.length || 0} scheduled items
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Link
                href={`/services/new?id=${upcomingService.id}`}
                className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-colors text-center"
              >
                Edit Service
              </Link>
              <Link
                href="/presentation"
                className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-brand-gold text-brand-darker text-xs font-bold hover:bg-brand-goldLight transition-colors text-center"
              >
                Launch Presentation
              </Link>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

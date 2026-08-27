"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Monitor,
  Square,
  Maximize,
  Minimize,
  X,
  Clock,
  Music2,
  SkipBack,
  SkipForward,
  Loader2,
  WifiOff,
  Wifi,
  RefreshCw,
  Play,
  Pause,
  Sliders,
  Type,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Sparkles,
  ExternalLink,
  BookOpen,
  Calendar,
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/app/providers";
import { db } from "@/services/database";
import { useDisplaySync } from "@/hooks/use-display-sync";
import { useToast } from "@/components/toast";
import type { Song, Service, Theme, DisplayMode, LyricLine } from "@/types";

const THEMES: Theme[] = [
  {
    id: "cinematic-dark",
    name: "Cinematic Dark",
    background: { type: "solid", value: "#050505" },
    font: { family: "Noto Sans Telugu, system-ui, sans-serif", size: 64, weight: 400 },
    alignment: "center",
    verticalAlign: "center",
    letterSpacing: 0,
    lineSpacing: 1.5,
    shadow: true,
    overlay: { enabled: true, color: "#000000", opacity: 0.3 },
    logo: { enabled: false, position: "bottom-right" },
    isDefault: true,
  },
  {
    id: "pure-black",
    name: "Pure Black",
    background: { type: "solid", value: "#000000" },
    font: { family: "Noto Sans Telugu, system-ui, sans-serif", size: 64, weight: 400 },
    alignment: "center",
    verticalAlign: "center",
    letterSpacing: 0,
    lineSpacing: 1.4,
    shadow: false,
    overlay: { enabled: false, color: "#000000", opacity: 0 },
    logo: { enabled: false, position: "bottom-right" },
    isDefault: true,
  },
  {
    id: "worship-glow",
    name: "Worship Glow",
    background: { type: "gradient", value: "radial-gradient(circle at center, #1a0a00 0%, #000000 100%)" },
    font: { family: "Noto Sans Telugu, system-ui, sans-serif", size: 64, weight: 400 },
    alignment: "center",
    verticalAlign: "center",
    letterSpacing: 0,
    lineSpacing: 1.5,
    shadow: true,
    overlay: { enabled: true, color: "#000000", opacity: 0.2 },
    logo: { enabled: false, position: "bottom-right" },
    isDefault: true,
  },
];

export default function PresentationPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black flex items-center justify-center text-white">Loading Presentation...</div>}>
      <PresentationConsole />
    </Suspense>
  );
}

function PresentationConsole() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const toast = useToast();

  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [currentBible, setCurrentBible] = useState<any | null>(null);
  const [currentService, setCurrentService] = useState<Service | null>(null);
  const [serviceItemIndex, setServiceItemIndex] = useState(0);

  const [allSlides, setAllSlides] = useState<{ id: string; primaryText: string; secondaryText?: string; label?: string }[]>([]);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [selectedTheme, setSelectedTheme] = useState<Theme>(THEMES[0]);
  const [languageMode, setLanguageMode] = useState<DisplayMode>("telugu");
  const [isBlackScreen, setIsBlackScreen] = useState(false);
  const [isBlankScreen, setIsBlankScreen] = useState(false);
  const [displayReady, setDisplayReady] = useState(false);

  // Timer state
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(true);

  // Search Switcher Modal
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [allSongs, setAllSongs] = useState<Song[]>([]);
  const [searchSongQuery, setSearchSongQuery] = useState("");

  const { sendMessage, subscribe } = useDisplaySync(false);

  // Listen for TV display window heartbeats
  useEffect(() => {
    let lastHeartbeat = Date.now();
    const unsubscribe = subscribe((msg) => {
      if (msg.type === "heartbeat") {
        lastHeartbeat = msg.timestamp;
        setDisplayReady(true);
      }
    });

    const interval = setInterval(() => {
      if (Date.now() - lastHeartbeat > 4000) {
        setDisplayReady(false);
      }
    }, 2000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, [subscribe]);

  // Load song / bible / service on mount
  useEffect(() => {
    loadActivePresentationData();
  }, []);

  const loadActivePresentationData = async () => {
    const rawSong = localStorage.getItem("church-lyrics-current-song");
    const rawBible = localStorage.getItem("church-lyrics-current-bible");
    const rawService = localStorage.getItem("church-lyrics-current-service");

    if (rawService) {
      try {
        const serv = JSON.parse(rawService);
        setCurrentService(serv);
      } catch (e) {
        console.error(e);
      }
    }

    if (rawSong) {
      try {
        const song: Song = JSON.parse(rawSong);
        setCurrentSong(song);

        if (song.sections && song.sections.length > 0) {
          buildSlidesFromSong(song);
        } else {
          const fullSong = await db.getSongWithSections(song.id, user?.id);
          if (fullSong) {
            setCurrentSong(fullSong);
            buildSlidesFromSong(fullSong);
          } else {
            buildSlidesFromSong(song);
          }
        }
      } catch (e) {
        console.error(e);
      }
    } else if (rawBible) {
      try {
        const bible = JSON.parse(rawBible);
        setCurrentBible(bible);
        const slides: { id: string; primaryText: string; secondaryText?: string; label?: string }[] = [];

        if (bible.verses && Array.isArray(bible.verses) && bible.verses.length > 0) {
          bible.verses.forEach((v: any) => {
            slides.push({
              id: `v-${v.verseNumber}`,
              primaryText: v.textTe || v.text,
              secondaryText: `${bible.bookTe || bible.book} ${bible.chapter}:${v.verseNumber} ${v.textEn ? `• ${v.textEn}` : ""}`,
              label: `${bible.bookTe || bible.book} ${bible.chapter}:${v.verseNumber}`,
            });
          });
        } else if (bible.text && bible.text.includes("---")) {
          const parts = bible.text.split(/\n\s*---\s*\n/).filter(Boolean);
          parts.forEach((p: string, idx: number) => {
            slides.push({
              id: `v-${idx + 1}`,
              primaryText: p,
              secondaryText: `${bible.book || "Scripture"} ${bible.chapter || ""}`,
              label: "Holy Scripture",
            });
          });
        } else {
          slides.push({
            id: bible.id || "bible-1",
            primaryText: bible.text,
            secondaryText: `${bible.book || bible.bookTe || ""} ${bible.chapter ? `${bible.chapter}:${bible.verseStart || 1}` : ""}`,
            label: "Holy Scripture",
          });
        }

        setAllSlides(slides);
        setCurrentSlideIndex(0);
      } catch (e) {
        console.error(e);
      }
    } else {
      const songs = await db.getSongs(user?.id);
      if (songs.length > 0) {
        const fullSong = await db.getSongWithSections(songs[0].id, user?.id);
        setCurrentSong(fullSong || songs[0]);
        buildSlidesFromSong(fullSong || songs[0]);
      }
    }

    const songList = await db.getSongs(user?.id);
    setAllSongs(songList as Song[]);
  };

  const buildSlidesFromSong = (song: Song) => {
    const slides: { id: string; primaryText: string; secondaryText?: string; label?: string }[] = [];

    if (song.sections && song.sections.length > 0) {
      song.sections.forEach((sec) => {
        sec.lines?.forEach((line) => {
          slides.push({
            id: line.id,
            primaryText: line.primaryText || (line as any).primary_text,
            secondaryText: line.secondaryText || (line as any).secondary_text,
            label: sec.label,
          });
        });
      });
    } else if (song.lyrics) {
      song.lyrics.split("\n").filter(Boolean).forEach((line, i) => {
        slides.push({
          id: `line-${i}`,
          primaryText: line,
          label: "Lyrics",
        });
      });
    }

    setAllSlides(slides);
    setCurrentSlideIndex(0);
  };

  // Broadcast current state to TV display
  const pushSlideUpdate = useCallback(
    (index: number) => {
      sendMessage({
        type: "slide-change",
        index,
        total: allSlides.length,
      });
    },
    [allSlides.length, sendMessage]
  );

  const handleSetSlideIndex = (index: number) => {
    const validIdx = Math.max(0, Math.min(allSlides.length - 1, index));
    setCurrentSlideIndex(validIdx);
    pushSlideUpdate(validIdx);
  };

  // Black screen toggle
  const toggleBlackScreen = () => {
    const next = !isBlackScreen;
    setIsBlackScreen(next);
    sendMessage({ type: "black-screen", enabled: next });
  };

  // Blank screen toggle
  const toggleBlankScreen = () => {
    const next = !isBlankScreen;
    setIsBlankScreen(next);
    sendMessage({ type: "blank-screen", enabled: next });
  };

  // Theme change
  const handleSelectTheme = (theme: Theme) => {
    setSelectedTheme(theme);
    sendMessage({ type: "theme-change", theme });
  };

  // Elapsed timer
  useEffect(() => {
    if (!isTimerRunning) return;
    const interval = setInterval(() => setElapsedSeconds((s) => s + 1), 1000);
    return () => clearInterval(interval);
  }, [isTimerRunning]);

  // Global Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === "ArrowRight" || e.key === " " || e.key === "PageDown") {
        e.preventDefault();
        handleSetSlideIndex(currentSlideIndex + 1);
      } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
        e.preventDefault();
        handleSetSlideIndex(currentSlideIndex - 1);
      } else if (e.key === "Home") {
        e.preventDefault();
        handleSetSlideIndex(0);
      } else if (e.key === "End") {
        e.preventDefault();
        handleSetSlideIndex(allSlides.length - 1);
      } else if (e.key === "b" || e.key === "B") {
        e.preventDefault();
        toggleBlackScreen();
      } else if (e.key === "f" || e.key === "F") {
        e.preventDefault();
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen().catch(() => {});
        } else {
          document.exitFullscreen().catch(() => {});
        }
      } else if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentSlideIndex, allSlides.length, isBlackScreen]);

  // Open secondary TV / Projector Display Window
  const handleOpenTVDisplay = () => {
    const popup = window.open(
      "/presentation/display",
      "WorshipFlow_TV_Display",
      "width=1280,height=720,menubar=no,toolbar=no,location=no,status=no"
    );
    if (!popup) {
      toast.addToast("error", "Pop-up blocked. Please allow popups for dual-display output.");
    } else {
      toast.addToast("success", "Presentation TV screen opened. Drag window to external projector.");
    }
  };

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const prevSlide = allSlides[currentSlideIndex - 1];
  const currentSlide = allSlides[currentSlideIndex];
  const nextSlide = allSlides[currentSlideIndex + 1];

  return (
    <div className="min-h-screen bg-[#060608] text-white flex flex-col justify-between select-none">
      {/* Top Operator Control Header */}
      <header className="h-14 px-4 bg-brand-surface border-b border-white/10 flex items-center justify-between z-20">
        <div className="flex items-center gap-4">
          <Link
            href="/songs"
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-white transition-colors"
            title="Exit Presentation"
          >
            <X className="w-4 h-4" />
          </Link>

          <div className="flex items-center gap-2">
            <span className="font-bold text-white text-sm truncate max-w-[200px] sm:max-w-xs">
              {currentSong?.title || currentBible?.book || "WorshipFlow Live"}
            </span>
            {currentSong?.key && (
              <span className="px-2 py-0.5 rounded bg-brand-gold/15 text-brand-gold text-[10px] font-mono font-bold">
                Key: {currentSong.key}
              </span>
            )}
          </div>

          {/* Quick Song Switcher Trigger */}
          <button
            onClick={() => setIsSearchOpen(true)}
            className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-muted-foreground hover:text-white border border-white/10 transition-colors"
          >
            <Search className="w-3.5 h-3.5 text-brand-gold" />
            Switch Song (Ctrl+K)
          </button>
        </div>

        {/* Center: Live Elapsed Timer & Clock */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/5 border border-white/10 font-mono text-xs text-white">
            <Clock className="w-3.5 h-3.5 text-brand-gold" />
            <span>{formatTimer(elapsedSeconds)}</span>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 text-xs text-muted-foreground">
            <span className="text-white font-mono font-bold">{currentSlideIndex + 1}</span>
            <span>/</span>
            <span className="font-mono">{allSlides.length}</span>
          </div>
        </div>

        {/* Right: Dual Display status & HDMI trigger */}
        <div className="flex items-center gap-2">
          {/* TV Display Sync Status Indicator */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-xs">
            <div className={cn("w-2 h-2 rounded-full animate-pulse", displayReady ? "bg-green-400" : "bg-yellow-400")} />
            <span className="text-[11px] text-muted-foreground hidden sm:inline">
              {displayReady ? "TV Connected" : "TV Waiting"}
            </span>
          </div>

          <button
            onClick={handleOpenTVDisplay}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-gold text-brand-darker text-xs font-bold hover:bg-brand-goldLight shadow transition-all"
            title="Open dedicated projector/TV presentation window"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Open TV Display</span>
          </button>

          {/* Blackout Button */}
          <button
            onClick={toggleBlackScreen}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors flex items-center gap-1.5",
              isBlackScreen
                ? "bg-red-500 text-white border-red-400 animate-pulse"
                : "bg-white/5 border-white/10 text-white hover:bg-white/10"
            )}
            title="Blackout TV Screen (B)"
          >
            <Square className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{isBlackScreen ? "BLACK ON" : "Black (B)"}</span>
          </button>
        </div>
      </header>

      {/* Main 3-Panel Operator Stage */}
      <div className="flex-1 p-4 lg:p-6 grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch max-w-[1600px] mx-auto w-full">
        {/* PANEL 1: PREVIOUS SLIDE (col-span-3) */}
        <div className="hidden lg:flex lg:col-span-3 flex-col justify-between glass rounded-2xl p-4 border border-white/5">
          <div className="flex items-center justify-between pb-2 border-b border-white/5 text-xs text-muted-foreground font-semibold uppercase">
            <span>Previous Slide</span>
            <span className="font-mono">{currentSlideIndex > 0 ? currentSlideIndex : "—"}</span>
          </div>

          <div className="my-auto text-center p-4">
            {prevSlide ? (
              <div className="space-y-2 opacity-60">
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 text-brand-gold">{prevSlide.label}</span>
                <p className="text-sm font-medium text-white line-clamp-3 leading-relaxed">{prevSlide.primaryText}</p>
                {prevSlide.secondaryText && <p className="text-xs text-brand-gold italic line-clamp-2">{prevSlide.secondaryText}</p>}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic">Beginning of presentation</p>
            )}
          </div>

          <button
            onClick={() => handleSetSlideIndex(currentSlideIndex - 1)}
            disabled={!prevSlide}
            className="w-full py-2 rounded-xl bg-white/5 hover:bg-white/10 disabled:opacity-20 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors border border-white/10"
          >
            <ChevronLeft className="w-3.5 h-3.5" /> Previous (←)
          </button>
        </div>

        {/* PANEL 2: CURRENT LIVE SLIDE (col-span-6) */}
        <div className="lg:col-span-6 flex flex-col justify-between rounded-2xl bg-black border-2 border-brand-gold/50 p-6 sm:p-8 shadow-2xl relative overflow-hidden">
          {/* Live Badge */}
          <div className="flex items-center justify-between pb-3 border-b border-white/10 text-xs">
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
              </span>
              <span className="font-bold text-red-400 tracking-wider uppercase text-[11px]">LIVE OUTPUT</span>
            </div>

            <div className="flex items-center gap-2">
              {currentSlide?.label && (
                <span className="px-2.5 py-0.5 rounded-full bg-brand-gold/15 text-brand-gold text-[10px] font-bold uppercase">
                  {currentSlide.label}
                </span>
              )}
              <span className="font-mono text-muted-foreground text-xs">
                Slide {currentSlideIndex + 1} of {allSlides.length}
              </span>
            </div>
          </div>

          {/* Current Live Text Preview */}
          <div className="my-auto text-center py-6 px-4">
            {isBlackScreen ? (
              <div className="text-red-400 font-bold text-lg animate-pulse py-8">
                [ TV DISPLAY IS BLACKED OUT ]
              </div>
            ) : currentSlide ? (
              <div className="space-y-4">
                <p className="text-2xl sm:text-3xl font-extrabold text-white leading-relaxed text-balance">
                  {currentSlide.primaryText}
                </p>
                {currentSlide.secondaryText && (
                  <p className="text-base sm:text-lg text-brand-gold italic text-balance font-medium">
                    {currentSlide.secondaryText}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">No slides loaded</p>
            )}
          </div>

          {/* Quick Operator Navigation Bar */}
          <div className="pt-4 border-t border-white/10 flex items-center justify-between gap-3">
            <button
              onClick={() => handleSetSlideIndex(currentSlideIndex - 1)}
              disabled={currentSlideIndex === 0}
              className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 disabled:opacity-30 text-white text-xs font-bold flex items-center gap-1.5 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" /> Prev
            </button>

            <div className="flex items-center gap-2">
              {THEMES.map((th) => (
                <button
                  key={th.id}
                  onClick={() => handleSelectTheme(th)}
                  className={cn(
                    "px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-colors",
                    selectedTheme.id === th.id
                      ? "bg-brand-gold/20 border-brand-gold text-brand-gold font-bold"
                      : "bg-white/5 border-white/5 text-muted-foreground hover:text-white"
                  )}
                >
                  {th.name}
                </button>
              ))}
            </div>

            <button
              onClick={() => handleSetSlideIndex(currentSlideIndex + 1)}
              disabled={currentSlideIndex >= allSlides.length - 1}
              className="px-5 py-2.5 rounded-xl bg-brand-gold text-brand-darker hover:bg-brand-goldLight disabled:opacity-30 text-xs font-extrabold flex items-center gap-1.5 transition-all shadow-lg"
            >
              Next <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* PANEL 3: NEXT SLIDE (col-span-3) */}
        <div className="hidden lg:flex lg:col-span-3 flex-col justify-between glass rounded-2xl p-4 border border-white/5">
          <div className="flex items-center justify-between pb-2 border-b border-white/5 text-xs text-muted-foreground font-semibold uppercase">
            <span>Next Slide</span>
            <span className="font-mono">{currentSlideIndex + 2 <= allSlides.length ? currentSlideIndex + 2 : "—"}</span>
          </div>

          <div className="my-auto text-center p-4">
            {nextSlide ? (
              <div className="space-y-2 opacity-80">
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 text-brand-gold">{nextSlide.label}</span>
                <p className="text-sm font-medium text-white line-clamp-3 leading-relaxed">{nextSlide.primaryText}</p>
                {nextSlide.secondaryText && <p className="text-xs text-brand-gold italic line-clamp-2">{nextSlide.secondaryText}</p>}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic">End of presentation</p>
            )}
          </div>

          <button
            onClick={() => handleSetSlideIndex(currentSlideIndex + 1)}
            disabled={!nextSlide}
            className="w-full py-2 rounded-xl bg-brand-gold/15 text-brand-gold hover:bg-brand-gold hover:text-brand-darker disabled:opacity-20 text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
          >
            Next Slide (Space / →) <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Bottom Thumbnail Slide Strip */}
      <footer className="h-28 bg-brand-surface border-t border-white/10 px-4 py-2 flex flex-col justify-between z-20">
        <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-1">
          <span className="font-semibold uppercase tracking-wider">Slide Navigator (Click to jump)</span>
          <span className="font-mono">Total {allSlides.length} slides</span>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 items-center">
          {allSlides.map((slide, idx) => (
            <div
              key={slide.id || idx}
              onClick={() => handleSetSlideIndex(idx)}
              className={cn(
                "min-w-[130px] h-16 rounded-xl p-2 bg-black border text-[10px] flex flex-col justify-between cursor-pointer transition-all shrink-0 select-none",
                currentSlideIndex === idx
                  ? "border-brand-gold ring-2 ring-brand-gold/40 scale-105 shadow-lg bg-white/5"
                  : "border-white/10 hover:border-white/30 opacity-70 hover:opacity-100"
              )}
            >
              <div className="flex justify-between items-center text-[9px] font-mono text-muted-foreground">
                <span className="text-brand-gold font-bold">{slide.label || `Slide ${idx + 1}`}</span>
                <span>{idx + 1}</span>
              </div>
              <p className="line-clamp-2 text-white font-medium leading-tight">{slide.primaryText}</p>
            </div>
          ))}
        </div>
      </footer>

      {/* Quick Song Switcher Modal (Ctrl+K) */}
      {isSearchOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setIsSearchOpen(false)} />
          <div className="relative z-10 w-full max-w-lg bg-brand-surface border border-white/10 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <Search className="w-4 h-4 text-brand-gold" />
                Quick Switch Song
              </h3>
              <button onClick={() => setIsSearchOpen(false)} className="text-muted-foreground hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <input
              type="text"
              placeholder="Type song title or romanized name..."
              value={searchSongQuery}
              onChange={(e) => setSearchSongQuery(e.target.value)}
              autoFocus
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:ring-1 focus:ring-brand-gold"
            />

            <div className="max-h-60 overflow-y-auto space-y-1.5">
              {allSongs
                .filter((s) => !searchSongQuery || s.title.toLowerCase().includes(searchSongQuery.toLowerCase()) || (s.romanizedTitle && s.romanizedTitle.toLowerCase().includes(searchSongQuery.toLowerCase())))
                .slice(0, 8)
                .map((song) => (
                  <div
                    key={song.id}
                    onClick={() => {
                      setCurrentSong(song);
                      buildSlidesFromSong(song);
                      localStorage.setItem("church-lyrics-current-song", JSON.stringify(song));
                      setIsSearchOpen(false);
                      toast.addToast("success", `Switched to "${song.title}"`);
                    }}
                    className="p-3 rounded-xl bg-white/5 hover:bg-brand-gold/15 hover:border-brand-gold/30 border border-transparent cursor-pointer flex items-center justify-between text-xs transition-colors"
                  >
                    <div>
                      <p className="font-bold text-white">{song.title}</p>
                      {song.romanizedTitle && <p className="text-muted-foreground italic text-[11px]">{song.romanizedTitle}</p>}
                    </div>
                    <span className="text-brand-gold font-semibold">Select →</span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

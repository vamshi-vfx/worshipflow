"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Wand2,
  Save,
  Play,
  Trash2,
  Copy,
  ChevronUp,
  ChevronDown,
  GripVertical,
  Undo2,
  Redo2,
  SplitSquareHorizontal,
  Merge,
  Plus,
  Loader2,
  Home,
  Music,
  Calendar,
  BookOpen,
  Megaphone,
  PlayIcon,
  Palette,
  Settings,
  HelpCircle,
  Sparkles,
  Languages,
  MonitorPlay,
  X,
  Search,
  Star,
  Heart,
  Tv,
  Monitor,
  Type,
  AlignCenter,
  AlignLeft,
  AlignRight,
  AlertTriangle,
  Keyboard,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/app/providers";
import { db } from "@/services/database";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/toast";
import type { Song, SongSection, LyricLine, Language, SectionType, DisplayMode, Theme } from "@/types";
import {
  processRawLyrics,
  generateSlides,
  type DetectedLanguage,
  type DetectedSection,
  type GeneratedSlide,
} from "@/lib/lyrics-parser";

const MODES = [
  { value: "smart-fit", label: "Smart Fit" },
  { value: "two-line", label: "Two Line" },
  { value: "one-line", label: "One Line" },
] as const;

type SlideMode = (typeof MODES)[number]["value"];

const SECTION_TYPES: { value: SectionType; label: string }[] = [
  { value: "verse", label: "Verse" },
  { value: "chorus", label: "Chorus" },
  { value: "bridge", label: "Bridge" },
  { value: "intro", label: "Intro" },
  { value: "outro", label: "Outro" },
  { value: "tag", label: "Tag" },
  { value: "custom", label: "Custom" },
];

const LANGUAGES: { value: Language; label: string }[] = [
  { value: "telugu", label: "Telugu" },
  { value: "english", label: "English" },
  { value: "hindi", label: "Hindi" },
  { value: "mixed", label: "Mixed" },
];

const DISPLAY_MODES: { value: DisplayMode; label: string }[] = [
  { value: "telugu", label: "Telugu" },
  { value: "english", label: "English" },
  { value: "transliteration", label: "Transliteration" },
  { value: "mixed", label: "Mixed" },
  { value: "both", label: "Both" },
];

const DEFAULT_THEME: Theme = {
  id: "cinematic-dark",
  name: "Cinematic Dark",
  description: "Default dark theme",
  background: { type: "solid", value: "#0A0A0A" },
  font: { family: "Noto Sans Telugu, system-ui, sans-serif", size: 72, weight: 400 },
  alignment: "center",
  verticalAlign: "center",
  letterSpacing: 0,
  lineSpacing: 1.5,
  shadow: true,
  overlay: { enabled: true, color: "#000000", opacity: 0.3 },
  logo: { enabled: false, position: "bottom-right" },
  isDefault: true,
};

const SAMPLE_LYRICS = `Verse 1

Yesu naa rakshakudavu
Naa jeevitha daatudavu
Nannu nadipinche Devudavu
Naa balam neeve

Chorus

Yesayya naa balam
Yesayya naa aashrayam
Naa jeevitham nee chethilo
Naa praanam nee kosame

Verse 2

Nee krupa nannu nadipinche
Nee prema nannu kaapade`;

function createSlideId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

export default function SmartImportPage() {
  const router = useRouter();
  const { user } = useAuth();
  const toast = useToast();

  const [rawLyrics, setRawLyrics] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState("");
  const [detectedLanguage, setDetectedLanguage] = useState<DetectedLanguage>("english");
  const [sections, setSections] = useState<DetectedSection[]>([]);
  const [slides, setSlides] = useState<GeneratedSlide[]>([]);
  const [mode, setMode] = useState<SlideMode>("smart-fit");
  const [selectedSlideId, setSelectedSlideId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [songTitle, setSongTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [undoStack, setUndoStack] = useState<GeneratedSlide[][]>([]);
  const [redoStack, setRedoStack] = useState<GeneratedSlide[][]>([]);
  const [displayTheme, setDisplayTheme] = useState<Theme>(DEFAULT_THEME);
  const [songId, setSongId] = useState<string | null>(null);
  const [step, setStep] = useState<"paste" | "sections" | "slides">("paste");
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [autosaveStatus, setAutosaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const autosaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [previewMode, setPreviewMode] = useState<"operator" | "tv">("operator");
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [isEditingSlideId, setIsEditingSlideId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [fontSize, setFontSize] = useState(72);
  const [textAlignment, setTextAlignment] = useState<"left" | "center" | "right">("center");
  const [lineHeight, setLineHeight] = useState(1.5);
  const [letterSpacing, setLetterSpacing] = useState(0);
  const [songCategory, setSongCategory] = useState("worship");
  const [songArtist, setSongArtist] = useState("");
  const [isFavorite, setIsFavorite] = useState(false);
  const [displayConnected, setDisplayConnected] = useState(false);
  const [showRegenerateWarning, setShowRegenerateWarning] = useState(false);
  const [showMergeWarning, setShowMergeWarning] = useState(false);
  const [pendingMergeSlideId, setPendingMergeSlideId] = useState<string | null>(null);

  const currentSlides = slides;

  const pushUndo = useCallback((newSlides: GeneratedSlide[]) => {
    setUndoStack((prev) => [...prev.slice(-20), currentSlides]);
    setRedoStack([]);
  }, [currentSlides]);

  const undo = useCallback(() => {
    if (undoStack.length === 0) return;
    const previous = undoStack[undoStack.length - 1];
    setUndoStack((prev) => prev.slice(0, -1));
    setRedoStack((prev) => [...prev, currentSlides]);
    setSlides(previous);
  }, [undoStack, currentSlides]);

  const redo = useCallback(() => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setRedoStack((prev) => prev.slice(0, -1));
    setUndoStack((prev) => [...prev, currentSlides]);
    setSlides(next);
  }, [redoStack, currentSlides]);

  const handleAutoFormat = useCallback(async () => {
    if (!rawLyrics.trim()) return;

    setIsProcessing(true);
    setError(null);
    setProcessingStep("Normalizing lyrics...");

    await new Promise((r) => setTimeout(r, 150));

    setProcessingStep("Detecting language...");
    await new Promise((r) => setTimeout(r, 150));

    setProcessingStep("Detecting sections...");
    await new Promise((r) => setTimeout(r, 150));

    setProcessingStep("Generating slides...");
    await new Promise((r) => setTimeout(r, 150));

    try {
      const result = processRawLyrics(rawLyrics, mode);
      setDetectedLanguage(result.language);
      setSections(result.sections);
      setSlides(result.slides);
      setSelectedSlideId(result.slides[0]?.id || null);
      setUndoStack([]);
      setRedoStack([]);
      setProcessingStep("");
      setStep("sections");
    } catch (e) {
      console.error("Auto format failed", e);
      setError("Failed to process lyrics");
    } finally {
      setIsProcessing(false);
    }
  }, [rawLyrics, mode]);

  const regenerateSlides = useCallback(() => {
    const newSlides = generateSlides(sections, mode);
    setSlides(newSlides);
    setSelectedSlideId(newSlides[0]?.id || null);
    setStep("slides");
  }, [sections, mode]);

  const updateSectionType = useCallback((sectionId: string, type: DetectedSection["type"]) => {
    setSections((prev) =>
      prev.map((s) =>
        s.id === sectionId
          ? {
              ...s,
              type,
              label: type === "custom" ? s.label : type.charAt(0).toUpperCase() + type.slice(1),
            }
          : s
      )
    );
  }, []);

  const updateSectionLabel = useCallback((sectionId: string, label: string) => {
    setSections((prev) =>
      prev.map((s) => (s.id === sectionId ? { ...s, label } : s))
    );
  }, []);

  const moveSection = useCallback((sectionId: string, direction: "up" | "down") => {
    setSections((prev) => {
      const index = prev.findIndex((s) => s.id === sectionId);
      if (index === -1) return prev;
      const newIndex = direction === "up" ? index - 1 : index + 1;
      if (newIndex < 0 || newIndex >= prev.length) return prev;

      const next = [...prev];
      [next[index], next[newIndex]] = [next[newIndex], next[index]];
      next.forEach((s, i) => {
        next[i] = { ...s, order: i };
      });
      return next;
    });
  }, []);

  const deleteSection = useCallback((sectionId: string) => {
    setSections((prev) => {
      const next = prev.filter((s) => s.id !== sectionId);
      next.forEach((s, i) => {
        s.order = i;
      });
      return next;
    });
  }, []);

  const updateSlide = useCallback((slideId: string, updates: Partial<GeneratedSlide>) => {
    pushUndo(slides);
    setSlides((prev) =>
      prev.map((s) => (s.id === slideId ? { ...s, ...updates } : s))
    );
  }, [slides, pushUndo]);

  const deleteSlide = useCallback((slideId: string) => {
    pushUndo(slides);
    setSlides((prev) => {
      const next = prev.filter((s) => s.id !== slideId);
      if (selectedSlideId === slideId) {
        setSelectedSlideId(next[0]?.id || null);
      }
      return next;
    });
  }, [slides, selectedSlideId, pushUndo]);

  const duplicateSlide = useCallback((slideId: string) => {
    pushUndo(slides);
    setSlides((prev) => {
      const index = prev.findIndex((s) => s.id === slideId);
      if (index === -1) return prev;
      const source = prev[index];
      const newSlide: GeneratedSlide = {
        ...source,
        id: createSlideId(),
        slideNumber: source.slideNumber + 0.5,
      };
      const next = [...prev];
      next.splice(index + 1, 0, newSlide);
      next.forEach((s, i) => {
        if (s.id === newSlide.id) {
          next[i] = { ...s, slideNumber: i + 1 };
        } else if (i > index) {
          next[i] = { ...s, slideNumber: s.slideNumber + 1 };
        }
      });
      return next;
    });
  }, [slides, pushUndo]);

  const splitSlide = useCallback((slideId: string) => {
    pushUndo(slides);
    setSlides((prev) => {
      const index = prev.findIndex((s) => s.id === slideId);
      if (index === -1) return prev;
      const source = prev[index];
      const words = source.primaryText.split(/\s+/).filter(Boolean);
      if (words.length < 2) return prev;

      const mid = Math.ceil(words.length / 2);
      const first = words.slice(0, mid).join(" ");
      const second = words.slice(mid).join(" ");

      const slide1: GeneratedSlide = {
        ...source,
        id: createSlideId(),
        slideNumber: index + 1,
        primaryText: first,
        secondaryText: undefined,
        lineIds: [],
      };
      const slide2: GeneratedSlide = {
        ...source,
        id: createSlideId(),
        slideNumber: index + 2,
        primaryText: second,
        secondaryText: source.secondaryText,
        lineIds: [],
      };

      const next = [...prev];
      next.splice(index, 1, slide1, slide2);
      next.forEach((s, i) => {
        next[i] = { ...s, slideNumber: i + 1 };
      });
      setSelectedSlideId(slide1.id);
      return next;
    });
  }, [slides, pushUndo]);

  const mergeSlide = useCallback((slideId: string) => {
    const index = slides.findIndex((s) => s.id === slideId);
    if (index <= 0) return;

    const prevSlide = slides[index - 1];
    const currentSlide = slides[index];
    const combinedPrimary = prevSlide.primaryText + " " + currentSlide.primaryText;
    const wordCount = combinedPrimary.split(/\s+/).filter(Boolean).length;

    if (wordCount > 12 || combinedPrimary.length > 96) {
      setPendingMergeSlideId(slideId);
      setShowMergeWarning(true);
      return;
    }

    pushUndo(slides);
    setSlides((prev) => {
      const idx = prev.findIndex((s) => s.id === slideId);
      if (idx <= 0) return prev;
      const prevS = prev[idx - 1];
      const currS = prev[idx];

      const combinedPrimaryText = prevS.primaryText + " " + currS.primaryText;
      const combinedSecondaryText =
        prevS.secondaryText && currS.secondaryText
          ? prevS.secondaryText + " " + currS.secondaryText
          : prevS.secondaryText || currS.secondaryText;

      const merged: GeneratedSlide = {
        ...currS,
        slideNumber: idx,
        primaryText: combinedPrimaryText.trim(),
        secondaryText: combinedSecondaryText?.trim() || undefined,
      };

      const next = [...prev];
      next.splice(idx - 1, 2, merged);
      next.forEach((s, i) => {
        next[i] = { ...s, slideNumber: i + 1 };
      });
      setSelectedSlideId(merged.id);
      return next;
    });
  }, [slides, pushUndo]);

  const addSlide = useCallback(() => {
    pushUndo(slides);
    const newSlide: GeneratedSlide = {
      id: createSlideId(),
      sectionOrder: slides.length > 0 ? slides[slides.length - 1].sectionOrder : 0,
      slideNumber: slides.length + 1,
      primaryText: "",
      secondaryText: "",
      lineIds: [],
    };
    setSlides((prev) => [...prev, newSlide]);
    setSelectedSlideId(newSlide.id);
  }, [slides, pushUndo]);

  const moveSlide = useCallback((slideId: string, direction: "up" | "down") => {
    pushUndo(slides);
    setSlides((prev) => {
      const index = prev.findIndex((s) => s.id === slideId);
      if (index === -1) return prev;
      const newIndex = direction === "up" ? index - 1 : index + 1;
      if (newIndex < 0 || newIndex >= prev.length) return prev;

      const next = [...prev];
      [next[index], next[newIndex]] = [next[newIndex], next[index]];
      next.forEach((s, i) => {
        next[i] = { ...s, slideNumber: i + 1 };
      });
      return next;
    });
  }, [slides, pushUndo]);

  const handleDragStart = useCallback((e: React.DragEvent, index: number) => {
    e.dataTransfer.setData("text/plain", String(index));
    e.dataTransfer.effectAllowed = "move";
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverIndex(index);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    const dragIndex = Number(e.dataTransfer.getData("text/plain"));
    if (Number.isNaN(dragIndex) || dragIndex === dropIndex) {
      setDragOverIndex(null);
      return;
    }

    pushUndo(slides);
    setSlides((prev) => {
      const next = [...prev];
      const [moved] = next.splice(dragIndex, 1);
      next.splice(dropIndex, 0, moved);
      next.forEach((s, i) => {
        next[i] = { ...s, slideNumber: i + 1 };
      });
      return next;
    });
    setDragOverIndex(null);
  }, [slides, pushUndo]);

  const handleDragEnd = useCallback(() => {
    setDragOverIndex(null);
  }, []);

  const startEditingSlide = useCallback((slideId: string) => {
    const slide = slides.find((s) => s.id === slideId);
    if (!slide) return;
    setIsEditingSlideId(slideId);
    setEditingText(slide.primaryText + (slide.secondaryText ? "\n" + slide.secondaryText : ""));
  }, [slides]);

  const saveSlideEdit = useCallback(() => {
    if (!isEditingSlideId) return;
    const lines = editingText.split("\n").filter(Boolean);
    const primaryText = lines[0] || "";
    const secondaryText = lines.length > 1 ? lines.slice(1).join("\n") : undefined;

    pushUndo(slides);
    setSlides((prev) =>
      prev.map((s) =>
        s.id === isEditingSlideId
          ? { ...s, primaryText, secondaryText }
          : s
      )
    );
    setIsEditingSlideId(null);
    setEditingText("");
  }, [isEditingSlideId, editingText, slides, pushUndo]);

  const cancelSlideEdit = useCallback(() => {
    setIsEditingSlideId(null);
    setEditingText("");
  }, []);

  const persistSongData = useCallback(async () => {
    if (!user || slides.length === 0) return;
    setError(null);

    try {
      let currentSongId = songId;

      if (currentSongId) {
        const existingSong = await db.getSong(currentSongId, user.id);
        if (existingSong) {
          await db.updateSong(currentSongId, {
            title: songTitle || existingSong.title,
            romanized_title: songTitle || existingSong.romanizedTitle,
            language: detectedLanguage === "romanized-telugu" ? "telugu" : detectedLanguage,
            lyrics: rawLyrics,
            updated_at: new Date().toISOString(),
          }, user.id);

          const existingSections = await db.getSongSections(currentSongId);
          for (const section of existingSections) {
            await db.deleteSongSection(section.id);
          }

          const existingSlides = await db.getSongSlides(currentSongId);
          for (const slide of existingSlides) {
            await db.deleteSongSlide(slide.id);
          }

          const sectionOrderToId: Record<number, string> = {};

          for (const section of sections) {
            const createdSection = await db.createSongSection({
              song_id: currentSongId,
              type: section.type,
              label: section.label,
              order: section.order,
              repeat_count: 1,
            });

            const sectionId = (createdSection as any).id;
            sectionOrderToId[section.order] = sectionId;

            for (const line of section.lines) {
              await db.createSongLine({
                section_id: sectionId,
                order: 0,
                primary_text: line.text,
                secondary_text: "",
                language: line.language === "romanized-telugu" ? "telugu" : (line.language as any),
                display_mode: "telugu",
              });
            }
          }

          for (const slide of slides) {
            const sectionId = sectionOrderToId[slide.sectionOrder];
            if (!sectionId) continue;

            await db.createSongSlide({
              song_id: currentSongId,
              section_id: sectionId,
              section_order: slide.sectionOrder,
              slide_number: slide.slideNumber,
              order: slide.slideNumber,
              primary_text: slide.primaryText,
              secondary_text: slide.secondaryText || "",
              line_ids: slide.lineIds,
              display_mode: "telugu",
            });
          }
          return;
        }
      }

      const song = await db.createSong({
        title: songTitle || "Untitled Song",
        romanized_title: songTitle || "Untitled Song",
        slug: (songTitle || "untitled").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, ""),
        language: detectedLanguage === "romanized-telugu" ? "telugu" : detectedLanguage,
        secondary_language: detectedLanguage === "mixed" ? "english" : undefined,
        category: "worship",
        lyrics: rawLyrics,
        tags: [],
        favorite: false,
      }, user.id);

      currentSongId = (song as any).id;
      setSongId(currentSongId);

      const sectionOrderToId: Record<number, string> = {};

      for (const section of sections) {
        const createdSection = await db.createSongSection({
          song_id: currentSongId,
          type: section.type,
          label: section.label,
          order: section.order,
          repeat_count: 1,
        });

        const sectionId = (createdSection as any).id;
        sectionOrderToId[section.order] = sectionId;

        for (const line of section.lines) {
          await db.createSongLine({
            section_id: sectionId,
            order: 0,
            primary_text: line.text,
            secondary_text: "",
            language: line.language === "romanized-telugu" ? "telugu" : (line.language as any),
            display_mode: "telugu",
          });
        }
      }

      for (const slide of slides) {
        const sectionId = sectionOrderToId[slide.sectionOrder];
        if (!sectionId) continue;

        await db.createSongSlide({
          song_id: currentSongId,
          section_id: sectionId,
          section_order: slide.sectionOrder,
          slide_number: slide.slideNumber,
          order: slide.slideNumber,
          primary_text: slide.primaryText,
          secondary_text: slide.secondaryText || "",
          line_ids: slide.lineIds,
          display_mode: "telugu",
        });
      }
    } catch (e) {
      console.error("Failed to persist song", e);
      setError("Failed to save song");
      throw e;
    }
  }, [user, slides, sections, rawLyrics, detectedLanguage, songTitle, songId, db]);

  useEffect(() => {
    if (!songId || slides.length === 0) return;

    if (autosaveTimeoutRef.current) {
      clearTimeout(autosaveTimeoutRef.current);
    }

    setAutosaveStatus("idle");
    autosaveTimeoutRef.current = setTimeout(async () => {
      setAutosaveStatus("saving");
      try {
        await persistSongData();
        setAutosaveStatus("saved");
        setHasUnsavedChanges(false);
        toast.addToast("success", "Song saved");
      } catch (e) {
        setAutosaveStatus("error");
        toast.addToast("error", "Failed to save song");
      }
    }, 2000);

    return () => {
      if (autosaveTimeoutRef.current) {
        clearTimeout(autosaveTimeoutRef.current);
      }
    };
  }, [slides, sections, songTitle, detectedLanguage, rawLyrics, songId, user, persistSongData, toast]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges]);

  useEffect(() => {
    setHasUnsavedChanges(true);
  }, [slides, sections, songTitle, detectedLanguage, rawLyrics, mode]);

  const handleSaveSong = useCallback(async () => {
    if (!user || slides.length === 0) return;
    setIsSaving(true);
    setSaveStatus("saving");
    setError(null);

    try {
      await persistSongData();
      setSaveStatus("saved");
      setHasUnsavedChanges(false);
      setTimeout(() => setSaveStatus("idle"), 3000);
    } catch (e) {
      setSaveStatus("error");
    } finally {
      setIsSaving(false);
    }
  }, [user, slides, sections, rawLyrics, detectedLanguage, songTitle, songId, persistSongData]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        handleSaveSong();
        return;
      }

      if (slides.length === 0) return;
      const currentIndex = slides.findIndex((s) => s.id === selectedSlideId);

      switch (e.key) {
        case "ArrowUp":
          e.preventDefault();
          if (currentIndex > 0) {
            setSelectedSlideId(slides[currentIndex - 1].id);
          }
          break;
        case "ArrowDown":
          e.preventDefault();
          if (currentIndex < slides.length - 1) {
            setSelectedSlideId(slides[currentIndex + 1].id);
          }
          break;
        case "ArrowLeft":
          e.preventDefault();
          if (currentIndex > 0) {
            setSelectedSlideId(slides[currentIndex - 1].id);
          }
          break;
        case "ArrowRight":
          e.preventDefault();
          if (currentIndex < slides.length - 1) {
            setSelectedSlideId(slides[currentIndex + 1].id);
          }
          break;
        case " ":
          e.preventDefault();
          if (currentIndex < slides.length - 1) {
            setSelectedSlideId(slides[currentIndex + 1].id);
          }
          break;
        case "Home":
          e.preventDefault();
          if (slides.length > 0) {
            setSelectedSlideId(slides[0].id);
          }
          break;
        case "End":
          e.preventDefault();
          if (slides.length > 0) {
            setSelectedSlideId(slides[slides.length - 1].id);
          }
          break;
        default:
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [slides, selectedSlideId, handleSaveSong]);

  const handlePresentNow = useCallback(() => {
    if (!songId) {
      setError("Please save the song first before presenting");
      return;
    }
    router.push(`/presentation?songId=${songId}`);
  }, [songId, router]);

  const selectedSlide = slides.find((s) => s.id === selectedSlideId);

  return (
    <div className="flex h-screen bg-brand-darker">
      {/* Sidebar */}
      <aside className="w-64 bg-brand-darker border-r border-white/5 flex flex-col">
        <div className="p-6">
          <Link href="/dashboard" className="block">
            <h1 className="font-display text-xl font-bold tracking-tight text-white">
              CHURCH LYRICS OS
            </h1>
            <p className="text-xs text-muted-foreground mt-1">Worship Presentation</p>
          </Link>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {[
            { label: "Dashboard", href: "/dashboard", icon: Home },
            { label: "Songs", href: "/songs", icon: Music },
            { label: "Smart Lyrics", href: "/smart-import", icon: Sparkles },
            { label: "Services", href: "/services", icon: Calendar },
            { label: "Bible", href: "/bible", icon: BookOpen },
            { label: "Announcements", href: "/announcements", icon: Megaphone },
            { label: "Media", href: "/media", icon: PlayIcon },
            { label: "Themes", href: "/themes", icon: Palette },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group",
                item.href === "/smart-import"
                  ? "bg-brand-gold/10 text-brand-gold"
                  : "text-muted-foreground hover:text-white hover:bg-white/5"
              )}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="p-3 border-t border-white/5 space-y-1">
          {[
            { label: "Settings", href: "/settings", icon: Settings },
            { label: "Help", href: "/help", icon: HelpCircle },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-white hover:bg-white/5 transition-all duration-200"
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </Link>
          ))}
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 border-b border-white/5 flex items-center justify-between px-8 flex-shrink-0">
          <div className="flex items-center gap-4 flex-1 min-w-0">
            <div className="flex flex-col min-w-0">
              <input
                type="text"
                value={songTitle}
                onChange={(e) => setSongTitle(e.target.value)}
                placeholder="Song Title"
                className="text-lg font-semibold text-white bg-transparent border-none focus:outline-none focus:ring-0 p-0 truncate w-full"
              />
              <div className="flex items-center gap-2 mt-0.5">
                <input
                  type="text"
                  value={songArtist}
                  onChange={(e) => setSongArtist(e.target.value)}
                  placeholder="Artist"
                  className="text-xs text-muted-foreground bg-transparent border-none focus:outline-none focus:ring-0 p-0 w-32"
                />
                <span className="text-muted-foreground">•</span>
                <select
                  value={songCategory}
                  onChange={(e) => setSongCategory(e.target.value)}
                  className="text-xs text-muted-foreground bg-transparent border-none focus:outline-none focus:ring-0 p-0"
                >
                  <option value="worship">Worship</option>
                  <option value="praise">Praise</option>
                  <option value="hymn">Hymn</option>
                  <option value="contemporary">Contemporary</option>
                  <option value="other">Other</option>
                </select>
                <button
                  onClick={() => setIsFavorite(!isFavorite)}
                  className="p-0.5 rounded hover:bg-white/10 transition-colors"
                >
                  {isFavorite ? (
                    <Star className="w-3.5 h-3.5 text-brand-gold fill-brand-gold" />
                  ) : (
                    <Star className="w-3.5 h-3.5 text-muted-foreground" />
                  )}
                </button>
                <div className="flex items-center gap-1">
                  <div className={cn(
                    "w-1.5 h-1.5 rounded-full",
                    displayConnected ? "bg-green-400" : "bg-white/20"
                  )} />
                  <span className="text-[10px] text-muted-foreground">
                    {displayConnected ? "Display Ready" : "Presentation Ready"}
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {autosaveStatus === "saving" && (
              <span className="text-xs text-muted-foreground">Saving...</span>
            )}
            {autosaveStatus === "saved" && (
              <span className="text-xs text-green-400">Saved</span>
            )}
            {autosaveStatus === "error" && (
              <span className="text-xs text-red-400">Save failed</span>
            )}
            {hasUnsavedChanges && autosaveStatus === "idle" && (
              <span className="text-xs text-yellow-400">● Unsaved Changes</span>
            )}
            <button
              onClick={handleSaveSong}
              disabled={isSaving || slides.length === 0}
              className={cn(
                "inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                isSaving || slides.length === 0
                  ? "bg-white/10 text-white/50 cursor-not-allowed"
                  : "bg-brand-gold text-black hover:bg-brand-goldLight"
              )}
            >
              {saveStatus === "saving" ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : saveStatus === "saved" ? (
                "Saved"
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Song
                </>
              )}
            </button>
            <button
              onClick={handlePresentNow}
              disabled={!songId}
              className={cn(
                "inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                !songId
                  ? "bg-white/10 text-white/50 cursor-not-allowed"
                  : "bg-brand-gold text-black hover:bg-brand-goldLight"
              )}
            >
              <Play className="w-4 h-4" />
              Present Now
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-8">
          <div className="max-w-7xl mx-auto space-y-6">
            {error && (
              <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
                {error}
              </div>
            )}

            <div className="rounded-xl border border-white/10 bg-brand-surface p-4">
              <label className="block text-sm font-medium text-white mb-2">
                Song Title
              </label>
              <input
                type="text"
                value={songTitle}
                onChange={(e) => setSongTitle(e.target.value)}
                placeholder="Enter song title..."
                className="w-full rounded-lg border border-white/10 bg-brand-darker px-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-brand-gold/50"
              />
            </div>

            {step === "paste" && slides.length === 0 && (
              <div className="rounded-xl border border-white/10 bg-brand-surface p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Paste your lyrics here
                  </label>
                  <textarea
                    value={rawLyrics}
                    onChange={(e) => setRawLyrics(e.target.value)}
                    placeholder="Paste your lyrics here...

Example:
Verse 1

Yesu naa rakshakudavu
Naa jeevitha daatudavu

Chorus

Yesayya naa balam
Yesayya naa aashrayam"
                    className="w-full h-64 rounded-lg border border-white/10 bg-brand-darker p-4 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-brand-gold/50 font-mono telugu-text"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground">Mode:</span>
                    {MODES.map((m) => (
                      <button
                        key={m.value}
                        onClick={() => setMode(m.value)}
                        className={cn(
                          "px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200",
                          mode === m.value
                            ? "bg-brand-gold text-black"
                            : "bg-white/5 text-muted-foreground hover:text-white hover:bg-white/10"
                        )}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={handleAutoFormat}
                    disabled={isProcessing || !rawLyrics.trim()}
                    className={cn(
                      "inline-flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-semibold transition-all duration-200",
                      isProcessing || !rawLyrics.trim()
                        ? "bg-white/10 text-white/50 cursor-not-allowed"
                        : "bg-gradient-to-r from-brand-gold to-brand-goldLight text-black hover:shadow-lg hover:shadow-brand-gold/20"
                    )}
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        {processingStep || "Processing..."}
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        Auto Format Lyrics
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {step === "sections" && sections.length > 0 && (
              <div className="rounded-xl border border-white/10 bg-brand-surface p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-white">Detected Structure</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      Review and correct the detected sections before generating slides
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setStep("paste")}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-white/5 text-muted-foreground hover:text-white hover:bg-white/10 transition-all duration-200"
                    >
                      Back
                    </button>
                    <button
                      onClick={regenerateSlides}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-gradient-to-r from-brand-gold to-brand-goldLight text-black hover:shadow-lg hover:shadow-brand-gold/20 transition-all duration-200"
                    >
                      Generate Slides
                    </button>
                  </div>
                </div>

                <div className="space-y-2 max-h-[500px] overflow-auto pr-2">
                  {sections.map((section, index) => (
                    <div
                      key={section.id}
                      className="rounded-lg border border-white/10 bg-brand-darker p-4 space-y-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 flex-1">
                          <span className="text-xs font-mono text-muted-foreground pt-1">
                            {String(index + 1).padStart(2, "0")}
                          </span>
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-2">
                              <select
                                value={section.type}
                                onChange={(e) => updateSectionType(section.id, e.target.value as DetectedSection["type"])}
                                className="rounded-lg border border-white/10 bg-brand-surface px-2 py-1.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-brand-gold/50"
                              >
                                {SECTION_TYPES.map((st) => (
                                  <option key={st.value} value={st.value}>
                                    {st.label}
                                  </option>
                                ))}
                              </select>
                              <input
                                type="text"
                                value={section.label}
                                onChange={(e) => updateSectionLabel(section.id, e.target.value)}
                                className="rounded-lg border border-white/10 bg-brand-surface px-2 py-1.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-brand-gold/50"
                              />
                              <span
                                className={cn(
                                  "text-[10px] font-medium px-2 py-0.5 rounded-full",
                                  section.confidence === "high"
                                    ? "bg-green-500/10 text-green-400"
                                    : section.confidence === "medium"
                                    ? "bg-yellow-500/10 text-yellow-400"
                                    : "bg-white/5 text-muted-foreground"
                                )}
                              >
                                {section.confidence}
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {section.lines
                                .filter((l) => l.text.trim() !== "")
                                .map((line, lineIndex) => (
                                  <span
                                    key={line.id}
                                    className="text-[11px] text-muted-foreground bg-white/5 px-2 py-0.5 rounded"
                                  >
                                    {line.text.length > 30 ? line.text.slice(0, 30) + "..." : line.text}
                                  </span>
                                ))}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-0.5">
                          <button
                            onClick={() => moveSection(section.id, "up")}
                            disabled={index === 0}
                            className="p-1 rounded hover:bg-white/10 disabled:opacity-30"
                          >
                            <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" />
                          </button>
                          <button
                            onClick={() => moveSection(section.id, "down")}
                            disabled={index === sections.length - 1}
                            className="p-1 rounded hover:bg-white/10 disabled:opacity-30"
                          >
                            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                          </button>
                          <button
                            onClick={() => deleteSection(section.id)}
                            className="p-1 rounded hover:bg-white/10"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-red-400" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(step === "slides" || slides.length > 0) && (
              <>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Generated Slides */}
                  <div className="rounded-xl border border-white/10 bg-brand-surface p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-white">Generated Slides</h3>
                        <button
                          onClick={() => setStep("sections")}
                          className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-white/5 text-muted-foreground hover:text-white hover:bg-white/10 transition-all duration-200"
                        >
                          Edit Sections
                        </button>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {slides.length} slides • {detectedLanguage}
                      </span>
                    </div>

                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search slides..."
                        className="w-full rounded-lg border border-white/10 bg-brand-darker pl-9 pr-3 py-2 text-xs text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-brand-gold/50"
                      />
                    </div>

                    <div className="space-y-1 max-h-[320px] overflow-auto pr-2">
                      {(() => {
                        const filteredSlides = searchQuery.trim()
                          ? slides.filter((s) => {
                              const query = searchQuery.toLowerCase();
                              return (
                                s.primaryText.toLowerCase().includes(query) ||
                                s.secondaryText?.toLowerCase().includes(query) ||
                                String(s.slideNumber).includes(query)
                              );
                            })
                          : slides;

                        if (filteredSlides.length === 0 && searchQuery.trim()) {
                          return (
                            <p className="text-xs text-muted-foreground text-center py-4">
                              No slides match "{searchQuery}"
                            </p>
                          );
                        }

                        const slidesToRender = searchQuery.trim() ? filteredSlides : slides;
                        const sectionMap = new Map<number, DetectedSection>();
                        sections.forEach((s) => sectionMap.set(s.order, s));

                        let lastSectionOrder: number | null = null;
                        const elements: React.ReactNode[] = [];

                        slidesToRender.forEach((slide, displayIndex) => {
                          const globalIndex = slides.findIndex((s) => s.id === slide.id);
                          const section = sectionMap.get(slide.sectionOrder);

                          if (!searchQuery.trim() && section && section.order !== lastSectionOrder) {
                            lastSectionOrder = section.order;
                            elements.push(
                              <div
                                key={`section-${section.id}`}
                                className="flex items-center gap-2 py-1.5 px-1 sticky top-0 bg-brand-surface z-10"
                              >
                                <span className="text-[10px] font-medium uppercase tracking-wider text-brand-gold">
                                  {section.label}
                                </span>
                                <div className="flex-1 h-px bg-white/10" />
                                <button
                                  onClick={() => setSelectedSectionId(section.id)}
                                  className="text-[10px] text-muted-foreground hover:text-white transition-colors"
                                >
                                  Jump
                                </button>
                              </div>
                            );
                          }

                          elements.push(
                            <div
                              key={slide.id}
                              draggable
                              onDragStart={(e) => handleDragStart(e, globalIndex)}
                              onDragOver={(e) => handleDragOver(e, globalIndex)}
                              onDrop={(e) => handleDrop(e, globalIndex)}
                              onDragEnd={handleDragEnd}
                              onClick={() => setSelectedSlideId(slide.id)}
                              onDoubleClick={() => startEditingSlide(slide.id)}
                              className={cn(
                                "group relative rounded-lg border p-2.5 cursor-pointer transition-all duration-200",
                                selectedSlideId === slide.id
                                  ? "border-brand-gold/50 bg-brand-gold/5"
                                  : dragOverIndex === globalIndex
                                  ? "border-brand-gold/30 bg-brand-gold/5"
                                  : "border-white/10 bg-brand-darker hover:border-white/20"
                              )}
                            >
                              {isEditingSlideId === slide.id ? (
                                <textarea
                                  value={editingText}
                                  onChange={(e) => setEditingText(e.target.value)}
                                  onBlur={saveSlideEdit}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter" && !e.shiftKey) {
                                      e.preventDefault();
                                      saveSlideEdit();
                                    }
                                    if (e.key === "Escape") {
                                      cancelSlideEdit();
                                    }
                                  }}
                                  autoFocus
                                  className="w-full rounded border border-brand-gold/50 bg-brand-darker px-2 py-1.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-brand-gold/50 resize-none"
                                  rows={2}
                                />
                              ) : (
                                <>
                                  <div className="flex items-start gap-2">
                                    <div className="flex flex-col items-center gap-0.5 pt-0.5">
                                      <GripVertical className="w-2.5 h-2.5 text-muted-foreground/50" />
                                      <span className="text-[10px] font-mono text-muted-foreground">
                                        {String(globalIndex + 1).padStart(2, "0")}
                                      </span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-xs text-white truncate">{slide.primaryText}</p>
                                      {slide.secondaryText && (
                                        <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                                          {slide.secondaryText}
                                        </p>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          duplicateSlide(slide.id);
                                        }}
                                        className="p-1 rounded hover:bg-white/10"
                                        title="Duplicate"
                                      >
                                        <Copy className="w-3 h-3 text-muted-foreground" />
                                      </button>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          splitSlide(slide.id);
                                        }}
                                        className="p-1 rounded hover:bg-white/10"
                                        title="Split"
                                      >
                                        <SplitSquareHorizontal className="w-3 h-3 text-muted-foreground" />
                                      </button>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          deleteSlide(slide.id);
                                        }}
                                        className="p-1 rounded hover:bg-white/10"
                                        title="Delete"
                                      >
                                        <Trash2 className="w-3 h-3 text-red-400" />
                                      </button>
                                    </div>
                                  </div>
                                </>
                              )}
                            </div>
                          );
                        });

                        return elements;
                      })()}
                    </div>

                    {!searchQuery.trim() && (
                      <button
                        onClick={addSlide}
                        className="w-full py-1.5 rounded-lg border border-dashed border-white/20 text-[10px] text-muted-foreground hover:text-white hover:border-white/40 transition-all duration-200"
                      >
                        + Add Slide
                      </button>
                    )}
                  </div>

                  {/* Live Preview */}
                  <div className="rounded-xl border border-white/10 bg-brand-surface p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-white">
                        {previewMode === "tv" ? "TV Preview" : "Operator Preview"}
                      </h3>
                      <div className="flex items-center gap-1 bg-white/5 rounded-lg p-0.5">
                        <button
                          onClick={() => setPreviewMode("operator")}
                          className={cn(
                            "px-2 py-1 rounded text-[10px] font-medium transition-all duration-200",
                            previewMode === "operator"
                              ? "bg-brand-gold text-black"
                              : "text-muted-foreground hover:text-white"
                          )}
                        >
                          <Monitor className="w-3 h-3 inline mr-1" />
                          Operator
                        </button>
                        <button
                          onClick={() => setPreviewMode("tv")}
                          className={cn(
                            "px-2 py-1 rounded text-[10px] font-medium transition-all duration-200",
                            previewMode === "tv"
                              ? "bg-brand-gold text-black"
                              : "text-muted-foreground hover:text-white"
                          )}
                        >
                          <Tv className="w-3 h-3 inline mr-1" />
                          TV
                        </button>
                      </div>
                    </div>

                    {previewMode === "operator" ? (
                      <div className="grid grid-cols-3 gap-3">
                        <div className="glass rounded-lg p-3 flex flex-col">
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Previous</p>
                          <div className="flex-1 flex items-center justify-center">
                            {slides.length > 0 && selectedSlideId ? (() => {
                              const currentIndex = slides.findIndex((s) => s.id === selectedSlideId);
                              const prevSlide = currentIndex > 0 ? slides[currentIndex - 1] : null;
                              return prevSlide ? (
                                <div className="text-center">
                                  <p className="text-[10px] text-muted-foreground mb-1">
                                    {String(currentIndex).padStart(2, "0")}
                                  </p>
                                  <p className="text-xs text-white/60 line-clamp-3">
                                    {prevSlide.primaryText}
                                  </p>
                                </div>
                              ) : (
                                <p className="text-xs text-muted-foreground">No previous</p>
                              );
                            })() : (
                              <p className="text-xs text-muted-foreground">No previous</p>
                            )}
                          </div>
                        </div>

                        <div className="glass rounded-lg p-3 flex flex-col ring-1 ring-brand-gold/30">
                          <p className="text-[10px] text-brand-gold uppercase tracking-wider mb-2">Current</p>
                          <div className="flex-1 flex items-center justify-center">
                            {selectedSlide ? (
                              <div className="text-center">
                                <p className="text-[10px] text-muted-foreground mb-1">
                                  {String(slides.findIndex((s) => s.id === selectedSlideId) + 1).padStart(2, "0")}
                                </p>
                                <p className="text-sm text-white text-balance leading-relaxed">
                                  {selectedSlide.primaryText}
                                </p>
                                {selectedSlide.secondaryText && (
                                  <p className="text-[10px] text-muted-foreground mt-1 italic">
                                    {selectedSlide.secondaryText}
                                  </p>
                                )}
                              </div>
                            ) : (
                              <p className="text-xs text-muted-foreground">No current slide</p>
                            )}
                          </div>
                        </div>

                        <div className="glass rounded-lg p-3 flex flex-col">
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Next</p>
                          <div className="flex-1 flex items-center justify-center">
                            {slides.length > 0 && selectedSlideId ? (() => {
                              const currentIndex = slides.findIndex((s) => s.id === selectedSlideId);
                              const nextSlide = currentIndex < slides.length - 1 ? slides[currentIndex + 1] : null;
                              return nextSlide ? (
                                <div className="text-center">
                                  <p className="text-[10px] text-muted-foreground mb-1">
                                    {String(currentIndex + 2).padStart(2, "0")}
                                  </p>
                                  <p className="text-xs text-white/60 line-clamp-3">
                                    {nextSlide.primaryText}
                                  </p>
                                </div>
                              ) : (
                                <p className="text-xs text-muted-foreground">End of song</p>
                              );
                            })() : (
                              <p className="text-xs text-muted-foreground">No next slide</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div
                        className="relative w-full aspect-video rounded-lg overflow-hidden"
                        style={{
                          background: displayTheme.background.type === "solid"
                            ? displayTheme.background.value
                            : displayTheme.background.value,
                        }}
                      >
                        {displayTheme.overlay.enabled && (
                          <div
                            className="absolute inset-0"
                            style={{
                              backgroundColor: displayTheme.overlay.color,
                              opacity: displayTheme.overlay.opacity,
                            }}
                          />
                        )}
                        <div
                          className="absolute inset-0 flex flex-col items-center justify-center p-8"
                          style={{
                            fontFamily: displayTheme.font.family,
                            fontSize: displayTheme.font.size * 0.5,
                            fontWeight: displayTheme.font.weight,
                            letterSpacing: displayTheme.letterSpacing,
                            lineHeight: displayTheme.lineSpacing,
                            textAlign: displayTheme.alignment as any,
                          }}
                        >
                          {selectedSlide ? (
                            <>
                              <p
                                className="text-white drop-shadow-lg"
                                style={{
                                  textShadow: displayTheme.shadow ? "0 2px 8px rgba(0,0,0,0.5)" : "none",
                                }}
                              >
                                {selectedSlide.primaryText}
                              </p>
                              {selectedSlide.secondaryText && (
                                <p
                                  className="text-white/80 mt-2"
                                  style={{
                                    textShadow: displayTheme.shadow ? "0 2px 8px rgba(0,0,0,0.5)" : "none",
                                  }}
                                >
                                  {selectedSlide.secondaryText}
                                </p>
                              )}
                            </>
                          ) : (
                            <p className="text-white/30 text-sm">Select a slide to preview</p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Controls */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs text-muted-foreground mb-1">
                          Slide Mode
                        </label>
                        <select
                          value={mode}
                          onChange={(e) => setMode(e.target.value as SlideMode)}
                          className="w-full rounded-lg border border-white/10 bg-brand-darker px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand-gold/50"
                        >
                          {MODES.map((m) => (
                            <option key={m.value} value={m.value}>
                              {m.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-muted-foreground mb-1">
                          Theme
                        </label>
                        <select
                          value={displayTheme.id}
                          onChange={(e) => {
                            const themes: Theme[] = [DEFAULT_THEME];
                            const found = themes.find((t) => t.id === e.target.value);
                            if (found) setDisplayTheme(found);
                          }}
                          className="w-full rounded-lg border border-white/10 bg-brand-darker px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand-gold/50"
                        >
                          <option value="cinematic-dark">Cinematic Dark</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs text-muted-foreground mb-1">
                          Font Size
                        </label>
                        <div className="flex items-center gap-2">
                          <Type className="w-3.5 h-3.5 text-muted-foreground" />
                          <input
                            type="range"
                            min={48}
                            max={120}
                            value={fontSize}
                            onChange={(e) => setFontSize(Number(e.target.value))}
                            className="flex-1"
                          />
                          <span className="text-xs text-muted-foreground w-8 text-right">{fontSize}px</span>
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs text-muted-foreground mb-1">
                          Alignment
                        </label>
                        <div className="flex items-center gap-1 bg-white/5 rounded-lg p-0.5">
                          {(["left", "center", "right"] as const).map((align) => (
                            <button
                              key={align}
                              onClick={() => setTextAlignment(align)}
                              className={cn(
                                "flex-1 px-2 py-1.5 rounded text-[10px] font-medium transition-all duration-200",
                                textAlignment === align
                                  ? "bg-brand-gold text-black"
                                  : "text-muted-foreground hover:text-white"
                              )}
                            >
                              {align === "left" && <AlignLeft className="w-3 h-3 inline mr-1" />}
                              {align === "center" && <AlignCenter className="w-3 h-3 inline mr-1" />}
                              {align === "right" && <AlignRight className="w-3 h-3 inline mr-1" />}
                              {align.charAt(0).toUpperCase() + align.slice(1)}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Slide Editor Actions */}
                <div className="rounded-xl border border-white/10 bg-brand-surface p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={undo}
                        disabled={undoStack.length === 0}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-white/5 text-muted-foreground hover:text-white hover:bg-white/10 disabled:opacity-30 transition-all duration-200"
                      >
                        <Undo2 className="w-3.5 h-3.5" />
                        Undo
                      </button>
                      <button
                        onClick={redo}
                        disabled={redoStack.length === 0}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-white/5 text-muted-foreground hover:text-white hover:bg-white/10 disabled:opacity-30 transition-all duration-200"
                      >
                        <Redo2 className="w-3.5 h-3.5" />
                        Redo
                      </button>
                      <div className="w-px h-6 bg-white/10 mx-2" />
                      <button
                        onClick={() => selectedSlideId && splitSlide(selectedSlideId)}
                        disabled={!selectedSlideId}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-white/5 text-muted-foreground hover:text-white hover:bg-white/10 disabled:opacity-30 transition-all duration-200"
                      >
                        <SplitSquareHorizontal className="w-3.5 h-3.5" />
                        Split
                      </button>
                      <button
                        onClick={() => selectedSlideId && mergeSlide(selectedSlideId)}
                        disabled={!selectedSlideId || slides.indexOf(slides.find((s) => s.id === selectedSlideId)!) <= 0}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-white/5 text-muted-foreground hover:text-white hover:bg-white/10 disabled:opacity-30 transition-all duration-200"
                      >
                        <Merge className="w-3.5 h-3.5" />
                        Merge
                      </button>
                      <button
                        onClick={() => selectedSlideId && duplicateSlide(selectedSlideId)}
                        disabled={!selectedSlideId}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-white/5 text-muted-foreground hover:text-white hover:bg-white/10 disabled:opacity-30 transition-all duration-200"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        Duplicate
                      </button>
                      <button
                        onClick={() => selectedSlideId && deleteSlide(selectedSlideId)}
                        disabled={!selectedSlideId}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-white/5 text-muted-foreground hover:text-white hover:bg-white/10 disabled:opacity-30 transition-all duration-200"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-red-400" />
                        Delete
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setRawLyrics("");
                          setSections([]);
                          setSlides([]);
                          setSelectedSlideId(null);
                          setStep("paste");
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-white/5 text-muted-foreground hover:text-white hover:bg-white/10 transition-all duration-200"
                      >
                        <X className="w-3.5 h-3.5" />
                        New Lyrics
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}
            {showRegenerateWarning && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                <div className="rounded-xl border border-white/10 bg-brand-surface p-6 max-w-md w-full mx-4 space-y-4">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="w-5 h-5 text-yellow-400" />
                    <h3 className="text-lg font-semibold text-white">Regenerate Slides?</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    This will rebuild slide grouping from the current lyrics. Manual slide edits may be replaced.
                  </p>
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => setShowRegenerateWarning(false)}
                      className="px-4 py-2 rounded-lg text-sm font-medium bg-white/5 text-muted-foreground hover:text-white hover:bg-white/10 transition-all duration-200"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        setShowRegenerateWarning(false);
                        regenerateSlides();
                      }}
                      className="px-4 py-2 rounded-lg text-sm font-medium bg-brand-gold text-black hover:bg-brand-goldLight transition-all duration-200"
                    >
                      Regenerate
                    </button>
                  </div>
                </div>
              </div>
            )}
            {showMergeWarning && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                <div className="rounded-xl border border-white/10 bg-brand-surface p-6 max-w-md w-full mx-4 space-y-4">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="w-5 h-5 text-yellow-400" />
                    <h3 className="text-lg font-semibold text-white">Merge Slides?</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    This slide may be difficult to read on a TV after merging. Continue anyway?
                  </p>
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => {
                        setShowMergeWarning(false);
                        setPendingMergeSlideId(null);
                      }}
                      className="px-4 py-2 rounded-lg text-sm font-medium bg-white/5 text-muted-foreground hover:text-white hover:bg-white/10 transition-all duration-200"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        if (pendingMergeSlideId) {
                          mergeSlide(pendingMergeSlideId);
                        }
                        setShowMergeWarning(false);
                        setPendingMergeSlideId(null);
                      }}
                      className="px-4 py-2 rounded-lg text-sm font-medium bg-brand-gold text-black hover:bg-brand-goldLight transition-all duration-200"
                    >
                      Merge Anyway
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

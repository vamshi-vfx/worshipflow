"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Plus,
  BookOpen,
  Play,
  Trash2,
  Search,
  ArrowLeft,
  Calendar,
  Sparkles,
  UploadCloud,
  CheckCircle2,
  Filter,
  Layers,
  ChevronRight,
  BookMarked,
  X,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/app/providers";
import { db } from "@/services/database";
import { useToast } from "@/components/toast";
import {
  ALL_BIBLE_BOOKS,
  CORE_TELUGU_SCRIPTURES,
  queryBibleScriptures,
  parseBibleJson,
  parseBibleCsv,
  type BibleBookInfo,
  type BibleVerse,
  type BiblePresentationData,
} from "@/lib/telugu-bible-data";
import type { BiblePresentation } from "@/types";

export default function BiblePage() {
  const router = useRouter();
  const { user } = useAuth();
  const toast = useToast();

  // Navigation State
  const [selectedBook, setSelectedBook] = useState<BibleBookInfo>(ALL_BIBLE_BOOKS[42]); // John (యోహాను) default
  const [selectedChapter, setSelectedChapter] = useState<number>(3);
  const [selectedVerseNumbers, setSelectedVerseNumbers] = useState<number[]>([16]);
  const [testamentFilter, setTestamentFilter] = useState<"ALL" | "OT" | "NT">("NT");
  const [bookSearch, setBookSearch] = useState("");
  const [scriptureSearch, setScriptureSearch] = useState("");
  const [displayMode, setDisplayMode] = useState<"telugu" | "english" | "both">("both");

  // Data State
  const [customVerses, setCustomVerses] = useState<BibleVerse[]>([]);
  const [savedPresentations, setSavedPresentations] = useState<BiblePresentation[]>([]);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importText, setImportText] = useState("");
  const [importFormat, setImportFormat] = useState<"json" | "csv">("json");
  const [activeTab, setActiveTab] = useState<"browse" | "saved" | "search">("browse");

  useEffect(() => {
    if (user) {
      loadSavedPresentations();
    }
  }, [user]);

  const loadSavedPresentations = async () => {
    try {
      if (user) {
        const data = await db.getBiblePresentations(user.id);
        setSavedPresentations(data as BiblePresentation[]);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Filtered Books List
  const filteredBooks = useMemo(() => {
    return ALL_BIBLE_BOOKS.filter((b) => {
      const matchesTestament = testamentFilter === "ALL" || b.testament === testamentFilter;
      const q = bookSearch.toLowerCase().trim();
      const matchesSearch =
        !q ||
        b.nameEn.toLowerCase().includes(q) ||
        b.nameTe.includes(q) ||
        b.shortTe.includes(q);
      return matchesTestament && matchesSearch;
    });
  }, [testamentFilter, bookSearch]);

  // Current Chapter Verses
  const currentChapterVerses = useMemo(() => {
    const all = [...CORE_TELUGU_SCRIPTURES, ...customVerses];
    return all.filter(
      (v) =>
        (v.bookEn.toLowerCase() === selectedBook.nameEn.toLowerCase() ||
          v.bookTe.includes(selectedBook.nameTe)) &&
        v.chapter === selectedChapter
    ).sort((a, b) => a.verse - b.verse);
  }, [selectedBook, selectedChapter, customVerses]);

  // Global Search Results
  const searchResults = useMemo(() => {
    if (!scriptureSearch.trim()) return [];
    return queryBibleScriptures(scriptureSearch, customVerses);
  }, [scriptureSearch, customVerses]);

  // Toggle Verse Selection
  const toggleVerseSelection = (verseNum: number) => {
    setSelectedVerseNumbers((prev) =>
      prev.includes(verseNum) ? prev.filter((n) => n !== verseNum) : [...prev, verseNum].sort((a, b) => a - b)
    );
  };

  // Select all verses in current chapter
  const selectAllChapterVerses = () => {
    if (currentChapterVerses.length === 0) return;
    const allNums = currentChapterVerses.map((v) => v.verse);
    setSelectedVerseNumbers(allNums);
  };

  // PRESENTATION TRIGGER
  const handlePresentScripture = (versesToPresent: BibleVerse[], customRef?: string) => {
    if (versesToPresent.length === 0) {
      toast.addToast("error", "Please select at least one verse to present.");
      return;
    }

    const firstVerse = versesToPresent[0];
    const lastVerse = versesToPresent[versesToPresent.length - 1];
    const verseRange =
      versesToPresent.length === 1
        ? `${firstVerse.verse}`
        : `${firstVerse.verse}-${lastVerse.verse}`;

    const refString = customRef || `${firstVerse.bookTe} ${firstVerse.chapter}:${verseRange}`;

    // Build unified scripture slides
    const combinedText = versesToPresent
      .map((v) => {
        if (displayMode === "telugu") {
          return `${v.verse}. ${v.textTe}`;
        } else if (displayMode === "english") {
          return `${v.verse}. ${v.textEn}`;
        } else {
          return `${v.verse}. ${v.textTe}\n\n${v.textEn}`;
        }
      })
      .join("\n\n---\n\n");

    const presentationPayload: BiblePresentationData = {
      id: crypto.randomUUID(),
      reference: refString,
      bookEn: firstVerse.bookEn,
      bookTe: firstVerse.bookTe,
      chapter: firstVerse.chapter,
      verseStart: firstVerse.verse,
      verseEnd: lastVerse.verse,
      translation: displayMode === "telugu" ? "Telugu" : displayMode === "english" ? "English (ESV)" : "Telugu / English",
      verses: versesToPresent.map((v) => ({
        verseNumber: v.verse,
        textTe: v.textTe,
        textEn: v.textEn,
      })),
      createdAt: new Date().toISOString(),
    };

    // Store in localStorage for Presentation Engine & TV display sync
    localStorage.setItem("church-lyrics-current-bible", JSON.stringify({
      ...presentationPayload,
      text: combinedText,
      book: firstVerse.bookTe,
    }));

    toast.addToast("success", `Presenting ${refString}`);
    router.push("/presentation");
  };

  // Save Bible presentation to Supabase
  const handleSaveToDatabase = async () => {
    if (!user) {
      toast.addToast("info", "Please sign in to save Bible presentations");
      return;
    }

    const verses = currentChapterVerses.filter((v) =>
      selectedVerseNumbers.length === 0 || selectedVerseNumbers.includes(v.verse)
    );

    if (verses.length === 0) {
      toast.addToast("error", "No verses available to save.");
      return;
    }

    const first = verses[0];
    const last = verses[verses.length - 1];
    const fullText = verses
      .map((v) => `${v.verse}. ${v.textTe}\n${v.textEn}`)
      .join("\n\n");

    try {
      await db.createBiblePresentation(
        {
          book: first.bookTe,
          chapter: first.chapter,
          verseStart: first.verse,
          verseEnd: last.verse,
          translation: displayMode === "telugu" ? "Telugu" : displayMode === "english" ? "English" : "Bilingual",
          text: fullText,
        },
        user.id
      );

      toast.addToast("success", "Saved to Scripture Library");
      loadSavedPresentations();
    } catch (e: any) {
      toast.addToast("error", e.message || "Failed to save presentation");
    }
  };

  // Handle Scripture File Import (JSON / CSV)
  const handleExecuteBibleImport = () => {
    if (!importText.trim()) {
      toast.addToast("error", "Please paste scripture content");
      return;
    }

    const res = importFormat === "json" ? parseBibleJson(importText) : parseBibleCsv(importText);

    if (res.error) {
      toast.addToast("error", res.error);
      return;
    }

    if (res.verses.length > 0) {
      setCustomVerses((prev) => [...prev, ...res.verses]);
      toast.addToast("success", `Successfully imported ${res.verses.length} scripture verses!`);
      setIsImportModalOpen(false);
      setImportText("");
    }
  };

  const handleDeleteSaved = async (id: string) => {
    if (!confirm("Delete this saved presentation?")) return;
    if (!user) return;
    try {
      await db.deleteBiblePresentation(id, user.id);
      setSavedPresentations((prev) => prev.filter((p) => p.id !== id));
      toast.addToast("success", "Deleted");
    } catch (e) {
      toast.addToast("error", "Failed to delete");
    }
  };

  return (
    <div className="min-h-screen pb-24 bg-brand-darker">
      {/* Header */}
      <header className="border-b border-white/5 bg-brand-darker/70 backdrop-blur-xl py-6 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Link
                  href="/dashboard"
                  className="p-1.5 rounded-lg bg-white/5 text-muted-foreground hover:text-white transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                </Link>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-white flex items-center gap-2.5">
                  <BookOpen className="w-7 h-7 text-brand-gold" />
                  Telugu & English Bible Presentation
                </h1>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Church Scripture Presentation Engine — 66 Books, Live Verse Selector & Dual-Screen TV Output
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setIsImportModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-semibold hover:bg-white/10 transition-all"
              >
                <UploadCloud className="w-4 h-4 text-brand-gold" />
                Import Scripture File
              </button>

              <button
                onClick={() =>
                  handlePresentScripture(
                    currentChapterVerses.filter(
                      (v) => selectedVerseNumbers.length === 0 || selectedVerseNumbers.includes(v.verse)
                    )
                  )
                }
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-gold text-brand-darker text-xs font-extrabold hover:bg-brand-goldLight shadow-lg shadow-brand-gold/10 transition-all"
              >
                <Play className="w-4 h-4 fill-brand-darker" />
                Present Selected ({selectedVerseNumbers.length > 0 ? selectedVerseNumbers.length : currentChapterVerses.length} Verses)
              </button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-2 mt-6 pt-4 border-t border-white/5">
            <button
              onClick={() => setActiveTab("browse")}
              className={cn(
                "px-4 py-1.5 rounded-lg text-xs font-bold transition-all",
                activeTab === "browse" ? "bg-brand-gold text-brand-darker" : "text-muted-foreground hover:text-white"
              )}
            >
              Browse Scripture
            </button>
            <button
              onClick={() => setActiveTab("search")}
              className={cn(
                "px-4 py-1.5 rounded-lg text-xs font-bold transition-all",
                activeTab === "search" ? "bg-brand-gold text-brand-darker" : "text-muted-foreground hover:text-white"
              )}
            >
              Global Search ({scriptureSearch ? searchResults.length : 0})
            </button>
            <button
              onClick={() => setActiveTab("saved")}
              className={cn(
                "px-4 py-1.5 rounded-lg text-xs font-bold transition-all",
                activeTab === "saved" ? "bg-brand-gold text-brand-darker" : "text-muted-foreground hover:text-white"
              )}
            >
              Saved Readings ({savedPresentations.length})
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-8 space-y-8">
        {/* ======================= BROWSE SCRIPTURE TAB ======================= */}
        {activeTab === "browse" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* LEFT COLUMN: 66 BOOKS SELECTOR (4 Cols) */}
            <div className="lg:col-span-4 space-y-4">
              <div className="glass rounded-2xl p-4 border border-white/10 space-y-3 shadow-xl">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                    <BookMarked className="w-4 h-4 text-brand-gold" />
                    Holy Bible (పరిశుద్ధ గ్రంథము)
                  </h2>
                  <span className="text-[11px] text-brand-gold font-mono font-bold">66 Books</span>
                </div>

                {/* Testament Filter & Book Search */}
                <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/5 text-xs font-semibold">
                  <button
                    onClick={() => setTestamentFilter("ALL")}
                    className={cn(
                      "flex-1 py-1 rounded-lg transition-all",
                      testamentFilter === "ALL" ? "bg-brand-gold text-brand-darker font-bold" : "text-muted-foreground hover:text-white"
                    )}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setTestamentFilter("OT")}
                    className={cn(
                      "flex-1 py-1 rounded-lg transition-all",
                      testamentFilter === "OT" ? "bg-brand-gold text-brand-darker font-bold" : "text-muted-foreground hover:text-white"
                    )}
                  >
                    Old (పాత)
                  </button>
                  <button
                    onClick={() => setTestamentFilter("NT")}
                    className={cn(
                      "flex-1 py-1 rounded-lg transition-all",
                      testamentFilter === "NT" ? "bg-brand-gold text-brand-darker font-bold" : "text-muted-foreground hover:text-white"
                    )}
                  >
                    New (క్రొత్త)
                  </button>
                </div>

                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search books (e.g. John, ఆదికాండము, యోహాను)..."
                    value={bookSearch}
                    onChange={(e) => setBookSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-brand-gold"
                  />
                </div>

                {/* Books List */}
                <div className="max-h-[500px] overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                  {filteredBooks.map((book) => {
                    const isSelected = selectedBook.id === book.id;
                    return (
                      <button
                        key={book.id}
                        onClick={() => {
                          setSelectedBook(book);
                          setSelectedChapter(1);
                          setSelectedVerseNumbers([1]);
                        }}
                        className={cn(
                          "w-full px-3 py-2.5 rounded-xl text-left flex items-center justify-between transition-all group",
                          isSelected
                            ? "bg-brand-gold text-brand-darker font-bold shadow-md"
                            : "bg-white/[0.03] text-white/90 hover:bg-white/[0.08]"
                        )}
                      >
                        <div className="min-w-0 pr-2">
                          <div className="text-sm font-semibold truncate leading-tight">{book.nameTe}</div>
                          <div className={cn("text-[11px] truncate", isSelected ? "text-brand-darker/80" : "text-muted-foreground")}>
                            {book.nameEn}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <span
                            className={cn(
                              "text-[10px] px-1.5 py-0.5 rounded font-mono",
                              isSelected ? "bg-brand-darker/20 text-brand-darker" : "bg-white/5 text-muted-foreground"
                            )}
                          >
                            {book.totalChapters} Ch
                          </span>
                          <ChevronRight className={cn("w-3.5 h-3.5 opacity-60", isSelected ? "text-brand-darker" : "text-muted-foreground")} />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: CHAPTERS, VERSES & PRESENTATION PREVIEW (8 Cols) */}
            <div className="lg:col-span-8 space-y-6">
              {/* Selected Book Header & Chapter Grid */}
              <div className="glass rounded-2xl p-6 border border-white/10 space-y-4 shadow-xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/5">
                  <div>
                    <h2 className="text-2xl font-extrabold text-white flex items-center gap-2">
                      {selectedBook.nameTe}
                      <span className="text-base text-brand-gold font-normal font-sans">({selectedBook.nameEn})</span>
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      {selectedBook.testament === "OT" ? "Old Testament (పాత నిబంధన)" : "New Testament (క్రొత్త నిబంధన)"} • {selectedBook.totalChapters} Chapters
                    </p>
                  </div>

                  {/* Language / Translation Toggle */}
                  <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10 text-xs font-semibold self-start sm:self-auto">
                    <button
                      onClick={() => setDisplayMode("telugu")}
                      className={cn(
                        "px-3 py-1 rounded-lg transition-all",
                        displayMode === "telugu" ? "bg-brand-gold text-brand-darker font-bold" : "text-muted-foreground hover:text-white"
                      )}
                    >
                      Telugu
                    </button>
                    <button
                      onClick={() => setDisplayMode("english")}
                      className={cn(
                        "px-3 py-1 rounded-lg transition-all",
                        displayMode === "english" ? "bg-brand-gold text-brand-darker font-bold" : "text-muted-foreground hover:text-white"
                      )}
                    >
                      English
                    </button>
                    <button
                      onClick={() => setDisplayMode("both")}
                      className={cn(
                        "px-3 py-1 rounded-lg transition-all",
                        displayMode === "both" ? "bg-brand-gold text-brand-darker font-bold" : "text-muted-foreground hover:text-white"
                      )}
                    >
                      Bilingual (రెండు)
                    </button>
                  </div>
                </div>

                {/* Chapters Grid */}
                <div className="space-y-2">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Select Chapter</span>
                  <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto pr-1">
                    {Array.from({ length: selectedBook.totalChapters }, (_, i) => i + 1).map((ch) => (
                      <button
                        key={ch}
                        onClick={() => {
                          setSelectedChapter(ch);
                          setSelectedVerseNumbers([1]);
                        }}
                        className={cn(
                          "w-9 h-9 rounded-xl font-mono text-xs font-bold flex items-center justify-center transition-all",
                          selectedChapter === ch
                            ? "bg-brand-gold text-brand-darker shadow-lg shadow-brand-gold/20 scale-105"
                            : "bg-white/5 text-white/80 hover:bg-white/10 hover:text-white"
                        )}
                      >
                        {ch}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Verses Selection & Live Preview */}
              <div className="glass rounded-2xl p-6 border border-white/10 space-y-4 shadow-xl">
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/5">
                  <div className="flex items-center gap-3">
                    <h3 className="text-base font-bold text-white">
                      {selectedBook.nameTe} — Chapter {selectedChapter}
                    </h3>
                    <span className="text-xs text-brand-gold font-mono font-semibold">
                      {selectedVerseNumbers.length > 0 ? `${selectedVerseNumbers.length} selected` : "All"}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={selectAllChapterVerses}
                      className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white text-xs font-semibold hover:bg-white/10"
                    >
                      Select All Chapter
                    </button>
                    <button
                      onClick={handleSaveToDatabase}
                      className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white text-xs font-semibold hover:bg-white/10 flex items-center gap-1.5"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-brand-gold" />
                      Save to Library
                    </button>
                  </div>
                </div>

                {/* Verses List */}
                <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                  {currentChapterVerses.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground bg-white/[0.02] rounded-xl border border-white/5 space-y-2">
                      <BookOpen className="w-8 h-8 mx-auto text-brand-gold opacity-50" />
                      <p className="text-sm text-white font-medium">
                        {selectedBook.nameTe} Chapter {selectedChapter}
                      </p>
                      <p className="text-xs text-muted-foreground max-w-md mx-auto">
                        This chapter can be presented using custom Bible files or pre-loaded scriptures. Use the Import Scripture File button to add full chapter text.
                      </p>
                      <button
                        onClick={() => {
                          // Allow quick presentation of reference
                          handlePresentScripture([
                            {
                              bookEn: selectedBook.nameEn,
                              bookTe: selectedBook.nameTe,
                              chapter: selectedChapter,
                              verse: 1,
                              textTe: `${selectedBook.nameTe} ${selectedChapter}వ అధ్యాయము`,
                              textEn: `${selectedBook.nameEn} Chapter ${selectedChapter}`,
                            },
                          ]);
                        }}
                        className="mt-3 px-4 py-2 rounded-xl bg-brand-gold text-brand-darker text-xs font-bold inline-flex items-center gap-1.5"
                      >
                        <Play className="w-3.5 h-3.5 fill-brand-darker" />
                        Present Reference Header
                      </button>
                    </div>
                  ) : (
                    currentChapterVerses.map((verse) => {
                      const isSelected = selectedVerseNumbers.includes(verse.verse);
                      return (
                        <div
                          key={verse.verse}
                          onClick={() => toggleVerseSelection(verse.verse)}
                          className={cn(
                            "p-4 rounded-xl border transition-all cursor-pointer flex gap-4 group",
                            isSelected
                              ? "bg-brand-gold/10 border-brand-gold/40 shadow-md"
                              : "bg-white/[0.02] border-white/5 hover:bg-white/[0.05]"
                          )}
                        >
                          <div className="flex flex-col items-center flex-shrink-0 pt-0.5">
                            <span
                              className={cn(
                                "w-7 h-7 rounded-lg font-mono text-xs font-extrabold flex items-center justify-center transition-colors",
                                isSelected
                                  ? "bg-brand-gold text-brand-darker shadow"
                                  : "bg-white/10 text-white/80 group-hover:bg-white/20"
                              )}
                            >
                              {verse.verse}
                            </span>
                          </div>

                          <div className="space-y-1.5 min-w-0 flex-1">
                            {(displayMode === "telugu" || displayMode === "both") && (
                              <p className="text-base text-white/95 leading-relaxed font-medium">
                                {verse.textTe}
                              </p>
                            )}
                            {(displayMode === "english" || displayMode === "both") && (
                              <p className="text-xs text-brand-gold/80 italic leading-normal">
                                {verse.textEn}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ======================= GLOBAL SEARCH TAB ======================= */}
        {activeTab === "search" && (
          <div className="space-y-6 max-w-4xl mx-auto">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search scripture by reference (e.g. John 3:16, యోహాను 3:16, Psalm 23, రోమీయులకు 8:28) or Telugu/English keywords..."
                value={scriptureSearch}
                onChange={(e) => setScriptureSearch(e.target.value)}
                className="w-full pl-11 pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl text-sm text-white placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand-gold/50 shadow-xl"
              />
            </div>

            <div className="space-y-4">
              {searchResults.length === 0 ? (
                <div className="glass rounded-2xl p-12 text-center text-muted-foreground border border-white/5">
                  <Search className="w-10 h-10 mx-auto mb-3 opacity-40 text-brand-gold" />
                  <p className="text-white font-medium">No matching scripture found</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Try searching &ldquo;John 3:16&rdquo;, &ldquo;కీర్తనలు 23&rdquo;, &ldquo;ప్రేమ&rdquo;, or &ldquo;Shepherd&rdquo;.
                  </p>
                </div>
              ) : (
                searchResults.map((verse, idx) => (
                  <div
                    key={idx}
                    className="glass rounded-2xl p-5 border border-white/10 hover:border-brand-gold/40 transition-all space-y-3 shadow-lg"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-sm font-bold text-brand-gold">
                        {verse.bookTe} ({verse.bookEn}) {verse.chapter}:{verse.verse}
                      </span>
                      <button
                        onClick={() => handlePresentScripture([verse])}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-gold text-brand-darker text-xs font-bold hover:bg-brand-goldLight shadow transition-all"
                      >
                        <Play className="w-3.5 h-3.5 fill-brand-darker" />
                        Present Verse
                      </button>
                    </div>

                    <p className="text-base text-white/95 leading-relaxed font-medium">{verse.textTe}</p>
                    <p className="text-xs text-muted-foreground italic">&ldquo;{verse.textEn}&rdquo;</p>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ======================= SAVED READINGS TAB ======================= */}
        {activeTab === "saved" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-white">Custom Saved Bible Readings</h2>
                <p className="text-xs text-muted-foreground">Manage your custom church scripture presentations</p>
              </div>
            </div>

            {savedPresentations.length === 0 ? (
              <div className="glass rounded-2xl p-12 text-center text-muted-foreground border border-white/5">
                <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-40 text-brand-gold" />
                <p className="text-white font-medium">No saved Bible readings yet</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Select verses in the &ldquo;Browse Scripture&rdquo; tab and click &ldquo;Save to Library&rdquo;.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {savedPresentations.map((p) => (
                  <div
                    key={p.id}
                    className="glass rounded-2xl p-5 border border-white/10 hover:border-brand-gold/30 transition-all flex flex-col justify-between group shadow-lg"
                  >
                    <div>
                      <h3 className="font-bold text-white text-base mb-1">
                        {p.book} {p.chapter}:{p.verseStart}
                        {p.verseEnd ? `-${p.verseEnd}` : ""}
                      </h3>
                      <p className="text-[11px] text-brand-gold font-mono mb-2">{p.translation}</p>
                      <p className="text-xs text-white/80 line-clamp-3 leading-relaxed">{p.text}</p>
                    </div>

                    <div className="pt-3 mt-4 border-t border-white/5 flex items-center justify-between">
                      <button
                        onClick={() => {
                          localStorage.setItem("church-lyrics-current-bible", JSON.stringify(p));
                          router.push("/presentation");
                        }}
                        className="px-3.5 py-1.5 rounded-lg bg-brand-gold text-brand-darker text-xs font-bold flex items-center gap-1.5 shadow hover:bg-brand-goldLight"
                      >
                        <Play className="w-3 h-3 fill-brand-darker" /> Present
                      </button>
                      <button
                        onClick={() => handleDeleteSaved(p.id)}
                        className="p-1.5 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* ======================= IMPORT MODAL ======================= */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass rounded-2xl max-w-2xl w-full p-6 border border-white/15 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <UploadCloud className="w-5 h-5 text-brand-gold" />
                Import Scripture File (JSON / CSV)
              </h2>
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Format:</span>
                <button
                  onClick={() => setImportFormat("json")}
                  className={cn(
                    "px-3 py-1 rounded-lg text-xs font-bold transition-all",
                    importFormat === "json" ? "bg-brand-gold text-brand-darker" : "bg-white/5 text-white/70"
                  )}
                >
                  JSON
                </button>
                <button
                  onClick={() => setImportFormat("csv")}
                  className={cn(
                    "px-3 py-1 rounded-lg text-xs font-bold transition-all",
                    importFormat === "csv" ? "bg-brand-gold text-brand-darker" : "bg-white/5 text-white/70"
                  )}
                >
                  CSV
                </button>
              </div>

              <textarea
                rows={10}
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                placeholder={
                  importFormat === "json"
                    ? `[
  {
    "book": "John",
    "bookTe": "యోహాను",
    "chapter": 1,
    "verse": 1,
    "textTe": "ఆదియందు వాక్యము ఉండెను...",
    "textEn": "In the beginning was the Word..."
  }
]`
                    : `book,chapter,verse,telugu_text,english_text
"John",1,1,"ఆదియందు వాక్యము ఉండెను...","In the beginning was the Word..."`
                }
                className="w-full p-4 bg-black/40 border border-white/10 rounded-xl font-mono text-xs text-white placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-brand-gold"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-white/5 text-white text-xs font-semibold hover:bg-white/10"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteBibleImport}
                className="px-5 py-2 rounded-xl bg-brand-gold text-brand-darker text-xs font-extrabold hover:bg-brand-goldLight shadow"
              >
                Import Verses
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

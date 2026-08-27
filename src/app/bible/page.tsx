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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/app/providers";
import { db } from "@/services/database";
import { POPULAR_VERSES, searchBibleVerses, type BibleVerseItem } from "@/lib/bible-data";
import { useToast } from "@/components/toast";
import type { BiblePresentation } from "@/types";

export default function BiblePage() {
  const router = useRouter();
  const { user } = useAuth();
  const toast = useToast();

  const [presentations, setPresentations] = useState<BiblePresentation[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadPresentations();
  }, [user]);

  const loadPresentations = async () => {
    try {
      if (user) {
        const data = await db.getBiblePresentations(user.id);
        setPresentations(data as BiblePresentation[]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const matchingVerses = useMemo(() => {
    return searchBibleVerses(searchQuery);
  }, [searchQuery]);

  const handlePresentPreset = (verse: BibleVerseItem) => {
    const biblePres = {
      id: crypto.randomUUID(),
      book: verse.book,
      chapter: verse.chapter,
      verseStart: parseInt(verse.verse.split("-")[0]) || 1,
      verseEnd: parseInt(verse.verse.split("-")[1] || verse.verse) || 1,
      translation: "Telugu / English",
      text: `${verse.teluguText}\n\n${verse.englishText}`,
      createdAt: new Date().toISOString(),
    };
    localStorage.setItem("church-lyrics-current-bible", JSON.stringify(biblePres));
    router.push("/presentation");
  };

  const handlePresentSaved = (presentation: BiblePresentation) => {
    localStorage.setItem("church-lyrics-current-bible", JSON.stringify(presentation));
    router.push("/presentation");
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this Bible presentation?")) return;
    if (!user) return;
    try {
      await db.deleteBiblePresentation(id, user.id);
      setPresentations((prev) => prev.filter((p) => p.id !== id));
      toast.addToast("success", "Bible presentation deleted");
    } catch (e) {
      console.error(e);
      toast.addToast("error", "Failed to delete presentation");
    }
  };

  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <header className="border-b border-white/5 bg-brand-darker/60 backdrop-blur-xl py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Link href="/" className="p-1.5 rounded-lg bg-white/5 text-muted-foreground hover:text-white transition-colors">
                  <ArrowLeft className="w-4 h-4" />
                </Link>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-white flex items-center gap-2.5">
                  <BookOpen className="w-7 h-7 text-brand-gold" />
                  Scripture & Bible Engine
                </h1>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Search, customize, and present bilingual Bible passages (Telugu & English) during church services
              </p>
            </div>

            <Link
              href="/bible/new"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-gold text-brand-darker text-xs font-bold hover:bg-brand-goldLight shadow transition-all self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              New Scripture Slide
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-8 space-y-10">
        {/* Search Scripture Section */}
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search scripture by reference (e.g., John 3:16, Psalm 23), keyword, or theme..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-3.5 bg-white/5 border border-white/10 rounded-2xl text-sm text-white placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand-gold/50"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {matchingVerses.map((verse, idx) => (
              <div
                key={idx}
                className="glass rounded-2xl p-5 border border-white/5 hover:border-brand-gold/30 transition-all flex flex-col justify-between group shadow-md"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-sm font-bold text-brand-gold">{verse.reference}</span>
                    <span className="px-2.5 py-0.5 rounded-full bg-white/5 text-[10px] text-muted-foreground">
                      {verse.theme}
                    </span>
                  </div>

                  <p className="text-base text-white/95 leading-relaxed font-medium mb-2">
                    {verse.teluguText}
                  </p>
                  <p className="text-xs text-muted-foreground italic mb-4">
                    &ldquo;{verse.englishText}&rdquo;
                  </p>
                </div>

                <div className="pt-3 border-t border-white/5 flex items-center justify-between">
                  <button
                    onClick={() => handlePresentPreset(verse)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-gold text-brand-darker text-xs font-bold hover:bg-brand-goldLight transition-all"
                  >
                    <Play className="w-3.5 h-3.5 fill-brand-darker" />
                    Present Scripture
                  </button>

                  <Link
                    href={`/services/new?scripture=${encodeURIComponent(verse.reference)}`}
                    className="text-xs text-muted-foreground hover:text-white flex items-center gap-1"
                  >
                    <Calendar className="w-3.5 h-3.5 text-blue-400" />
                    Add to Service
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* User Saved Presentations */}
        {presentations.length > 0 && (
          <div className="space-y-4 pt-6 border-t border-white/5">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-brand-gold" />
              Custom Saved Bible Readings ({presentations.length})
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {presentations.map((p) => (
                <div
                  key={p.id}
                  className="glass rounded-xl p-5 border border-white/5 flex flex-col justify-between group"
                >
                  <div>
                    <h3 className="font-bold text-white text-base mb-1">
                      {p.book} {p.chapter}:{p.verseStart}{p.verseEnd ? `-${p.verseEnd}` : ""}
                    </h3>
                    <p className="text-xs text-muted-foreground font-mono mb-2">{p.translation}</p>
                    <p className="text-xs text-white/80 line-clamp-3 leading-relaxed">{p.text}</p>
                  </div>

                  <div className="pt-3 mt-4 border-t border-white/5 flex items-center justify-between">
                    <button
                      onClick={() => handlePresentSaved(p)}
                      className="px-3 py-1.5 rounded-lg bg-brand-gold text-brand-darker text-xs font-bold flex items-center gap-1"
                    >
                      <Play className="w-3 h-3 fill-brand-darker" /> Present
                    </button>
                    <button
                      onClick={() => handleDelete(p.id)}
                      className="p-1.5 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

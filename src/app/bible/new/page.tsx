"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Save,
  BookOpen,
  Loader2,
} from "lucide-react";
import { useAuth } from "@/app/providers";
import { db } from "@/services/database";

export default function NewBiblePage() {
  const router = useRouter();
  const { user } = useAuth();
  const [book, setBook] = useState("");
  const [chapter, setChapter] = useState("");
  const [verseStart, setVerseStart] = useState("");
  const [verseEnd, setVerseEnd] = useState("");
  const [translation, setTranslation] = useState("ESV");
  const [text, setText] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!book.trim() || !text.trim()) {
      alert("Please fill in all required fields");
      return;
    }

    if (!user) {
      alert("You must be logged in to save Bible presentations");
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      await db.createBiblePresentation({
        book,
        chapter: parseInt(chapter) || 1,
        verse_start: parseInt(verseStart) || 1,
        verse_end: parseInt(verseEnd) || parseInt(verseStart) || 1,
        translation,
        text,
      }, user.id);
      router.push("/bible");
    } catch (e) {
      console.error("Failed to save bible presentation", e);
      setError("Failed to save Bible presentation. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-darker">
      <header className="h-16 border-b border-white/5 flex items-center justify-between px-8">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push("/bible")}
            className="text-muted-foreground hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="text-lg font-semibold text-white">New Bible Presentation</h2>
        </div>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="px-4 py-2 bg-brand-gold text-brand-darker font-semibold rounded-lg hover:bg-brand-goldLight transition-colors flex items-center gap-2 disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {isSaving ? "Saving..." : "Save"}
        </button>
      </header>

      {error && (
        <div className="mx-8 mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400">
          {error}
        </div>
      )}

      <div className="p-8 max-w-2xl">
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-muted-foreground mb-1.5">Book</label>
              <input
                type="text"
                placeholder="John"
                value={book}
                onChange={(e) => setBook(e.target.value)}
                className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-brand-gold/50"
              />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1.5">Chapter</label>
              <input
                type="number"
                placeholder="3"
                value={chapter}
                onChange={(e) => setChapter(e.target.value)}
                className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-brand-gold/50"
              />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1.5">Verse Range</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  placeholder="16"
                  value={verseStart}
                  onChange={(e) => setVerseStart(e.target.value)}
                  className="flex-1 px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-brand-gold/50"
                />
                <span className="text-muted-foreground">-</span>
                <input
                  type="number"
                  placeholder="18"
                  value={verseEnd}
                  onChange={(e) => setVerseEnd(e.target.value)}
                  className="flex-1 px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-brand-gold/50"
                />
              </div>
            </div>
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1.5">Translation</label>
            <select
              value={translation}
              onChange={(e) => setTranslation(e.target.value)}
              className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-1 focus:ring-brand-gold/50"
            >
              <option value="ESV">ESV</option>
              <option value="NIV">NIV</option>
              <option value="KJV">KJV</option>
              <option value="NLT">NLT</option>
              <option value="CSB">CSB</option>
              <option value="NASB">NASB</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1.5">Verse Text</label>
            <textarea
              placeholder="Enter the Bible verse text..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={8}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-brand-gold/50 resize-none telugu-text"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

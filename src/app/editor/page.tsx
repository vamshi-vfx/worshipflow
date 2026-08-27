"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Save,
  Play,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Copy,
  Type,
  Mic2,
  Loader2,
  Star,
  ArrowLeft,
  Music2,
  Code,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/app/providers";
import { db } from "@/services/database";
import { useToast } from "@/components/toast";
import type { Song, SongSection, LyricLine, Language, SectionType, DisplayMode } from "@/types";

const LANGUAGES: { value: Language; label: string }[] = [
  { value: "telugu", label: "Telugu" },
  { value: "english", label: "English" },
  { value: "hindi", label: "Hindi" },
  { value: "mixed", label: "Mixed" },
];

const DISPLAY_MODES: { value: DisplayMode; label: string }[] = [
  { value: "telugu", label: "Telugu" },
  { value: "english", label: "English" },
  { value: "hindi", label: "Hindi" },
  { value: "transliteration", label: "Transliteration" },
  { value: "mixed", label: "Mixed" },
  { value: "both", label: "Both" },
];

const SECTION_TYPES: { value: SectionType; label: string }[] = [
  { value: "verse", label: "Verse" },
  { value: "chorus", label: "Chorus" },
  { value: "bridge", label: "Bridge" },
  { value: "intro", label: "Intro" },
  { value: "outro", label: "Outro" },
  { value: "tag", label: "Tag" },
  { value: "custom", label: "Custom" },
];

function createEmptyLine(order: number): LyricLine {
  return {
    id: crypto.randomUUID(),
    order,
    primaryText: "",
    secondaryText: "",
    language: "telugu",
    displayMode: "telugu",
  };
}

function createEmptySection(type: SectionType = "verse", label = "Verse 1"): SongSection {
  return {
    id: crypto.randomUUID(),
    type,
    label,
    order: 0,
    repeatCount: 1,
    lines: [createEmptyLine(0)],
  };
}

export default function SongEditorPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-brand-darker flex items-center justify-center text-white">Loading Editor...</div>}>
      <SongEditorInner />
    </Suspense>
  );
}

function SongEditorInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const songId = searchParams.get("id");
  const { user } = useAuth();
  const toast = useToast();

  const [isLoading, setIsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showChordsTab, setShowChordsTab] = useState(false);

  const [formData, setFormData] = useState<Partial<Song>>({
    title: "",
    romanizedTitle: "",
    englishTitle: "",
    language: "telugu",
    category: "worship",
    artist: "",
    author: "",
    lyricist: "",
    composer: "",
    key: "C",
    tempo: 72,
    chords: "",
    tags: [],
    sections: [],
    favorite: false,
  });

  const [newTag, setNewTag] = useState("");

  useEffect(() => {
    if (songId && songId !== "new" && user) {
      loadSong(songId);
    } else {
      setFormData((prev) => ({
        ...prev,
        sections: [createEmptySection("verse", "Verse 1")],
      }));
    }
  }, [songId, user]);

  const loadSong = async (id: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const song = await db.getSong(id, user?.id);
      if (song) {
        setFormData(song as Song);
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
              language: line.language as Language,
              displayMode: line.display_mode as DisplayMode,
            })),
          } as SongSection;
        })
      );

      if (sectionsWithLines.length > 0) {
        setFormData((prev) => ({
          ...prev,
          sections: sectionsWithLines,
        }));
        setActiveSectionId(sectionsWithLines[0].id);
      }
    } catch (e) {
      console.error("Failed to load song", e);
      setError("Failed to load song");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.title?.trim()) {
      toast.addToast("error", "Please enter a song title");
      return;
    }

    if (!user) {
      toast.addToast("error", "Your session has expired. Please sign in again.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const isNew = !songId || songId === "new";
      let songIdToUse = isNew ? "" : songId;

      // Assemble flat lyrics string from all section lines
      const sections = formData.sections || [];
      const lyricsFromSections = sections
        .map((sec) => {
          const sectionHeader = `[${sec.label}]`;
          const sectionLines = sec.lines
            .map((l) => l.primaryText)
            .filter(Boolean)
            .join("\n");
          return sectionLines ? `${sectionHeader}\n${sectionLines}` : "";
        })
        .filter(Boolean)
        .join("\n\n");

      const payload: Record<string, unknown> = {
        title: formData.title,
        romanized_title: formData.romanizedTitle || formData.title,
        english_title: formData.englishTitle || "",
        language: formData.language || "telugu",
        category: formData.category || "worship",
        artist: formData.artist || formData.author || "",
        author: formData.author || formData.artist || "",
        lyricist: formData.lyricist || "",
        composer: formData.composer || "",
        key: formData.key || "",
        tempo: formData.tempo || 72,
        // Include assembled lyrics so songs.lyrics is always populated
        lyrics: lyricsFromSections || formData.chords || "",
        chords: formData.chords || "",
        tags: formData.tags || [],
        favorite: formData.favorite || false,
      };

      if (!isNew && songIdToUse) {
        await db.updateSong(songIdToUse, payload, user.id);
      } else {
        payload.slug = formData.title.toLowerCase().replace(/[^a-z0-9]+/g, "-") + "-" + Date.now().toString().slice(-4);
        const created = await db.createSong(payload, user.id);
        songIdToUse = created.id;
      }

      // Save sections and lines
      if (songIdToUse) {
        await db.deleteSongSections(songIdToUse);

        for (let sIdx = 0; sIdx < sections.length; sIdx++) {
          const sec = sections[sIdx];
          const newSec = await db.createSongSection({
            song_id: songIdToUse,
            type: sec.type,
            label: sec.label,
            order: sIdx,
            repeat_count: sec.repeatCount || 1,
          });

          if (newSec?.id && sec.lines.length > 0) {
            const linesPayload = sec.lines.map((l, lIdx) => ({
              section_id: newSec.id,
              order: lIdx,
              primary_text: l.primaryText,
              secondary_text: l.secondaryText || "",
              chords: l.chords || "",
              language: l.language || formData.language || "telugu",
              display_mode: l.displayMode || "telugu",
            }));
            await db.createSongLines(linesPayload);
          }
        }
      }

      toast.addToast("success", "Song saved successfully");
      router.push(`/songs/${songIdToUse}`);
    } catch (e: any) {
      console.error("Failed to save song", e);
      // Show actual Supabase error if available, not a generic message
      const msg =
        e?.message ||
        e?.error_description ||
        "Failed to save song. Please check required fields.";
      setError(msg);
      toast.addToast("error", msg);
    } finally {
      setSaving(false);
    }
  };

  const addSection = (type: SectionType, label: string) => {
    const newSection = createEmptySection(type, label);
    setFormData((prev) => ({
      ...prev,
      sections: [...(prev.sections || []), newSection],
    }));
    setActiveSectionId(newSection.id);
  };

  const removeSection = (sectionId: string) => {
    setFormData((prev) => ({
      ...prev,
      sections: prev.sections?.filter((s) => s.id !== sectionId) || [],
    }));
  };

  const updateSection = (sectionId: string, updates: Partial<SongSection>) => {
    setFormData((prev) => ({
      ...prev,
      sections:
        prev.sections?.map((s) => (s.id === sectionId ? { ...s, ...updates } : s)) || [],
    }));
  };

  const addLine = (sectionId: string) => {
    setFormData((prev) => ({
      ...prev,
      sections:
        prev.sections?.map((s) => {
          if (s.id !== sectionId) return s;
          const newLine = createEmptyLine(s.lines.length);
          return {
            ...s,
            lines: [...s.lines, newLine],
          };
        }) || [],
    }));
  };

  const updateLine = (sectionId: string, lineId: string, updates: Partial<LyricLine>) => {
    setFormData((prev) => ({
      ...prev,
      sections:
        prev.sections?.map((s) => {
          if (s.id !== sectionId) return s;
          return {
            ...s,
            lines: s.lines.map((l) => (l.id === lineId ? { ...l, ...updates } : l)),
          };
        }) || [],
    }));
  };

  const removeLine = (sectionId: string, lineId: string) => {
    setFormData((prev) => ({
      ...prev,
      sections:
        prev.sections?.map((s) => {
          if (s.id !== sectionId) return s;
          return {
            ...s,
            lines: s.lines.filter((l) => l.id !== lineId).map((l, i) => ({ ...l, order: i })),
          };
        }) || [],
    }));
  };

  const addTag = () => {
    if (newTag.trim() && !formData.tags?.includes(newTag.trim())) {
      setFormData((prev) => ({
        ...prev,
        tags: [...(prev.tags || []), newTag.trim()],
      }));
      setNewTag("");
    }
  };

  const removeTag = (tag: string) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags?.filter((t) => t !== tag) || [],
    }));
  };

  return (
    <div className="min-h-screen bg-brand-darker flex flex-col">
      {/* Top Header */}
      <header className="h-16 border-b border-white/5 flex items-center justify-between px-6 sticky top-16 bg-brand-darker/90 backdrop-blur-xl z-40">
        <div className="flex items-center gap-4 flex-1">
          <Link
            href="/songs"
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex-1 max-w-lg">
            <input
              type="text"
              placeholder="Song Title (e.g. Krupa Naatho Undi / Amazing Grace)"
              value={formData.title || ""}
              onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
              className="bg-transparent text-lg font-bold text-white placeholder:text-muted-foreground/50 focus:outline-none w-full"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setFormData((prev) => ({ ...prev, favorite: !prev.favorite }))}
            className={cn(
              "p-2 rounded-xl border transition-colors",
              formData.favorite
                ? "bg-brand-gold/20 border-brand-gold/40 text-brand-gold"
                : "bg-white/5 border-white/10 text-muted-foreground hover:text-white"
            )}
            title="Favorite"
          >
            <Star className={cn("w-4 h-4", formData.favorite && "fill-brand-gold")} />
          </button>

          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-brand-gold text-brand-darker font-bold text-xs hover:bg-brand-goldLight shadow-lg transition-all disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? "Saving..." : "Save Song"}
          </button>
        </div>
      </header>

      {error && (
        <div className="mx-6 mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-400">
          {error}
        </div>
      )}

      {/* 2-Column Editor Layout */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Left Metadata Panel */}
        <div className="w-full md:w-80 border-r border-white/5 p-6 overflow-y-auto space-y-5 bg-brand-surface/30">
          <h3 className="text-xs font-bold text-brand-gold uppercase tracking-wider">Song Metadata</h3>

          <div className="space-y-4 text-xs">
            <div>
              <label className="block text-muted-foreground mb-1.5 font-semibold">Romanized / Transliterated Title</label>
              <input
                type="text"
                placeholder="e.g. Yesayya Naa Balamu"
                value={formData.romanizedTitle || ""}
                onChange={(e) => setFormData((prev) => ({ ...prev, romanizedTitle: e.target.value }))}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-brand-gold"
              />
            </div>

            <div>
              <label className="block text-muted-foreground mb-1.5 font-semibold">Language</label>
              <select
                value={formData.language || "telugu"}
                onChange={(e) => setFormData((prev) => ({ ...prev, language: e.target.value as Language }))}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-brand-gold"
              >
                {LANGUAGES.map((lang) => (
                  <option key={lang.value} value={lang.value}>
                    {lang.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-muted-foreground mb-1.5 font-semibold">Category</label>
              <input
                type="text"
                placeholder="worship, praise, prayer..."
                value={formData.category || ""}
                onChange={(e) => setFormData((prev) => ({ ...prev, category: e.target.value }))}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-brand-gold capitalize"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-muted-foreground mb-1.5 font-semibold">Musical Key</label>
                <input
                  type="text"
                  placeholder="C, D, Em..."
                  value={formData.key || ""}
                  onChange={(e) => setFormData((prev) => ({ ...prev, key: e.target.value }))}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-brand-gold font-mono"
                />
              </div>
              <div>
                <label className="block text-muted-foreground mb-1.5 font-semibold">Tempo (BPM)</label>
                <input
                  type="number"
                  placeholder="72"
                  value={formData.tempo || 72}
                  onChange={(e) => setFormData((prev) => ({ ...prev, tempo: parseInt(e.target.value) || 72 }))}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-brand-gold font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-muted-foreground mb-1.5 font-semibold">Artist / Author</label>
              <input
                type="text"
                placeholder="e.g. John Newton"
                value={formData.artist || ""}
                onChange={(e) => setFormData((prev) => ({ ...prev, artist: e.target.value }))}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-brand-gold"
              />
            </div>

            <div>
              <label className="block text-muted-foreground mb-1.5 font-semibold">Lyricist / Composer</label>
              <input
                type="text"
                placeholder="Lyricist name"
                value={formData.lyricist || ""}
                onChange={(e) => setFormData((prev) => ({ ...prev, lyricist: e.target.value }))}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-brand-gold"
              />
            </div>

            {/* Tags */}
            <div>
              <label className="block text-muted-foreground mb-1.5 font-semibold">Tags</label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {formData.tags?.map((t) => (
                  <span key={t} className="px-2 py-0.5 rounded bg-white/10 text-white text-[11px] flex items-center gap-1">
                    {t}
                    <button onClick={() => removeTag(t)} className="text-muted-foreground hover:text-white">×</button>
                  </span>
                ))}
              </div>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  placeholder="Add tag"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
                  className="flex-1 px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:ring-1 focus:ring-brand-gold"
                />
                <button onClick={addTag} className="px-2.5 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-xs text-white">
                  +
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Lyric & Chords Editor */}
        <div className="flex-1 flex flex-col overflow-y-auto p-6 space-y-6">
          {/* Editor Mode Tabs */}
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowChordsTab(false)}
                className={cn(
                  "px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all",
                  !showChordsTab ? "bg-brand-gold text-brand-darker shadow" : "text-muted-foreground hover:text-white"
                )}
              >
                Lyrics & Sections
              </button>
              <button
                onClick={() => setShowChordsTab(true)}
                className={cn(
                  "px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5",
                  showChordsTab ? "bg-brand-gold text-brand-darker shadow" : "text-muted-foreground hover:text-white"
                )}
              >
                <Music2 className="w-3.5 h-3.5" />
                ChordPro Editor
              </button>
            </div>

            {/* Quick Section Adders */}
            {!showChordsTab && (
              <div className="flex flex-wrap items-center gap-1.5">
                {SECTION_TYPES.map((st) => (
                  <button
                    key={st.value}
                    onClick={() => addSection(st.value, st.label)}
                    className="px-2.5 py-1 rounded-md bg-white/5 hover:bg-white/10 text-white text-[11px] font-medium border border-white/5 transition-colors"
                  >
                    + {st.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* TAB 1: SECTION BY SECTION LYRICS */}
          {!showChordsTab ? (
            <div className="space-y-6 max-w-3xl">
              {formData.sections?.map((section, sIdx) => (
                <div key={section.id} className="glass rounded-2xl p-5 border border-white/10 space-y-4">
                  <div className="flex items-center justify-between">
                    <input
                      type="text"
                      value={section.label}
                      onChange={(e) => updateSection(section.id, { label: e.target.value })}
                      className="text-xs font-bold text-brand-gold uppercase tracking-wider bg-transparent border-b border-brand-gold/30 focus:outline-none px-1"
                    />

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => addLine(section.id)}
                        className="px-2.5 py-1 rounded-lg bg-brand-gold/15 text-brand-gold hover:bg-brand-gold hover:text-brand-darker text-xs font-bold transition-colors"
                      >
                        + Add Line
                      </button>
                      <button
                        onClick={() => removeSection(section.id)}
                        className="p-1 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                        title="Delete Section"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Lines list */}
                  <div className="space-y-3">
                    {section.lines.map((line, lIdx) => (
                      <div key={line.id} className="flex items-start gap-2 group">
                        <span className="text-[11px] font-mono text-muted-foreground w-5 pt-2 text-right">{lIdx + 1}</span>
                        <div className="flex-1 space-y-1.5">
                          <input
                            type="text"
                            placeholder="Primary text (Telugu / English)..."
                            value={line.primaryText}
                            onChange={(e) => updateLine(section.id, line.id, { primaryText: e.target.value })}
                            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-brand-gold"
                          />
                          <input
                            type="text"
                            placeholder="Romanized / English translation (optional)..."
                            value={line.secondaryText || ""}
                            onChange={(e) => updateLine(section.id, line.id, { secondaryText: e.target.value })}
                            className="w-full px-3 py-1.5 bg-white/[0.02] border border-white/5 rounded-lg text-xs text-brand-gold/80 italic placeholder:text-muted-foreground/30 focus:outline-none focus:ring-1 focus:ring-brand-gold/40"
                          />
                        </div>
                        <button
                          onClick={() => removeLine(section.id, line.id)}
                          className="p-2 text-muted-foreground hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* TAB 2: FULL CHORDPRO TEXT EDITOR */
            <div className="space-y-3 max-w-3xl">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Write ChordPro format with bracketed chords e.g. <code className="text-brand-gold">[C] [G] [Am] [F]</code></span>
              </div>
              <textarea
                rows={20}
                value={formData.chords || ""}
                onChange={(e) => setFormData((prev) => ({ ...prev, chords: e.target.value }))}
                placeholder={`[Verse 1]\n[C]Amazing grace how [G]sweet the sound\nThat [Am]saved a wretch like [F]me\n\n[Chorus]\n[C]Yesayya [G]Yesayya\nNinne [Am]aaraadhin[F]thunu`}
                className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl font-mono text-sm text-white placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-brand-gold/50 leading-relaxed"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

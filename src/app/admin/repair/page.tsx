"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/providers";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/toast";
import {
  Wrench,
  Search,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  ArrowLeft,
  ChevronRight,
  Loader2,
  Eye,
  Save,
  SkipForward,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Same patterns as repair-song-titles.mjs ────────────────────────────────
const BAD_PATTERNS = [
  /^పాట\s*[:\-\.]?\s*\d+$/u,
  /^Song\s+\d+$/i,
  /^Paata\s+\d+$/i,
  /^Untitled\s+Song\s+\d+$/i,
  /^Untitled\s+Worship\s+Song$/i,
  /^\d+$/,
];
function isBadTitle(t: string | null | undefined): boolean {
  if (!t || !t.trim()) return true;
  return BAD_PATTERNS.some((p) => p.test(t.trim()));
}

const SECTION_HEADINGS = [
  /^\[.+\]$/i,
  /^(verse\s*\d*|chorus|bridge|intro|interlude|outro|tag|break)$/i,
  /^(pallavi|charanam\s*\d*)$/i,
  /^(పల్లవి|చరణం\s*\d*|చరణము\s*\d*)$/u,
];
function isHeading(l: string): boolean {
  return SECTION_HEADINGS.some((p) => p.test(l.trim()));
}
function isPureNum(l: string): boolean {
  const t = l.trim();
  return (
    /^\d{1,4}$/.test(t) ||
    /^(?:Song|No\.?)\s*\d+$/i.test(t) ||
    /^పాట\s*[:\-\.]?\s*\d+$/u.test(t)
  );
}
function extractTitle(lyrics: string | null): string | null {
  if (!lyrics) return null;
  for (const raw of lyrics.trim().split("\n")) {
    const line = raw.trim();
    if (!line || isPureNum(line) || isHeading(line)) continue;
    const stripped = line
      .replace(
        /^(?:పాట\s*[:\-\.]?\s*\d+\s*[:\-\.]?\s*|Song\s*\d+\s*[:\-\.]?\s*|\d+\s*[\.\-\)]\s*)/iu,
        ""
      )
      .trim();
    if (stripped.length > 1 && !isHeading(stripped) && !isPureNum(stripped))
      return stripped;
    if (line.length > 1) return line;
  }
  return null;
}

// ─── Types ───────────────────────────────────────────────────────────────────
interface RepairSong {
  id: string;
  title: string;
  lyrics: string | null;
  extractedTitle: string | null;
  status: "pending" | "approved" | "skipped" | "saved" | "failed";
  customTitle?: string;
}

// ─── Component ───────────────────────────────────────────────────────────────
export default function AdminRepairPage() {
  const { user } = useAuth();
  const router = useRouter();
  const toast = useToast();

  const [songs, setSongs] = useState<RepairSong[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "skipped">("pending");
  const [previewSongId, setPreviewSongId] = useState<string | null>(null);
  const [analyzed, setAnalyzed] = useState(false);
  const [stats, setStats] = useState({ total: 0, bad: 0, extractable: 0, unextractable: 0 });

  const analyze = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("songs")
        .select("id, title, lyrics")
        .limit(2000);

      if (error) throw error;

      const rows = (data || []).filter((s) => isBadTitle(s.title));
      const repairSongs: RepairSong[] = rows.map((s) => {
        const extracted = extractTitle(s.lyrics);
        return {
          id: s.id,
          title: s.title,
          lyrics: s.lyrics,
          extractedTitle: extracted,
          status: "pending",
        };
      });

      setSongs(repairSongs);
      setStats({
        total: data?.length || 0,
        bad: rows.length,
        extractable: repairSongs.filter((s) => s.extractedTitle).length,
        unextractable: repairSongs.filter((s) => !s.extractedTitle).length,
      });
      setAnalyzed(true);
    } catch (e: any) {
      toast.addToast("error", `Analysis failed: ${e.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const approveAll = () => {
    setSongs((prev) =>
      prev.map((s) =>
        s.extractedTitle && s.status === "pending"
          ? { ...s, status: "approved" }
          : s
      )
    );
  };

  const skipAll = () => {
    setSongs((prev) =>
      prev.map((s) =>
        s.status === "pending" ? { ...s, status: "skipped" } : s
      )
    );
  };

  const toggleStatus = (id: string, status: RepairSong["status"]) => {
    setSongs((prev) => prev.map((s) => (s.id === id ? { ...s, status } : s)));
  };

  const setCustomTitle = (id: string, title: string) => {
    setSongs((prev) =>
      prev.map((s) => (s.id === id ? { ...s, customTitle: title } : s))
    );
  };

  const saveApproved = async () => {
    const toSave = songs.filter((s) => s.status === "approved");
    if (toSave.length === 0) {
      toast.addToast("error", "No songs approved for save. Approve some songs first.");
      return;
    }
    setIsSaving(true);
    let saved = 0, failed = 0;

    for (const song of toSave) {
      const newTitle = song.customTitle?.trim() || song.extractedTitle;
      if (!newTitle) continue;
      const { error } = await supabase
        .from("songs")
        .update({ title: newTitle, updated_at: new Date().toISOString() })
        .eq("id", song.id);

      setSongs((prev) =>
        prev.map((s) =>
          s.id === song.id
            ? { ...s, status: error ? "failed" : "saved" }
            : s
        )
      );
      if (error) failed++;
      else saved++;
    }

    setIsSaving(false);
    toast.addToast(
      failed > 0 ? "error" : "success",
      `Saved ${saved} songs${failed > 0 ? `, ${failed} failed` : ""}`
    );
  };

  const visibleSongs = songs.filter((s) => {
    if (filter === "all") return true;
    return s.status === filter;
  });

  const previewSong = songs.find((s) => s.id === previewSongId);

  return (
    <div className="min-h-screen bg-[#0A0A0F] text-white p-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft size={20} />
          Back
        </button>
        <div className="flex items-center gap-3">
          <Wrench size={28} className="text-amber-400" />
          <div>
            <h1 className="text-2xl font-bold">Song Title Repair</h1>
            <p className="text-sm text-gray-400">
              Analyze and fix songs with bad index-style titles
            </p>
          </div>
        </div>
      </div>

      {!analyzed ? (
        /* Analyze prompt */
        <div className="max-w-xl mx-auto mt-20 text-center">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-10">
            <Wrench size={48} className="text-amber-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Analyze Song Library</h2>
            <p className="text-gray-400 text-sm mb-6">
              This tool scans your entire song library for index-style titles like{" "}
              <code className="bg-white/10 px-1 rounded">పాట:98</code>,{" "}
              <code className="bg-white/10 px-1 rounded">Song 3</code>, and{" "}
              <code className="bg-white/10 px-1 rounded">Untitled Song 5</code>, then
              extracts the real title from each song&apos;s lyrics — without touching the actual lyrics.
            </p>
            <button
              onClick={analyze}
              disabled={isLoading}
              className="flex items-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-400 text-black font-semibold rounded-xl mx-auto transition-all disabled:opacity-60"
            >
              {isLoading ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <Search size={18} />
              )}
              {isLoading ? "Analyzing..." : "Analyze Song Library"}
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {[
              { label: "Total Songs", value: stats.total, color: "text-blue-400" },
              { label: "Bad Titles", value: stats.bad, color: "text-red-400" },
              { label: "Auto-Fixable", value: stats.extractable, color: "text-green-400" },
              { label: "Need Manual Fix", value: stats.unextractable, color: "text-amber-400" },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-white/5 border border-white/10 rounded-xl p-4">
                <div className={cn("text-3xl font-bold", color)}>{value}</div>
                <div className="text-xs text-gray-400 mt-1">{label}</div>
              </div>
            ))}
          </div>

          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <div className="flex gap-1 bg-white/5 rounded-lg p-1">
              {(["pending", "approved", "skipped", "all"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={cn(
                    "px-3 py-1.5 text-sm rounded-md transition-all capitalize",
                    filter === f
                      ? "bg-white/15 text-white"
                      : "text-gray-400 hover:text-white"
                  )}
                >
                  {f}
                  {f !== "all" && (
                    <span className="ml-1 text-xs opacity-60">
                      ({songs.filter((s) => s.status === f).length})
                    </span>
                  )}
                </button>
              ))}
            </div>

            <button
              onClick={approveAll}
              className="flex items-center gap-1.5 px-4 py-2 bg-green-500/20 hover:bg-green-500/30 text-green-400 text-sm rounded-lg transition-all"
            >
              <CheckCircle2 size={15} />
              Approve All Extractable
            </button>
            <button
              onClick={skipAll}
              className="flex items-center gap-1.5 px-4 py-2 bg-gray-500/20 hover:bg-gray-500/30 text-gray-400 text-sm rounded-lg transition-all"
            >
              <SkipForward size={15} />
              Skip All Pending
            </button>
            <button
              onClick={saveApproved}
              disabled={isSaving || songs.filter((s) => s.status === "approved").length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black font-semibold text-sm rounded-lg transition-all disabled:opacity-50 ml-auto"
            >
              {isSaving ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <Save size={15} />
              )}
              Save {songs.filter((s) => s.status === "approved").length} Approved
            </button>
          </div>

          {/* Song List */}
          <div className="space-y-2">
            {visibleSongs.length === 0 && (
              <div className="text-center py-16 text-gray-500">
                No songs in this filter
              </div>
            )}
            {visibleSongs.map((song) => (
              <div
                key={song.id}
                className={cn(
                  "bg-white/5 border rounded-xl p-4 transition-all",
                  song.status === "approved" && "border-green-500/40 bg-green-500/5",
                  song.status === "skipped" && "border-gray-600/30 opacity-60",
                  song.status === "saved" && "border-blue-500/40 bg-blue-500/5",
                  song.status === "failed" && "border-red-500/40 bg-red-500/5",
                  song.status === "pending" && "border-white/10"
                )}
              >
                <div className="flex items-start gap-4">
                  {/* Status icon */}
                  <div className="mt-0.5 flex-shrink-0">
                    {song.status === "saved" && <CheckCircle2 size={18} className="text-blue-400" />}
                    {song.status === "approved" && <CheckCircle2 size={18} className="text-green-400" />}
                    {song.status === "failed" && <XCircle size={18} className="text-red-400" />}
                    {song.status === "skipped" && <SkipForward size={18} className="text-gray-500" />}
                    {song.status === "pending" && (
                      <div className="w-4.5 h-4.5 rounded-full border-2 border-amber-400/60" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-red-400 bg-red-400/10 px-2 py-0.5 rounded font-mono truncate max-w-[200px]">
                        {song.title}
                      </span>
                      {song.extractedTitle && (
                        <>
                          <ChevronRight size={14} className="text-gray-500 flex-shrink-0" />
                          <span className="text-xs text-green-400 bg-green-400/10 px-2 py-0.5 rounded truncate max-w-[300px]">
                            {song.customTitle?.trim() || song.extractedTitle}
                          </span>
                        </>
                      )}
                      {!song.extractedTitle && (
                        <span className="text-xs text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded">
                          ⚠ Cannot auto-extract — set manually
                        </span>
                      )}
                    </div>

                    {/* Custom title input for pending/approved */}
                    {(song.status === "pending" || song.status === "approved") && (
                      <input
                        type="text"
                        placeholder={song.extractedTitle || "Enter title manually..."}
                        value={song.customTitle || ""}
                        onChange={(e) => setCustomTitle(song.id, e.target.value)}
                        className="mt-2 w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-white/30"
                      />
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {song.status !== "saved" && (
                      <>
                        <button
                          onClick={() =>
                            setPreviewSongId(previewSongId === song.id ? null : song.id)
                          }
                          className="p-1.5 rounded-lg hover:bg-white/10 transition-all text-gray-400 hover:text-white"
                          title="Preview lyrics"
                        >
                          <Eye size={15} />
                        </button>
                        {song.status !== "approved" && (
                          <button
                            onClick={() => toggleStatus(song.id, "approved")}
                            disabled={!song.extractedTitle && !song.customTitle}
                            className="flex items-center gap-1 px-2.5 py-1 bg-green-500/20 hover:bg-green-500/30 text-green-400 text-xs rounded-lg transition-all disabled:opacity-40"
                          >
                            <CheckCircle2 size={13} />
                            Approve
                          </button>
                        )}
                        {song.status !== "skipped" && (
                          <button
                            onClick={() => toggleStatus(song.id, "skipped")}
                            className="flex items-center gap-1 px-2.5 py-1 bg-gray-500/20 hover:bg-gray-500/30 text-gray-400 text-xs rounded-lg transition-all"
                          >
                            <SkipForward size={13} />
                            Skip
                          </button>
                        )}
                        {song.status !== "pending" && (
                          <button
                            onClick={() => toggleStatus(song.id, "pending")}
                            className="flex items-center gap-1 px-2.5 py-1 bg-white/10 hover:bg-white/15 text-gray-400 text-xs rounded-lg transition-all"
                          >
                            <RefreshCw size={13} />
                            Reset
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* Lyrics preview */}
                {previewSongId === song.id && song.lyrics && (
                  <div className="mt-3 bg-black/30 border border-white/5 rounded-lg p-3 max-h-40 overflow-y-auto">
                    <pre className="text-xs text-gray-400 whitespace-pre-wrap font-sans leading-relaxed">
                      {song.lyrics.slice(0, 800)}
                      {song.lyrics.length > 800 ? "\n..." : ""}
                    </pre>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

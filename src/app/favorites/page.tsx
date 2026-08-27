"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Star,
  Search,
  Music,
  Play,
  ArrowLeft,
  Trash2,
  Calendar,
  Sparkles,
  Heart,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/app/providers";
import { db } from "@/services/database";
import { useToast } from "@/components/toast";
import type { Song } from "@/types";

export default function FavoritesPage() {
  const router = useRouter();
  const { user } = useAuth();
  const toast = useToast();
  const [songs, setSongs] = useState<Song[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [languageFilter, setLanguageFilter] = useState("all");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSongs();
  }, [user]);

  const loadSongs = async () => {
    if (!user) return;
    try {
      const data = await db.getSongs(user.id);
      setSongs(data.filter((s: Song) => s.favorite));
    } catch (e) {
      console.error("Failed to load favorite songs", e);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredFavorites = useMemo(() => {
    return songs.filter((song) => {
      const matchesLanguage = languageFilter === "all" || song.language === languageFilter;
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !q ||
        song.title.toLowerCase().includes(q) ||
        (song.romanizedTitle && song.romanizedTitle.toLowerCase().includes(q)) ||
        (song.artist && song.artist.toLowerCase().includes(q));
      return matchesLanguage && matchesSearch;
    });
  }, [songs, languageFilter, searchQuery]);

  const handleToggleFavorite = async (song: Song) => {
    if (!user) {
      toast.addToast("info", "Please sign in to persist favorite changes");
      return;
    }
    try {
      await db.toggleFavorite(song.id, false, user.id);
      setSongs((prev) => prev.filter((s) => s.id !== song.id));
      toast.addToast("success", `Removed "${song.title}" from favorites`);
    } catch (err) {
      console.error("Failed to update favorite", err);
      toast.addToast("error", "Failed to update favorite");
    }
  };

  const handlePresentSong = (song: Song) => {
    localStorage.setItem("church-lyrics-current-song", JSON.stringify(song));
    router.push("/presentation");
  };

  const handlePresentAllFavorites = () => {
    if (filteredFavorites.length === 0) return;
    // Create an ad-hoc service session
    const adHocService = {
      id: "ad-hoc-favorites",
      name: "Favorites Playlist",
      date: new Date().toISOString().split("T")[0],
      status: "live",
      items: filteredFavorites.map((s, idx) => ({
        id: `fav-item-${idx}`,
        type: "song",
        songId: s.id,
        song: s,
        order: idx,
      })),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem("church-lyrics-current-service", JSON.stringify(adHocService));
    localStorage.setItem("church-lyrics-current-song", JSON.stringify(filteredFavorites[0]));
    router.push("/presentation");
  };

  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <header className="border-b border-white/5 bg-brand-darker/50 backdrop-blur-lg py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Link href="/" className="p-1.5 rounded-lg bg-white/5 text-muted-foreground hover:text-white transition-colors">
                  <ArrowLeft className="w-4 h-4" />
                </Link>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-white flex items-center gap-2.5">
                  <Star className="w-7 h-7 text-brand-gold fill-brand-gold" />
                  Favorite Songs
                </h1>
              </div>
              <p className="text-sm text-muted-foreground">
                Your pinned worship anthems and frequently used hymns for quick service preparation and presentation
              </p>
            </div>

            {filteredFavorites.length > 0 && (
              <button
                onClick={handlePresentAllFavorites}
                className="self-start md:self-auto inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-gold text-brand-darker text-xs font-bold hover:bg-brand-goldLight shadow-lg transition-all"
              >
                <Play className="w-4 h-4 fill-brand-darker" />
                Present All ({filteredFavorites.length})
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-8 space-y-6">
        {/* Search & Language Bar */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search in favorites..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-brand-gold/50"
            />
          </div>

          <div className="flex items-center gap-1 bg-white/5 rounded-xl p-1 border border-white/10 w-full sm:w-auto justify-center">
            {["all", "telugu", "english", "hindi"].map((lang) => (
              <button
                key={lang}
                onClick={() => setLanguageFilter(lang)}
                className={cn(
                  "px-3 py-1 rounded-lg text-xs font-medium capitalize transition-all",
                  languageFilter === lang ? "bg-brand-gold text-brand-darker font-bold" : "text-muted-foreground hover:text-white"
                )}
              >
                {lang}
              </button>
            ))}
          </div>
        </div>

        {/* Favorites Grid */}
        {filteredFavorites.length === 0 ? (
          <div className="glass rounded-2xl p-16 text-center text-muted-foreground border border-white/5">
            <Star className="w-14 h-14 mx-auto mb-3 opacity-30 text-brand-gold" />
            <h3 className="text-lg font-bold text-white mb-1">No favorites found</h3>
            <p className="text-xs text-muted-foreground max-w-md mx-auto mb-6">
              You haven't bookmarked any songs yet or no favorites match your search. Browse the Song Library and star your favorite songs!
            </p>
            <Link
              href="/songs"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-gold text-brand-darker text-xs font-bold hover:bg-brand-goldLight transition-all"
            >
              <Music className="w-4 h-4" />
              Browse Song Library
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredFavorites.map((song) => (
              <div
                key={song.id}
                className="glass rounded-xl p-5 border border-white/5 hover:border-brand-gold/30 hover:bg-white/[0.07] transition-all flex flex-col justify-between group shadow-md"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <Link href={`/songs/${song.id}`} className="font-bold text-white group-hover:text-brand-gold transition-colors text-base truncate">
                      {song.title}
                    </Link>
                    <button
                      onClick={() => handleToggleFavorite(song)}
                      className="p-1 text-brand-gold hover:text-red-400 transition-colors"
                      title="Remove from favorites"
                    >
                      <Star className="w-4 h-4 fill-brand-gold" />
                    </button>
                  </div>
                  {song.romanizedTitle && (
                    <p className="text-xs text-brand-gold/80 italic mb-2 truncate">{song.romanizedTitle}</p>
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
                      className="p-1.5 rounded-lg bg-brand-gold text-brand-darker hover:bg-brand-goldLight transition-colors font-bold text-xs flex items-center gap-1 px-2.5"
                      title="Present Now"
                    >
                      <Play className="w-3.5 h-3.5 fill-brand-darker" />
                      Present
                    </button>
                    <Link
                      href={`/songs/${song.id}`}
                      className="text-xs font-semibold text-white/80 hover:text-white px-2 py-1 rounded bg-white/5"
                    >
                      View
                    </Link>
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

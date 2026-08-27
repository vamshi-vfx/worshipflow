"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  FolderOpen,
  Search,
  Music,
  Play,
  ArrowLeft,
  Filter,
  Star,
  Sparkles,
  SlidersHorizontal,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/app/providers";
import { db } from "@/services/database";
import type { Song } from "@/types";

const ALL_CATEGORIES = [
  { slug: "worship", name: "Worship", teluguName: "ఆరాధన", icon: "🙏", description: "Adoration, reverence, and deep communion with God" },
  { slug: "praise", name: "Praise", teluguName: "స్తుతి", icon: "🙌", description: "Joyful exaltation, thanksgiving, and glory to the Lord" },
  { slug: "prayer", name: "Prayer", teluguName: "ప్రార్థన", icon: "🕊️", description: "Supplication, intercession, and seeking God's face" },
  { slug: "gospel", name: "Gospel", teluguName: "సువార్త", icon: "📖", description: "Good news of salvation and Christ's redeeming love" },
  { slug: "encouragement", name: "Encouragement", teluguName: "ధైర్యము", icon: "✨", description: "Faith lifting, perseverance, and strength in trials" },
  { slug: "hope", name: "Hope", teluguName: "నిరీక్షణ", icon: "⚓", description: "Eternal anchor in God's unfailing promises" },
  { slug: "comfort", name: "Comfort", teluguName: "ఓదార్పు", icon: "🌿", description: "Peace, healing, and solace in times of sorrow" },
  { slug: "christmas", name: "Christmas", teluguName: "క్రిస్మస్", icon: "⭐", description: "Celebration of the birth of our Savior Jesus Christ" },
  { slug: "good-friday", name: "Good Friday", teluguName: "గుడ్ ఫ్రైడే", icon: "✝️", description: "The Cross, the sacrifice, and Christ's blood" },
  { slug: "thanksgiving", name: "Thanksgiving", teluguName: "కృతజ్ఞత", icon: "🌾", description: "Gratitude for harvest, blessings, and daily grace" },
  { slug: "repentance", name: "Repentance", teluguName: "మారుమనస్సు", icon: "💧", description: "Contrition, confession, and renewal of heart" },
  { slug: "commitment", name: "Commitment", teluguName: "సమర్పణ", icon: "🔥", description: "Surrender, dedication, and consecration to God" },
  { slug: "marriage", name: "Marriage", teluguName: "వివాహం", icon: "💍", description: "Holy matrimony, covenant love, and family blessing" },
  { slug: "second-coming", name: "Second Coming", teluguName: "రెండవ రాకడ", icon: "👑", description: "The glorious return of King Jesus and eternal reign" },
  { slug: "children", name: "Children", teluguName: "పిల్లల పాటలు", icon: "🎈", description: "Sunday school and action songs for kids" },
  { slug: "youth", name: "Youth", teluguName: "యౌవనస్థులు", icon: "⚡", description: "High energy contemporary praise and youth ministry" },
  { slug: "special", name: "Special Songs", teluguName: "ప్రత్యేక పాటలు", icon: "🎶", description: "Choir anthems, solos, and special occasions" },
];

export default function CategoriesPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [songs, setSongs] = useState<Song[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSongs();
  }, [user]);

  const loadSongs = async () => {
    if (!user) return;
    try {
      const data = await db.getSongs(user.id);
      setSongs(data as Song[]);
    } catch (e) {
      console.error("Failed to load songs for categories", e);
    } finally {
      setIsLoading(false);
    }
  };

  const categoriesWithCounts = useMemo(() => {
    return ALL_CATEGORIES.map((cat) => {
      const count = songs.filter((s) => s.category?.toLowerCase() === cat.slug.toLowerCase()).length;
      return { ...cat, count };
    });
  }, [songs]);

  const activeCategoryData = useMemo(() => {
    if (!selectedCategory) return null;
    return categoriesWithCounts.find((c) => c.slug === selectedCategory);
  }, [selectedCategory, categoriesWithCounts]);

  const songsInSelectedCategory = useMemo(() => {
    if (!selectedCategory) return [];
    return songs
      .filter((s) => s.category?.toLowerCase() === selectedCategory.toLowerCase())
      .filter((s) => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return (
          s.title.toLowerCase().includes(q) ||
          (s.romanizedTitle && s.romanizedTitle.toLowerCase().includes(q)) ||
          (s.artist && s.artist.toLowerCase().includes(q))
        );
      });
  }, [songs, selectedCategory, searchQuery]);

  const handlePresentSong = (song: Song) => {
    localStorage.setItem("church-lyrics-current-song", JSON.stringify(song));
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
                  <FolderOpen className="w-7 h-7 text-brand-gold" />
                  Worship Categories
                </h1>
              </div>
              <p className="text-sm text-muted-foreground">
                Discover hymns and worship songs indexed by theological theme, service occasion, and church calendar
              </p>
            </div>

            {selectedCategory && (
              <button
                onClick={() => setSelectedCategory(null)}
                className="self-start md:self-auto px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-semibold border border-white/10 transition-colors"
              >
                ← View All Categories
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-8">
        {/* If no category is selected: Show Category Cards Grid */}
        {!selectedCategory ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {categoriesWithCounts.map((cat) => (
                <div
                  key={cat.slug}
                  onClick={() => setSelectedCategory(cat.slug)}
                  className="glass rounded-2xl p-6 border border-white/5 hover:border-brand-gold/40 hover:bg-white/[0.08] transition-all cursor-pointer group shadow-lg flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-3xl group-hover:scale-110 transition-transform">{cat.icon}</span>
                      <span className="px-2.5 py-1 rounded-full bg-white/5 text-xs font-mono font-semibold text-brand-gold">
                        {cat.count} {cat.count === 1 ? "song" : "songs"}
                      </span>
                    </div>

                    <h3 className="text-lg font-bold text-white group-hover:text-brand-gold transition-colors mb-1">
                      {cat.name} <span className="text-sm font-normal text-muted-foreground ml-1">({cat.teluguName})</span>
                    </h3>
                    <p className="text-xs text-muted-foreground line-clamp-2">{cat.description}</p>
                  </div>

                  <div className="pt-4 mt-4 border-t border-white/5 flex items-center justify-between text-xs text-brand-gold font-semibold">
                    <span>Browse songs</span>
                    <span className="group-hover:translate-x-1 transition-transform">→</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* Category Detail View */
          <div className="space-y-6">
            {/* Category Detail Header */}
            <div className="glass rounded-2xl p-6 border border-brand-gold/30 bg-gradient-to-r from-brand-gold/10 to-transparent">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <span className="text-4xl p-3 rounded-2xl bg-white/5 border border-white/10">{activeCategoryData?.icon}</span>
                  <div>
                    <h2 className="text-2xl font-bold text-white">
                      {activeCategoryData?.name}{" "}
                      <span className="text-lg text-brand-gold font-normal">({activeCategoryData?.teluguName})</span>
                    </h2>
                    <p className="text-xs text-muted-foreground mt-0.5">{activeCategoryData?.description}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-3 py-1.5 rounded-xl bg-brand-gold text-brand-darker text-xs font-bold shadow">
                    {songsInSelectedCategory.length} songs
                  </span>
                </div>
              </div>
            </div>

            {/* In-category Search Bar */}
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder={`Search within ${activeCategoryData?.name}...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-brand-gold/50"
              />
            </div>

            {/* Songs List */}
            {songsInSelectedCategory.length === 0 ? (
              <div className="glass rounded-2xl p-12 text-center text-muted-foreground">
                <Music className="w-12 h-12 mx-auto mb-3 opacity-30 text-brand-gold" />
                <p className="text-white font-medium mb-1">No songs in this category yet</p>
                <p className="text-xs mb-4">You can categorize any song during Smart Import or in the Song Editor.</p>
                <Link
                  href="/smart-import"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-gold text-brand-darker text-xs font-bold"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Import Song for {activeCategoryData?.name}
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {songsInSelectedCategory.map((song) => (
                  <div
                    key={song.id}
                    className="glass rounded-xl p-5 border border-white/5 hover:border-brand-gold/30 hover:bg-white/[0.07] transition-all flex flex-col justify-between group"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <Link href={`/songs/${song.id}`} className="font-bold text-white group-hover:text-brand-gold transition-colors text-base truncate">
                          {song.title}
                        </Link>
                        {song.favorite && <Star className="w-4 h-4 text-brand-gold fill-brand-gold shrink-0" />}
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
          </div>
        )}
      </div>
    </div>
  );
}

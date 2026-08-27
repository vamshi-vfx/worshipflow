"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Plus,
  Play,
  Trash2,
  Image,
  Film,
  Music2,
  Loader2,
} from "lucide-react";
import { useAuth } from "@/app/providers";
import { db } from "@/services/database";
import type { Media } from "@/types";

export default function MediaPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [media, setMedia] = useState<Media[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    loadMedia();
  }, [user]);

  const loadMedia = async () => {
    if (!user) return;
    try {
      const data = await db.getMedia?.(user.id) || [];
      setMedia(data as Media[]);
    } catch (e) {
      console.error("Failed to load media", e);
      setError("Failed to load media");
    } finally {
      setIsLoading(false);
    }
  };

  const deleteMedia = async (id: string) => {
    if (!confirm("Are you sure you want to delete this media?")) return;
    if (!user) return;
    try {
      await db.deleteMedia?.(id, user.id);
      setMedia((prev) => prev.filter((m) => m.id !== id));
    } catch (e) {
      console.error("Failed to delete media", e);
      alert("Failed to delete media");
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "image":
        return <Image className="w-8 h-8" />;
      case "video":
        return <Film className="w-8 h-8" />;
      case "audio":
        return <Music2 className="w-8 h-8" />;
      default:
        return <Image className="w-8 h-8" />;
    }
  };

  return (
    <div className="min-h-screen bg-brand-darker">
      <header className="h-16 border-b border-white/5 flex items-center justify-between px-8">
        <div>
          <h2 className="text-lg font-semibold text-white">Media</h2>
          <p className="text-sm text-muted-foreground">
            {media.length} files
          </p>
        </div>
        <button
          onClick={() => router.push("/media/upload")}
          className="px-4 py-2 bg-brand-gold text-brand-darker font-semibold rounded-lg hover:bg-brand-goldLight transition-colors flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Upload Media
        </button>
      </header>

      <div className="p-8">
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400">
            {error}
          </div>
        )}

        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Loading...</div>
        ) : media.length === 0 ? (
          <div className="glass rounded-xl p-12 text-center">
            <Plus className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">No media files yet</p>
            <button
              onClick={() => router.push("/media/upload")}
              className="inline-flex items-center gap-2 px-4 py-2 bg-brand-gold text-brand-darker font-semibold rounded-lg hover:bg-brand-goldLight transition-colors"
            >
              <Plus className="w-4 h-4" />
              Upload Your First File
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-4">
            {media.map((item) => (
              <div
                key={item.id}
                className="glass rounded-xl overflow-hidden hover:bg-white/[0.07] transition-all duration-300 group"
              >
                <div className="aspect-video bg-white/5 flex items-center justify-center text-muted-foreground">
                  {item.thumbnailUrl ? (
                    <img
                      src={item.thumbnailUrl}
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    getIcon(item.type)
                  )}
                </div>
                <div className="p-4">
                  <h3 className="font-medium text-white text-sm truncate">{item.name}</h3>
                  <p className="text-xs text-muted-foreground capitalize">{item.type}</p>
                  <div className="mt-3 flex items-center gap-2">
                    <button
                      onClick={() => {
                        localStorage.setItem("church-lyrics-current-media", JSON.stringify(item));
                        router.push("/presentation");
                      }}
                      className="p-2 rounded-lg bg-brand-gold/10 text-brand-gold hover:bg-brand-gold/20 transition-colors"
                    >
                      <Play className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => deleteMedia(item.id)}
                      className="p-2 rounded-lg hover:bg-red-500/10 text-red-400 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
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

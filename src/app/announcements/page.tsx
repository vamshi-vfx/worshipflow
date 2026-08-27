"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Plus,
  Megaphone,
  Play,
  Trash2,
  Calendar,
  MapPin,
  Loader2,
} from "lucide-react";
import { useAuth } from "@/app/providers";
import { db } from "@/services/database";
import type { Announcement } from "@/types";

export default function AnnouncementsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    loadAnnouncements();
  }, [user]);

  const loadAnnouncements = async () => {
    if (!user) return;
    try {
      const data = await db.getAnnouncements(user.id);
      setAnnouncements(data as Announcement[]);
    } catch (e) {
      console.error("Failed to load announcements", e);
      setError("Failed to load announcements");
    } finally {
      setIsLoading(false);
    }
  };

  const deleteAnnouncement = async (id: string) => {
    if (!confirm("Are you sure you want to delete this announcement?")) return;
    if (!user) return;
    try {
      await db.deleteAnnouncement(id, user.id);
      setAnnouncements((prev) => prev.filter((a) => a.id !== id));
    } catch (e) {
      console.error("Failed to delete announcement", e);
      alert("Failed to delete announcement");
    }
  };

  const presentAnnouncement = (announcement: Announcement) => {
    localStorage.setItem("church-lyrics-current-announcement", JSON.stringify(announcement));
    router.push("/presentation");
  };

  return (
    <div className="min-h-screen bg-brand-darker">
      <header className="h-16 border-b border-white/5 flex items-center justify-between px-8">
        <div>
          <h2 className="text-lg font-semibold text-white">Announcements</h2>
          <p className="text-sm text-muted-foreground">
            {announcements.length} announcements
          </p>
        </div>
        <button
          onClick={() => router.push("/announcements/new")}
          className="px-4 py-2 bg-brand-gold text-brand-darker font-semibold rounded-lg hover:bg-brand-goldLight transition-colors flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          New Announcement
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
        ) : announcements.length === 0 ? (
          <div className="glass rounded-xl p-12 text-center">
            <Megaphone className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">No announcements yet</p>
            <button
              onClick={() => router.push("/announcements/new")}
              className="inline-flex items-center gap-2 px-4 py-2 bg-brand-gold text-brand-darker font-semibold rounded-lg hover:bg-brand-goldLight transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create Announcement
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-4">
            {announcements.map((announcement) => (
              <div
                key={announcement.id}
                className="glass rounded-xl p-6 hover:bg-white/[0.07] transition-all duration-300 group"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-white group-hover:text-brand-gold transition-colors">
                      {announcement.title}
                    </h3>
                    {announcement.description && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {announcement.description}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3 mb-4 text-xs text-muted-foreground">
                  {announcement.date && (
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {announcement.date}
                    </span>
                  )}
                  {announcement.location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {announcement.location}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => presentAnnouncement(announcement)}
                    className="flex-1 px-3 py-2 bg-brand-gold/10 text-brand-gold rounded-lg text-sm font-medium hover:bg-brand-gold/20 transition-colors flex items-center justify-center gap-1"
                  >
                    <Play className="w-4 h-4" />
                    Present
                  </button>
                  <button
                    onClick={() => deleteAnnouncement(announcement.id)}
                    className="p-2 rounded-lg hover:bg-red-500/10 text-red-400 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

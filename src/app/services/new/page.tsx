"use client";

import { useState, useEffect, useRef, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Save,
  Play,
  Music,
  BookOpen,
  Megaphone,
  Search,
  X,
  Loader2,
  Calendar,
} from "lucide-react";
import { useAuth } from "@/app/providers";
import { db } from "@/services/database";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/toast";
import type { Service, ServiceItem, Song, Announcement, ServiceStatus } from "@/types";

export default function NewServicePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-brand-darker flex items-center justify-center text-white">Loading...</div>}>
      <NewServicePageContent />
    </Suspense>
  );
}

function NewServicePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const toast = useToast();
  const serviceId = searchParams.get("id");
  const isEditing = Boolean(serviceId);
  const [name, setName] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<ServiceStatus>("draft");
  const [items, setItems] = useState<ServiceItem[]>([]);
  const [itemType, setItemType] = useState<"song" | "bible" | "announcement">("song");
  const [songs, setSongs] = useState<Song[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const autosaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!user) return;
    loadData();
    if (serviceId) {
      loadService(serviceId);
    }
  }, [user, serviceId]);

  const loadData = async () => {
    if (!user) return;
    try {
      const [songsData, announcementsData] = await Promise.all([
        db.getSongs(user.id),
        db.getAnnouncements(user.id),
      ]);
      setSongs(songsData as Song[]);
      setAnnouncements(announcementsData as Announcement[]);
    } catch (e) {
      console.error("Failed to load data", e);
      setError("Failed to load data");
    }
  };

  const loadService = async (id: string) => {
    if (!user) return;
    try {
      const service = await db.getService(id, user.id);
      if (service) {
        setName(service.name);
        setDate(service.date);
        setDescription(service.description || "");
        setStatus(service.status || "draft");
        const serviceItems = await db.getServiceItems(id);
        setItems(serviceItems as ServiceItem[]);
      }
    } catch (e) {
      console.error("Failed to load service", e);
      setError("Failed to load service");
    }
  };

  const addItem = () => {
    const newItem: ServiceItem = {
      id: crypto.randomUUID(),
      type: itemType,
      order: items.length,
      notes: "",
    };
    setItems([...items, newItem]);
  };

  const removeItem = async (id: string) => {
    try {
      const item = items.find((i) => i.id === id);
      if (item?.songId) {
        await db.deleteServiceItems([id]);
      }
    } catch (e) {
      console.error("Failed to delete item", e);
    }
    setItems(items.filter((i) => i.id !== id).map((i, idx) => ({ ...i, order: idx })));
  };

  const moveItem = (id: string, direction: "up" | "down") => {
    const idx = items.findIndex((i) => i.id === id);
    if (direction === "up" && idx > 0) {
      const newItems = [...items];
      [newItems[idx - 1], newItems[idx]] = [newItems[idx], newItems[idx - 1]];
      setItems(newItems.map((i, index) => ({ ...i, order: index })));
    } else if (direction === "down" && idx < items.length - 1) {
      const newItems = [...items];
      [newItems[idx], newItems[idx + 1]] = [newItems[idx + 1], newItems[idx]];
      setItems(newItems.map((i, index) => ({ ...i, order: index })));
    }
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    const newItems = [...items];
    const [removed] = newItems.splice(draggedIndex, 1);
    newItems.splice(index, 0, removed);
    setItems(newItems.map((i, idx) => ({ ...i, order: idx })));
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const persistServiceData = useCallback(async () => {
    if (!user || !name.trim()) return;
    setError(null);

    try {
      let currentServiceId = serviceId;

      if (currentServiceId) {
        const existingService = await db.getService(currentServiceId, user.id);
        if (existingService) {
          await db.updateService(currentServiceId, {
            name,
            date,
            description,
            status,
          }, user.id);

          const existingItems = await db.getServiceItems(currentServiceId);
          const existingItemIds = existingItems.map((i) => i.id);
          if (existingItemIds.length > 0) {
            await db.deleteServiceItems(existingItemIds);
          }

          if (items.length > 0) {
            await db.createServiceItems(items.map((item) => ({
              service_id: currentServiceId,
              type: item.type,
              song_id: item.songId,
              bible_reference: item.bibleReference,
              bible_text: item.bibleText,
              announcement_id: item.announcementId,
              order: item.order,
              notes: item.notes,
            })));
          }
          return;
        }
      }

      const service = await db.createService({
        name,
        date,
        description,
        status,
      }, user.id);

      currentServiceId = service.id;

      if (items.length > 0) {
        await db.createServiceItems(items.map((item) => ({
          service_id: currentServiceId,
          type: item.type,
          song_id: item.songId,
          bible_reference: item.bibleReference,
          bible_text: item.bibleText,
          announcement_id: item.announcementId,
          order: item.order,
          notes: item.notes,
        })));
      }
    } catch (e) {
      console.error("Failed to persist service", e);
      setError("Failed to save service");
      throw e;
    }
  }, [user, name, date, description, status, items, serviceId, db]);

  useEffect(() => {
    if (!name) return;

    if (autosaveTimeoutRef.current) {
      clearTimeout(autosaveTimeoutRef.current);
    }

    setSaveStatus("idle");
    autosaveTimeoutRef.current = setTimeout(async () => {
      setSaveStatus("saving");
      try {
        await persistServiceData();
        setSaveStatus("saved");
        toast.addToast("success", "Service saved");
      } catch (e) {
        setSaveStatus("error");
        toast.addToast("error", "Failed to save service");
      }
    }, 2000);

    return () => {
      if (autosaveTimeoutRef.current) {
        clearTimeout(autosaveTimeoutRef.current);
      }
    };
  }, [name, date, description, status, items, persistServiceData]);

  const handleSave = async () => {
    if (!name.trim()) {
      alert("Please enter a service name");
      return;
    }

    if (!user) {
      alert("You must be logged in to save services");
      return;
    }

    setIsSaving(true);
    setSaveStatus("saving");
    setError(null);
    try {
      await persistServiceData();
      setSaveStatus("saved");
      router.push("/services");
    } catch (e) {
      console.error("Failed to save service", e);
      setError("Failed to save service. Please try again.");
      setSaveStatus("error");
    } finally {
      setIsSaving(false);
    }
  };

  const filteredSongs = songs.filter(
    (s) =>
      s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.romanizedTitle && s.romanizedTitle.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-brand-darker">
      <header className="h-16 border-b border-white/5 flex items-center justify-between px-8">
        <div className="flex items-center gap-4">
          <Link
            href="/services"
            className="text-muted-foreground hover:text-white transition-colors"
          >
            &larr; Back
          </Link>
          <h2 className="text-lg font-semibold text-white">Plan Service</h2>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-xs text-muted-foreground">
            {saveStatus === "saving" && "Saving..."}
            {saveStatus === "saved" && "✓ Saved"}
            {saveStatus === "error" && "✕ Error saving"}
          </div>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-2 bg-white text-brand-darker font-semibold rounded-lg hover:bg-white/90 transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {isSaving ? "Saving..." : "Save Service"}
          </button>
        </div>
      </header>

      {error && (
        <div className="mx-8 mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400">
          {error}
        </div>
      )}

      <div className="flex h-[calc(100vh-64px)]">
        {/* Left Panel */}
        <div className="w-96 border-r border-white/5 p-6 overflow-y-auto">
          <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
            Service Details
          </h3>
          <div className="space-y-4 mb-8">
            <div>
              <label className="block text-xs text-muted-foreground mb-1.5">Service Name</label>
              <input
                type="text"
                placeholder="e.g., Sunday Worship Service"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-brand-gold/50"
              />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1.5">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-1 focus:ring-brand-gold/50"
              />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1.5">Description</label>
              <textarea
                placeholder="Optional description..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-brand-gold/50 resize-none"
              />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1.5">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as ServiceStatus)}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-1 focus:ring-brand-gold/50"
              >
                <option value="draft">Draft</option>
                <option value="ready">Ready</option>
                <option value="live">Live</option>
                <option value="completed">Completed</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          </div>

          <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
            Add Items
          </h3>
          <div className="space-y-3">
            <select
              value={itemType}
              onChange={(e) => setItemType(e.target.value as typeof itemType)}
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-1 focus:ring-brand-gold/50"
            >
              <option value="song">Song</option>
              <option value="bible">Bible</option>
              <option value="announcement">Announcement</option>
            </select>

            {itemType === "song" && (
              <div className="space-y-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search songs..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-brand-gold/50"
                  />
                </div>
                <div className="max-h-48 overflow-y-auto space-y-1">
                  {filteredSongs.map((song) => (
                    <button
                      key={song.id}
                      onClick={() => {
                        const newItem: ServiceItem = {
                          id: crypto.randomUUID(),
                          type: "song",
                          songId: song.id,
                          song,
                          order: items.length,
                          notes: "",
                        };
                        setItems([...items, newItem]);
                        setSearchQuery("");
                      }}
                      className="w-full text-left px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-sm text-white transition-colors"
                    >
                      {song.title}
                      {song.romanizedTitle && (
                        <span className="text-muted-foreground text-xs ml-2">
                          ({song.romanizedTitle})
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {itemType === "bible" && (
              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="Reference (e.g., John 3:16)"
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-brand-gold/50"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      const newItem: ServiceItem = {
                        id: crypto.randomUUID(),
                        type: "bible",
                        bibleReference: (e.target as HTMLInputElement).value,
                        order: items.length,
                        notes: "",
                      };
                      setItems([...items, newItem]);
                      (e.target as HTMLInputElement).value = "";
                    }
                  }}
                />
              </div>
            )}

            {itemType === "announcement" && (
              <div className="space-y-2">
                {announcements.map((ann) => (
                  <button
                    key={ann.id}
                    onClick={() => {
                      const newItem: ServiceItem = {
                        id: crypto.randomUUID(),
                        type: "announcement",
                        announcementId: ann.id,
                        announcement: ann,
                        order: items.length,
                        notes: "",
                      };
                      setItems([...items, newItem]);
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-sm text-white transition-colors"
                  >
                    {ann.title}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - Service Timeline */}
        <div className="flex-1 p-6 overflow-y-auto">
          <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
            Service Timeline ({items.length} items)
          </h3>
          {items.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No items added yet. Add items from the left panel.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((item, idx) => (
                <div
                  key={item.id}
                  draggable
                  onDragStart={() => handleDragStart(idx)}
                  onDragOver={(e) => handleDragOver(e, idx)}
                  onDragEnd={handleDragEnd}
                  className={cn(
                    "glass rounded-xl p-4 flex items-center gap-4 cursor-move transition-all duration-200",
                    draggedIndex === idx && "opacity-50 scale-[0.98]"
                  )}
                >
                  <div className="flex flex-col gap-1">
                    <button
                      onClick={() => moveItem(item.id, "up")}
                      disabled={idx === 0}
                      className="p-0.5 rounded hover:bg-white/10 text-muted-foreground hover:text-white disabled:opacity-30 transition-colors"
                    >
                      <ChevronUp className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => moveItem(item.id, "down")}
                      disabled={idx === items.length - 1}
                      className="p-0.5 rounded hover:bg-white/10 text-muted-foreground hover:text-white disabled:opacity-30 transition-colors"
                    >
                      <ChevronDown className="w-4 h-4" />
                    </button>
                  </div>
                  <span className="text-sm font-mono text-muted-foreground w-8 text-center">
                    {String(idx + 1).padStart(2, "0")}
                  </span>
                  <div className="flex-1">
                    {item.type === "song" && item.song && (
                      <div className="flex items-center gap-2">
                        <Music className="w-4 h-4 text-brand-gold" />
                        <span className="text-white font-medium">{item.song.title}</span>
                        {item.song.romanizedTitle && (
                          <span className="text-sm text-muted-foreground">
                            ({item.song.romanizedTitle})
                          </span>
                        )}
                        <span className="px-2 py-0.5 bg-green-500/10 text-green-400 text-[10px] rounded-full">
                          Ready
                        </span>
                      </div>
                    )}
                    {item.type === "bible" && (
                      <div className="flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-blue-400" />
                        <span className="text-white font-medium">
                          {item.bibleReference || "Bible Reading"}
                        </span>
                        {item.bibleText ? (
                          <span className="px-2 py-0.5 bg-green-500/10 text-green-400 text-[10px] rounded-full">
                            Ready
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-yellow-500/10 text-yellow-400 text-[10px] rounded-full">
                            Add text
                          </span>
                        )}
                      </div>
                    )}
                    {item.type === "announcement" && item.announcement && (
                      <div className="flex items-center gap-2">
                        <Megaphone className="w-4 h-4 text-green-400" />
                        <span className="text-white font-medium">{item.announcement.title}</span>
                        <span className="px-2 py-0.5 bg-green-500/10 text-green-400 text-[10px] rounded-full">
                          Ready
                        </span>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => removeItem(item.id)}
                    className="p-2 rounded-lg hover:bg-red-500/10 text-red-400 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

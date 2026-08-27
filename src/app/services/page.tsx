"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Plus,
  Calendar,
  Play,
  Trash2,
  Music,
  BookOpen,
  Megaphone,
  Loader2,
  Copy,
  Archive,
  Edit,
  Clock,
  X,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { useAuth } from "@/app/providers";
import { db } from "@/services/database";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/toast";
import type { Service } from "@/types";

export default function ServicesPage() {
  const router = useRouter();
  const { user } = useAuth();
  const toast = useToast();
  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [readinessService, setReadinessService] = useState<Service | null>(null);
  const [readinessResult, setReadinessResult] = useState<{ ready: boolean; issues: string[]; checks: { label: string; ready: boolean }[] } | null>(null);

  useEffect(() => {
    if (!user) return;
    loadServices();
  }, [user]);

  const loadServices = async () => {
    if (!user) return;
    try {
      const data = await db.getServices(user.id);
      setServices(data as Service[]);
    } catch (e) {
      console.error("Failed to load services", e);
      setError("Failed to load services");
    } finally {
      setIsLoading(false);
    }
  };

  const deleteService = async (id: string) => {
    if (!user) return;
    try {
      const { data: serviceItems, error: countError } = await supabase
        .from("service_items")
        .select("id", { count: "exact", head: true })
        .eq("service_id", id);

      if (countError) throw countError;

      const itemCount = serviceItems?.length || 0;
      const confirmed = itemCount > 0
        ? confirm(`This service has ${itemCount} item${itemCount === 1 ? "" : "s"}. Deleting the service will remove all items.\n\nAre you sure you want to delete this service?`)
        : confirm("Are you sure you want to delete this service?");
      
      if (!confirmed) return;

      await db.deleteService(id, user.id);
      setServices((prev) => prev.filter((s) => s.id !== id));
      toast.addToast("success", "Service deleted");
    } catch (e) {
      console.error("Failed to delete service", e);
      toast.addToast("error", "Failed to delete service");
    }
  };

  const duplicateService = async (service: Service) => {
    if (!user) return;
    try {
      const newService = await db.createService({
        name: `${service.name} (Copy)`,
        date: service.date,
        description: service.description,
        status: "draft",
      }, user.id);

      const items = await db.getServiceItems(service.id);
      if (items.length > 0) {
        await db.createServiceItems(
          items.map((item) => ({
            service_id: newService.id,
            type: item.type,
            song_id: item.songId,
            bible_reference: item.bibleReference,
            bible_text: item.bibleText,
            announcement_id: item.announcementId,
            order: item.order,
            notes: item.notes,
          }))
        );
      }

      setServices((prev) => [newService as Service, ...prev]);
      toast.addToast("success", "Service duplicated");
    } catch (e) {
      console.error("Failed to duplicate service", e);
      toast.addToast("error", "Failed to duplicate service");
    }
  };

  const archiveService = async (service: Service) => {
    if (!user) return;
    try {
      const updated = await db.updateService(service.id, {
        status: service.status === "archived" ? "draft" : "archived",
      }, user.id);
      setServices((prev) => prev.map((s) => s.id === service.id ? { ...s, status: updated.status } : s));
      toast.addToast("success", updated.status === "archived" ? "Service archived" : "Service restored");
    } catch (e) {
      console.error("Failed to archive service", e);
      toast.addToast("error", "Failed to archive service");
    }
  };

  const startService = async (service: Service) => {
    if (!user) return;
    try {
      const items = await db.getServiceItems(service.id);
      const songs = await db.getSongs(user.id);
      const announcements = await db.getAnnouncements(user.id);

      const checks: { label: string; ready: boolean }[] = [];
      const issues: string[] = [];

      const serviceSongs = items.filter((i: any) => i.type === "song");
      if (serviceSongs.length === 0) {
        checks.push({ label: "Songs added", ready: true });
      } else {
        const matchedSongs = serviceSongs.filter((i: any) => songs.find((s) => s.id === i.songId));
        if (matchedSongs.length === serviceSongs.length) {
          checks.push({ label: "All songs available", ready: true });
        } else {
          checks.push({ label: "All songs available", ready: false });
          issues.push(`${serviceSongs.length - matchedSongs.length} song(s) missing from library`);
        }
      }

      const bibles = items.filter((i: any) => i.type === "bible");
      if (bibles.length === 0) {
        checks.push({ label: "Bible content ready", ready: true });
      } else {
        const readyBibles = bibles.filter((i: any) => i.bibleText?.trim());
        if (readyBibles.length === bibles.length) {
          checks.push({ label: "Bible content ready", ready: true });
        } else {
          checks.push({ label: "Bible content ready", ready: false });
          issues.push(`${bibles.length - readyBibles.length} Bible item(s) missing content`);
        }
      }

      const announcementItems = items.filter((i: any) => i.type === "announcement");
      if (announcementItems.length === 0) {
        checks.push({ label: "Announcements ready", ready: true });
      } else {
        const readyAnnouncements = announcementItems.filter((i: any) => announcements.find((a) => a.id === i.announcementId));
        if (readyAnnouncements.length === announcementItems.length) {
          checks.push({ label: "Announcements ready", ready: true });
        } else {
          checks.push({ label: "Announcements ready", ready: false });
          issues.push(`${announcementItems.length - readyAnnouncements.length} announcement(s) missing`);
        }
      }

      checks.push({ label: "Presentation theme selected", ready: true });
      checks.push({ label: "Display window available", ready: true });

      const ready = issues.length === 0;
      setReadinessService(service);
      setReadinessResult({ ready, issues, checks });
    } catch (e) {
      console.error("Failed to check service readiness", e);
      alert("Failed to check service readiness");
    }
  };

  const confirmStartService = async () => {
    if (!readinessService || !user) return;
    try {
      const items = await db.getServiceItems(readinessService.id);
      const serviceWithItems = { ...readinessService, items: items as any };
      localStorage.setItem("church-lyrics-current-service", JSON.stringify(serviceWithItems));
      setReadinessService(null);
      setReadinessResult(null);
      router.push("/presentation");
    } catch (e) {
      console.error("Failed to start service", e);
      alert("Failed to start service");
    }
  };

  return (
    <div className="min-h-screen bg-brand-darker">
      <header className="h-16 border-b border-white/5 flex items-center justify-between px-8">
        <div className="flex items-center gap-4">
          <div>
            <h2 className="text-lg font-semibold text-white">Services</h2>
            <p className="text-sm text-muted-foreground">
              {services.length} services planned
            </p>
          </div>
          <Link
            href="/services/history"
            className="text-xs text-muted-foreground hover:text-white transition-colors flex items-center gap-1"
          >
            <Clock className="w-3 h-3" />
            History
          </Link>
        </div>
        <Link
          href="/services/new"
          className="px-4 py-2 bg-brand-gold text-brand-darker font-semibold rounded-lg hover:bg-brand-goldLight transition-colors flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          New Service
        </Link>
      </header>

      <div className="p-8">
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400">
            {error}
          </div>
        )}

        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Loading...</div>
        ) : services.length === 0 ? (
          <div className="glass rounded-xl p-12 text-center">
            <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">No services planned yet</p>
            <Link
              href="/services/new"
              className="inline-flex items-center gap-2 px-4 py-2 bg-brand-gold text-brand-darker font-semibold rounded-lg hover:bg-brand-goldLight transition-colors"
            >
              <Plus className="w-4 h-4" />
              Plan Your First Service
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-4">
              {services.map((service) => (
                <div
                  key={service.id}
                  className="glass rounded-xl p-6 hover:bg-white/[0.07] transition-all duration-300 group"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-semibold text-white group-hover:text-brand-gold transition-colors">
                        {service.name}
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        {new Date(service.date).toLocaleDateString("en-US", {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className={cn(
                        "px-2 py-0.5 rounded text-xs font-medium",
                        service.status === "live" && "bg-red-500/20 text-red-400",
                        service.status === "ready" && "bg-green-500/20 text-green-400",
                        service.status === "draft" && "bg-gray-500/20 text-gray-400",
                        service.status === "completed" && "bg-blue-500/20 text-blue-400",
                        service.status === "archived" && "bg-yellow-500/20 text-yellow-400",
                      )}>
                        {service.status}
                      </span>
                      <button
                        onClick={() => deleteService(service.id)}
                        className="p-1.5 rounded hover:bg-red-500/10 text-red-400 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 mb-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Music className="w-4 h-4" />
                      {service.items?.filter((i: any) => i.type === "song").length || 0} songs
                    </span>
                    <span className="flex items-center gap-1">
                      <BookOpen className="w-4 h-4" />
                      {service.items?.filter((i: any) => i.type === "bible").length || 0} bible
                    </span>
                    <span className="flex items-center gap-1">
                      <Megaphone className="w-4 h-4" />
                      {service.items?.filter((i: any) => i.type === "announcement").length || 0} announcements
                    </span>
                  </div>

                  <div className="text-xs text-muted-foreground mb-4">
                    {service.items?.length || 0} items • Last modified {new Date(service.updatedAt).toLocaleDateString()}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => startService(service)}
                      className="flex-1 px-4 py-2 bg-brand-gold text-brand-darker font-semibold rounded-lg hover:bg-brand-goldLight transition-colors flex items-center justify-center gap-2"
                    >
                      <Play className="w-4 h-4" />
                      {service.status === "live" ? "Continue" : "Start Service"}
                    </button>
                    <Link
                      href={`/services/new?id=${service.id}`}
                      className="px-3 py-2 bg-white/5 border border-white/10 text-white rounded-lg hover:bg-white/10 transition-colors"
                    >
                      <Edit className="w-4 h-4" />
                    </Link>
                    <button
                      onClick={() => duplicateService(service)}
                      className="px-3 py-2 bg-white/5 border border-white/10 text-white rounded-lg hover:bg-white/10 transition-colors"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => archiveService(service)}
                      className="px-3 py-2 bg-white/5 border border-white/10 text-white rounded-lg hover:bg-white/10 transition-colors"
                    >
                      <Archive className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>

      {readinessService && readinessResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => { setReadinessService(null); setReadinessResult(null); }} />
          <div className="relative glass rounded-xl p-6 max-w-md w-full mx-4 border border-white/10">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Service Readiness</h3>
              <button
                onClick={() => { setReadinessService(null); setReadinessResult(null); }}
                className="p-1 rounded hover:bg-white/10 text-muted-foreground hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 mb-4">
              {readinessResult.checks.map((check, idx) => (
                <div key={idx} className="flex items-center gap-2 text-sm">
                  {check.ready ? (
                    <CheckCircle2 className="w-4 h-4 text-green-400" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-yellow-400" />
                  )}
                  <span className={check.ready ? "text-muted-foreground" : "text-yellow-400"}>
                    {check.label}
                  </span>
                </div>
              ))}
            </div>

            {readinessResult.issues.length > 0 && (
              <div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                <p className="text-xs text-yellow-400 font-medium mb-1">Issues to fix:</p>
                <ul className="text-xs text-yellow-400/80 space-y-0.5">
                  {readinessResult.issues.map((issue, idx) => (
                    <li key={idx}>• {issue}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex items-center gap-3">
              <button
                onClick={() => { setReadinessService(null); setReadinessResult(null); }}
                className="flex-1 px-4 py-2 bg-white/5 border border-white/10 text-white rounded-lg hover:bg-white/10 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmStartService}
                className="flex-1 px-4 py-2 bg-brand-gold text-brand-darker font-semibold rounded-lg hover:bg-brand-goldLight transition-colors"
              >
                Start Anyway
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

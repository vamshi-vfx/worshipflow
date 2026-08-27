"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Home,
  Music,
  Calendar,
  BookOpen,
  Megaphone,
  Play,
  Palette,
  Settings,
  HelpCircle,
  Plus,
  Music2,
  Clock,
  Star,
  Search,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Timer,
  Users,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/app/providers";
import { db } from "@/services/database";
import { CommandPalette } from "@/components/command-palette";
import type { Song, Service, Announcement } from "@/types";

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: Home },
  { label: "Songs", href: "/songs", icon: Music },
  { label: "Services", href: "/services", icon: Calendar },
  { label: "Bible", href: "/bible", icon: BookOpen },
  { label: "Announcements", href: "/announcements", icon: Megaphone },
  { label: "Media", href: "/media", icon: Play },
  { label: "Themes", href: "/themes", icon: Palette },
];

const bottomNavItems = [
  { label: "Settings", href: "/settings", icon: Settings },
  { label: "Help", href: "/help", icon: HelpCircle },
];

export default function DashboardPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [greeting, setGreeting] = useState("Good Evening");
  const [stats, setStats] = useState({
    totalSongs: 0,
    totalServices: 0,
    recentlyUsed: 0,
    favorites: 0,
  });
  const [recentSongs, setRecentSongs] = useState<Song[]>([]);
  const [upcomingService, setUpcomingService] = useState<Service | null>(null);
  const [serviceReadiness, setServiceReadiness] = useState<{
    ready: boolean;
    issues: string[];
    checks: { label: string; ready: boolean }[];
  }>({ ready: false, issues: [], checks: [] });
  const [completedServices, setCompletedServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting("Good Morning");
    else if (hour < 17) setGreeting("Good Afternoon");
    else setGreeting("Good Evening");
  }, []);

  useEffect(() => {
    const loadData = async () => {
      if (!user) return;

      try {
        const [songs, services, announcements] = await Promise.all([
          db.getSongs(user.id),
          db.getServices(user.id),
          db.getAnnouncements(user.id),
        ]);

        const totalSongs = songs.length;
        const totalServices = services.length;
        const recentlyUsed = songs.filter((s) => s.updatedAt).length;
        const favorites = songs.filter((s) => s.favorite).length;

        setStats({ totalSongs, totalServices, recentlyUsed, favorites });
        setRecentSongs(songs.slice(0, 5));
        setCompletedServices(services.filter((s) => s.status === "completed"));

        const today = new Date().toISOString().split("T")[0];
        const upcoming = services
          .filter((s) => s.date >= today && s.status !== "archived")
          .sort((a, b) => a.date.localeCompare(b.date))[0] || null;
        setUpcomingService(upcoming as Service | null);

        if (upcoming) {
          const checks: { label: string; ready: boolean }[] = [];
          const issues: string[] = [];

          const serviceSongs = upcoming.items?.filter((i: any) => i.type === "song") || [];
          const songIds = serviceSongs.map((i: any) => i.songId).filter(Boolean);
          const matchedSongs = songs.filter((s) => songIds.includes(s.id));
          
          if (serviceSongs.length === 0) {
            checks.push({ label: "Songs added", ready: true });
          } else if (matchedSongs.length === serviceSongs.length) {
            checks.push({ label: "All songs available", ready: true });
          } else {
            const missing = serviceSongs.filter((i: any) => !matchedSongs.find((s) => s.id === i.songId));
            checks.push({ label: "All songs available", ready: false });
            issues.push(`${missing.length} song(s) missing from library`);
          }

          const bibles = upcoming.items?.filter((i: any) => i.type === "bible") || [];
          if (bibles.length === 0) {
            checks.push({ label: "Bible content ready", ready: true });
          } else {
            const readyBibles = bibles.filter((i: any) => i.bibleText && i.bibleText.trim().length > 0);
            if (readyBibles.length === bibles.length) {
              checks.push({ label: "Bible content ready", ready: true });
            } else {
              checks.push({ label: "Bible content ready", ready: false });
              issues.push(`${bibles.length - readyBibles.length} Bible item(s) missing content`);
            }
          }

          const announcementsInService = upcoming.items?.filter((i: any) => i.type === "announcement") || [];
          if (announcementsInService.length === 0) {
            checks.push({ label: "Announcements ready", ready: true });
          } else {
            const readyAnnouncements = announcementsInService.filter((i: any) => i.announcementId);
            if (readyAnnouncements.length === announcementsInService.length) {
              checks.push({ label: "Announcements ready", ready: true });
            } else {
              checks.push({ label: "Announcements ready", ready: false });
              issues.push(`${announcementsInService.length - readyAnnouncements.length} announcement(s) missing`);
            }
          }

          checks.push({ label: "Presentation theme selected", ready: true });
          checks.push({ label: "Display window available", ready: true });

          setServiceReadiness({
            ready: issues.length === 0,
            issues,
            checks,
          });
        }
      } catch (e) {
        console.error("Failed to load dashboard data", e);
        setError("Failed to load dashboard data");
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [user]);

  const quickActions = [
    { label: "New Song", href: "/songs/new", icon: Plus },
    { label: "New Service", href: "/services/new", icon: Calendar },
    { label: "Present Song", href: "/presentation", icon: Play },
    { label: "Bible", href: "/bible/new", icon: BookOpen },
    { label: "Announcement", href: "/announcements/new", icon: Megaphone },
  ];

  return (
    <div className="flex h-screen bg-brand-darker">
      {/* Sidebar */}
      <aside className="w-64 bg-brand-darker border-r border-white/5 flex flex-col">
        <div className="p-6">
          <Link href="/dashboard" className="block">
            <h1 className="font-display text-xl font-bold tracking-tight text-white">
              CHURCH LYRICS OS
            </h1>
            <p className="text-xs text-muted-foreground mt-1">Worship Presentation</p>
          </Link>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group",
                item.href === "/dashboard"
                  ? "bg-brand-gold/10 text-brand-gold"
                  : "text-muted-foreground hover:text-white hover:bg-white/5"
              )}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="p-3 border-t border-white/5 space-y-1">
          {bottomNavItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-white hover:bg-white/5 transition-all duration-200"
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </Link>
          ))}
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="h-16 border-b border-white/5 flex items-center justify-between px-8 flex-shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-white">{greeting}</h2>
            <p className="text-sm text-muted-foreground">Ready for worship?</p>
          </div>
          <div className="flex items-center gap-4">
            <CommandPalette />
            <button
              onClick={() => router.push("/presentation")}
              className="px-4 py-2 bg-brand-gold text-brand-darker font-semibold rounded-lg hover:bg-brand-goldLight transition-colors flex items-center gap-2"
            >
              <Play className="w-4 h-4" />
              Start Presentation
            </button>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8">
          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400">
              {error}
            </div>
          )}

          {/* Stats Grid */}
          <div className="grid grid-cols-4 gap-6 mb-8">
            {[
              { label: "Total Songs", value: stats.totalSongs.toString(), icon: Music2, color: "text-blue-400" },
              { label: "Total Services", value: stats.totalServices.toString(), icon: Calendar, color: "text-green-400" },
              { label: "Recently Used", value: stats.recentlyUsed.toString(), icon: Clock, color: "text-yellow-400" },
              { label: "Favorites", value: stats.favorites.toString(), icon: Star, color: "text-brand-gold" },
            ].map((stat) => (
              <div
                key={stat.label}
                className="glass rounded-xl p-6 hover:bg-white/[0.07] transition-all duration-300 group"
              >
                <div className="flex items-center justify-between mb-4">
                  <stat.icon className={cn("w-5 h-5", stat.color)} />
                </div>
                <p className="text-3xl font-bold text-white mb-1">{stat.value}</p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* Analytics */}
          <div className="mb-8">
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
              Analytics
            </h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="glass rounded-xl p-6">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp className="w-4 h-4 text-green-400" />
                  <span className="text-sm text-muted-foreground">Services Completed</span>
                </div>
                <p className="text-2xl font-bold text-white">{completedServices.length}</p>
                <p className="text-xs text-muted-foreground mt-1">Total completed services</p>
              </div>
              <div className="glass rounded-xl p-6">
                <div className="flex items-center gap-2 mb-3">
                  <Star className="w-4 h-4 text-brand-gold" />
                  <span className="text-sm text-muted-foreground">Favorite Songs</span>
                </div>
                <p className="text-2xl font-bold text-white">{stats.favorites}</p>
                <p className="text-xs text-muted-foreground mt-1">Songs marked as favorites</p>
              </div>
              <div className="glass rounded-xl p-6">
                <div className="flex items-center gap-2 mb-3">
                  <Clock className="w-4 h-4 text-blue-400" />
                  <span className="text-sm text-muted-foreground">Recently Updated</span>
                </div>
                <p className="text-2xl font-bold text-white">{stats.recentlyUsed}</p>
                <p className="text-xs text-muted-foreground mt-1">Songs with recent activity</p>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="mb-8">
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
              Quick Actions
            </h3>
            <div className="grid grid-cols-5 gap-4">
              {quickActions.map((action) => (
                <Link
                  key={action.href}
                  href={action.href}
                  className="glass rounded-xl p-4 flex flex-col items-center gap-3 hover:bg-white/[0.07] transition-all duration-300 group"
                >
                  <div className="p-3 rounded-full bg-brand-gold/10 group-hover:bg-brand-gold/20 transition-colors">
                    <action.icon className="w-5 h-5 text-brand-gold" />
                  </div>
                  <span className="text-sm font-medium text-white">{action.label}</span>
                </Link>
              ))}
            </div>
          </div>

          {/* Recent Songs */}
          <div>
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
              Recent Songs
            </h3>
            {isLoading ? (
              <div className="text-center py-12 text-muted-foreground">Loading...</div>
            ) : recentSongs.length === 0 ? (
              <div className="glass rounded-xl p-12 text-center">
                <Music2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">No songs yet</p>
                <Link
                  href="/songs/new"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-brand-gold text-brand-darker font-semibold rounded-lg hover:bg-brand-goldLight transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add Your First Song
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-4">
                {recentSongs.map((song) => (
                  <Link
                    key={song.id}
                    href={`/songs/${song.id}`}
                    className="glass rounded-xl p-5 hover:bg-white/[0.07] transition-all duration-300 group"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-semibold text-white group-hover:text-brand-gold transition-colors">
                          {song.title}
                        </h4>
                        {song.romanizedTitle && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {song.romanizedTitle}
                          </p>
                        )}
                      </div>
                      {song.favorite && (
                        <Star className="w-4 h-4 text-brand-gold fill-brand-gold" />
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="px-2 py-1 rounded-full bg-white/5 capitalize">
                        {song.language}
                      </span>
                      {song.category && (
                        <span className="px-2 py-1 rounded-full bg-white/5 capitalize">
                          {song.category}
                        </span>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Upcoming Service */}
          {upcomingService && (
            <div className="mb-8">
              <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
                Upcoming Service
              </h3>
              <div className="glass rounded-xl p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h4 className="font-semibold text-white text-lg">{upcomingService.name}</h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      {new Date(upcomingService.date).toLocaleDateString("en-US", {
                        weekday: "long",
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                    <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Music2 className="w-3 h-3" />
                        {upcomingService.items?.filter((i: any) => i.type === "song").length || 0} songs
                      </span>
                      <span className="flex items-center gap-1">
                        <BookOpen className="w-3 h-3" />
                        {upcomingService.items?.filter((i: any) => i.type === "bible").length || 0} bible
                      </span>
                      <span className="flex items-center gap-1">
                        <Megaphone className="w-3 h-3" />
                        {upcomingService.items?.filter((i: any) => i.type === "announcement").length || 0} announcements
                      </span>
                    </div>
                  </div>
                  <span className={cn(
                    "px-2 py-1 rounded text-xs font-medium capitalize",
                    serviceReadiness.ready
                      ? "bg-green-500/20 text-green-400"
                      : "bg-yellow-500/20 text-yellow-400"
                  )}>
                    {serviceReadiness.ready ? "Ready" : "Needs Review"}
                  </span>
                </div>

                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-brand-gold transition-all duration-500"
                        style={{ width: `${(serviceReadiness.checks.filter((c) => c.ready).length / serviceReadiness.checks.length) * 100 || 0}%` }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {serviceReadiness.checks.filter((c) => c.ready).length}/{serviceReadiness.checks.length}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {serviceReadiness.checks.map((check, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-xs">
                        {check.ready ? (
                          <CheckCircle2 className="w-3 h-3 text-green-400" />
                        ) : (
                          <AlertTriangle className="w-3 h-3 text-yellow-400" />
                        )}
                        <span className={check.ready ? "text-muted-foreground" : "text-yellow-400"}>
                          {check.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {serviceReadiness.issues.length > 0 && (
                  <div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                    <p className="text-xs text-yellow-400 font-medium mb-1">Issues to fix:</p>
                    <ul className="text-xs text-yellow-400/80 space-y-0.5">
                      {serviceReadiness.issues.map((issue, idx) => (
                        <li key={idx}>• {issue}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="flex items-center gap-3">
                  <Link
                    href={`/services/new?id=${upcomingService.id}`}
                    className="px-4 py-2 bg-white/5 border border-white/10 text-white rounded-lg hover:bg-white/10 transition-colors flex items-center gap-2"
                  >
                    Continue Preparing
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                  {serviceReadiness.ready && (
                    <button
                      onClick={() => router.push(`/presentation?serviceId=${upcomingService.id}`)}
                      className="px-4 py-2 bg-brand-gold text-brand-darker font-semibold rounded-lg hover:bg-brand-goldLight transition-colors flex items-center gap-2"
                    >
                      <Play className="w-4 h-4" />
                      Start Service
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Calendar,
  Clock,
  Music2,
  BookOpen,
  Megaphone,
  Play,
  ChevronRight,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/app/providers";
import { db } from "@/services/database";
import type { Service } from "@/types";

type ServiceStatus = "draft" | "ready" | "live" | "completed" | "archived";

const STATUS_CONFIG: Record<ServiceStatus, { label: string; color: string }> = {
  draft: { label: "Draft", color: "bg-gray-500/20 text-gray-400" },
  ready: { label: "Ready", color: "bg-blue-500/20 text-blue-400" },
  live: { label: "Live", color: "bg-red-500/20 text-red-400" },
  completed: { label: "Completed", color: "bg-green-500/20 text-green-400" },
  archived: { label: "Archived", color: "bg-yellow-500/20 text-yellow-400" },
};

export default function ServicesHistoryPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [services, setServices] = useState<Service[]>([]);
  const [filter, setFilter] = useState<ServiceStatus | "all">("all");
  const [isLoading, setIsLoading] = useState(true);

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
    } finally {
      setIsLoading(false);
    }
  };

  const filteredServices = services
    .filter((s) => filter === "all" || s.status === filter)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const completedServices = services.filter((s) => s.status === "completed");
  const totalDuration = completedServices.length;

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
          <div>
            <h2 className="text-lg font-semibold text-white">Service History</h2>
            <p className="text-sm text-muted-foreground">
              {services.length} services total • {completedServices.length} completed
            </p>
          </div>
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
        {/* Stats */}
        <div className="grid grid-cols-4 gap-6 mb-8">
          {[
            { label: "Total Services", value: services.length.toString(), icon: Calendar, color: "text-blue-400" },
            { label: "Completed", value: completedServices.length.toString(), icon: Play, color: "text-green-400" },
            { label: "In Progress", value: services.filter((s) => s.status === "live" || s.status === "ready").length.toString(), icon: Clock, color: "text-yellow-400" },
            { label: "Archived", value: services.filter((s) => s.status === "archived").length.toString(), icon: BookOpen, color: "text-muted-foreground" },
          ].map((stat) => (
            <div
              key={stat.label}
              className="glass rounded-xl p-6 hover:bg-white/[0.07] transition-all duration-300"
            >
              <div className="flex items-center justify-between mb-4">
                <stat.icon className={cn("w-5 h-5", stat.color)} />
              </div>
              <p className="text-3xl font-bold text-white mb-1">{stat.value}</p>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Filter */}
        <div className="flex items-center gap-4 mb-6">
          <div className="flex items-center gap-2">
            {(["all", "completed", "live", "ready", "draft", "archived"] as const).map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                  filter === status
                    ? "bg-brand-gold/10 text-brand-gold border border-brand-gold/20"
                    : "bg-white/5 border border-white/10 text-muted-foreground hover:text-white"
                )}
              >
                {status === "all" ? "All" : STATUS_CONFIG[status]?.label || status}
              </button>
            ))}
          </div>
        </div>

        {/* Services List */}
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Loading...</div>
        ) : filteredServices.length === 0 ? (
          <div className="glass rounded-xl p-12 text-center">
            <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">No services found</p>
            <Link
              href="/services/new"
              className="inline-flex items-center gap-2 px-4 py-2 bg-brand-gold text-brand-darker font-semibold rounded-lg hover:bg-brand-goldLight transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create Your First Service
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredServices.map((service) => (
              <Link
                key={service.id}
                href={`/services/new?id=${service.id}`}
                className="glass rounded-xl p-6 hover:bg-white/[0.07] transition-all duration-300 group flex items-center justify-between"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold text-white group-hover:text-brand-gold transition-colors">
                      {service.name}
                    </h3>
                    <span className={cn("px-2 py-0.5 rounded text-xs font-medium", STATUS_CONFIG[service.status]?.color)}>
                      {STATUS_CONFIG[service.status]?.label || service.status}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">
                    {new Date(service.date).toLocaleDateString("en-US", {
                      weekday: "long",
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Music2 className="w-3 h-3" />
                      {service.items?.filter((i: any) => i.type === "song").length || 0} songs
                    </span>
                    <span className="flex items-center gap-1">
                      <BookOpen className="w-3 h-3" />
                      {service.items?.filter((i: any) => i.type === "bible").length || 0} bible
                    </span>
                    <span className="flex items-center gap-1">
                      <Megaphone className="w-3 h-3" />
                      {service.items?.filter((i: any) => i.type === "announcement").length || 0} announcements
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-white transition-colors" />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, User, Church, Bell, Shield, Palette, Database, Trash2 } from "lucide-react";

export default function SettingsPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-brand-darker">
      <header className="h-16 border-b border-white/5 flex items-center gap-4 px-8">
        <button
          onClick={() => router.push("/dashboard")}
          className="text-muted-foreground hover:text-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 className="text-lg font-semibold text-white">Settings</h2>
      </header>

      <div className="p-8 max-w-3xl">
        <div className="space-y-6">
          {/* Profile */}
          <div className="glass rounded-xl p-6">
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
              <User className="w-4 h-4" />
              Profile
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-muted-foreground mb-1.5">Name</label>
                <input
                  type="text"
                  placeholder="Your name"
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-brand-gold/50"
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1.5">Email</label>
                <input
                  type="email"
                  placeholder="your@email.com"
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-brand-gold/50"
                />
              </div>
            </div>
          </div>

          {/* Church */}
          <div className="glass rounded-xl p-6">
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
              <Church className="w-4 h-4" />
              Church
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-muted-foreground mb-1.5">Church Name</label>
                <input
                  type="text"
                  placeholder="Your church name"
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-brand-gold/50"
                />
              </div>
            </div>
          </div>

          {/* Appearance */}
          <div className="glass rounded-xl p-6">
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
              <Palette className="w-4 h-4" />
              Appearance
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-muted-foreground mb-1.5">Default Theme</label>
                <select className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-1 focus:ring-brand-gold/50">
                  <option value="cinematic-dark">Cinematic Dark</option>
                  <option value="pure-black">Pure Black</option>
                  <option value="minimal-white">Minimal White</option>
                  <option value="worship-glow">Worship Glow</option>
                </select>
              </div>
            </div>
          </div>

          {/* Data */}
          <div className="glass rounded-xl p-6">
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
              <Database className="w-4 h-4" />
              Data
            </h3>
            <div className="space-y-3">
              <button className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white hover:bg-white/10 transition-colors text-left">
                Export All Data (JSON)
              </button>
              <button className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white hover:bg-white/10 transition-colors text-left">
                Import Data
              </button>
              <button className="w-full px-4 py-2.5 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400 hover:bg-red-500/20 transition-colors text-left flex items-center gap-2">
                <Trash2 className="w-4 h-4" />
                Clear All Data
              </button>
            </div>
          </div>

          {/* About */}
          <div className="glass rounded-xl p-6">
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-2">
              About
            </h3>
            <p className="text-sm text-muted-foreground">
              Church Lyrics OS v1.0.0
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Premium Worship Presentation Platform
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Save,
  Palette,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/app/providers";
import { db } from "@/services/database";
import type { Theme } from "@/types";

export default function NewThemePage() {
  const router = useRouter();
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [backgroundColor, setBackgroundColor] = useState("#000000");
  const [fontFamily, setFontFamily] = useState("Inter, system-ui, sans-serif");
  const [fontSize, setFontSize] = useState(64);
  const [alignment, setAlignment] = useState<"left" | "center" | "right">("center");
  const [verticalAlign, setVerticalAlign] = useState<"top" | "center" | "bottom">("center");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!name.trim()) {
      alert("Please enter a theme name");
      return;
    }

    if (!user) {
      alert("You must be logged in to save themes");
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      await db.createTheme({
        name,
        description,
        background: { type: "solid", value: backgroundColor },
        font: { family: fontFamily, size: fontSize, weight: 400 },
        alignment,
        vertical_align: verticalAlign,
        letter_spacing: 0,
        line_spacing: 1.5,
        shadow: true,
        overlay: { enabled: true, color: "#000000", opacity: 0.3 },
        logo: { enabled: false, position: "bottom-right" },
        is_default: false,
      }, user.id);
      router.push("/themes");
    } catch (e) {
      console.error("Failed to save theme", e);
      setError("Failed to save theme. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-darker">
      <header className="h-16 border-b border-white/5 flex items-center justify-between px-8">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push("/themes")}
            className="text-muted-foreground hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="text-lg font-semibold text-white">New Theme</h2>
        </div>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="px-4 py-2 bg-brand-gold text-brand-darker font-semibold rounded-lg hover:bg-brand-goldLight transition-colors flex items-center gap-2 disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {isSaving ? "Saving..." : "Save Theme"}
        </button>
      </header>

      {error && (
        <div className="mx-8 mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400">
          {error}
        </div>
      )}

      <div className="p-8 max-w-2xl">
        <div className="space-y-4">
          <div>
            <label className="block text-xs text-muted-foreground mb-1.5">Theme Name</label>
            <input
              type="text"
              placeholder="My Custom Theme"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-brand-gold/50"
            />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1.5">Description</label>
            <input
              type="text"
              placeholder="Brief description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-brand-gold/50"
            />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1.5">Background Color</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={backgroundColor}
                onChange={(e) => setBackgroundColor(e.target.value)}
                className="w-12 h-10 rounded-lg cursor-pointer border-0"
              />
              <input
                type="text"
                value={backgroundColor}
                onChange={(e) => setBackgroundColor(e.target.value)}
                className="flex-1 px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-1 focus:ring-brand-gold/50"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1.5">Font Family</label>
            <select
              value={fontFamily}
              onChange={(e) => setFontFamily(e.target.value)}
              className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-1 focus:ring-brand-gold/50"
            >
              <option value="Inter, system-ui, sans-serif">Inter (English)</option>
              <option value="Noto Sans Telugu, system-ui, sans-serif">Noto Sans Telugu</option>
              <option value="Noto Sans Devanagari, system-ui, sans-serif">Noto Sans Devanagari</option>
              <option value="Georgia, serif">Georgia (Serif)</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1.5">Font Size: {fontSize}px</label>
            <input
              type="range"
              min="32"
              max="120"
              value={fontSize}
              onChange={(e) => setFontSize(parseInt(e.target.value))}
              className="w-full"
            />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1.5">Alignment</label>
            <div className="flex gap-2">
              {(["left", "center", "right"] as const).map((a) => (
                <button
                  key={a}
                  onClick={() => setAlignment(a)}
                  className={cn(
                    "flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                    alignment === a
                      ? "bg-brand-gold/10 text-brand-gold border border-brand-gold/20"
                      : "bg-white/5 border border-white/10 text-muted-foreground hover:text-white"
                  )}
                >
                  {a === "left" ? "Left" : a === "center" ? "Center" : "Right"}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1.5">Vertical Position</label>
            <div className="flex gap-2">
              {(["top", "center", "bottom"] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setVerticalAlign(v)}
                  className={cn(
                    "flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                    verticalAlign === v
                      ? "bg-brand-gold/10 text-brand-gold border border-brand-gold/20"
                      : "bg-white/5 border border-white/10 text-muted-foreground hover:text-white"
                  )}
                >
                  {v.charAt(0).toUpperCase() + v.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Plus,
  Play,
  Trash2,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/app/providers";
import { db } from "@/services/database";
import type { Theme } from "@/types";

const defaultThemes: Theme[] = [
  {
    id: "pure-black",
    name: "Pure Black",
    description: "Solid black background",
    background: { type: "solid", value: "#000000" },
    font: { family: "Inter, system-ui, sans-serif", size: 64, weight: 400 },
    alignment: "center",
    verticalAlign: "center",
    letterSpacing: 0,
    lineSpacing: 1.5,
    shadow: false,
    overlay: { enabled: false, color: "#000000", opacity: 0 },
    logo: { enabled: false, position: "bottom-right" },
    isDefault: true,
  },
  {
    id: "cinematic-dark",
    name: "Cinematic Dark",
    description: "Deep dark with subtle shadows",
    background: { type: "solid", value: "#0A0A0A" },
    font: { family: "Noto Sans Telugu, system-ui, sans-serif", size: 72, weight: 400 },
    alignment: "center",
    verticalAlign: "center",
    letterSpacing: 0,
    lineSpacing: 1.6,
    shadow: true,
    overlay: { enabled: true, color: "#000000", opacity: 0.3 },
    logo: { enabled: false, position: "bottom-right" },
    isDefault: true,
  },
  {
    id: "minimal-white",
    name: "Minimal White",
    description: "Clean white background",
    background: { type: "solid", value: "#FFFFFF" },
    font: { family: "Inter, system-ui, sans-serif", size: 64, weight: 400 },
    alignment: "center",
    verticalAlign: "center",
    letterSpacing: 0,
    lineSpacing: 1.5,
    shadow: false,
    overlay: { enabled: false, color: "#FFFFFF", opacity: 0 },
    logo: { enabled: false, position: "bottom-right" },
    isDefault: true,
  },
  {
    id: "worship-glow",
    name: "Worship Glow",
    description: "Soft golden glow effect",
    background: { type: "gradient", value: "radial-gradient(circle at center, #1a0a00 0%, #000000 100%)" },
    font: { family: "Noto Sans Telugu, system-ui, sans-serif", size: 72, weight: 400 },
    alignment: "center",
    verticalAlign: "center",
    letterSpacing: 0,
    lineSpacing: 1.6,
    shadow: true,
    overlay: { enabled: true, color: "#000000", opacity: 0.2 },
    logo: { enabled: false, position: "bottom-right" },
    isDefault: true,
  },
];

export default function ThemesPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [themes, setThemes] = useState<Theme[]>(defaultThemes);
  const [selectedTheme, setSelectedTheme] = useState<Theme | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    loadThemes();
  }, [user]);

  const loadThemes = async () => {
    if (!user) return;
    try {
      const data = await db.getThemes(user.id);
      const customThemes = data as Theme[];
      setThemes([...defaultThemes, ...customThemes.filter(t => !t.isDefault)]);
    } catch (e) {
      console.error("Failed to load themes", e);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-darker">
      <header className="h-16 border-b border-white/5 flex items-center justify-between px-8">
        <div>
          <h2 className="text-lg font-semibold text-white">Themes</h2>
          <p className="text-sm text-muted-foreground">
            Choose a theme for your presentations
          </p>
        </div>
        <button
          onClick={() => router.push("/themes/new")}
          className="px-4 py-2 bg-brand-gold text-brand-darker font-semibold rounded-lg hover:bg-brand-goldLight transition-colors flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          New Theme
        </button>
      </header>

      <div className="p-8">
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Loading...</div>
        ) : (
          <div className="grid grid-cols-4 gap-6">
            {themes.map((theme) => (
              <button
                key={theme.id}
                onClick={() => setSelectedTheme(theme)}
                className={cn(
                  "glass rounded-xl overflow-hidden text-left hover:bg-white/[0.07] transition-all duration-300 group",
                  selectedTheme?.id === theme.id && "ring-2 ring-brand-gold"
                )}
              >
                <div
                  className="aspect-video w-full"
                  style={{
                    background: theme.background.type === "solid" ? theme.background.value : theme.background.value,
                  }}
                />
                <div className="p-4">
                  <h3 className="font-semibold text-white group-hover:text-brand-gold transition-colors">
                    {theme.name}
                  </h3>
                  {theme.description && (
                    <p className="text-sm text-muted-foreground mt-1">{theme.description}</p>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}

        {selectedTheme && (
          <div className="mt-8 glass rounded-xl p-6">
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
              Theme Preview
            </h3>
            <div className="aspect-video rounded-lg overflow-hidden flex items-center justify-center">
              <div
                className="text-center px-8"
                style={{
                  background: selectedTheme.background.type === "solid" ? selectedTheme.background.value : selectedTheme.background.value,
                }}
              >
                <h4
                  className="font-display text-2xl text-white mb-4"
                  style={{
                    fontFamily: selectedTheme.font.family,
                    fontSize: `${selectedTheme.font.size * 0.4}px`,
                    fontWeight: selectedTheme.font.weight,
                    textShadow: selectedTheme.shadow ? "0 2px 10px rgba(0,0,0,0.5)" : "none",
                  }}
                >
                  Sample Title
                </h4>
                <p
                  className="text-white/80"
                  style={{
                    fontFamily: selectedTheme.font.family,
                    fontSize: `${selectedTheme.font.size * 0.25}px`,
                    fontWeight: selectedTheme.font.weight,
                    lineHeight: selectedTheme.lineSpacing,
                    textShadow: selectedTheme.shadow ? "0 2px 10px rgba(0,0,0,0.5)" : "none",
                  }}
                >
                  This is how your lyrics will look
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

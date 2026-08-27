"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Monitor,
  Keyboard,
  HelpCircle,
  ExternalLink,
  Play,
  Square,
  Maximize,
  SkipBack,
  SkipForward,
} from "lucide-react";

export default function HelpPage() {
  const router = useRouter();

  const shortcuts = [
    { key: "Space / →", action: "Next slide" },
    { key: "← / Backspace", action: "Previous slide" },
    { key: "Home", action: "First slide" },
    { key: "End", action: "Last slide" },
    { key: "B", action: "Black screen" },
    { key: "F", action: "Fullscreen" },
    { key: "Esc", action: "Exit presentation" },
  ];

  return (
    <div className="min-h-screen bg-brand-darker">
      <header className="h-16 border-b border-white/5 flex items-center gap-4 px-8">
        <button
          onClick={() => router.push("/dashboard")}
          className="text-muted-foreground hover:text-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 className="text-lg font-semibold text-white">Help & Guide</h2>
      </header>

      <div className="p-8 max-w-4xl">
        {/* Dual Screen Setup */}
        <div className="glass rounded-xl p-6 mb-6">
          <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
            <Monitor className="w-4 h-4" />
            Dual Screen Setup (HDMI)
          </h3>
          <div className="space-y-4 text-sm text-muted-foreground">
            <div className="p-4 bg-white/5 rounded-lg">
              <h4 className="font-medium text-white mb-2">Windows Setup</h4>
              <ol className="list-decimal list-inside space-y-1">
                <li>Connect your TV/Projector via HDMI</li>
                <li>Go to Settings → System → Display</li>
                <li>Select "Extend these displays"</li>
                <li>Click "Start Presentation" in Church Lyrics OS</li>
                <li>Click "Open Display" to open the presentation window</li>
                <li>Drag the presentation window to your TV screen</li>
                <li>Press F to go fullscreen on the TV</li>
              </ol>
            </div>
            <div className="p-4 bg-white/5 rounded-lg">
              <h4 className="font-medium text-white mb-2">Tip</h4>
              <p>
                Laptop screen = Operator controls<br />
                TV screen = Audience sees only lyrics
              </p>
            </div>
          </div>
        </div>

        {/* Keyboard Shortcuts */}
        <div className="glass rounded-xl p-6 mb-6">
          <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
            <Keyboard className="w-4 h-4" />
            Keyboard Shortcuts
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {shortcuts.map((shortcut) => (
              <div
                key={shortcut.key}
                className="flex items-center justify-between p-3 bg-white/5 rounded-lg"
              >
                <span className="text-sm text-muted-foreground">{shortcut.action}</span>
                <span className="px-2 py-1 bg-white/10 rounded text-xs text-white font-mono">
                  {shortcut.key}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Tips */}
        <div className="glass rounded-xl p-6">
          <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
            <HelpCircle className="w-4 h-4" />
            Tips
          </h3>
          <div className="space-y-3 text-sm text-muted-foreground">
            <div className="p-3 bg-white/5 rounded-lg">
              <h4 className="font-medium text-white mb-1">Search in Telugu & Romanized</h4>
              <p>Search for "Yesayya" to find "యేసయ్య" and vice versa. The search supports all languages.</p>
            </div>
            <div className="p-3 bg-white/5 rounded-lg">
              <h4 className="font-medium text-white mb-1">Structured Lyrics</h4>
              <p>Organize your songs into verses, choruses, and bridges for better presentation control.</p>
            </div>
            <div className="p-3 bg-white/5 rounded-lg">
              <h4 className="font-medium text-white mb-1">Mixed Language Support</h4>
              <p>Each line can have Telugu, English, or both. Choose the display mode for each line.</p>
            </div>
            <div className="p-3 bg-white/5 rounded-lg">
              <h4 className="font-medium text-white mb-1">Black Screen</h4>
              <p>Press B during presentation for a black screen. Useful during prayer or transitions.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

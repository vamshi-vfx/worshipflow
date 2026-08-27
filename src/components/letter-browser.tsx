"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

interface LetterBrowserProps {
  selectedLetter: string | null;
  onSelectLetter: (letter: string | null) => void;
  language?: "all" | "english" | "telugu" | "hindi";
  className?: string;
}

const ENGLISH_LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
const TELUGU_LETTERS = [
  "అ", "ఆ", "ఇ", "ఈ", "ఉ", "ఊ", "ఎ", "ఏ", "ఐ", "ఒ", "ఓ", "ఔ",
  "క", "ఖ", "గ", "ఘ", "చ", "ఛ", "జ", "ఝ", "ట", "ఠ", "డ", "ఢ",
  "త", "థ", "ద", "ధ", "న", "ప", "ఫ", "బ", "భ", "మ", "య", "ర",
  "ల", "వ", "శ", "ష", "స", "హ",
];
const HINDI_LETTERS = [
  "अ", "आ", "इ", "ई", "उ", "ऊ", "ए", "ऐ", "ओ", "औ",
  "क", "ख", "ग", "घ", "च", "छ", "ज", "झ", "ट", "ठ", "ड", "ढ",
  "त", "थ", "द", "ध", "न", "प", "फ", "ब", "भ", "म", "य", "र",
  "ल", "व", "श", "ष", "स", "ह",
];

export function LetterBrowser({
  selectedLetter,
  onSelectLetter,
  language = "all",
  className,
}: LetterBrowserProps) {
  const [activeTab, setActiveTab] = useState<"english" | "telugu" | "hindi">(
    language === "telugu" ? "telugu" : language === "hindi" ? "hindi" : "english"
  );

  const letters = activeTab === "telugu" ? TELUGU_LETTERS : activeTab === "hindi" ? HINDI_LETTERS : ENGLISH_LETTERS;

  return (
    <div className={cn("glass rounded-xl p-4 border border-white/5", className)}>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3 pb-3 border-b border-white/5">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Browse by Letter:
          </span>
          {selectedLetter && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-brand-gold/20 text-brand-gold text-xs font-bold">
              Filtering by: {selectedLetter}
              <button
                onClick={() => onSelectLetter(null)}
                className="ml-1 hover:text-white"
                title="Clear filter"
              >
                ×
              </button>
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 bg-white/5 rounded-lg p-0.5">
          <button
            onClick={() => setActiveTab("english")}
            className={cn(
              "px-2.5 py-1 rounded text-xs font-medium transition-all",
              activeTab === "english" ? "bg-brand-gold text-brand-darker font-semibold" : "text-muted-foreground hover:text-white"
            )}
          >
            A–Z (English)
          </button>
          <button
            onClick={() => setActiveTab("telugu")}
            className={cn(
              "px-2.5 py-1 rounded text-xs font-medium transition-all",
              activeTab === "telugu" ? "bg-brand-gold text-brand-darker font-semibold" : "text-muted-foreground hover:text-white"
            )}
          >
            తెలుగు (Telugu)
          </button>
          <button
            onClick={() => setActiveTab("hindi")}
            className={cn(
              "px-2.5 py-1 rounded text-xs font-medium transition-all",
              activeTab === "hindi" ? "bg-brand-gold text-brand-darker font-semibold" : "text-muted-foreground hover:text-white"
            )}
          >
            हिन्दी (Hindi)
          </button>
        </div>
      </div>

      {/* Letters Flex Row */}
      <div className="flex flex-wrap gap-1 items-center">
        <button
          onClick={() => onSelectLetter(null)}
          className={cn(
            "px-2.5 py-1 rounded-md text-xs font-medium transition-all duration-150",
            selectedLetter === null
              ? "bg-brand-gold text-brand-darker font-bold shadow"
              : "bg-white/5 text-muted-foreground hover:text-white hover:bg-white/10"
          )}
        >
          All
        </button>

        {letters.map((letter) => {
          const isSelected = selectedLetter === letter;
          return (
            <button
              key={letter}
              onClick={() => onSelectLetter(isSelected ? null : letter)}
              className={cn(
                "min-w-[28px] h-7 px-1.5 rounded-md text-xs font-medium transition-all duration-150 flex items-center justify-center",
                isSelected
                  ? "bg-brand-gold text-brand-darker font-bold shadow-lg scale-105"
                  : "bg-white/5 text-white/80 hover:text-white hover:bg-white/15"
              )}
            >
              {letter}
            </button>
          );
        })}
      </div>
    </div>
  );
}

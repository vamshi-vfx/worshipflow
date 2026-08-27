"use client";

import { useState } from "react";
import { Music2, Plus, Minus, RotateCcw, Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { parseChordProLine, transposeTextChords } from "@/lib/chord-transposer";

interface ChordSheetProps {
  rawChords: string;
  originalKey?: string;
  className?: string;
}

export function ChordSheet({ rawChords, originalKey, className }: ChordSheetProps) {
  const [transposeOffset, setTransposeOffset] = useState(0);
  const [showChords, setShowChords] = useState(true);
  const [preferFlats, setPreferFlats] = useState(false);

  if (!rawChords || !rawChords.trim()) {
    return (
      <div className="glass rounded-xl p-12 text-center text-muted-foreground">
        <Music2 className="w-12 h-12 mx-auto mb-3 opacity-40 text-brand-gold" />
        <p className="text-base text-white font-medium mb-1">No chords available for this song</p>
        <p className="text-sm">Chords can be added in the Song Editor using ChordPro format e.g. [C] [G] [Am] [F].</p>
      </div>
    );
  }

  const lines = rawChords.split("\n");

  return (
    <div className={cn("glass rounded-xl p-6 border border-white/5", className)}>
      {/* Transpose & Visibility Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6 pb-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs">
            <span className="text-muted-foreground">Original Key:</span>
            <span className="text-brand-gold font-bold">{originalKey || "Auto"}</span>
          </div>

          <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-lg p-1">
            <button
              onClick={() => setTransposeOffset((prev) => prev - 1)}
              className="p-1.5 rounded hover:bg-white/10 text-white transition-colors"
              title="Transpose down 1 semitone"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <span className="px-2 text-xs font-mono font-bold text-white min-w-[36px] text-center">
              {transposeOffset > 0 ? `+${transposeOffset}` : transposeOffset}
            </span>
            <button
              onClick={() => setTransposeOffset((prev) => prev + 1)}
              className="p-1.5 rounded hover:bg-white/10 text-white transition-colors"
              title="Transpose up 1 semitone"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          {transposeOffset !== 0 && (
            <button
              onClick={() => setTransposeOffset(0)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-brand-gold/10 text-brand-gold text-xs font-medium hover:bg-brand-gold/20 transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              Reset
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setPreferFlats(!preferFlats)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors",
              preferFlats
                ? "bg-brand-gold/10 border-brand-gold/30 text-brand-gold"
                : "bg-white/5 border-white/10 text-muted-foreground hover:text-white"
            )}
          >
            {preferFlats ? "♭ Flats" : "♯ Sharps"}
          </button>

          <button
            onClick={() => setShowChords(!showChords)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs font-medium text-white hover:bg-white/10 transition-colors"
          >
            {showChords ? <Eye className="w-3.5 h-3.5 text-brand-gold" /> : <EyeOff className="w-3.5 h-3.5 text-muted-foreground" />}
            {showChords ? "Chords Visible" : "Chords Hidden"}
          </button>
        </div>
      </div>

      {/* Chord Sheet Lines */}
      <div className="font-mono text-sm leading-relaxed space-y-4 overflow-x-auto pb-4">
        {lines.map((line, idx) => {
          const transposedLine = transposeTextChords(line, transposeOffset, preferFlats);
          const parsed = parseChordProLine(transposedLine);

          // Section Heading [Chorus], [Verse 1], etc.
          const headingMatch = line.trim().match(/^\[(Verse\s*\d*|Chorus|Bridge|Intro|Outro|Tag|Pre-Chorus|Interlude.*)\]$/i);
          if (headingMatch) {
            return (
              <div key={idx} className="pt-3 font-sans font-bold text-brand-gold text-xs uppercase tracking-wider border-b border-brand-gold/20 pb-1 inline-block">
                {headingMatch[1]}
              </div>
            );
          }

          if (!parsed.hasChords) {
            return (
              <div key={idx} className="text-white/90 font-sans py-0.5">
                {parsed.raw}
              </div>
            );
          }

          return (
            <div key={idx} className="flex flex-wrap gap-y-1 items-end">
              {parsed.segments.map((segment, sIdx) => (
                <span key={sIdx} className="inline-flex flex-col pr-2">
                  {showChords && (
                    <span className="text-brand-gold font-bold font-mono text-xs select-all min-h-[16px]">
                      {segment.chord || ""}
                    </span>
                  )}
                  <span className="text-white font-sans text-base whitespace-pre">
                    {segment.lyric || (segment.chord ? " " : "")}
                  </span>
                </span>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

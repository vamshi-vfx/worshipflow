"use client";

import { useState, useEffect } from "react";
import { useDisplaySync, type DisplayMessage } from "@/hooks/use-display-sync";
import type { Theme, DisplayMode } from "@/types";

const DEFAULT_THEME: Theme = {
  id: "cinematic-dark",
  name: "Cinematic Dark",
  background: { type: "solid", value: "#050505" },
  font: { family: "Noto Sans Telugu, system-ui, sans-serif", size: 72, weight: 400 },
  alignment: "center",
  verticalAlign: "center",
  letterSpacing: 0,
  lineSpacing: 1.6,
  shadow: true,
  overlay: { enabled: true, color: "#000000", opacity: 0.3 },
  logo: { enabled: false, position: "bottom-right" },
  isDefault: true,
};

export default function PresentationDisplayPage() {
  const [slide, setSlide] = useState<{ primaryText: string; secondaryText?: string; sectionLabel?: string } | null>(null);
  const [isBlackScreen, setIsBlackScreen] = useState(false);
  const [isBlankScreen, setIsBlankScreen] = useState(false);
  const [theme, setTheme] = useState<Theme>(DEFAULT_THEME);
  const [languageMode, setLanguageMode] = useState<DisplayMode>("telugu");

  const { sendMessage, subscribe } = useDisplaySync(true);

  // Send periodic heartbeats so operator knows display is live
  useEffect(() => {
    const timer = setInterval(() => {
      sendMessage({ type: "heartbeat", timestamp: Date.now() });
    }, 1500);

    // Initial message to request current state
    sendMessage({ type: "heartbeat", timestamp: Date.now() });

    return () => clearInterval(timer);
  }, [sendMessage]);

  useEffect(() => {
    const unsubscribe = subscribe((msg: DisplayMessage) => {
      if (msg.type === "black-screen") {
        setIsBlackScreen(msg.enabled);
      } else if (msg.type === "blank-screen") {
        setIsBlankScreen(msg.enabled);
      } else if (msg.type === "theme-change") {
        if (msg.theme) setTheme(msg.theme);
      } else if (msg.type === "language-change") {
        setLanguageMode(msg.language as DisplayMode);
      } else if (msg.type === "slide-change") {
        // Operator pushed new slide index - retrieve latest slide from storage
        const currentSongRaw = localStorage.getItem("church-lyrics-current-song");
        const currentBibleRaw = localStorage.getItem("church-lyrics-current-bible");

        if (currentSongRaw) {
          try {
            const currentSong = JSON.parse(currentSongRaw);
            const allSlides: any[] = [];
            currentSong.sections?.forEach((sec: any) => {
              sec.lines?.forEach((line: any) => {
                allSlides.push({
                  primaryText: line.primaryText || line.primary_text,
                  secondaryText: line.secondaryText || line.secondary_text,
                  sectionLabel: sec.label,
                });
              });
            });

            if (allSlides[msg.index]) {
              setSlide(allSlides[msg.index]);
            }
          } catch (e) {
            console.error("Display slide parse error", e);
          }
        } else if (currentBibleRaw) {
          try {
            const bible = JSON.parse(currentBibleRaw);
            const bibleSlides: any[] = [];

            if (bible.verses && Array.isArray(bible.verses) && bible.verses.length > 0) {
              bible.verses.forEach((v: any) => {
                bibleSlides.push({
                  primaryText: v.textTe || v.text,
                  secondaryText: `${bible.bookTe || bible.book} ${bible.chapter}:${v.verseNumber} ${v.textEn ? `• ${v.textEn}` : ""}`,
                  sectionLabel: `${bible.bookTe || bible.book} ${bible.chapter}:${v.verseNumber}`,
                });
              });
            } else if (bible.text && bible.text.includes("---")) {
              const parts = bible.text.split(/\n\s*---\s*\n/).filter(Boolean);
              parts.forEach((p: string, idx: number) => {
                bibleSlides.push({
                  primaryText: p,
                  secondaryText: `${bible.book || "Scripture"} ${bible.chapter || ""}`,
                  sectionLabel: "Holy Scripture",
                });
              });
            } else {
              bibleSlides.push({
                primaryText: bible.text,
                secondaryText: `${bible.book || bible.bookTe || ""} ${bible.chapter ? `${bible.chapter}:${bible.verseStart || 1}` : ""}`,
                sectionLabel: "Holy Scripture",
              });
            }

            if (bibleSlides[msg.index]) {
              setSlide(bibleSlides[msg.index]);
            }
          } catch (e) {
            console.error("Display bible parse error", e);
          }
        }
      }
    });

    // Also check storage on mount
    const currentSongRaw = localStorage.getItem("church-lyrics-current-song");
    const currentBibleRaw = localStorage.getItem("church-lyrics-current-bible");

    if (currentSongRaw) {
      try {
        const song = JSON.parse(currentSongRaw);
        if (song.sections?.[0]?.lines?.[0]) {
          setSlide({
            primaryText: song.sections[0].lines[0].primaryText || song.sections[0].lines[0].primary_text,
            secondaryText: song.sections[0].lines[0].secondaryText || song.sections[0].lines[0].secondary_text,
            sectionLabel: song.sections[0].label,
          });
        }
      } catch (e) {
        console.error(e);
      }
    } else if (currentBibleRaw) {
      try {
        const bible = JSON.parse(currentBibleRaw);
        if (bible.verses && bible.verses[0]) {
          setSlide({
            primaryText: bible.verses[0].textTe || bible.verses[0].text,
            secondaryText: `${bible.bookTe || bible.book} ${bible.chapter}:${bible.verses[0].verseNumber} ${bible.verses[0].textEn ? `• ${bible.verses[0].textEn}` : ""}`,
            sectionLabel: `${bible.bookTe || bible.book} ${bible.chapter}:${bible.verses[0].verseNumber}`,
          });
        } else {
          setSlide({
            primaryText: bible.text,
            secondaryText: `${bible.book} ${bible.chapter}:${bible.verseStart || 1}`,
            sectionLabel: "Holy Scripture",
          });
        }
      } catch (e) {
        console.error(e);
      }
    }

    return () => unsubscribe();
  }, [subscribe]);

  if (isBlackScreen) {
    return <div className="fixed inset-0 bg-black z-50 cursor-none" />;
  }

  if (isBlankScreen) {
    return <div className="fixed inset-0 bg-transparent z-50 cursor-none" />;
  }

  const bgValue = theme.background?.value || "#050505";
  const isGradient = theme.background?.type === "gradient";

  return (
    <div
      className="fixed inset-0 flex flex-col justify-center items-center p-12 sm:p-20 text-center select-none overflow-hidden cursor-none"
      style={{
        background: isGradient ? bgValue : bgValue,
        backgroundColor: isGradient ? undefined : bgValue,
        fontFamily: theme.font?.family || "Noto Sans Telugu, system-ui, sans-serif",
      }}
    >
      {/* Background Overlay if enabled */}
      {theme.overlay?.enabled && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundColor: theme.overlay.color || "#000000",
            opacity: theme.overlay.opacity ?? 0.3,
          }}
        />
      )}

      {/* Lyrics Content Container */}
      <div className="relative z-10 max-w-5xl mx-auto space-y-6">
        {slide ? (
          <>
            <p
              className="font-bold text-white leading-relaxed text-balance transition-all duration-200"
              style={{
                fontSize: `${theme.font?.size || 72}px`,
                textShadow: theme.shadow ? "0 4px 24px rgba(0,0,0,0.85), 0 2px 8px rgba(0,0,0,0.9)" : "none",
                lineHeight: theme.lineSpacing || 1.5,
              }}
            >
              {slide.primaryText}
            </p>

            {slide.secondaryText && (
              <p
                className="text-brand-gold italic leading-normal text-balance transition-all duration-200"
                style={{
                  fontSize: `${Math.max(28, (theme.font?.size || 72) * 0.55)}px`,
                  textShadow: theme.shadow ? "0 3px 18px rgba(0,0,0,0.85)" : "none",
                }}
              >
                {slide.secondaryText}
              </p>
            )}
          </>
        ) : (
          <p className="text-white/40 text-2xl font-light">WorshipFlow Presentation Screen Ready</p>
        )}
      </div>
    </div>
  );
}

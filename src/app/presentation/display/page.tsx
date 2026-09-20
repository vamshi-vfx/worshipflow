"use client";

import { useState, useEffect, useRef } from "react";
import { useDisplaySync, type DisplayMessage } from "@/hooks/use-display-sync";
import type { Theme, DisplayMode } from "@/types";
import { createClient } from "@/lib/supabase/client";

function getVideoEmbedUrl(url?: string): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes("youtube.com")) {
      const id = parsed.searchParams.get("v") || parsed.pathname.split("/").filter(Boolean).pop();
      return id ? `https://www.youtube.com/embed/${id}?autoplay=1&rel=0&enablejsapi=1` : null;
    }
    if (parsed.hostname === "youtu.be") {
      const id = parsed.pathname.split("/").filter(Boolean)[0];
      return id ? `https://www.youtube.com/embed/${id}?autoplay=1&rel=0&enablejsapi=1` : null;
    }
    if (parsed.hostname.includes("vimeo.com")) {
      const id = parsed.pathname.split("/").filter(Boolean).pop();
      return id ? `https://player.vimeo.com/video/${id}?autoplay=1` : null;
    }
  } catch { /* direct media URL */ }
  return null;
}

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
  const [slide, setSlide] = useState<{ primaryText: string; secondaryText?: string; sectionLabel?: string; mediaUrl?: string; mediaType?: string } | null>(null);
  const [isBlackScreen, setIsBlackScreen] = useState(false);
  const [isBlankScreen, setIsBlankScreen] = useState(false);
  const [theme, setTheme] = useState<Theme>(DEFAULT_THEME);
  const [languageMode, setLanguageMode] = useState<DisplayMode>("telugu");
  const [sessionId, setSessionId] = useState("");
  const [source, setSource] = useState<"camera" | "lyrics" | "bible" | "media" | "blank">("lyrics");
  const [cameraSession, setCameraSession] = useState("");
  const cameraVideoRef = useRef<HTMLVideoElement>(null);

  // A display can be opened from the operator's pairing QR/link. The random
  // session id is the capability token; no song or service data is put in it.
  useEffect(() => {
    const value = new URLSearchParams(window.location.search).get("session");
    if (value) setSessionId(value);
  }, []);

  const { sendMessage, subscribe } = useDisplaySync(true, sessionId);

  // When the Control Studio selects Camera, the display joins the same temporary
  // camera session and receives the laptop's already-negotiated phone stream.
  useEffect(() => {
    if (source !== "camera" || !cameraSession) return;
    const supabase = createClient();
    const viewerId = `display-${Math.random().toString(36).slice(2)}`;
    const channel = supabase.channel(`wf-camera:${cameraSession}`, { config: { broadcast: { self: false } } });
    const pc = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] });
    const send = (payload: any) => channel.send({ type: "broadcast", event: "camera", payload });
    pc.ontrack = (event) => { if (cameraVideoRef.current) cameraVideoRef.current.srcObject = event.streams[0]; };
    pc.onicecandidate = (event) => { if (event.candidate) send({ kind: "display-candidate", to: "studio", from: viewerId, candidate: event.candidate }); };
    channel.on("broadcast", { event: "camera" }, async ({ payload }: any) => {
      try {
        if (payload.to && payload.to !== viewerId) return;
        if (payload.kind === "studio-offer") { await pc.setRemoteDescription(payload.offer); const answer = await pc.createAnswer(); await pc.setLocalDescription(answer); send({ kind: "display-answer", to: "studio", from: viewerId, answer }); }
        if (payload.kind === "studio-candidate") await pc.addIceCandidate(payload.candidate);
      } catch { /* reconnect is handled by the studio status */ }
    });
    channel.subscribe((state: string) => { if (state === "SUBSCRIBED") send({ kind: "display-ready", to: "studio", from: viewerId }); });
    return () => { pc.close(); channel.unsubscribe(); };
  }, [source, cameraSession]);

  // The operator and projector must render the same persisted deck. Older
  // localStorage songs have no slides, so retain a line-based fallback.
  const getSongSlides = (song: any) => {
    if (Array.isArray(song.slides) && song.slides.length > 0) {
      return [...song.slides].sort((a: any, b: any) =>
        Number(a.order ?? a.slideNumber ?? 0) - Number(b.order ?? b.slideNumber ?? 0)
      ).map((s: any) => ({
        primaryText: s.primaryText ?? s.primary_text ?? " ",
        secondaryText: s.secondaryText ?? s.secondary_text ?? undefined,
        sectionLabel: song.sections?.find((sec: any) => sec.id === s.sectionId || sec.order === s.sectionOrder)?.label || "Lyrics",
      })).filter((s: any) => String(s.primaryText).trim());
    }
    const fallback: any[] = [];
    song.sections?.forEach((sec: any) => sec.lines?.forEach((line: any) => {
      const text = line.primaryText ?? line.primary_text ?? "";
      if (String(text).trim()) fallback.push({ primaryText: text, secondaryText: line.secondaryText ?? line.secondary_text, sectionLabel: sec.label });
    }));
    if (!fallback.length && song.lyrics) song.lyrics.split(/\r?\n/).filter((x: string) => x.trim()).forEach((text: string) => fallback.push({ primaryText: text, sectionLabel: "Lyrics" }));
    return fallback;
  };

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
      } else if (msg.type === "source-change") {
        setSource(msg.source);
        if (msg.cameraSession) setCameraSession(msg.cameraSession);
        if (msg.source !== "camera" && cameraVideoRef.current) cameraVideoRef.current.srcObject = null;
      } else if (msg.type === "theme-change") {
        if (msg.theme) setTheme(msg.theme);
      } else if (msg.type === "language-change") {
        setLanguageMode(msg.language as DisplayMode);
      } else if (msg.type === "slide-change") {
        // Prefer the operator payload: this also works when a TV is a separate
        // device and therefore cannot read the operator's localStorage.
        if (msg.slide) {
          setSlide({
            primaryText: msg.slide.primaryText || msg.slide.primary_text || " ",
            secondaryText: msg.slide.secondaryText || msg.slide.secondary_text,
            sectionLabel: msg.slide.label || msg.slide.sectionLabel,
            mediaUrl: msg.slide.mediaUrl || msg.slide.media_url,
            mediaType: msg.slide.mediaType || msg.slide.media_type,
          });
          sendMessage({ type: "state", state: { index: msg.index, total: msg.total, slide: msg.slide } });
          return;
        }
        // Legacy payload: retrieve latest slide from same-origin storage.
        const currentSongRaw = localStorage.getItem("church-lyrics-current-song");
        const currentBibleRaw = localStorage.getItem("church-lyrics-current-bible");

        if (currentSongRaw) {
          try {
            const currentSong = JSON.parse(currentSongRaw);
            const allSlides = getSongSlides(currentSong);

            if (allSlides[msg.index]) {
              const nextSlide = allSlides[msg.index];
              setSlide(nextSlide);
              sendMessage({ type: "state", state: { index: msg.index, total: allSlides.length, slide: nextSlide } });
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
              const nextSlide = bibleSlides[msg.index];
              setSlide(nextSlide);
              sendMessage({ type: "state", state: { index: msg.index, total: bibleSlides.length, slide: nextSlide } });
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
        const songSlides = getSongSlides(song);
        if (songSlides[0]) setSlide(songSlides[0]);
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

    const currentMediaRaw = localStorage.getItem("church-lyrics-current-media");
    if (!currentSongRaw && !currentBibleRaw && currentMediaRaw) {
      try {
        const media = JSON.parse(currentMediaRaw);
        setSlide({ primaryText: media.name || "Media", sectionLabel: "Media", mediaUrl: media.url, mediaType: media.type });
      } catch (e) { console.error("Display media parse error", e); }
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
      className="fixed inset-0 flex flex-col justify-center items-center p-6 sm:p-12 text-center select-none overflow-auto cursor-none"
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

      {source === "camera" && (
        <video ref={cameraVideoRef} autoPlay playsInline className="absolute inset-0 z-10 h-full w-full object-contain bg-black" />
      )}
      {/* Lyrics Content Container */}
      <div className={`relative z-10 w-full max-w-[95vw] mx-auto space-y-6 break-words whitespace-pre-wrap ${source === "camera" ? "hidden" : ""}`}>
        {slide ? (
          <>
            {slide.mediaUrl && slide.mediaType === "video" && getVideoEmbedUrl(slide.mediaUrl) ? <iframe src={getVideoEmbedUrl(slide.mediaUrl)!} title={slide.primaryText} allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen className="h-[75vh] w-full rounded-xl" /> : slide.mediaUrl && slide.mediaType === "video" ? <video src={slide.mediaUrl} autoPlay loop controls playsInline className="max-h-[75vh] max-w-full rounded-xl object-contain" /> : slide.mediaUrl && slide.mediaType === "document" ? <iframe src={slide.mediaUrl} title={slide.primaryText} className="h-[75vh] w-full rounded-xl bg-white" /> : slide.mediaUrl && slide.mediaType === "audio" ? <audio src={slide.mediaUrl} controls autoPlay className="w-full max-w-xl" /> : slide.mediaUrl ? <img src={slide.mediaUrl} alt={slide.primaryText} className="max-h-[75vh] max-w-full rounded-xl object-contain" /> : null}
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

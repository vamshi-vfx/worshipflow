"use client";

import { useEffect, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

export type DisplayMessage =
  | { type: "slide-change"; index: number; total: number; slide?: any }
  | { type: "black-screen"; enabled: boolean }
  | { type: "blank-screen"; enabled: boolean }
  | { type: "theme-change"; theme: any }
  | { type: "mode-change"; mode: string }
  | { type: "language-change"; language: string }
  | { type: "open-display" }
  | { type: "close-display" }
  | { type: "heartbeat"; timestamp: number }
  | { type: "state"; state: any }
  | { type: "source-change"; source: "camera" | "lyrics" | "bible" | "media" | "blank"; cameraSession?: string };

const CHANNEL_NAME = "church-lyrics-display";
const safeSession = (value: string) => value.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 80);

/** Same-browser BroadcastChannel plus Supabase Realtime for phone-to-TV control. */
export function useDisplaySync(isDisplayWindow: boolean, sessionId?: string) {
  const channelRef = useRef<BroadcastChannel | null>(null);
  const realtimeRef = useRef<any>(null);
  const listenersRef = useRef<Set<(message: DisplayMessage) => void>>(new Set());
  const session = sessionId ? safeSession(sessionId) : "";

  useEffect(() => {
    if (typeof window === "undefined") return;
    const bc = window.BroadcastChannel ? new BroadcastChannel(CHANNEL_NAME) : null;
    channelRef.current = bc;
    if (bc) bc.onmessage = (event: MessageEvent<DisplayMessage>) => listenersRef.current.forEach((listener) => listener(event.data));

    const supabase = createClient();
    const channel = supabase.channel(`wf-presentation:${session || "local"}`, { config: { broadcast: { self: false } } });
    channel.on("broadcast", { event: "control" }, ({ payload }) => {
      if (payload?.message) listenersRef.current.forEach((listener) => listener(payload.message as DisplayMessage));
    }).subscribe();
    realtimeRef.current = channel;

    return () => {
      bc?.close();
      channel.unsubscribe();
      channelRef.current = null;
      realtimeRef.current = null;
    };
  }, [session]);

  const sendMessage = useCallback((message: DisplayMessage) => {
    channelRef.current?.postMessage(message);
    if (realtimeRef.current) realtimeRef.current.send({ type: "broadcast", event: "control", payload: { message } }).catch(() => {});
  }, []);

  const subscribe = useCallback((listener: (message: DisplayMessage) => void) => {
    listenersRef.current.add(listener);
    return () => { listenersRef.current.delete(listener); };
  }, []);

  return { sendMessage, subscribe };
}

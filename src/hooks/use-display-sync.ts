"use client";

import { useEffect, useRef, useCallback } from "react";

export type DisplayMessage =
  | { type: "slide-change"; index: number; total: number }
  | { type: "black-screen"; enabled: boolean }
  | { type: "blank-screen"; enabled: boolean }
  | { type: "theme-change"; theme: any }
  | { type: "mode-change"; mode: string }
  | { type: "language-change"; language: string }
  | { type: "open-display" }
  | { type: "close-display" }
  | { type: "heartbeat"; timestamp: number };

const CHANNEL_NAME = "church-lyrics-display";

export function useDisplaySync(isDisplayWindow: boolean) {
  const channelRef = useRef<BroadcastChannel | null>(null);
  const listenersRef = useRef<Set<(message: DisplayMessage) => void>>(new Set());

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!window.BroadcastChannel) return;

    const channel = new BroadcastChannel(CHANNEL_NAME);
    channelRef.current = channel;

    channel.onmessage = (event: MessageEvent<DisplayMessage>) => {
      const message = event.data;
      listenersRef.current.forEach((listener) => listener(message));
    };

    return () => {
      channel.close();
      channelRef.current = null;
    };
  }, []);

  const sendMessage = useCallback((message: DisplayMessage) => {
    if (channelRef.current) {
      try {
        channelRef.current.postMessage(message);
      } catch {
        // ignore broadcast errors
      }
    }
  }, []);

  const subscribe = useCallback((listener: (message: DisplayMessage) => void) => {
    listenersRef.current.add(listener);
    return () => {
      listenersRef.current.delete(listener);
    };
  }, []);

  return { sendMessage, subscribe };
}

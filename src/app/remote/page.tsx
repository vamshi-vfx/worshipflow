"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Ban, ChevronLeft, ChevronRight, Eye, EyeOff, Monitor, Radio, RefreshCw, Square } from "lucide-react";
import { useDisplaySync, type DisplayMessage } from "@/hooks/use-display-sync";

/** Operator-safe remote control for an already-open presentation display window. */
export default function RemoteControlPage() {
  const { sendMessage, subscribe } = useDisplaySync(false);
  const [connected, setConnected] = useState(false);
  const [lastSeen, setLastSeen] = useState<number | null>(null);
  const [slide, setSlide] = useState(0);
  const [total, setTotal] = useState(0);
  const [black, setBlack] = useState(false);
  const [blank, setBlank] = useState(false);

  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;
    const onMessage = (message: DisplayMessage) => {
      if (message.type === "heartbeat") {
        setConnected(true);
        setLastSeen(message.timestamp);
      }
      if (message.type === "slide-change") {
        setSlide(message.index);
        setTotal(message.total);
      }
      if (message.type === "black-screen") setBlack(message.enabled);
      if (message.type === "blank-screen") setBlank(message.enabled);
    };
    const unsubscribe = subscribe(onMessage);
    timer = setInterval(() => {
      setConnected(lastSeen !== null && Date.now() - lastSeen < 5000);
    }, 1000);
    return () => { unsubscribe(); clearInterval(timer); };
  }, [subscribe, lastSeen]);

  const sendSlide = (index: number) => {
    const next = Math.max(0, total ? Math.min(index, total - 1) : index);
    setSlide(next);
    sendMessage({ type: "slide-change", index: next, total });
  };

  const status = useMemo(() => connected ? "Display connected" : "Open the display window to pair", [connected]);

  return (
    <main className="min-h-screen bg-brand-darker text-white p-5 sm:p-8">
      <div className="max-w-xl mx-auto space-y-5">
        <div className="flex items-center justify-between">
          <Link href="/presentation" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-white"><ArrowLeft className="w-4 h-4" /> Presentation</Link>
          <div className="flex items-center gap-2 text-xs"><span className={`w-2 h-2 rounded-full ${connected ? "bg-emerald-400" : "bg-red-400"}`} />{status}</div>
        </div>
        <section className="glass rounded-2xl p-6 border border-white/10">
          <div className="flex items-center gap-3 mb-6"><Radio className="w-5 h-5 text-brand-gold" /><div><h1 className="text-xl font-semibold">Remote Control</h1><p className="text-xs text-muted-foreground">Control the open projector display in this browser.</p></div></div>
          <div className="rounded-xl bg-black/40 border border-white/10 p-5 text-center mb-5">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Current slide</p>
            <p className="text-4xl font-bold text-brand-gold mt-2">{total ? `${slide + 1} / ${total}` : "—"}</p>
            {lastSeen && <p className="text-[11px] text-muted-foreground mt-2">Last signal {new Date(lastSeen).toLocaleTimeString()}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <button disabled={!connected} onClick={() => sendSlide(slide - 1)} className="control-btn"><ChevronLeft className="w-5 h-5" /> Previous</button>
            <button disabled={!connected} onClick={() => sendSlide(slide + 1)} className="control-btn">Next <ChevronRight className="w-5 h-5" /></button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button disabled={!connected} onClick={() => { const value = !black; setBlack(value); sendMessage({ type: "black-screen", enabled: value }); }} className="control-btn"><Ban className="w-4 h-4" /> {black ? "Show screen" : "Blackout"}</button>
            <button disabled={!connected} onClick={() => { const value = !blank; setBlank(value); sendMessage({ type: "blank-screen", enabled: value }); }} className="control-btn"><EyeOff className="w-4 h-4" /> {blank ? "Restore" : "Clear screen"}</button>
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={() => sendMessage({ type: "open-display" })} className="text-xs text-brand-gold hover:underline inline-flex items-center gap-1"><Monitor className="w-3.5 h-3.5" /> Open display</button>
            <button onClick={() => window.location.reload()} className="text-xs text-muted-foreground hover:text-white inline-flex items-center gap-1 ml-auto"><RefreshCw className="w-3.5 h-3.5" /> Refresh link</button>
          </div>
        </section>
        <p className="text-[11px] text-muted-foreground text-center">Pairing uses the existing same-browser display channel. No messages or external actions are sent.</p>
      </div>
      <style jsx>{`.control-btn{display:flex;align-items:center;justify-content:center;gap:.5rem;border:1px solid rgba(255,255,255,.1);border-radius:.75rem;padding:.8rem;font-size:.875rem;font-weight:600;background:rgba(255,255,255,.04);transition:all .15s}.control-btn:hover:not(:disabled){background:rgba(255,255,255,.1)}.control-btn:disabled{opacity:.4;cursor:not-allowed}`}</style>
    </main>
  );
}

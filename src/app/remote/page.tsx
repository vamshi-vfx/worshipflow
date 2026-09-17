"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Ban, ChevronLeft, ChevronRight, Copy, EyeOff, ExternalLink, Monitor, Radio, RefreshCw, ShieldCheck, Unplug } from "lucide-react";
import { useDisplaySync, type DisplayMessage } from "@/hooks/use-display-sync";

const makeCode = () => `WF-${crypto.randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase()}`;
const key = "worshipflow-remote-pairing";

type Pairing = { code: string; createdAt: number };

export default function RemoteControlPage() {
  const [pairing, setPairing] = useState<Pairing | null>(null);
  const [input, setInput] = useState("");
  const [session, setSession] = useState("");
  const [connected, setConnected] = useState(false);
  const [lastSeen, setLastSeen] = useState<number | null>(null);
  const [slide, setSlide] = useState(0);
  const [total, setTotal] = useState(0);
  const [black, setBlack] = useState(false);
  const [blank, setBlank] = useState(false);
  const { sendMessage, subscribe } = useDisplaySync(false, session);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(key) || "null") as Pairing | null;
      if (saved && Date.now() - saved.createdAt < 8 * 60 * 60 * 1000) { setPairing(saved); setSession(saved.code); }
    } catch { /* ignore invalid pairing */ }
  }, []);

  useEffect(() => {
    const unsubscribe = subscribe((message: DisplayMessage) => {
      if (message.type === "heartbeat") { setConnected(true); setLastSeen(message.timestamp); }
      if (message.type === "slide-change") { setSlide(message.index); setTotal(message.total); }
      if (message.type === "black-screen") setBlack(message.enabled);
      if (message.type === "blank-screen") setBlank(message.enabled);
    });
    const timer = setInterval(() => setConnected(lastSeen !== null && Date.now() - lastSeen < 5000), 1000);
    return () => { unsubscribe(); clearInterval(timer); };
  }, [subscribe, lastSeen]);

  const createPairing = () => {
    const next = { code: makeCode(), createdAt: Date.now() };
    localStorage.setItem(key, JSON.stringify(next)); setPairing(next); setSession(next.code);
  };
  const join = () => { const code = input.trim().toUpperCase(); if (/^WF-[A-Z0-9]{8}$/.test(code)) setSession(code); };
  const sendSlide = (index: number) => {
    const next = Math.max(0, total ? Math.min(index, total - 1) : index);
    setSlide(next); sendMessage({ type: "slide-change", index: next, total });
  };
  const displayUrl = typeof window !== "undefined" && pairing ? `${window.location.origin}/presentation/display?session=${encodeURIComponent(pairing.code)}` : "";
  const qrUrl = displayUrl ? `https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=8&data=${encodeURIComponent(displayUrl)}` : "";
  const status = useMemo(() => connected ? "Display connected" : session ? "Waiting for display" : "Not paired", [connected, session]);

  return <main className="min-h-screen bg-brand-darker text-white p-4 sm:p-8"><div className="max-w-2xl mx-auto space-y-5">
    <div className="flex items-center justify-between"><Link href="/presentation" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-white"><ArrowLeft className="w-4 h-4" /> Presentation</Link><div className="flex items-center gap-2 text-xs"><span className={`w-2 h-2 rounded-full ${connected ? "bg-emerald-400" : "bg-amber-400"}`} />{status}</div></div>
    <section className="glass rounded-2xl p-5 sm:p-7 border border-white/10"><div className="flex items-center gap-3 mb-5"><Radio className="w-5 h-5 text-brand-gold" /><div><h1 className="text-xl font-semibold">WorshipFlow Remote</h1><p className="text-xs text-muted-foreground">Secure phone-to-display presentation control</p></div></div>
      {!pairing ? <div className="space-y-4"><div className="rounded-xl bg-black/30 border border-white/10 p-5 text-center"><ShieldCheck className="w-8 h-8 text-brand-gold mx-auto mb-2" /><h2 className="font-semibold">Create a display pairing</h2><p className="text-xs text-muted-foreground mt-1">A short-lived code keeps control limited to this presentation.</p><button onClick={createPairing} className="mt-4 rounded-lg bg-brand-gold text-brand-darker font-semibold px-5 py-2.5 text-sm">Generate pairing code</button></div><div className="flex gap-2"><input value={input} onChange={e => setInput(e.target.value.toUpperCase())} placeholder="WF-XXXXXXXX" className="flex-1 rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm tracking-widest" /><button onClick={join} className="rounded-lg border border-white/15 px-4 text-sm">Join</button></div></div> : <>
        <div className="grid sm:grid-cols-[1fr_230px] gap-5 items-center"><div><p className="text-xs text-muted-foreground uppercase tracking-wider">Pairing code</p><p className="text-3xl font-black tracking-[.18em] text-brand-gold mt-2">{pairing.code}</p><button onClick={() => navigator.clipboard?.writeText(pairing.code)} className="text-xs text-muted-foreground hover:text-white inline-flex gap-1 items-center mt-2"><Copy className="w-3 h-3" /> Copy code</button><p className="text-xs text-muted-foreground mt-5">On the TV/display browser, open the QR link or use:</p><a href={displayUrl} target="_blank" rel="noreferrer" className="text-xs text-brand-gold break-all inline-flex gap-1 mt-1">{displayUrl} <ExternalLink className="w-3 h-3 shrink-0" /></a><div className="flex gap-2 mt-4"><a href={displayUrl} target="_blank" rel="noreferrer" className="rounded-lg bg-brand-gold text-brand-darker font-semibold px-3 py-2 text-xs inline-flex items-center gap-1"><Monitor className="w-3.5 h-3.5" /> Open display</a><button onClick={() => { localStorage.removeItem(key); setPairing(null); setSession(""); setConnected(false); }} className="rounded-lg border border-red-400/30 text-red-300 px-3 py-2 text-xs inline-flex items-center gap-1"><Unplug className="w-3.5 h-3.5" /> Disconnect</button></div></div><div className="bg-white rounded-xl p-2 w-fit mx-auto"><img src={qrUrl} alt="Display pairing QR code" width={210} height={210} /></div></div>
        <div className="rounded-xl bg-black/40 border border-white/10 p-5 text-center mt-5"><p className="text-xs text-muted-foreground uppercase tracking-wider">Current slide</p><p className="text-4xl font-bold text-brand-gold mt-2">{total ? `${slide + 1} / ${total}` : "—"}</p>{lastSeen && <p className="text-[11px] text-muted-foreground mt-2">Last signal {new Date(lastSeen).toLocaleTimeString()}</p>}</div>
        <div className="grid grid-cols-2 gap-3 mt-4"><button disabled={!connected} onClick={() => sendSlide(slide - 1)} className="control-btn"><ChevronLeft className="w-5 h-5" /> Previous</button><button disabled={!connected} onClick={() => sendSlide(slide + 1)} className="control-btn">Next <ChevronRight className="w-5 h-5" /></button></div>
        <div className="mt-4 flex gap-2"><input type="number" min="1" max={total || undefined} value={total ? slide + 1 : ""} onChange={e => sendSlide(Number(e.target.value) - 1)} placeholder="Slide #" className="w-24 rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm" /><span className="text-xs text-muted-foreground self-center">Jump to slide</span></div>
        <div className="grid grid-cols-2 gap-3 mt-4"><button disabled={!connected} onClick={() => { const v = !black; setBlack(v); sendMessage({ type: "black-screen", enabled: v }); }} className="control-btn"><Ban className="w-4 h-4" /> {black ? "Resume screen" : "Blackout"}</button><button disabled={!connected} onClick={() => { const v = !blank; setBlank(v); sendMessage({ type: "blank-screen", enabled: v }); }} className="control-btn"><EyeOff className="w-4 h-4" /> {blank ? "Restore" : "Clear screen"}</button></div>
      </>}
    </section><p className="text-[11px] text-muted-foreground text-center">Pairings expire after 8 hours. Disconnect removes this device's pairing; no presentation content is stored in the URL.</p>
  </div><style jsx>{`.control-btn{display:flex;align-items:center;justify-content:center;gap:.5rem;border:1px solid rgba(255,255,255,.1);border-radius:.75rem;padding:.8rem;font-size:.875rem;font-weight:600;background:rgba(255,255,255,.04);transition:all .15s}.control-btn:hover:not(:disabled){background:rgba(255,255,255,.1)}.control-btn:disabled{opacity:.4;cursor:not-allowed}`}</style></main>;
}

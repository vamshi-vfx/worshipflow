"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Camera, Circle, Copy, Download, ExternalLink, Maximize2, Mic, MicOff, Pause, Play, RefreshCw, Square, Tv, Video, Wifi, WifiOff } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useDisplaySync, type DisplayMessage } from "@/hooks/use-display-sync";

const makeSession = () => `WF-CAM-${crypto.randomUUID().replace(/-/g, "").slice(0, 14).toUpperCase()}`;
type Source = "camera" | "lyrics" | "bible" | "media" | "blank";

export default function CameraStudio() {
  const [session, setSession] = useState(""); const [status, setStatus] = useState("Create a camera session");
  const [source, setSource] = useState<Source>("camera"); const [muted, setMuted] = useState(false); const [paused, setPaused] = useState(false); const [recording, setRecording] = useState(false); const [phoneReady, setPhoneReady] = useState(false);
  const remoteVideo = useRef<HTMLVideoElement>(null); const pcRef = useRef<RTCPeerConnection | null>(null); const channelRef = useRef<any>(null); const recorderRef = useRef<MediaRecorder | null>(null); const chunksRef = useRef<Blob[]>([]); const viewerId = useRef(crypto.randomUUID());
  const { sendMessage } = useDisplaySync(false, session);
  const phoneUrl = useMemo(() => typeof window !== "undefined" && session ? `${window.location.origin}/live-camera/phone?session=${encodeURIComponent(session)}` : "", [session]);
  const qrUrl = phoneUrl ? `https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=8&data=${encodeURIComponent(phoneUrl)}` : "";
  const send = (payload: any) => channelRef.current?.send({ type: "broadcast", event: "camera", payload });

  useEffect(() => () => { pcRef.current?.close(); channelRef.current?.unsubscribe(); recorderRef.current?.stop(); }, []);

  const connect = async (code: string) => {
    const supabase = createClient(); const channel = supabase.channel(`wf-camera:${code}`, { config: { broadcast: { self: false } } }); channelRef.current = channel;
    const pc = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] }); pcRef.current = pc;
    pc.ontrack = (event) => { if (remoteVideo.current) remoteVideo.current.srcObject = event.streams[0]; setStatus("Phone camera live"); setPhoneReady(true); };
    pc.onicecandidate = (e) => e.candidate && send({ kind: "candidate", to: "phone", from: viewerId.current, candidate: e.candidate });
    pc.onconnectionstatechange = () => { if (["failed", "disconnected"].includes(pc.connectionState)) setStatus("Disconnected — reconnecting…"); if (pc.connectionState === "connected") setStatus("Phone camera live"); };
    channel.on("broadcast", { event: "camera" }, async ({ payload }: any) => {
      try {
        if (payload.to && payload.to !== viewerId.current) return;
        if (payload.kind === "phone-ready") { setPhoneReady(true); setStatus("Phone connected — start camera"); }
        if (payload.kind === "permission-required") setStatus("Phone permission required");
        if (payload.kind === "phone-live") { setPhoneReady(true); setStatus("Phone live — connecting preview…"); send({ kind: "viewer-ready", from: viewerId.current }); }
        if (payload.kind === "offer") { await pc.setRemoteDescription(payload.offer); const answer = await pc.createAnswer(); await pc.setLocalDescription(answer); send({ kind: "answer", to: "phone", from: viewerId.current, answer }); }
        if (payload.kind === "candidate") await pc.addIceCandidate(payload.candidate);
        if (payload.kind === "phone-stopped") { setStatus("Phone camera stopped"); setPhoneReady(false); }
      } catch { setStatus("Signaling error — reconnect"); }
    });
    await channel.subscribe((state: string) => { if (state === "SUBSCRIBED") { setStatus("Waiting for phone…"); send({ kind: "laptop-ready", from: viewerId.current }); } });
  };
  const createSession = async () => { const code = makeSession(); setSession(code); await connect(code); };
  const command = (name: string, extra: any = {}) => { send({ kind: "command", command: name, ...extra }); if (name === "pause") setPaused(true); if (name === "resume") setPaused(false); if (name === "mute") setMuted(true); if (name === "unmute") setMuted(false); if (name === "stop") { setPhoneReady(false); setStatus("Stopped"); } };
  const startRecording = () => { const stream = remoteVideo.current?.srcObject as MediaStream | null; if (!stream) return setStatus("Connect phone camera before recording"); chunksRef.current = []; const rec = new MediaRecorder(stream, { mimeType: "video/webm" }); rec.ondataavailable = e => e.data.size && chunksRef.current.push(e.data); rec.onstop = () => { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob(chunksRef.current, { type: "video/webm" })); a.download = `worshipflow-camera-${Date.now()}.webm`; a.click(); setRecording(false); }; rec.start(); recorderRef.current = rec; setRecording(true); setStatus("Recording phone camera…"); };
  const stopRecording = () => recorderRef.current?.stop();
  const selectSource = (next: Source) => { setSource(next); const msg: DisplayMessage = next === "blank" ? { type: "blank-screen", enabled: true } : { type: "state", state: { source: next, cameraSession: session } }; sendMessage(msg); };

  return <main className="min-h-screen bg-[#090a0c] text-white p-4 lg:p-6"><div className="mx-auto max-w-[1500px] space-y-4"><header className="flex flex-wrap items-center justify-between gap-3"><div><Link href="/" className="text-xs text-zinc-400 hover:text-white">← WorshipFlow</Link><h1 className="mt-1 text-2xl font-bold">Control Studio <span className="text-amber-300">/ OBS workflow</span></h1><p className="text-xs text-zinc-400">Laptop operator • TV display • secure phone camera host</p></div><div className="flex items-center gap-2 text-xs"><span className={`h-2 w-2 rounded-full ${phoneReady ? "bg-emerald-400" : "bg-amber-400"}`} />{status}</div></header>
    <section className="grid gap-4 lg:grid-cols-[1fr_320px]"><div className="space-y-4"><div className="overflow-hidden rounded-2xl border border-white/10 bg-black shadow-2xl"><div className="flex items-center justify-between border-b border-white/10 px-4 py-3 text-xs"><span className="font-semibold"><Circle className="mr-2 inline h-3 w-3 fill-red-500 text-red-500" />Program preview • {source.toUpperCase()}</span><button onClick={() => remoteVideo.current?.requestFullscreen()}><Maximize2 className="h-4 w-4" /></button></div><div className="aspect-video"><video ref={remoteVideo} autoPlay playsInline muted={muted} className={`h-full w-full object-contain ${source === "camera" ? "" : "hidden"}`} /><div className={`h-full items-center justify-center bg-black text-zinc-500 ${source === "camera" ? "hidden" : "flex"}`}><Tv className="mr-3 h-8 w-8" />TV source: {source}</div></div></div><div className="rounded-2xl border border-white/10 bg-white/[.03] p-4"><div className="mb-3 flex items-center justify-between"><h2 className="text-sm font-semibold">Scenes / display source</h2><span className="rounded bg-amber-300/15 px-2 py-1 text-[10px] text-amber-200">LIVE: {source}</span></div><div className="grid grid-cols-2 gap-2 sm:grid-cols-5">{(["camera", "lyrics", "bible", "media", "blank"] as Source[]).map(s => <button key={s} onClick={() => selectSource(s)} className={`rounded-xl border px-3 py-3 text-xs capitalize ${source === s ? "border-amber-300 bg-amber-300/15 text-amber-200" : "border-white/10 bg-white/5 text-zinc-300"}`}>{s === "camera" ? <Camera className="mx-auto mb-1 h-4 w-4" /> : s === "blank" ? <Square className="mx-auto mb-1 h-4 w-4" /> : <Tv className="mx-auto mb-1 h-4 w-4" />}{s}</button>)}</div></div><div className="flex flex-wrap gap-2 rounded-2xl border border-white/10 bg-white/[.03] p-4"><button onClick={() => command("start")} className="control primary"><Play />Start</button><button onClick={() => command(paused ? "resume" : "pause")} className="control"><Pause />{paused ? "Resume" : "Pause"}</button><button onClick={() => command("stop")} className="control"><Square />Stop</button><button onClick={() => command("switch", { facing: "user" })} className="control"><RefreshCw />Switch camera</button><button onClick={() => command(muted ? "unmute" : "mute")} className="control">{muted ? <MicOff /> : <Mic />}{muted ? "Unmute" : "Mute"}</button><button onClick={recording ? stopRecording : startRecording} className="control">{recording ? <Download /> : <Video />}{recording ? "Save recording" : "Record"}</button></div></div>
      <aside className="space-y-4 rounded-2xl border border-white/10 bg-white/[.03] p-4"><div className="flex items-center justify-between"><h2 className="font-semibold">Camera session</h2><Wifi className="h-4 w-4 text-emerald-300" /></div>{!session ? <button onClick={createSession} className="w-full rounded-xl bg-amber-300 px-4 py-3 font-bold text-black">Create secure session</button> : <><div className="rounded-xl bg-black p-3 text-center"><img src={qrUrl} alt="Scan to open phone camera host" className="mx-auto mb-2 rounded-lg" width={240} height={240} /><p className="text-xs text-zinc-300">Scan with the phone camera</p></div><div className="break-all rounded-lg border border-white/10 bg-black/30 p-2 text-[10px] text-zinc-400">{session}<button onClick={() => navigator.clipboard?.writeText(phoneUrl)} className="ml-2 text-amber-300"><Copy className="inline h-3 w-3" /></button></div><a href={phoneUrl} target="_blank" rel="noreferrer" className="block text-center text-xs text-amber-300">Open phone host link <ExternalLink className="inline h-3 w-3" /></a></>}
      <div className="space-y-2 text-xs text-zinc-400"><p><WifiOff className="mr-2 inline h-3 w-3" />{phoneReady ? "Phone joined" : "Waiting for phone"}</p><p>Session is temporary and random. Keep the phone host page open and grant camera/mic permission.</p><p>WebRTC latency and quality depend on network, browser, and device conditions; zero lag cannot be guaranteed.</p></div></aside></section></div><style jsx>{`.control{display:inline-flex;align-items:center;gap:.45rem;border:1px solid rgba(255,255,255,.12);border-radius:.7rem;padding:.7rem .9rem;font-size:.75rem;background:rgba(255,255,255,.06)}.control svg{width:15px;height:15px}.control.primary{background:#f6c453;color:#111;font-weight:700}`}</style></main>;
}

"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Camera, Copy, Maximize, Mic, MicOff, RefreshCw, Square } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const makeRoom = () => `CAM-${crypto.randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase()}`;

export default function LiveCameraPage() {
  const [room, setRoom] = useState("");
  const [role, setRole] = useState<"host" | "viewer">("viewer");
  const [status, setStatus] = useState("Not connected");
  const [muted, setMuted] = useState(false);
  const localVideo = useRef<HTMLVideoElement>(null);
  const remoteVideo = useRef<HTMLVideoElement>(null);
  const channelRef = useRef<any>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const roomRef = useRef("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const requested = params.get("room") || "";
    const requestedRole = params.get("role") === "host" ? "host" : "viewer";
    const nextRoom = requested || makeRoom();
    setRoom(nextRoom); roomRef.current = nextRoom; setRole(requestedRole);
    return () => { pcRef.current?.close(); streamRef.current?.getTracks().forEach((track) => track.stop()); channelRef.current?.unsubscribe(); };
  }, []);

  const send = (message: any) => channelRef.current?.send({ type: "broadcast", event: "signal", payload: message });

  const start = async () => {
    if (!roomRef.current) return;
    const supabase = createClient();
    const channel = supabase.channel(`wf-camera:${roomRef.current}`, { config: { broadcast: { self: false } } });
    channelRef.current = channel;
    const pc = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] });
    pcRef.current = pc;
    pc.onicecandidate = (event) => { if (event.candidate) send({ kind: "candidate", candidate: event.candidate }); };
    pc.onconnectionstatechange = () => setStatus(pc.connectionState === "connected" ? "Live connected" : pc.connectionState);
    pc.ontrack = (event) => { if (remoteVideo.current) remoteVideo.current.srcObject = event.streams[0]; };

    channel.on("broadcast", { event: "signal" }, async ({ payload }: any) => {
      try {
        if (payload.kind === "viewer-ready" && role === "host") {
          const offer = await pc.createOffer(); await pc.setLocalDescription(offer); send({ kind: "offer", offer });
        } else if (payload.kind === "offer" && role === "viewer") {
          await pc.setRemoteDescription(payload.offer); const answer = await pc.createAnswer(); await pc.setLocalDescription(answer); send({ kind: "answer", answer });
        } else if (payload.kind === "answer" && role === "host") await pc.setRemoteDescription(payload.answer);
        else if (payload.kind === "candidate") await pc.addIceCandidate(payload.candidate);
      } catch (error) { console.error("camera signaling", error); setStatus("Connection error"); }
    });
    await channel.subscribe();

    if (role === "host") {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment", width: { ideal: 1280 } }, audio: true });
      streamRef.current = stream; if (localVideo.current) localVideo.current.srcObject = stream;
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));
      setStatus("Waiting for TV/display");
    } else {
      setStatus("Connecting to camera"); send({ kind: "viewer-ready" });
    }
  };

  const hostUrl = typeof window !== "undefined" && room ? `${window.location.origin}/live-camera?room=${encodeURIComponent(room)}&role=host` : "";
  const qrUrl = hostUrl ? `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(hostUrl)}` : "";

  return <main className="min-h-screen bg-brand-darker text-white p-4 sm:p-8"><div className="max-w-5xl mx-auto space-y-5">
    <div className="flex items-center justify-between"><Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-white"><ArrowLeft className="w-4 h-4" /> WorshipFlow</Link><span className="text-xs text-muted-foreground">{status}</span></div>
    <section className="glass rounded-2xl p-5 border border-white/10"><div className="flex items-center gap-3 mb-5"><Camera className="w-5 h-5 text-brand-gold" /><div><h1 className="text-xl font-semibold">Live Camera</h1><p className="text-xs text-muted-foreground">Phone camera to TV/display</p></div></div>
      {!room ? <p className="text-sm text-muted-foreground">Preparing secure room...</p> : <>
        <div className="flex flex-wrap gap-2 items-center mb-5"><span className="text-xs text-muted-foreground">Room</span><strong className="text-brand-gold tracking-widest">{room}</strong><button onClick={() => navigator.clipboard?.writeText(room)} className="text-xs text-muted-foreground"><Copy className="w-3.5 h-3.5" /></button><button onClick={start} className="ml-auto px-4 py-2 rounded-lg bg-brand-gold text-brand-darker text-sm font-bold"><Camera className="w-4 h-4 inline mr-1" /> Start {role === "host" ? "camera" : "viewer"}</button></div>
        <div className="grid lg:grid-cols-2 gap-4"><div className="rounded-xl bg-black overflow-hidden aspect-video"><video ref={role === "host" ? localVideo : remoteVideo} autoPlay playsInline muted={role === "host" || muted} className="w-full h-full object-contain" /></div><div className="rounded-xl bg-white p-3 w-fit"><p className="text-xs text-black text-center mb-2">Scan with camera phone</p><img src={qrUrl} alt="Live camera viewer QR" width={210} height={210} /></div></div>
        <div className="flex gap-2 mt-4"><button onClick={() => { const next = !muted; setMuted(next); streamRef.current?.getAudioTracks().forEach((track) => { track.enabled = !next; }); }} className="control-btn">{muted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />} {muted ? "Unmute" : "Mute"}</button><button onClick={() => { pcRef.current?.close(); streamRef.current?.getTracks().forEach((track) => track.stop()); setStatus("Stopped"); }} className="control-btn"><Square className="w-4 h-4" /> Stop</button><button onClick={() => window.location.reload()} className="control-btn"><RefreshCw className="w-4 h-4" /> New room</button></div>
      </>}
    </section><p className="text-[11px] text-muted-foreground text-center">Live camera requires camera permission and a stable internet connection. Video quality adapts to the available network.</p>
  </div><style jsx>{`.control-btn{display:inline-flex;align-items:center;gap:.45rem;border:1px solid rgba(255,255,255,.12);border-radius:.65rem;padding:.65rem .8rem;font-size:.75rem;background:rgba(255,255,255,.05)}.control-btn:hover{background:rgba(255,255,255,.1)}`}</style></main>;
}

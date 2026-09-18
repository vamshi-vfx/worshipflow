"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, CameraOff, Mic, MicOff, Pause, Play, Radio, RefreshCw } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function PhoneCameraHost() {
  const [session, setSession] = useState("");
  const [status, setStatus] = useState("Opening secure camera session…");
  const [running, setRunning] = useState(false);
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(false);
  const [facing, setFacing] = useState<"user" | "environment">("environment");
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const channelRef = useRef<any>(null);
  const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map());

  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get("session") || "";
    setSession(code);
    if (!code) { setStatus("Invalid or expired camera link"); return; }
    const supabase = createClient();
    const channel = supabase.channel(`wf-camera:${code}`, { config: { broadcast: { self: false } } });
    channelRef.current = channel;
    const send = (payload: any) => channel.send({ type: "broadcast", event: "camera", payload });
    const closePeers = () => { peersRef.current.forEach((pc) => pc.close()); peersRef.current.clear(); };
    const connectViewer = async (viewerId: string) => {
      if (!streamRef.current) { send({ kind: "permission-required", to: viewerId }); return; }
      const old = peersRef.current.get(viewerId); old?.close();
      const pc = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] });
      peersRef.current.set(viewerId, pc);
      streamRef.current.getTracks().forEach((track) => pc.addTrack(track, streamRef.current!));
      pc.onicecandidate = (e) => e.candidate && send({ kind: "candidate", to: viewerId, from: "phone", candidate: e.candidate });
      pc.onconnectionstatechange = () => { if (["failed", "disconnected"].includes(pc.connectionState)) setStatus("Reconnecting…"); };
      const offer = await pc.createOffer(); await pc.setLocalDescription(offer);
      send({ kind: "offer", to: viewerId, from: "phone", offer });
    };
    const onMessage = async ({ payload }: any) => {
      try {
        if (payload.to && payload.to !== "phone") return;
        if (payload.kind === "viewer-ready") await connectViewer(payload.from);
        else if (payload.kind === "answer") await peersRef.current.get(payload.from)?.setRemoteDescription(payload.answer);
        else if (payload.kind === "candidate") await peersRef.current.get(payload.from)?.addIceCandidate(payload.candidate);
        else if (payload.kind === "command") {
          if (payload.command === "start") await startCamera();
          if (payload.command === "stop") stopCamera();
          if (payload.command === "pause") { streamRef.current?.getTracks().forEach(t => t.enabled = false); setPaused(true); }
          if (payload.command === "resume") { streamRef.current?.getTracks().forEach(t => t.enabled = true); setPaused(false); }
          if (payload.command === "mute" || payload.command === "unmute") { const off = payload.command === "mute"; streamRef.current?.getAudioTracks().forEach(t => t.enabled = !off); setMuted(off); }
          if (payload.command === "switch") { setFacing(payload.facing); await startCamera(payload.facing); }
        }
      } catch { setStatus("Connection error — tap reconnect"); }
    };
    channel.on("broadcast", { event: "camera" }, onMessage).subscribe((state: string) => {
      if (state === "SUBSCRIBED") { setStatus("Connected — waiting for laptop"); send({ kind: "phone-ready", from: "phone" }); }
    });
    return () => { closePeers(); channel.unsubscribe(); streamRef.current?.getTracks().forEach(t => t.stop()); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const send = (payload: any) => channelRef.current?.send({ type: "broadcast", event: "camera", payload });
  const startCamera = async (nextFacing = facing) => {
    try {
      if (!navigator.mediaDevices?.getUserMedia) { setStatus("Open this link in Chrome and allow camera access"); return; }
      streamRef.current?.getTracks().forEach(t => t.stop());
      // Request video first so a microphone permission problem does not prevent the camera preview.
      const videoStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: nextFacing, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
      let stream = videoStream;
      try {
        const audioStream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
        audioStream.getAudioTracks().forEach(track => stream.addTrack(track));
      } catch {
        setStatus("Camera live — allow microphone for audio");
      }
      streamRef.current = stream; if (videoRef.current) videoRef.current.srcObject = stream;
      setRunning(true); setPaused(false); setStatus(stream.getAudioTracks().length ? "Camera live — laptop controls enabled" : "Camera live — microphone permission needed for audio"); send({ kind: "phone-live", from: "phone" });
    } catch (error: any) { setStatus(error?.name === "NotAllowedError" ? "Allow camera in Chrome site permissions, then tap Start again" : "Camera unavailable — close other camera apps and retry"); send({ kind: "permission-required", from: "phone" }); }
  };
  const stopCamera = () => { streamRef.current?.getTracks().forEach(t => t.stop()); streamRef.current = null; if (videoRef.current) videoRef.current.srcObject = null; setRunning(false); setPaused(false); setStatus("Camera stopped"); send({ kind: "phone-stopped", from: "phone" }); };

  return <main className="min-h-screen bg-black text-white p-5 flex items-center justify-center"><section className="w-full max-w-md space-y-5 rounded-3xl border border-white/10 bg-zinc-950 p-6 shadow-2xl"><div className="flex items-center gap-3"><div className="rounded-2xl bg-amber-400/15 p-3 text-amber-300"><Camera /></div><div><h1 className="text-xl font-bold">WorshipFlow Camera Host</h1><p className="text-xs text-zinc-400">Phone camera device • {session || "no session"}</p></div></div><div className="aspect-video overflow-hidden rounded-2xl bg-zinc-900"><video ref={videoRef} autoPlay muted playsInline className="h-full w-full object-cover" /></div><div className="flex items-center gap-2 text-sm"><span className={`h-2.5 w-2.5 rounded-full ${running ? "bg-emerald-400" : "bg-amber-400"}`} /><span>{status}</span></div><div className="grid grid-cols-2 gap-2"><button onClick={() => startCamera()} className="rounded-xl bg-amber-400 px-3 py-3 font-semibold text-black"><Camera className="mr-2 inline h-4 w-4" />Start</button><button onClick={stopCamera} className="rounded-xl bg-white/10 px-3 py-3"><CameraOff className="mr-2 inline h-4 w-4" />Stop</button><button onClick={() => { const next=!paused; streamRef.current?.getTracks().forEach(t=>t.enabled=!next); setPaused(next); send({kind:"phone-state", paused:next}); }} className="rounded-xl bg-white/10 px-3 py-3">{paused ? <Play className="mr-2 inline h-4 w-4" /> : <Pause className="mr-2 inline h-4 w-4" />}{paused ? "Resume" : "Pause"}</button><button onClick={() => { const next=facing === "environment" ? "user" : "environment"; setFacing(next); startCamera(next); }} className="rounded-xl bg-white/10 px-3 py-3"><RefreshCw className="mr-2 inline h-4 w-4" />Flip</button></div><p className="text-center text-[11px] text-zinc-500">Keep this page open and allow camera/microphone access. Quality and latency depend on the network and device.</p></section></main>;
}

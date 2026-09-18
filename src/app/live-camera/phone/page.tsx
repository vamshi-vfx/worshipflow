"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, CameraOff, Pause, Play, RefreshCw } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Facing = "user" | "environment";
const phoneId = `phone-${Math.random().toString(36).slice(2, 10)}`;

export default function PhoneCameraHost() {
  const [session, setSession] = useState("");
  const [status, setStatus] = useState("Connecting to this camera session…");
  const [running, setRunning] = useState(false);
  const [paused, setPaused] = useState(false);
  const [facing, setFacing] = useState<Facing>("environment");
  const [permissionHelp, setPermissionHelp] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const channelRef = useRef<any>(null);
  const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const pendingCandidates = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());
  const viewerIds = useRef<Set<string>>(new Set());

  const send = (payload: any) => channelRef.current?.send({ type: "broadcast", event: "camera", payload });
  const announceReady = () => send({ kind: "phone-ready", from: phoneId, role: "phone" });

  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get("session") || "";
    setSession(code);
    if (!code) { setStatus("Invalid or expired camera link"); return; }
    const channel = createClient().channel(`wf-camera:${code}`, { config: { broadcast: { self: false } } });
    channelRef.current = channel;
    const closePeers = () => { peersRef.current.forEach((pc) => pc.close()); peersRef.current.clear(); };
    const connectViewer = async (viewerId: string) => {
      if (!viewerId || viewerId === phoneId) return;
      viewerIds.current.add(viewerId);
      if (!streamRef.current) { send({ kind: "permission-required", to: viewerId, from: phoneId }); return; }
      peersRef.current.get(viewerId)?.close();
      const pc = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] });
      peersRef.current.set(viewerId, pc);
      streamRef.current.getTracks().forEach((track) => pc.addTrack(track, streamRef.current!));
      pc.onicecandidate = (event) => event.candidate && send({ kind: "candidate", to: viewerId, from: phoneId, candidate: event.candidate });
      pc.onconnectionstatechange = () => { if (pc.connectionState === "connected") setStatus("Camera live — laptop connected"); if (["failed", "disconnected"].includes(pc.connectionState)) setStatus("Laptop reconnecting…"); };
      const offer = await pc.createOffer(); await pc.setLocalDescription(offer);
      send({ kind: "offer", to: viewerId, from: phoneId, offer: pc.localDescription });
    };
    const onMessage = async ({ payload }: any) => {
      try {
        if (payload.to && payload.to !== phoneId && payload.to !== "phone") return;
        if (payload.kind === "viewer-ready") await connectViewer(payload.from);
        else if (payload.kind === "answer" && payload.from) {
          const peer = peersRef.current.get(payload.from);
          if (peer) { await peer.setRemoteDescription(payload.answer); for (const candidate of pendingCandidates.current.get(payload.from) || []) await peer.addIceCandidate(candidate); pendingCandidates.current.delete(payload.from); }
        }
        else if (payload.kind === "candidate" && payload.from) {
          const pc = peersRef.current.get(payload.from);
          if (pc?.remoteDescription) await pc.addIceCandidate(payload.candidate);
          else { const queued = pendingCandidates.current.get(payload.from) || []; queued.push(payload.candidate); pendingCandidates.current.set(payload.from, queued); }
        } else if (payload.kind === "command") {
          if (payload.command === "stop") stopCamera();
          if (payload.command === "pause") { streamRef.current?.getTracks().forEach(t => t.enabled = false); setPaused(true); }
          if (payload.command === "resume") { streamRef.current?.getTracks().forEach(t => t.enabled = true); setPaused(false); }
          if (payload.command === "switch") await startCamera(payload.facing);
        }
      } catch { setStatus("Connection error — tap Record to retry"); }
    };
    channel.on("broadcast", { event: "camera" }, onMessage).subscribe((state: string) => {
      if (state === "SUBSCRIBED") { setStatus("Connected — tap Record to allow camera and microphone"); announceReady(); }
    });
    const heartbeat = window.setInterval(announceReady, 5000);
    return () => { window.clearInterval(heartbeat); closePeers(); channel.unsubscribe(); streamRef.current?.getTracks().forEach(t => t.stop()); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const permissionMessage = (error: any, kind: "camera" | "microphone") => {
    const name = error?.name || "UnknownError";
    if (name === "NotAllowedError" || name === "PermissionDeniedError") {
      return `${kind === "camera" ? "Camera" : "Microphone"} permission denied. Tap the lock/site settings icon, set ${kind} to Allow, then tap Record again.`;
    }
    if (name === "NotFoundError") return `No ${kind} was found on this phone.`;
    if (name === "NotReadableError") return `${kind[0].toUpperCase() + kind.slice(1)} is busy. Close other camera or call apps and try again.`;
    if (name === "SecurityError") return "Camera access requires HTTPS (or localhost). Reopen the QR link from the secure WorshipFlow URL.";
    return `${kind[0].toUpperCase() + kind.slice(1)} could not start (${name}). Check browser site permissions and try Record again.`;
  };

  const startCamera = async (nextFacing = facing) => {
    setPermissionHelp("");
    if (!navigator.mediaDevices?.getUserMedia) { setStatus("This browser cannot access the camera. Open the secure link in Chrome."); return; }
    try {
      streamRef.current?.getTracks().forEach(t => t.stop());
      setStatus("Requesting camera permission…");
      const videoStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: nextFacing, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
      let stream = videoStream;
      try {
        setStatus("Camera allowed. Requesting microphone permission…");
        const audioStream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
        audioStream.getAudioTracks().forEach(track => stream.addTrack(track));
      } catch (error: any) {
        setPermissionHelp(permissionMessage(error, "microphone"));
      }
      streamRef.current = stream; if (videoRef.current) videoRef.current.srcObject = stream;
      setFacing(nextFacing); setRunning(true); setPaused(false);
      setStatus(stream.getAudioTracks().length ? "Camera and microphone live — laptop connected" : "Camera live — microphone unavailable");
      send({ kind: "phone-live", from: phoneId });
      // The laptop re-sends viewer-ready after phone-live; this keeps permission and signaling independent.
      viewerIds.current.forEach((id) => send({ kind: "phone-live", to: id, from: phoneId }));
    } catch (error: any) {
      setRunning(false); setStatus(permissionMessage(error, "camera")); setPermissionHelp("If permission was previously denied: tap the browser lock/site-settings icon → Camera → Allow, reload this page, then tap Record.");
      send({ kind: "permission-required", from: phoneId });
    }
  };
  const stopCamera = () => { streamRef.current?.getTracks().forEach(t => t.stop()); streamRef.current = null; if (videoRef.current) videoRef.current.srcObject = null; setRunning(false); setPaused(false); setStatus("Camera stopped — tap Record to start again"); send({ kind: "phone-stopped", from: phoneId }); };

  return <main className="min-h-screen bg-black text-white p-5 flex items-center justify-center"><section className="w-full max-w-md space-y-5 rounded-3xl border border-white/10 bg-zinc-950 p-6 shadow-2xl"><div className="flex items-center gap-3"><div className="rounded-2xl bg-amber-400/15 p-3 text-amber-300"><Camera /></div><div><h1 className="text-xl font-bold">WorshipFlow Camera</h1><p className="text-xs text-zinc-400">Dedicated phone camera • {session || "no session"}</p></div></div><div className="aspect-video overflow-hidden rounded-2xl bg-zinc-900"><video ref={videoRef} autoPlay muted playsInline className="h-full w-full object-cover" /></div><div className="flex items-start gap-2 text-sm"><span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${running ? "bg-emerald-400" : "bg-amber-400"}`} /><span>{status}</span></div>{permissionHelp && <div className="rounded-xl border border-amber-300/30 bg-amber-300/10 p-3 text-xs text-amber-100">{permissionHelp}</div>}<button onClick={() => startCamera()} className="w-full rounded-xl bg-amber-400 px-3 py-4 text-base font-bold text-black"><Camera className="mr-2 inline h-5 w-5" />{running ? "Restart Camera" : "Record / Start Camera"}</button><div className="grid grid-cols-3 gap-2"><button onClick={stopCamera} className="rounded-xl bg-white/10 px-2 py-3 text-xs"><CameraOff className="mr-1 inline h-4 w-4" />Stop</button><button disabled={!running} onClick={() => { const next=!paused; streamRef.current?.getTracks().forEach(t=>t.enabled=!next); setPaused(next); }} className="rounded-xl bg-white/10 px-2 py-3 text-xs disabled:opacity-40">{paused ? <Play className="mr-1 inline h-4 w-4" /> : <Pause className="mr-1 inline h-4 w-4" />}{paused ? "Resume" : "Pause"}</button><button disabled={!running} onClick={() => startCamera(facing === "environment" ? "user" : "environment")} className="rounded-xl bg-white/10 px-2 py-3 text-xs disabled:opacity-40"><RefreshCw className="mr-1 inline h-4 w-4" />Flip</button></div><p className="text-center text-[11px] text-zinc-500">QR scan joins this page only. Browser security requires your one tap to grant camera and microphone permission.</p></section></main>;
}

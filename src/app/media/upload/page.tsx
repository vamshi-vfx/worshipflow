"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, Upload, Loader2, Image as ImageIcon } from "lucide-react";
import { useAuth } from "@/app/providers";
import { db } from "@/services/database";
import { useToast } from "@/components/toast";

export default function MediaUploadPage() {
  const router = useRouter();
  const { user } = useAuth();
  const toast = useToast();

  const [name, setName] = useState("");
  const [type, setType] = useState<"image" | "video" | "audio" | "document">("image");
  const [url, setUrl] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim() || (!url.trim() && !selectedFile)) {
      toast.addToast("error", "Add a URL or choose a file before saving");
      return;
    }

    if (!user) {
      toast.addToast("info", "Please sign in to upload and save media");
      return;
    }

    setIsSaving(true);
    try {
      let sourceUrl = url.trim();
      if (selectedFile) {
        if (selectedFile.size > 25 * 1024 * 1024) throw new Error("Direct files must be 25MB or smaller");
        sourceUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result));
          reader.onerror = () => reject(new Error("Could not read selected file"));
          reader.readAsDataURL(selectedFile);
        });
      }
      await db.createMedia(
        {
          name,
          type,
          url: sourceUrl,
          size: selectedFile?.size,
        },
        user.id
      );
      toast.addToast("success", "Media saved to library");
      router.push("/media");
    } catch (e) {
      console.error("Failed to save media", e);
      toast.addToast("error", "Failed to save media to Supabase");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-darker pb-20">
      <header className="h-16 border-b border-white/5 flex items-center justify-between px-8 bg-brand-surface/50 backdrop-blur-xl">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push("/media")}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="text-lg font-bold text-white">Upload Media Asset</h2>
        </div>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="inline-flex items-center gap-2 px-4 py-2 bg-brand-gold text-brand-darker font-bold text-xs rounded-xl hover:bg-brand-goldLight transition-all disabled:opacity-50 shadow"
        >
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {isSaving ? "Saving..." : "Save to Media Library"}
        </button>
      </header>

      <div className="p-8 max-w-2xl mx-auto space-y-6">
        <div className="glass rounded-2xl p-6 border border-white/5 space-y-4 shadow-xl">
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase">Asset Name</label>
            <input
              type="text"
              placeholder="e.g., Church Cross Motion Background"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand-gold/50"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase">Media Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as "image" | "video" | "audio" | "document")}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand-gold/50"
            >
              <option value="image">Image (JPEG, PNG, WebP)</option>
              <option value="video">Motion Video Loop (MP4, WebM)</option>
              <option value="audio">Audio / Instrumental Track (MP3, WAV)</option>
              <option value="document">Document / PDF</option>
            </select>
          </div>

          <div className="rounded-xl border border-dashed border-brand-gold/40 bg-brand-gold/5 p-4">
            <label className="block text-xs font-semibold text-brand-gold mb-2 uppercase">Direct file import (up to 25MB)</label>
            <input type="file" accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.ppt,.pptx" onChange={(e) => { const file = e.target.files?.[0] || null; setSelectedFile(file); if (file) { setName((current) => current || file.name.replace(/\\.[^.]+$/, "")); setType(file.type.startsWith("image/") ? "image" : file.type.startsWith("video/") ? "video" : file.type.startsWith("audio/") ? "audio" : "document"); } }} className="block w-full text-xs text-muted-foreground file:mr-3 file:rounded-lg file:border-0 file:bg-brand-gold file:px-3 file:py-2 file:text-xs file:font-semibold file:text-brand-darker" />
            {selectedFile && <p className="text-xs text-white/70 mt-2">Selected: {selectedFile.name}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase">Direct Media URL (optional)</label>
            <input
              type="text"
              placeholder="https://images.unsplash.com/... or cloud storage URL"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand-gold/50"
            />
          </div>

          {type === "image" && url && (
            <div className="space-y-2 pt-2">
              <span className="text-xs text-muted-foreground">Preview:</span>
              <div className="aspect-video bg-black rounded-xl overflow-hidden flex items-center justify-center border border-white/10">
                <img
                  src={url}
                  alt="Preview"
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

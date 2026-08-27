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
  const [type, setType] = useState<"image" | "video" | "audio">("image");
  const [url, setUrl] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim() || !url.trim()) {
      toast.addToast("error", "Please fill in all fields");
      return;
    }

    if (!user) {
      toast.addToast("info", "Please sign in to upload and save media");
      return;
    }

    setIsSaving(true);
    try {
      await db.createMedia(
        {
          name,
          type,
          url,
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
              onChange={(e) => setType(e.target.value as "image" | "video" | "audio")}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand-gold/50"
            >
              <option value="image">Image (JPEG, PNG, WebP)</option>
              <option value="video">Motion Video Loop (MP4, WebM)</option>
              <option value="audio">Audio / Instrumental Track (MP3, WAV)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase">Direct Media URL</label>
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

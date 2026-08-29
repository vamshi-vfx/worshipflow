"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  UploadCloud,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Copy,
  Trash2,
  ArrowLeft,
  Sparkles,
  ShieldCheck,
  RefreshCw,
  Plus,
  ArrowRight,
  Database,
  Layers,
  Loader2,
  X,
  FileType2,
  FileJson,
  FileSpreadsheet,
  FileCode2,
  FileBox,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/app/providers";
import { db } from "@/services/database";
import { useToast } from "@/components/toast";
import {
  parseRawPastedSongs,
  parseCSVContent,
  parseJSONContent,
} from "@/lib/content-importer";
import {
  parseTxtFile,
  parseDocxFile,
  parsePdfFile,
  parsePptxFile,
} from "@/lib/file-parsers";
import { parsePdfSongBook, parseOcrPdfSongBook } from "@/lib/pdf-song-book-parser";
import { processRawLyrics } from "@/lib/lyrics-parser";
import type { Song, ImportItem, ImportJob, Language } from "@/types";

const IMPORT_MODES = [
  { key: "paste", label: "Paste Data", icon: FileText, accept: "" },
  { key: "csv", label: "CSV", icon: FileSpreadsheet, accept: ".csv" },
  { key: "json", label: "JSON", icon: FileJson, accept: ".json" },
  { key: "txt", label: "TXT", icon: FileType2, accept: ".txt" },
  { key: "docx", label: "DOCX", icon: FileCode2, accept: ".docx" },
  { key: "pdf", label: "PDF", icon: FileText, accept: ".pdf" },
  { key: "pptx", label: "PPTX", icon: FileBox, accept: ".pptx" },
] as const;

type ImportMode = (typeof IMPORT_MODES)[number]["key"];

const BATCH_SIZE = 100;

export default function ContentImportPage() {
  const router = useRouter();
  const { user } = useAuth();
  const toast = useToast();

  const [importMode, setImportMode] = useState<ImportMode>("paste");
  const [rawText, setRawText] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [existingSongs, setExistingSongs] = useState<Song[]>([]);
  const [parsedItems, setParsedItems] = useState<ImportItem[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importStep, setImportStep] = useState<"input" | "preview" | "done" | "history">("input");
  const [importResults, setImportResults] = useState<{ imported: number; skipped: number; failed: number }>({ imported: 0, skipped: 0, failed: 0 });
  const [importJob, setImportJob] = useState<ImportJob | null>(null);
  const [importJobs, setImportJobs] = useState<ImportJob[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [pdfBookInfo, setPdfBookInfo] = useState<{ filename: string; pageCount: number; detectedSongs: number; isScanned: boolean } | null>(null);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [ocrEnabled, setOcrEnabled] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!user) return;
    loadExistingSongs();
    loadImportHistory();
  }, [user]);

  const loadExistingSongs = async () => {
    if (!user) return;
    try {
      const data = await db.getSongs(user.id);
      setExistingSongs(data as Song[]);
    } catch (e) {
      console.error(e);
    }
  };

  const loadImportHistory = async () => {
    try {
      const jobs = await db.getImportJobs(user?.id || "");
      setImportJobs(jobs as ImportJob[]);
    } catch (e) {
      console.error(e);
    }
  };

  const handleFiles = async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    setUploadedFiles((prev) => [...prev, ...fileArray]);

    for (const file of fileArray) {
      const ext = file.name.split(".").pop()?.toLowerCase();

      if (ext === "zip") {
        setIsAnalyzing(true);
        try {
          const JSZip = (await import("jszip")).default;
          const zip = await JSZip.loadAsync(file);
          const zipFiles: File[] = [];
          for (const [path, zipEntry] of Object.entries(zip.files)) {
            if (zipEntry.dir) continue;
            const ext2 = path.split(".").pop()?.toLowerCase();
            if (!["pdf", "txt", "csv", "json"].includes(ext2 || "")) continue;
            const blob = await zipEntry.async("blob");
            const f = new File([blob], path.split("/").pop() || path, { type: blob.type || "application/octet-stream" });
            zipFiles.push(f);
          }
          await handleFiles(zipFiles);
        } catch (err) {
          console.error("ZIP parse error", err);
          toast.addToast("error", `Failed to parse ZIP: ${file.name}`);
        } finally {
          setIsAnalyzing(false);
        }
        continue;
      }

      if (!ext || !["txt", "csv", "json", "docx", "pdf", "pptx"].includes(ext)) {
        toast.addToast("error", `Unsupported file type: ${file.name}`);
        continue;
      }

      setIsAnalyzing(true);
      try {
        if (ext === "txt" || ext === "csv" || ext === "json") {
          const text = await file.text();
          setRawText(text);
          setImportMode(ext as ImportMode);
          setPdfBookInfo(null);
          toast.addToast("success", `Loaded ${file.name}`);
          continue;
        }

        if (ext === "docx") {
          const buffer = await file.arrayBuffer();
          const result = await parseDocxFile(buffer, file.name, existingSongs);
          setPdfBookInfo(null);
          if (result.items.length > 0) {
            setParsedItems((prev) => [...prev, ...result.items]);
            setImportStep("preview");
            toast.addToast("success", `Parsed ${result.items.length} songs from ${file.name}`);
          } else if (result.errors.length > 0) {
            toast.addToast("error", result.errors.join(", "));
          }
          continue;
        }

        if (ext === "pptx") {
          const buffer = await file.arrayBuffer();
          const result = await parsePptxFile(buffer, file.name, existingSongs);
          setPdfBookInfo(null);
          if (result.items.length > 0) {
            setParsedItems((prev) => [...prev, ...result.items]);
            setImportStep("preview");
            toast.addToast("success", `Parsed ${result.items.length} songs from ${file.name}`);
          } else if (result.errors.length > 0) {
            toast.addToast("error", result.errors.join(", "));
          }
          continue;
        }

        if (ext === "pdf") {
          const buffer = await file.arrayBuffer();
          const parser = ocrEnabled ? parseOcrPdfSongBook : parsePdfSongBook;
          const result = await parser(buffer, file.name, existingSongs);
          setPdfBookInfo({
            filename: file.name,
            pageCount: result.pageCount,
            detectedSongs: result.detectedSongs,
            isScanned: result.isScanned,
          });
          if (result.items.length > 0) {
            setParsedItems((prev) => [...prev, ...result.items]);
            setImportStep("preview");
            toast.addToast("success", `Parsed ${result.items.length} songs from ${file.name}${result.isScanned ? " (OCR)" : ""}`);
          } else if (result.errors.length > 0) {
            toast.addToast("error", result.errors.join(", "));
          }
          continue;
        }
      } catch (err) {
        console.error("File parse error", err);
        toast.addToast("error", `Failed to parse ${file.name}`);
      } finally {
        setIsAnalyzing(false);
      }
    }
  };

  const handleAnalyze = async () => {
    if (!rawText.trim() && parsedItems.length === 0) {
      toast.addToast("error", "Please paste or upload content first");
      return;
    }

    setIsAnalyzing(true);
    try {
      let items: ImportItem[] = [];

      if (parsedItems.length > 0) {
        items = parsedItems;
      } else {
        if (importMode === "paste" || importMode === "txt") {
          items = parseRawPastedSongs(rawText, existingSongs);
        } else if (importMode === "csv") {
          items = parseCSVContent(rawText, existingSongs);
        } else if (importMode === "json") {
          items = parseJSONContent(rawText, existingSongs);
        }
      }

      if (items.length === 0) {
        toast.addToast("error", "Could not detect any valid songs in the provided text.");
        setIsAnalyzing(false);
        return;
      }

      setParsedItems(items);
      setImportStep("preview");
      toast.addToast("success", `Parsed ${items.length} songs. Please review duplicates and metadata.`);
    } catch (err) {
      console.error("Analysis error", err);
      toast.addToast("error", "Failed to parse content. Check format.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleExecuteImport = async () => {
    if (!user) {
      toast.addToast("info", "Please sign in to save imported songs");
      return;
    }

    const validItems = parsedItems.filter((item) => item.status === "valid" || (item.status === "duplicate" && (item.resolution === "create_new" || item.resolution === "merge")));
    const duplicateItems = parsedItems.filter((item) => item.status === "duplicate" && item.resolution === "skip");

    const itemsToImport = selectedItems.size > 0 ? parsedItems.filter((item) => selectedItems.has(item.id)) : validItems;

    if (itemsToImport.length === 0) {
      toast.addToast("error", "No songs selected for import.");
      return;
    }

    setIsImporting(true);
    let imported = 0;
    let skipped = duplicateItems.filter((item) => selectedItems.size === 0 || selectedItems.has(item.id)).length;
    let failed = 0;

    try {
      const job = await db.createImportJob({
        filename: uploadedFiles.map((f) => f.name).join(", ") || rawText.slice(0, 100) || "pasted-content",
        format: importMode,
        totalCount: itemsToImport.length,
        createdBy: user.id,
      });
      setImportJob(job as ImportJob);

      const batches: ImportItem[][] = [];
      for (let i = 0; i < itemsToImport.length; i += BATCH_SIZE) {
        batches.push(itemsToImport.slice(i, i + BATCH_SIZE));
      }

      for (let batchIdx = 0; batchIdx < batches.length; batchIdx++) {
        const batch = batches[batchIdx];

        for (const item of batch) {
          try {
            await db.createImportItem({
              importJobId: job.id,
              title: item.title,
              language: item.language,
              status: "processing",
              sourceName: item.sourceName,
              sourceUrl: item.sourceUrl,
              license: item.license,
              copyrightNotice: item.copyrightNotice,
              contentOwner: item.contentOwner,
              sourceType: item.sourceType,
              sourceFileName: item.sourceFileName,
              sourceFileHash: item.sourceFileHash,
              pageStart: item.pageStart,
              pageEnd: item.pageEnd,
            });

            const parsed = processRawLyrics(item.lyrics || "", "smart-fit");

            const songSlug = item.title
              .toLowerCase()
              .replace(/[^\w\s-]/g, "")
              .replace(/\s+/g, "-")
              + "-" + Date.now().toString().slice(-4);

            const newSongPayload: Record<string, unknown> = {
              title: item.title,
              romanizedTitle: item.romanizedTitle || item.title,
              englishTitle: item.englishTitle || "",
              slug: songSlug,
              language: item.language,
              category: item.category || "worship",
              author: item.artist || "",
              artist: item.artist || "",
              lyricist: item.lyricist || "",
              translator: item.translator || "",
              lyrics: item.lyrics,
              chords: item.chords || "",
              sourceName: item.sourceName || "Authorized Import",
              sourceUrl: item.sourceUrl || "",
              sourceType: item.sourceType || "PDF_IMPORT",
              sourceFileName: item.sourceFileName || "",
              sourceFileHash: item.sourceFileHash || "",
              pageStart: item.pageStart,
              pageEnd: item.pageEnd,
              license: item.license || "Public Domain / Authorized",
              copyrightNotice: item.copyrightNotice || "",
              tags: [item.category, item.language, "imported"].filter(Boolean),
              favorite: false,
            };

            let createdSong: any;
            if (item.status === "duplicate" && item.resolution === "merge" && item.duplicateOfId) {
              // Update existing song instead of creating a new one
              createdSong = await db.updateSong(item.duplicateOfId, newSongPayload, user.id);
            } else {
              createdSong = await db.createSong(newSongPayload, user.id);
            }

            if (parsed.sections && parsed.sections.length > 0 && createdSong?.id) {
              for (let sIdx = 0; sIdx < parsed.sections.length; sIdx++) {
                const sec = parsed.sections[sIdx];
                const createdSec = await db.createSongSection({
                  song_id: createdSong.id,
                  type: sec.type,
                  label: sec.label,
                  order: sIdx,
                  repeat_count: 1,
                });

                if (createdSec?.id && sec.lines.length > 0) {
                  const linesPayload = sec.lines.map((l, lIdx) => ({
                    section_id: createdSec.id,
                    order: lIdx,
                    primary_text: l.text,
                    language: item.language,
                    display_mode: item.language,
                  }));
                  await db.createSongLines(linesPayload);
                }
              }
            }

            await db.createImportItem({
              importJobId: job.id,
              title: item.title,
              language: item.language,
              status: "imported",
              sourceName: item.sourceName,
              sourceUrl: item.sourceUrl,
              license: item.license,
              copyrightNotice: item.copyrightNotice,
              contentOwner: item.contentOwner,
              sourceType: item.sourceType,
              sourceFileName: item.sourceFileName,
              sourceFileHash: item.sourceFileHash,
              pageStart: item.pageStart,
              pageEnd: item.pageEnd,
              songId: createdSong?.id,
            });

            imported++;
          } catch (err) {
            console.error("Failed to import item", err);
            failed++;
            await db.createImportItem({
              importJobId: job.id,
              title: item.title,
              language: item.language,
              status: "failed",
              errorMessage: err instanceof Error ? err.message : "Unknown error",
              sourceName: item.sourceName,
              sourceUrl: item.sourceUrl,
              license: item.license,
              copyrightNotice: item.copyrightNotice,
              contentOwner: item.contentOwner,
              sourceType: item.sourceType,
              sourceFileName: item.sourceFileName,
              sourceFileHash: item.sourceFileHash,
              pageStart: item.pageStart,
              pageEnd: item.pageEnd,
            });
          }
        }

        await db.updateImportJob(job.id, {
          importedCount: imported,
          skippedCount: skipped,
          failedCount: failed,
          status: failed === 0 ? "completed" : "partial",
        });
      }

      setImportResults({ imported, skipped, failed });
      setImportStep("done");
      toast.addToast("success", `Import complete: ${imported} songs imported, ${skipped} skipped, ${failed} failed.`);
      loadImportHistory();
    } catch (err) {
      console.error("Import execution failed", err);
      toast.addToast("error", "Error occurred during batch import.");
    } finally {
      setIsImporting(false);
    }
  };

  const handleRetryFailed = async () => {
    if (!importJob || !user) return;
    setIsImporting(true);
    try {
      const results = await db.retryFailedImportItems(importJob.id, user.id);
      toast.addToast("success", `Retry complete: ${results.imported} imported, ${results.failed} failed.`);
      loadImportHistory();
    } catch (err) {
      console.error(err);
      toast.addToast("error", "Retry failed.");
    } finally {
      setIsImporting(false);
    }
  };

  const handleRollback = async () => {
    if (!importJob) return;
    const confirmed = confirm(`Rollback will delete ${importJob.imported_count || 0} songs from this import. Continue?`);
    if (!confirmed) return;

    setIsImporting(true);
    try {
      const result = await db.rollbackImportJob(importJob.id);
      toast.addToast("success", `Rollback complete. ${result.deleted} songs removed.`);
      loadImportHistory();
    } catch (err) {
      console.error(err);
      toast.addToast("error", "Rollback failed.");
    } finally {
      setIsImporting(false);
    }
  };

  const handleSetResolution = (id: string, resolution: "skip" | "merge" | "create_new") => {
    setParsedItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, resolution } : item))
    );
  };

  const summary = useMemo(() => {
    const valid = parsedItems.filter((i) => i.status === "valid" || (i.status === "duplicate" && i.resolution === "create_new")).length;
    const duplicates = parsedItems.filter((i) => i.status === "duplicate" && i.resolution === "skip").length;
    const needsReview = parsedItems.filter((i) => i.status === "error" || i.status === "needs_review").length;
    const failed = parsedItems.filter((i) => i.status === "failed").length;
    return { total: parsedItems.length, valid, duplicates, needsReview, failed };
  }, [parsedItems]);

  const sampleTemplate = `Title: Mahima Neeke Prabhuda
Romanized: Mahima Neeke Prabhuda
Artist: Traditional Worship
Category: worship
Language: telugu
License: Public Domain / Authorized

[Verse 1]
Mahima neeke prabhuda
Ghanatha neeke yesayya
Nee krupa nannu kaapade
Naa balam neeve deva

[Chorus]
Yesayya yesayya
Ninne aaraadhinthunu
Yesayya yesayya
Ninne keerthinthunu
---
Title: Amazing Grace
Artist: John Newton
Category: praise
Language: english
License: Public Domain

[Verse 1]
Amazing grace how sweet the sound
That saved a wretch like me
I once was lost but now am found
Was blind but now I see`;

  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <header className="border-b border-white/5 bg-brand-darker/60 backdrop-blur-xl py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Link href="/" className="p-1.5 rounded-lg bg-white/5 text-muted-foreground hover:text-white transition-colors">
                  <ArrowLeft className="w-4 h-4" />
                </Link>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-white flex items-center gap-2.5">
                  <UploadCloud className="w-7 h-7 text-brand-gold" />
                  Song Import Center
                </h1>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Import, validate and organize your worship song library.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setImportStep("history")}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-semibold hover:bg-white/10 transition-colors"
              >
                <Clock className="w-4 h-4 text-brand-gold" />
                Import History
              </button>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-semibold">
                <ShieldCheck className="w-4 h-4" />
                Rights & License Compliant
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-8 space-y-8">
        {/* HISTORY VIEW */}
        {importStep === "history" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-white">Import History</h2>
                <p className="text-xs text-muted-foreground">Review past imports, retry failed items, or rollback.</p>
              </div>
              <button onClick={() => setImportStep("input")} className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-semibold hover:bg-white/10">
                New Import
              </button>
            </div>

            {importJobs.length === 0 ? (
              <div className="glass rounded-2xl p-12 text-center text-muted-foreground border border-white/5">
                <Database className="w-10 h-10 mx-auto mb-3 opacity-40 text-brand-gold" />
                <p className="text-white font-medium">No import history yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {importJobs.map((job) => (
                  <div key={job.id || job.filename} className="glass rounded-xl p-5 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-white text-sm">{job.filename || "Untitled Import"}</h3>
                        <span className={cn("px-2 py-0.5 rounded text-[11px] font-semibold", job.status === "completed" && "bg-green-500/15 text-green-400", job.status === "partial" && "bg-yellow-500/15 text-yellow-400", job.status === "rolled_back" && "bg-red-500/15 text-red-400", !["completed", "partial", "rolled_back"].includes(job.status) && "bg-white/5 text-muted-foreground")}>
                          {job.status}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {new Date(job.created_at).toLocaleString()} • Format: {job.format} • Total: {job.total_count}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Imported: {job.imported_count} • Skipped: {job.skipped_count} • Failed: {job.failed_count || 0}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={handleRetryFailed} className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-xs font-semibold hover:bg-white/10">
                        Retry Failed
                      </button>
                      {job.status !== "rolled_back" && (
                        <button onClick={handleRollback} className="px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold hover:bg-red-500/20">
                          Rollback
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* INPUT VIEW */}
        {importStep === "input" && (
          <div className="space-y-6">
            {/* Mode Tabs */}
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-1 bg-white/5 rounded-xl p-1 border border-white/10">
                {IMPORT_MODES.map((mode) => (
                  <button
                    key={mode.key}
                    onClick={() => setImportMode(mode.key)}
                    className={cn(
                      "inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all",
                      importMode === mode.key ? "bg-brand-gold text-brand-darker shadow" : "text-muted-foreground hover:text-white"
                    )}
                  >
                    <mode.icon className="w-3.5 h-3.5" />
                    {mode.label}
                  </button>
                ))}
              </div>

              <div>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={(e) => e.target.files && handleFiles(e.target.files)}
                  accept={IMPORT_MODES.find((m) => m.key === importMode)?.accept || ".txt,.csv,.json,.docx,.pdf,.pptx"}
                  multiple
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-semibold border border-white/10 transition-colors"
                >
                  <UploadCloud className="w-4 h-4 text-brand-gold" />
                  Upload Files
                </button>
              </div>
            </div>

            {/* Drag & Drop Zone */}
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={(e) => { e.preventDefault(); setIsDragOver(false); handleFiles(e.dataTransfer.files); }}
              className={cn("rounded-2xl border-2 border-dashed p-10 text-center transition-colors", isDragOver ? "border-brand-gold bg-brand-gold/5" : "border-white/10 hover:border-white/20")}
            >
              <UploadCloud className="w-10 h-10 mx-auto mb-3 text-brand-gold opacity-70" />
              <p className="text-sm font-semibold text-white mb-1">Drop song files here</p>
              <p className="text-xs text-muted-foreground">Supports TXT, CSV, JSON, DOCX, PDF, PPTX. Multiple files allowed.</p>
            </div>

            {uploadedFiles.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">Uploaded Files</h3>
                <div className="flex flex-wrap gap-2">
                  {uploadedFiles.map((file, idx) => (
                    <span key={idx} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-white">
                      <FileText className="w-3.5 h-3.5 text-brand-gold" />
                      {file.name}
                      <button onClick={() => setUploadedFiles((prev) => prev.filter((_, i) => i !== idx))} className="text-muted-foreground hover:text-white">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Input Text Area */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Separate multiple songs with <code className="text-brand-gold bg-white/5 px-1.5 py-0.5 rounded">---</code> delimiter</span>
                <button onClick={() => setRawText(sampleTemplate)} className="text-brand-gold hover:underline">
                  Insert Sample Songs
                </button>
              </div>

              <textarea
                rows={16}
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                placeholder="Paste lyrics content with Title:, Artist:, Category:, Language:, License: headers and lyrics body..."
                className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl font-mono text-sm text-white placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand-gold/50 leading-relaxed"
              />
            </div>

            {/* Analyze Trigger */}
            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-muted-foreground">
                {rawText.trim().length > 0 ? `${rawText.split(/\n\s*---\s*\n/).length} song block(s) detected` : "No text input"}
              </span>

              <button
                onClick={handleAnalyze}
                disabled={isAnalyzing || (!rawText.trim() && parsedItems.length === 0)}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-brand-gold text-brand-darker font-extrabold text-sm hover:bg-brand-goldLight shadow-xl disabled:opacity-40 transition-all"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Analyzing Content & Checking Duplicates...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Validate & Check Duplicates
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* PREVIEW VIEW */}
        {importStep === "preview" && (
          <div className="space-y-6">
            {pdfBookInfo && (
              <div className="glass rounded-xl p-4 border border-brand-gold/20 flex flex-wrap items-center gap-4 text-xs">
                <span className="text-brand-gold font-bold">PDF Song Book</span>
                <span className="text-muted-foreground">File: {pdfBookInfo.filename}</span>
                <span className="text-muted-foreground">Pages: {pdfBookInfo.pageCount}</span>
                <span className="text-muted-foreground">Detected Songs: {pdfBookInfo.detectedSongs}</span>
                <span className={pdfBookInfo.isScanned ? "text-yellow-400" : "text-green-400"}>{pdfBookInfo.isScanned ? "Scanned PDF — OCR used" : "Text PDF"}</span>
                <label className="flex items-center gap-2 text-muted-foreground ml-auto">
                  <input type="checkbox" checked={ocrEnabled} onChange={(e) => setOcrEnabled(e.target.checked)} />
                  Force OCR
                </label>
              </div>
            )}

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-white">Import Preview ({summary.total} songs)</h2>
                <p className="text-xs text-muted-foreground">
                  Review metadata and resolve any detected duplicates before writing to database.
                </p>
                <div className="flex flex-wrap items-center gap-3 mt-2 text-xs">
                  <span className="text-green-400 font-semibold">{summary.valid} valid</span>
                  <span className="text-yellow-400 font-semibold">{summary.duplicates} duplicates</span>
                  <span className="text-red-400 font-semibold">{summary.needsReview} needs review</span>
                  <span className="text-red-500 font-semibold">{summary.failed} failed</span>
                  <span className="text-brand-gold font-semibold">{selectedItems.size > 0 ? `${selectedItems.size} selected` : ""}</span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button onClick={() => setImportStep("input")} className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-semibold border border-white/10">
                  ← Back to Editor
                </button>
                <button onClick={() => setSelectedItems(new Set(parsedItems.map((i) => i.id)))} className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-semibold hover:bg-white/10">
                  Select All
                </button>
                <button onClick={() => setSelectedItems(new Set(parsedItems.filter((i) => i.status === "valid" || (i.status === "duplicate" && i.resolution === "create_new")).map((i) => i.id)))} className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-semibold hover:bg-white/10">
                  Select Valid
                </button>
                <button onClick={() => setSelectedItems(new Set())} className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-semibold hover:bg-white/10">
                  Deselect All
                </button>
                <button onClick={handleExecuteImport} disabled={isImporting || selectedItems.size === 0} className="inline-flex items-center gap-2 px-6 py-2 rounded-xl bg-brand-gold text-brand-darker text-xs font-extrabold hover:bg-brand-goldLight shadow-lg disabled:opacity-40 transition-all">
                  {isImporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
                  Import Selected ({selectedItems.size > 0 ? selectedItems.size : parsedItems.length})
                </button>
              </div>
            </div>

            {/* Parsed Items List */}
            <div className="space-y-4">
              {parsedItems.map((item, index) => (
                <div
                  key={item.id}
                  className={cn(
                    "glass rounded-2xl p-5 border transition-all space-y-3",
                    item.status === "duplicate" ? "border-yellow-500/40 bg-yellow-500/5" : item.status === "error" || item.status === "needs_review" ? "border-red-500/40 bg-red-500/5" : "border-white/10"
                  )}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={selectedItems.has(item.id)}
                        onChange={(e) => {
                          const next = new Set(selectedItems);
                          if (e.target.checked) next.add(item.id);
                          else next.delete(item.id);
                          setSelectedItems(next);
                        }}
                        className="w-4 h-4 rounded border-white/20 bg-white/5 text-brand-gold focus:ring-brand-gold"
                      />
                      <span className="w-6 h-6 rounded-full bg-white/10 text-brand-gold text-xs font-bold flex items-center justify-center font-mono">
                        {index + 1}
                      </span>
                      <div>
                        <h3 className="font-bold text-white text-base">{item.title}</h3>
                        {item.romanizedTitle && (
                          <p className="text-xs text-brand-gold/80 italic">{item.romanizedTitle}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {item.status === "duplicate" ? (
                        <div className="flex items-center gap-2 bg-yellow-500/15 border border-yellow-500/30 px-3 py-1 rounded-xl text-yellow-400 text-xs font-semibold">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          Possible Duplicate ({Math.round((item.duplicateScore || 0.9) * 100)}% match)
                        </div>
                      ) : item.status === "error" || item.status === "needs_review" ? (
                        <div className="flex items-center gap-2 bg-red-500/15 border border-red-500/30 px-3 py-1 rounded-xl text-red-400 text-xs font-semibold">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          Needs Review
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 bg-green-500/15 text-green-400 px-3 py-1 rounded-xl text-xs font-semibold">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Ready for Import
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span className="px-2 py-0.5 rounded bg-white/5 capitalize font-mono text-white/90">Lang: {item.language}</span>
                    <span className="px-2 py-0.5 rounded bg-white/5 capitalize">Category: {item.category}</span>
                    {item.artist && <span className="px-2 py-0.5 rounded bg-white/5">Artist: {item.artist}</span>}
                    {item.license && <span className="px-2 py-0.5 rounded bg-white/5 text-green-400/90 font-mono">License: {item.license}</span>}
                  </div>

                  {item.status === "duplicate" && (
                    <div className="p-3 rounded-xl bg-white/5 border border-white/5 space-y-2 text-xs">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-muted-foreground">Duplicate resolution:</span>
                        {item.duplicateOfId && (
                          <span className="text-yellow-400/80 font-mono text-[11px]">Matches: {item.duplicateOfId.slice(0, 8)}…</span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          onClick={() => handleSetResolution(item.id, "skip")}
                          className={cn("px-3 py-1.5 rounded-lg font-semibold transition-colors flex items-center gap-1.5", item.resolution === "skip" ? "bg-yellow-500 text-brand-darker font-bold" : "bg-white/5 text-white/80 hover:text-white")}
                        >
                          Skip
                        </button>
                        <button
                          onClick={() => handleSetResolution(item.id, "merge")}
                          className={cn("px-3 py-1.5 rounded-lg font-semibold transition-colors flex items-center gap-1.5", item.resolution === "merge" ? "bg-blue-500 text-white font-bold" : "bg-white/5 text-white/80 hover:text-white")}
                        >
                          Update Existing
                        </button>
                        <button
                          onClick={() => handleSetResolution(item.id, "create_new")}
                          className={cn("px-3 py-1.5 rounded-lg font-semibold transition-colors flex items-center gap-1.5", item.resolution === "create_new" ? "bg-brand-gold text-brand-darker font-bold" : "bg-white/5 text-white/80 hover:text-white")}
                        >
                          Import as New Copy
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="p-3 rounded-xl bg-black/40 text-xs font-mono text-white/70 line-clamp-3 leading-relaxed">
                    {item.lyrics}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* DONE VIEW */}
        {importStep === "done" && (
          <div className="glass rounded-2xl p-12 text-center max-w-xl mx-auto border border-brand-gold/30 space-y-6">
            <div className="w-16 h-16 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <h2 className="text-2xl font-bold text-white mb-1">Batch Ingestion Successful</h2>
              <p className="text-xs text-muted-foreground">
                {importResults.imported} songs were saved to your library. {importResults.skipped} duplicates were skipped. {importResults.failed} failed.
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <Link href="/songs" className="px-5 py-2.5 rounded-xl bg-brand-gold text-brand-darker text-xs font-bold hover:bg-brand-goldLight">
                Go to Song Library
              </Link>
              <button onClick={() => { setRawText(""); setUploadedFiles([]); setParsedItems([]); setImportStep("input"); }} className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-semibold border border-white/10">
                Import More Songs
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// WorshipFlow PDF Song Book Auto-Importer
// Handles text PDFs, scanned PDFs with OCR, ZIP bundles, and multi-song boundary detection.

import type { ImportItem, Language } from "@/types";
import { detectLanguage, normalizeText, cleanDuplicateLines, detectSections } from "@/lib/lyrics-parser";
import { findDuplicateInLibrary } from "@/lib/duplicate-detector";
import type { Song } from "@/types";

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function sanitizeText(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+/g, " ")
    .trim();
}

export interface PdfSongBookResult {
  filename: string;
  format: "pdf";
  items: ImportItem[];
  errors: string[];
  pageCount: number;
  detectedSongs: number;
  isScanned: boolean;
}

function cleanNoise(text: string): string {
  return text
    .replace(/Page\s+\d+/gi, "")
    .replace(/^\d+\s*$/gm, "")
    .replace(/^([A-Za-z\s]+)\s*-\s*Page\s*\d+$/gim, "")
    .replace(/ WorshipFlow | Christian Lyrics | Song Book /gi, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function detectSongBoundaries(pages: string[]): { startPage: number; endPage: number; title: string; body: string }[] {
  const songs: { startPage: number; endPage: number; title: string; body: string }[] = [];
  
  if (pages.length === 0) return songs;
  
  // Build page-indexed full text
  const pageStartIndices: number[] = [];
  let fullText = "";
  
  for (let i = 0; i < pages.length; i++) {
    pageStartIndices.push(fullText.length);
    if (i > 0) fullText += "\n\n";
    fullText += pages[i];
  }
  
  function getPageIndex(charIndex: number): number {
    for (let i = pageStartIndices.length - 1; i >= 0; i--) {
      if (charIndex >= pageStartIndices[i]) return i;
    }
    return 0;
  }
  
  // Explicit song boundary patterns
  const boundaryPatterns = [
    { regex: /^పాట\s*[:\s]\s*(\d+)\s*$/imu, extractTitle: (m: RegExpMatchArray) => m[0].trim() },
    { regex: /^Song\s+(?:No\.?\s*)?(\d+)\s*$/imu, extractTitle: (m: RegExpMatchArray) => m[0].trim() },
    { regex: /^#\s*(\d+)\s*$/imu, extractTitle: (m: RegExpMatchArray) => m[0].trim() },
    { regex: /^(\d+)\.\s{2,}[A-Za-z\u0C00-\u0C7F]/imu, extractTitle: (m: RegExpMatchArray) => m[0].trim() },
  ];
  
  const boundaries: { index: number; title: string; pageIndex: number }[] = [];
  
  for (const pattern of boundaryPatterns) {
    const regex = new RegExp(pattern.regex.source, pattern.regex.flags);
    let match;
    while ((match = regex.exec(fullText)) !== null) {
      const title = pattern.extractTitle(match);
      boundaries.push({
        index: match.index,
        title,
        pageIndex: getPageIndex(match.index),
      });
    }
  }
  
  const uniqueBoundaries = boundaries.filter((b, i, arr) => 
    i === 0 || b.index !== arr[i - 1].index
  ).sort((a, b) => a.index - b.index);
  
  if (uniqueBoundaries.length > 1) {
    for (let i = 0; i < uniqueBoundaries.length; i++) {
      const start = uniqueBoundaries[i].index + uniqueBoundaries[i].title.length;
      const end = i + 1 < uniqueBoundaries.length ? uniqueBoundaries[i + 1].index : fullText.length;
      let body = fullText.slice(start, end).trim();
      body = body.replace(/\n{3,}/g, "\n\n").trim();
      
      if (body) {
        songs.push({
          startPage: uniqueBoundaries[i].pageIndex + 1,
          endPage: i + 1 < uniqueBoundaries.length ? uniqueBoundaries[i + 1].pageIndex + 1 : pages.length,
          title: uniqueBoundaries[i].title,
          body,
        });
      }
    }
  }
  
  if (songs.length === 0) {
    pages.forEach((pageText, idx) => {
      const lines = pageText.split("\n").filter((l) => l.trim() !== "");
      if (lines.length === 0) return;
      
      const firstLine = lines[0].trim();
      const isTeluguTitle = /[\u0C00-\u0C7F]/.test(firstLine) && firstLine.length < 120 && firstLine.length > 2;
      const isShortEnglishTitle = firstLine.length < 80 && firstLine === firstLine.toUpperCase() && /[A-Z]/.test(firstLine);
      const isNumberedTitle = /^\d+\.?\s+.+/.test(firstLine);
      
      const looksLikeTitle = isTeluguTitle || isShortEnglishTitle || isNumberedTitle;
      
      if (looksLikeTitle) {
        const title = firstLine.replace(/^\d+\.?\s*/, "").trim();
        const body = lines.slice(1).join("\n").trim();
        if (body) {
          songs.push({ startPage: idx + 1, endPage: idx + 1, title, body });
        }
      }
    });
  }
  
  return songs;
}

function extractMetadataFromBody(body: string): { artist?: string; category?: string; license?: string } {
  const artistMatch = body.match(/(?:Artist|Author|Singer)\s*[:\-]\s*(.+)/i);
  const categoryMatch = body.match(/Category\s*[:\-]\s*(.+)/i);
  const licenseMatch = body.match(/License\s*[:\-]\s*(.+)/i);
  return {
    artist: artistMatch?.[1]?.trim(),
    category: categoryMatch?.[1]?.trim()?.toLowerCase(),
    license: licenseMatch?.[1]?.trim(),
  };
}

function estimateConfidence(text: string, source: "text" | "ocr", ocrConfidence?: number): number {
  if (source === "ocr") {
    return ocrConfidence != null ? Math.min(1, Math.max(0, ocrConfidence / 100)) : 0.5;
  }
  
  const words = text.split(/\s+/).filter(Boolean).length;
  const hasTelugu = /[\u0C00-\u0C7F]/.test(text);
  const lines = text.split("\n").filter((l) => l.trim() !== "").length;
  
  if (words < 5 || lines < 2) return 0.4;
  if (words < 20) return 0.6;
  if (hasTelugu && words > 30) return 0.95;
  if (words > 50) return 0.9;
  return 0.8;
}

function buildImportItemFromPdfSong(
  song: { title: string; body: string; startPage: number; endPage: number },
  filename: string,
  existingSongs: Song[],
  confidence: number
): ImportItem {
  const cleanedBody = cleanNoise(sanitizeText(song.body));
  const normalizedLyrics = normalizeText(cleanDuplicateLines(cleanedBody));
  const detected = detectLanguage(normalizedLyrics);
  const resolvedLanguage: Language = detected === "romanized-telugu" ? "telugu" : (detected as Language);
  const { artist, category, license } = extractMetadataFromBody(cleanedBody);

  const duplicate = findDuplicateInLibrary({ title: song.title, lyrics: normalizedLyrics, artist }, existingSongs);
  
  const isLowConfidence = confidence < 0.6;
  
  return {
    id: generateId(),
    title: song.title,
    language: resolvedLanguage,
    category: category || "worship",
    artist,
    lyrics: normalizedLyrics,
    sourceName: `PDF Import: ${filename}`,
    sourceType: "PDF_IMPORT",
    sourceFileName: filename,
    license: license || "Needs Review",
    pageStart: song.startPage,
    pageEnd: song.endPage,
    confidence,
    status: isLowConfidence ? "needs_review" : (duplicate ? "duplicate" : "valid"),
    duplicateOfId: duplicate?.songId,
    duplicateScore: duplicate?.score,
    resolution: duplicate ? "skip" : undefined,
  };
}

export async function parsePdfSongBook(
  arrayBuffer: ArrayBuffer,
  filename: string,
  existingSongs: Song[] = []
): Promise<PdfSongBookResult> {
  try {
    const pdfjsModule = await import("pdfjs-dist");
    const pdfjs = (pdfjsModule as any).default || pdfjsModule;
    pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
    const pdf = await pdfjs.getDocument({ data: Array.from(new Uint8Array(arrayBuffer)) }).promise;

    const pages: string[] = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const pageText = (content.items as any[])
        .map((item: any) => item.str || "")
        .join("\n")
        .trim();
      if (pageText) pages.push(pageText);
    }

    if (pages.length === 0) {
      return { filename, format: "pdf", items: [], errors: ["No extractable text found in PDF. The document may be scanned or image-based."], pageCount: pdf.numPages, detectedSongs: 0, isScanned: true };
    }

    const boundaries = detectSongBoundaries(pages);
    const items = boundaries.map((song) => {
      const confidence = estimateConfidence(song.body, "text");
      return buildImportItemFromPdfSong(song, filename, existingSongs, confidence);
    });
    const errors = items.length === 0 ? ["No songs detected in PDF."] : [];

    return { filename, format: "pdf", items, errors, pageCount: pdf.numPages, detectedSongs: items.length, isScanned: false };
  } catch (e) {
    console.error("PDF song book parse error", e);
    return { filename, format: "pdf", items: [], errors: ["Failed to parse PDF song book."], pageCount: 0, detectedSongs: 0, isScanned: false };
  }
}

export async function parseOcrPdfSongBook(
  arrayBuffer: ArrayBuffer,
  filename: string,
  existingSongs: Song[] = []
): Promise<PdfSongBookResult> {
  try {
    const pdfjsModule = await import("pdfjs-dist");
    const pdfjs = (pdfjsModule as any).default || pdfjsModule;
    pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
    const pdf = await pdfjs.getDocument({ data: Array.from(new Uint8Array(arrayBuffer)) }).promise;

    let tesseract: any;
    try {
      const tesseractModule = await import("tesseract.js");
      tesseract = (tesseractModule as any).default || tesseractModule;
    } catch {
      return { filename, format: "pdf", items: [], errors: ["OCR requires tesseract.js. Install it to enable scanned PDF import."], pageCount: pdf.numPages, detectedSongs: 0, isScanned: true };
    }

    const pages: string[] = [];
    const ocrConfidences: number[] = [];
    
    for (let i = 1; i <= pdf.numPages; i++) {
      try {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 2 });
        const canvas = document.createElement("canvas");
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) continue;
        await page.render({ canvasContext: ctx, viewport }).promise;
        const dataUrl = canvas.toDataURL("image/png");
        const result = await tesseract.recognize(dataUrl, "eng+tel");
        const text = result.data.text.trim();
        if (text) {
          pages.push(text);
          if (typeof result.data.confidence === "number") {
            ocrConfidences.push(result.data.confidence);
          }
        }
      } catch (pageError) {
        console.error(`OCR failed for page ${i}`, pageError);
        ocrConfidences.push(0);
      }
    }

    if (pages.length === 0) {
      return { filename, format: "pdf", items: [], errors: ["No OCR text extracted from scanned PDF."], pageCount: pdf.numPages, detectedSongs: 0, isScanned: true };
    }

    const boundaries = detectSongBoundaries(pages);
    const avgOcrConfidence = ocrConfidences.length > 0
      ? ocrConfidences.reduce((a, b) => a + b, 0) / ocrConfidences.length
      : 50;
    
    const items = boundaries.map((song) => {
      const confidence = estimateConfidence(song.body, "ocr", avgOcrConfidence);
      return buildImportItemFromPdfSong(song, filename, existingSongs, confidence);
    });
    
    const needsReviewCount = items.filter((item) => item.status === "needs_review").length;
    const errors: string[] = [];
    if (needsReviewCount > 0) {
      errors.push(`${needsReviewCount} item(s) marked for review due to low OCR confidence.`);
    }

    return { filename, format: "pdf", items, errors, pageCount: pdf.numPages, detectedSongs: items.length, isScanned: true };
  } catch (e) {
    console.error("OCR PDF parse error", e);
    return { filename, format: "pdf", items: [], errors: ["Failed to OCR scanned PDF."], pageCount: 0, detectedSongs: 0, isScanned: true };
  }
}

export async function parsePdfFilesAsSongBook(
  files: File[],
  existingSongs: Song[] = []
): Promise<{ totalItems: ImportItem[]; results: PdfSongBookResult[]; errors: string[] }> {
  const results: PdfSongBookResult[] = [];
  const allItems: ImportItem[] = [];
  const errors: string[] = [];

  for (const file of files) {
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (ext !== "pdf") {
      errors.push(`Unsupported file type: ${file.name}`);
      continue;
    }

    const buffer = await file.arrayBuffer();
    const result = await parsePdfSongBook(buffer, file.name, existingSongs);
    results.push(result);
    allItems.push(...result.items);
    errors.push(...result.errors);
  }

  return { totalItems: allItems, results, errors };
}

// WorshipFlow Universal File Parsers
// Supports: TXT, CSV, JSON, DOCX, PDF, PPTX

import type { ImportItem, Language } from "@/types";
import { parseRawPastedSongs, parseCSVContent, parseJSONContent } from "@/lib/content-importer";
import { detectLanguage, normalizeText, cleanDuplicateLines } from "@/lib/lyrics-parser";
import { findDuplicateInLibrary } from "@/lib/duplicate-detector";
import { parsePdfSongBook, parseOcrPdfSongBook } from "./pdf-song-book-parser";
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

export interface ParsedFileResult {
  filename: string;
  format: "txt" | "csv" | "json" | "docx" | "pdf" | "pptx";
  items: ImportItem[];
  errors: string[];
}

function buildImportItemFromRaw({
  title,
  romanizedTitle,
  englishTitle,
  artist,
  lyricist,
  category,
  language,
  lyrics,
  chords,
  sourceName,
  sourceUrl,
  license,
  copyrightNotice,
  existingSongs,
}: {
  title: string;
  romanizedTitle?: string;
  englishTitle?: string;
  artist?: string;
  lyricist?: string;
  category?: string;
  language?: Language;
  lyrics: string;
  chords?: string;
  sourceName?: string;
  sourceUrl?: string;
  license?: string;
  copyrightNotice?: string;
  existingSongs: Song[];
}): ImportItem {
  const normalizedLyrics = normalizeText(cleanDuplicateLines(lyrics));
  const detected = detectLanguage(normalizedLyrics);
  const resolvedLanguage = language || (detected === "romanized-telugu" ? "telugu" : detected);

  const duplicate = findDuplicateInLibrary(
    { title, romanizedTitle, lyrics: normalizedLyrics, artist },
    existingSongs
  );

  return {
    id: generateId(),
    title: title.trim(),
    romanizedTitle: romanizedTitle?.trim(),
    englishTitle: englishTitle?.trim(),
    language: resolvedLanguage,
    category: category?.trim() || "worship",
    artist: artist?.trim(),
    lyricist: lyricist?.trim(),
    lyrics: normalizedLyrics,
    chords: chords?.trim(),
    sourceName: sourceName?.trim(),
    sourceUrl: sourceUrl?.trim(),
    license: license?.trim() || "Public Domain / Authorized",
    copyrightNotice: copyrightNotice?.trim(),
    status: duplicate ? "duplicate" : "valid",
    duplicateOfId: duplicate?.songId,
    duplicateScore: duplicate?.score,
    resolution: duplicate ? "skip" : undefined,
  };
}

import { extractSongInfo } from "@/lib/title-extractor";

export async function parseTxtFile(text: string, filename: string, existingSongs: Song[] = []): Promise<ParsedFileResult> {
  const cleaned = sanitizeText(text);
  const fallbackTitle = filename.replace(/\.[^.]+$/, "").replace(/[-_]/g, " ").trim() || "Untitled";

  // Use raw pasted song parser which splits chunks and extracts real song titles & numbers
  const items = parseRawPastedSongs(cleaned, existingSongs);
  if (items.length > 0) {
    return {
      filename,
      format: "txt",
      items,
      errors: [],
    };
  }

  // Fallback single song extraction
  const info = extractSongInfo(cleaned);
  const item = buildImportItemFromRaw({
    title: info.title || fallbackTitle,
    romanizedTitle: info.subtitle,
    artist: info.artist,
    lyricist: info.lyricist,
    category: info.category,
    language: info.language as Language,
    lyrics: info.lyrics || cleaned,
    existingSongs,
  });

  return {
    filename,
    format: "txt",
    items: [item],
    errors: item.status === "valid" ? [] : ["Needs review: duplicate or invalid content"],
  };
}

export async function parseDocxFile(arrayBuffer: ArrayBuffer, filename: string, existingSongs: Song[] = []): Promise<ParsedFileResult> {
  try {
    const mammoth = await import("mammoth");
    const result = await mammoth.extractRawText({ arrayBuffer });
    const text = result.value || "";
    if (!text.trim()) {
      return { filename, format: "docx", items: [], errors: ["No extractable text found in DOCX."] };
    }

    // DOCX files may contain a single song or a songbook.
    // parseTxtFile internally detects multi-song content and delegates appropriately.
    const parsed = await parseTxtFile(text, filename, existingSongs);
    return { ...parsed, format: "docx" };
  } catch (e) {
    console.error("DOCX parse error", e);
    return { filename, format: "docx", items: [], errors: ["Failed to parse DOCX file."] };
  }
}

export async function parsePdfFile(arrayBuffer: ArrayBuffer, filename: string, existingSongs: Song[] = []): Promise<ParsedFileResult> {
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
        .join(" ")
        .trim();
      if (pageText) pages.push(pageText);
    }
    const text = pages.join("\n\n");
    if (!text.trim()) {
      return { filename, format: "pdf", items: [], errors: ["No extractable text found in PDF."] };
    }
    return parseTxtFile(text, filename, existingSongs);
  } catch (e) {
    console.error("PDF parse error", e);
    return { filename, format: "pdf", items: [], errors: ["Failed to parse PDF file. Ensure pdfjs-dist is installed."] };
  }
}

export async function parsePptxFile(arrayBuffer: ArrayBuffer, filename: string, existingSongs: Song[] = []): Promise<ParsedFileResult> {
  try {
    const PptxGenJS = await import("pptxgenjs");
    const pptxlib = (PptxGenJS as any).default || PptxGenJS;
    let JSZip: any;
    try {
      const jszipModule = await import("jszip");
      JSZip = jszipModule.default || jszipModule;
    } catch {
      return { filename, format: "pptx", items: [], errors: ["JSZip package is required for PPTX parsing. Install jszip to enable this feature."] };
    }
    const zip = await JSZip.loadAsync(arrayBuffer);
    const slideFiles = Object.keys(zip.files)
      .filter((name: string) => /^ppt\/slides\/slide\d+\.xml$/.test(name))
      .sort((a: string, b: string) => {
        const aNum = parseInt(a.match(/slide(\d+)/)?.[1] || "0");
        const bNum = parseInt(b.match(/slide(\d+)/)?.[1] || "0");
        return aNum - bNum;
      });

    const slideTexts: string[] = [];
    for (const file of slideFiles) {
      const zipEntry = zip.files[file];
      if (!zipEntry) continue;
      const xml = await zipEntry.async("text");
      const textMatches = xml.match(/<a:t>([^<]+)<\/a:t>/g) || [];
      const texts = textMatches
        .map((match: string) => match.replace(/<[^>]+>/g, "").trim())
        .filter(Boolean);
      if (texts.length) slideTexts.push(texts.join("\n"));
    }

    const text = slideTexts.join("\n\n---\n\n");
    if (!text.trim()) {
      return { filename, format: "pptx", items: [], errors: ["No extractable text found in PPTX."] };
    }

    const parsed = parseRawPastedSongs(text, existingSongs);
    return {
      filename,
      format: "pptx",
      items: parsed,
      errors: [],
    };
  } catch (e) {
    console.error("PPTX parse error", e);
    return { filename, format: "pptx", items: [], errors: ["Failed to parse PPTX file."] };
  }
}

export { parsePdfSongBook, parseOcrPdfSongBook } from "./pdf-song-book-parser";
export type { PdfSongBookResult } from "./pdf-song-book-parser";

// WorshipFlow Content Ingestion Parser
import type { ImportItem, ImportJob, Song, Language } from "@/types";
import { findDuplicateInLibrary } from "./duplicate-detector";
import { detectLanguage } from "./lyrics-parser";

import { extractSongInfo } from "./title-extractor";

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Split raw text into song chunks using standard delimiters or song number boundaries
 */
export function splitRawTextIntoChunks(rawText: string): string[] {
  const normalizedText = rawText.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();
  if (!normalizedText) return [];

  // Pass 1: Standard delimiters --- or ===
  let chunks = normalizedText
    .split(/\n\s*(?:---|===)\s*\n/)
    .map((c) => c.trim())
    .filter(Boolean);

  // Pass 2: Telugu song markers (పాట: 1, పాట:1, పాట 1, పాట నెం. 1, పాట సంఖ్య 1)
  chunks = chunks.flatMap((chunk) => {
    const sub = chunk
      .split(/(?:\n|^)(?=పాట\s*(?:నెం\.?|నంబరు|సంఖ్య|నం\.?)?\s*[:\-\.]?\s*\d+)/imu)
      .map((c) => c.trim())
      .filter((c) => c.length > 5);
    return sub.length > 0 ? sub : [chunk];
  });

  // Pass 3: English song markers (Song 1, Song No. 1, No. 1, #1)
  chunks = chunks.flatMap((chunk) => {
    const sub = chunk
      .split(/(?:\n|^)(?=(?:Song\s*(?:No\.?|#)?|No\.)\s*[:\-\.]?\s*\d+)/imu)
      .map((c) => c.trim())
      .filter((c) => c.length > 5);
    return sub.length > 0 ? sub : [chunk];
  });

  // Pass 4: Numbered list markers (1. Title, 01. Title)
  chunks = chunks.flatMap((chunk) => {
    const sub = chunk
      .split(/(?:\n|^)(?=\d{1,4}\s*[\.\-\)]\s+[A-Za-z\u0C00-\u0C7F])/imu)
      .map((c) => c.trim())
      .filter((c) => c.length > 5);
    return sub.length > 0 ? sub : [chunk];
  });

  return chunks.filter((c) => c.trim().length > 0);
}

/**
 * Parse raw text containing one or more songs separated by '---' or metadata headers
 */
export function parseRawPastedSongs(rawText: string, existingSongs: Song[] = []): ImportItem[] {
  if (!rawText.trim()) return [];

  const chunks = splitRawTextIntoChunks(rawText);
  const items: ImportItem[] = [];

  for (let idx = 0; idx < chunks.length; idx++) {
    const chunk = chunks[idx];
    if (!chunk.trim()) continue;

    // Use intelligent song info & title extractor
    const info = extractSongInfo(chunk, idx);
    if (!info.lyrics && !info.title) continue;

    const duplicate = findDuplicateInLibrary(
      {
        title: info.title,
        romanizedTitle: info.subtitle,
        lyrics: info.lyrics,
        artist: info.artist,
      },
      existingSongs
    );

    items.push({
      id: generateId(),
      title: info.title,
      romanizedTitle: info.subtitle,
      language: info.language as Language,
      category: info.category || "worship",
      artist: info.artist,
      lyricist: info.lyricist,
      lyrics: info.lyrics,
      sourceName: info.sourceName || (info.songNumber ? `Songbook #${info.songNumber}` : undefined),
      license: info.license || "Public Domain / Authorized",
      status: duplicate ? "duplicate" : "valid",
      duplicateOfId: duplicate?.songId,
      duplicateScore: duplicate?.score,
      resolution: duplicate ? "skip" : undefined,
    });
  }

  return items;
}

/**
 * Parse CSV text into ImportItem array
 */
export function parseCSVContent(csvText: string, existingSongs: Song[] = []): ImportItem[] {
  const lines = csvText.trim().split(/\r?\n/);
  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/^["']|["']$/g, ""));
  const items: ImportItem[] = [];

  const getCol = (row: string[], colName: string): string => {
    const idx = headers.indexOf(colName);
    if (idx === -1 || idx >= row.length) return "";
    return row[idx].trim().replace(/^["']|["']$/g, "").replace(/""/g, '"');
  };

  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;

    // Simple CSV parser for rows
    const row = lines[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
    const title = getCol(row, "title");
    if (!title) continue;

    const romanizedTitle = getCol(row, "romanized_title") || getCol(row, "romanized");
    const artist = getCol(row, "artist") || getCol(row, "author");
    const lyricist = getCol(row, "lyricist");
    const category = getCol(row, "category") || "worship";
    const langRaw = getCol(row, "language").toLowerCase();
    const language: Language = (langRaw === "telugu" || langRaw === "english" || langRaw === "hindi" || langRaw === "mixed")
      ? (langRaw as Language)
      : "telugu";
    const lyrics = getCol(row, "lyrics").replace(/\\n/g, "\n");
    const chords = getCol(row, "chords").replace(/\\n/g, "\n");
    const sourceName = getCol(row, "source") || getCol(row, "source_name");
    const license = getCol(row, "license") || "Authorized / Public Domain";

    const duplicate = findDuplicateInLibrary({ title, romanizedTitle, lyrics, artist }, existingSongs);

    items.push({
      id: generateId(),
      title,
      romanizedTitle: romanizedTitle || undefined,
      artist: artist || undefined,
      lyricist: lyricist || undefined,
      category,
      language,
      lyrics,
      chords: chords || undefined,
      sourceName: sourceName || undefined,
      license: license || undefined,
      status: duplicate ? "duplicate" : "valid",
      duplicateOfId: duplicate?.songId,
      duplicateScore: duplicate?.score,
      resolution: duplicate ? "skip" : undefined,
    });
  }

  return items;
}

/**
 * Parse JSON array into ImportItem array
 */
export function parseJSONContent(jsonText: string, existingSongs: Song[] = []): ImportItem[] {
  try {
    const parsed = JSON.parse(jsonText);
    const array = Array.isArray(parsed) ? parsed : [parsed];
    const items: ImportItem[] = [];

    for (const obj of array) {
      const title = obj.title || obj.name;
      if (!title) continue;

      const romanizedTitle = obj.romanizedTitle || obj.romanized_title || obj.romanized;
      const lyrics = obj.lyrics || "";
      const artist = obj.artist || obj.author;
      const category = obj.category || "worship";
      const language = (obj.language || "telugu") as Language;
      const chords = obj.chords;
      const sourceName = obj.sourceName || obj.source_name || obj.source;
      const license = obj.license || "Authorized / Public Domain";

      const duplicate = findDuplicateInLibrary({ title, romanizedTitle, lyrics, artist }, existingSongs);

      items.push({
        id: generateId(),
        title,
        romanizedTitle: romanizedTitle || undefined,
        artist: artist || undefined,
        lyricist: obj.lyricist || undefined,
        category,
        language,
        lyrics,
        chords: chords || undefined,
        sourceName: sourceName || undefined,
        license: license || undefined,
        status: duplicate ? "duplicate" : "valid",
        duplicateOfId: duplicate?.songId,
        duplicateScore: duplicate?.score,
        resolution: duplicate ? "skip" : undefined,
      });
    }

    return items;
  } catch (err) {
    console.error("Failed to parse JSON import content", err);
    return [];
  }
}

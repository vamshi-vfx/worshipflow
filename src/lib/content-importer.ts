// WorshipFlow Content Ingestion Parser
import type { ImportItem, ImportJob, Song, Language } from "@/types";
import { findDuplicateInLibrary } from "./duplicate-detector";
import { detectLanguage } from "./lyrics-parser";

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Parse raw text containing one or more songs separated by '---' or metadata headers
 */
export function parseRawPastedSongs(rawText: string, existingSongs: Song[] = []): ImportItem[] {
  if (!rawText.trim()) return [];

  const chunks = splitRawTextIntoChunks(rawText);
  const items: ImportItem[] = [];

  for (const chunk of chunks) {
    if (!chunk.trim()) continue;

    const lines = chunk.trim().split("\n");
    let title = "";
    let romanizedTitle = "";
    let artist = "";
    let lyricist = "";
    let category = "worship";
    let language: Language = "telugu";
    let sourceName = "";
    let sourceUrl = "";
    let license = "Public Domain / Authorized";
    let copyrightNotice = "";
    const lyricsLines: string[] = [];

    let isParsingLyrics = false;

    for (const line of lines) {
      const trimmed = line.trim();

      if (!isParsingLyrics) {
        const titleMatch = trimmed.match(/^Title:\s*(.+)$/i);
        const romMatch = trimmed.match(/^(?:Romanized|Transliteration):\s*(.+)$/i);
        const artistMatch = trimmed.match(/^(?:Artist|Author|Singer):\s*(.+)$/i);
        const lyricistMatch = trimmed.match(/^(?:Lyricist|Composer|Written By):\s*(.+)$/i);
        const catMatch = trimmed.match(/^Category:\s*(.+)$/i);
        const langMatch = trimmed.match(/^Language:\s*(.+)$/i);
        const srcMatch = trimmed.match(/^Source:\s*(.+)$/i);
        const licMatch = trimmed.match(/^License:\s*(.+)$/i);

        if (titleMatch) {
          title = titleMatch[1].trim();
          continue;
        } else if (romMatch) {
          romanizedTitle = romMatch[1].trim();
          continue;
        } else if (artistMatch) {
          artist = artistMatch[1].trim();
          continue;
        } else if (lyricistMatch) {
          lyricist = lyricistMatch[1].trim();
          continue;
        } else if (catMatch) {
          category = catMatch[1].trim().toLowerCase();
          continue;
        } else if (langMatch) {
          const l = langMatch[1].trim().toLowerCase();
          if (l === "telugu" || l === "english" || l === "hindi" || l === "mixed") {
            language = l as Language;
          }
          continue;
        } else if (srcMatch) {
          sourceName = srcMatch[1].trim();
          continue;
        } else if (licMatch) {
          license = licMatch[1].trim();
          continue;
        } else if (trimmed.length > 0) {
          if (!title) {
            title = trimmed;
            continue;
          }
          isParsingLyrics = true;
          lyricsLines.push(trimmed);
        }
      } else {
        lyricsLines.push(trimmed);
      }
    }

    const lyrics = lyricsLines.join("\n").trim();
    if (!title && lyricsLines.length > 0) {
      title = lyricsLines[0];
    }

    if (!title) continue;

    const detectedLang = detectLanguage(lyrics);
    if (language === "telugu" && detectedLang !== "telugu") {
      language = detectedLang === "romanized-telugu" ? "telugu" : (detectedLang as Language);
    }

    const duplicate = findDuplicateInLibrary({ title, romanizedTitle, lyrics, artist }, existingSongs);

    items.push({
      id: generateId(),
      title,
      romanizedTitle: romanizedTitle || undefined,
      language,
      category,
      artist: artist || undefined,
      lyricist: lyricist || undefined,
      lyrics,
      sourceName: sourceName || undefined,
      sourceUrl: sourceUrl || undefined,
      license: license || undefined,
      copyrightNotice: copyrightNotice || undefined,
      status: duplicate ? "duplicate" : "valid",
      duplicateOfId: duplicate?.songId,
      duplicateScore: duplicate?.score,
      resolution: duplicate ? "skip" : undefined,
    });
  }

  return items;
}

function splitRawTextIntoChunks(rawText: string): string[] {
  const chunks: string[] = [];

  // Primary delimiter: ---
  const primaryChunks = rawText.split(/\n\s*---\s*\n/);
  if (primaryChunks.length > 1) {
    return primaryChunks;
  }

  // Fallback: Telugu song markers (పాట:1, పాట: 1, పాట :1, పాట : 1, పాట 1, పాట:133, etc.)
  const teluguMarkerChunks = rawText.split(/\n(?=పాట\s*[:\s]\s*\d+\s*$)/imu);
  if (teluguMarkerChunks.length > 1) {
    return teluguMarkerChunks;
  }

  // Fallback: English song markers (Song 1, Song:1, No. 1, etc.)
  const englishMarkerChunks = rawText.split(/\n(?=(?:Song\s+(?:No\.?\s*)?\d+|No\.\s*\d+)\s*$)/imu);
  if (englishMarkerChunks.length > 1) {
    return englishMarkerChunks;
  }

  return [rawText];
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

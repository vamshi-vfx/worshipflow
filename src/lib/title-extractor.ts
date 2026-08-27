// WorshipFlow Intelligent Song Title & Metadata Extractor
// Accurately extracts real song titles, song numbers, and metadata from Telugu & English songbooks.

export interface ExtractedSongInfo {
  songNumber?: number;
  songNumberText?: string;
  title: string;
  subtitle?: string;
  artist?: string;
  lyricist?: string;
  composer?: string;
  category?: string;
  language?: "telugu" | "english" | "hindi" | "mixed";
  sourceName?: string;
  license?: string;
  lyrics: string;
  rawLyricsLines: string[];
}

// Known Section Heading Patterns to never use as titles
const SECTION_HEADING_PATTERNS = [
  /^\[.+\]$/i,
  /^(verse\s*\d*|v\s*\d*|v\d+)$/i,
  /^(pre\s*-?\s*chorus|pre\s+chorus|prechorus)$/i,
  /^(chorus|refrain)$/i,
  /^(bridge)$/i,
  /^(intro)$/i,
  /^(interlude)$/i,
  /^(outro|ending|coda)$/i,
  /^(tag|break)$/i,
  // Telugu Section Headings
  /^(పల్లవి|చరణం\s*\d*|చరణము\s*\d*|అంతర|కోరస్|బ్రిడ్జ్|ముగింపు|వంతు|వచనం\s*\d*)$/u,
  /^(పల్లవి\s*[:\.]|చరణం\s*\d*\s*[:\.]|చరణము\s*\d*\s*[:\.])$/u,
  /^(pallavi|charanam\s*\d*|charanamu\s*\d*|anupallavi)$/i,
];

// Song Number Patterns
const SONG_NUMBER_REGEX = /^(?:పాట\s*(?:నెం\.?|నంబరు|సంఖ్య|నం\.?)?\s*[:\-\.]?\s*(\d+)|Song\s*(?:No\.?|#)?\s*[:\-\.]?\s*(\d+)|No\.?\s*[:\-\.]?\s*(\d+)|#\s*(\d+)|(\d+)\s*[\.\-\)]\s*)/imu;

const TELUGU_UNICODE_REGEX = /[\u0C00-\u0C7F]/;

/**
 * Checks if a line is a section heading label
 */
export function isSectionHeading(line: string): boolean {
  const trimmed = line.trim();
  return SECTION_HEADING_PATTERNS.some((pattern) => pattern.test(trimmed));
}

/**
 * Checks if a line is solely a song number label (e.g. "పాట:98", "Song 12", "No. 45", "98.")
 */
export function isPureSongNumberLine(line: string): { isNumber: boolean; songNumber?: number; numberText?: string } {
  const trimmed = line.trim();
  
  // Explicit matches like "పాట:98", "పాట 98", "Song 98", "No. 98", "#98", "98."
  const match = trimmed.match(/^(?:పాట\s*(?:నెం\.?|నంబరు|సంఖ్య|నం\.?)?\s*[:\-\.]?\s*(\d+)|Song\s*(?:No\.?|#)?\s*[:\-\.]?\s*(\d+)|No\.?\s*[:\-\.]?\s*(\d+)|#\s*(\d+)|(\d+)\s*[\.\-\)]\s*)$/iu);
  if (match) {
    const numStr = match[1] || match[2] || match[3] || match[4] || match[5];
    return {
      isNumber: true,
      songNumber: parseInt(numStr, 10),
      numberText: trimmed,
    };
  }

  // Standalone numbers (e.g. "98", "098")
  if (/^\d{1,4}$/.test(trimmed)) {
    return {
      isNumber: true,
      songNumber: parseInt(trimmed, 10),
      numberText: trimmed,
    };
  }

  return { isNumber: false };
}

/**
 * Extracts Song Number, Real Title, and Clean Lyrics from a song text block
 */
export function extractSongInfo(rawChunk: string, fallbackIndex?: number): ExtractedSongInfo {
  const lines = rawChunk.trim().split("\n");
  let songNumber: number | undefined;
  let songNumberText: string | undefined;
  let title = "";
  let subtitle = "";
  let artist = "";
  let lyricist = "";
  let composer = "";
  let category = "worship";
  let language: "telugu" | "english" | "hindi" | "mixed" = "telugu";
  let sourceName = "";
  let license = "Public Domain / Authorized";

  const cleanLyricLines: string[] = [];
  let foundExplicitTitle = false;

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const line = rawLine.trim();
    if (!line) {
      if (cleanLyricLines.length > 0) cleanLyricLines.push("");
      continue;
    }

    // 1. Check for Explicit Metadata Headers
    const titleMatch = line.match(/^Title\s*[:\-]\s*(.+)$/i);
    const subMatch = line.match(/^(?:Subtitle|Romanized|Transliteration)\s*[:\-]\s*(.+)$/i);
    const songNoMatch = line.match(/^(?:Song\s*No|Song\s*Number|Song\s*#|పాట\s*నెం|పాట\s*సంఖ్య)\s*[:\-]\s*(\d+)$/i);
    const artistMatch = line.match(/^(?:Artist|Author|Singer|Singer\(s\))\s*[:\-]\s*(.+)$/i);
    const lyricistMatch = line.match(/^(?:Lyricist|Written By|Composer|Music)\s*[:\-]\s*(.+)$/i);
    const catMatch = line.match(/^Category\s*[:\-]\s*(.+)$/i);
    const langMatch = line.match(/^Language\s*[:\-]\s*(.+)$/i);
    const srcMatch = line.match(/^Source\s*[:\-]\s*(.+)$/i);
    const licMatch = line.match(/^License\s*[:\-]\s*(.+)$/i);

    if (titleMatch) {
      title = titleMatch[1].trim();
      foundExplicitTitle = true;
      continue;
    }
    if (subMatch) {
      subtitle = subMatch[1].trim();
      continue;
    }
    if (songNoMatch) {
      songNumber = parseInt(songNoMatch[1], 10);
      songNumberText = line;
      continue;
    }
    if (artistMatch) {
      artist = artistMatch[1].trim();
      continue;
    }
    if (lyricistMatch) {
      lyricist = lyricistMatch[1].trim();
      continue;
    }
    if (catMatch) {
      category = catMatch[1].trim().toLowerCase();
      continue;
    }
    if (langMatch) {
      const l = langMatch[1].trim().toLowerCase();
      if (l === "telugu" || l === "english" || l === "hindi" || l === "mixed") {
        language = l;
      }
      continue;
    }
    if (srcMatch) {
      sourceName = srcMatch[1].trim();
      continue;
    }
    if (licMatch) {
      license = licMatch[1].trim();
      continue;
    }

    // 2. Check if this line starts with a song number pattern (e.g. "పాట:98 - అంకితం నీకే దేవా" or "98. అంకితం నీకే దేవా")
    const embeddedNumberMatch = line.match(/^(?:పాట\s*(?:నెం\.?|నంబరు|సంఖ్య|నం\.?)?\s*[:\-\.]?\s*(\d+)|Song\s*(?:No\.?|#)?\s*[:\-\.]?\s*(\d+)|No\.?\s*[:\-\.]?\s*(\d+)|#\s*(\d+)|(\d+)\s*[\.\-\)]\s*)(.*)$/iu);
    
    if (embeddedNumberMatch && !foundExplicitTitle && !title) {
      const numStr = embeddedNumberMatch[1] || embeddedNumberMatch[2] || embeddedNumberMatch[3] || embeddedNumberMatch[4] || embeddedNumberMatch[5];
      songNumber = parseInt(numStr, 10);
      songNumberText = `Song ${songNumber}`;

      const remainingText = (embeddedNumberMatch[6] || "").replace(/^[\s:\-\.]+|[\s:\-\.]+$/g, "").trim();

      if (remainingText.length > 1 && !isSectionHeading(remainingText)) {
        // Real title was on the same line after the number! (e.g. "పాట:98 అంకితం నీకే దేవా")
        title = remainingText;
        // Also include the title line in the lyrics body so words are preserved
        cleanLyricLines.push(remainingText);
        continue;
      } else {
        // Line was just a song number (e.g. "పాట:98"), continue to next lines to find the title
        continue;
      }
    }

    // 3. Check for pure song number line
    const pureNum = isPureSongNumberLine(line);
    if (pureNum.isNumber && !songNumber) {
      songNumber = pureNum.songNumber;
      songNumberText = pureNum.numberText;
      continue;
    }

    // 4. Skip pure Section Headings when searching for Title
    if (!title && isSectionHeading(line)) {
      cleanLyricLines.push(line);
      continue;
    }

    // 5. Discover Title from first meaningful lyric line if not yet found
    if (!title) {
      // Clean leading numbering if any
      const cleanedLine = line.replace(/^\d+[\.\-\)]\s*/, "").trim();
      if (cleanedLine.length > 0 && !isSectionHeading(cleanedLine)) {
        title = cleanedLine;
        cleanLyricLines.push(line);
        continue;
      }
    }

    // Regular lyric line
    cleanLyricLines.push(line);
  }

  // 6. Robust Fallback if title still not found
  if (!title) {
    const firstNonHeading = cleanLyricLines.find((l) => l.trim() && !isSectionHeading(l.trim()));
    if (firstNonHeading) {
      title = firstNonHeading.trim().replace(/^\d+[\.\-\)]\s*/, "");
    }
  }

  // Clean title from any leftover song-number prefixes (e.g., "పాట: 98", "Song 98", "98.")
  if (title) {
    const strippedTitle = title
      .replace(/^(?:పాట\s*(?:నెం\.?|నంబరు|సంఖ్య|నం\.?)?\s*[:\-\.]?\s*\d+\s*[:\-\.]?\s*|Song\s*(?:No\.?|#)?\s*[:\-\.]?\s*\d+\s*[:\-\.]?\s*|No\.?\s*[:\-\.]?\s*\d+\s*[:\-\.]?\s*|#\s*\d+\s*[:\-\.]?\s*|\d+\s*[\.\-\)]\s*)/iu, "")
      .trim();

    if (strippedTitle.length > 0 && !isSectionHeading(strippedTitle)) {
      title = strippedTitle;
    }
  }

  // If title is STILL empty or purely a song number pattern, use safe fallback
  const isStillPureNumber = isPureSongNumberLine(title);
  if (!title || isStillPureNumber.isNumber || /^(?:పాట\s*[:\-\.]?\s*\d+|Song\s*\d+|No\.\s*\d+)$/iu.test(title)) {
    if (songNumber !== undefined) {
      title = `Untitled Song ${songNumber}`;
    } else if (fallbackIndex !== undefined) {
      title = `Untitled Song ${fallbackIndex + 1}`;
    } else {
      title = "Untitled Worship Song";
    }
  }

  // Detect language from final content
  const fullLyrics = cleanLyricLines.join("\n").trim();
  const hasTelugu = TELUGU_UNICODE_REGEX.test(title) || TELUGU_UNICODE_REGEX.test(fullLyrics);
  if (hasTelugu) {
    language = "telugu";
  } else if (/^[A-Za-z0-9\s.,!?'"()-]+$/.test(fullLyrics.slice(0, 200))) {
    language = "english";
  }

  return {
    songNumber,
    songNumberText,
    title,
    subtitle: subtitle || undefined,
    artist: artist || undefined,
    lyricist: lyricist || undefined,
    composer: composer || undefined,
    category,
    language,
    sourceName: sourceName || (songNumber ? `Songbook #${songNumber}` : undefined),
    license,
    lyrics: fullLyrics,
    rawLyricsLines: cleanLyricLines,
  };
}

// WorshipFlow Duplicate Detection Engine (Levenshtein Distance & Token Jaccard Similarity)
import type { Song, DuplicateMatch } from "@/types";

/**
 * Clean and normalize string for comparison
 */
export function normalizeForComparison(str: string): string {
  if (!str) return "";
  return str
    .toLowerCase()
    .replace(/[^\w\s\u0C00-\u0C7F\u0900-\u097F]/g, "") // Keep English, Telugu, Hindi alphanumeric
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Standard Levenshtein distance
 */
export function levenshteinDistance(a: string, b: string): number {
  const an = a ? a.length : 0;
  const bn = b ? b.length : 0;
  if (an === 0) return bn;
  if (bn === 0) return an;

  const matrix: number[][] = [];
  for (let i = 0; i <= bn; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= an; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= bn; i++) {
    for (let j = 1; j <= an; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  return matrix[bn][an];
}

/**
 * String similarity ratio (0 to 1)
 */
export function stringSimilarity(a: string, b: string): number {
  const normA = normalizeForComparison(a);
  const normB = normalizeForComparison(b);
  if (normA === normB) return 1;
  if (!normA || !normB) return 0;

  const distance = levenshteinDistance(normA, normB);
  const maxLen = Math.max(normA.length, normB.length);
  return Math.max(0, 1 - distance / maxLen);
}

/**
 * Token Jaccard similarity for lyrics body
 */
export function tokenJaccardSimilarity(textA: string, textB: string): number {
  const tokensA = new Set(normalizeForComparison(textA).split(" ").filter((w) => w.length > 2));
  const tokensB = new Set(normalizeForComparison(textB).split(" ").filter((w) => w.length > 2));

  if (tokensA.size === 0 || tokensB.size === 0) return 0;

  let intersectionCount = 0;
  tokensA.forEach((token) => {
    if (tokensB.has(token)) intersectionCount++;
  });

  const unionCount = tokensA.size + tokensB.size - intersectionCount;
  return unionCount === 0 ? 0 : intersectionCount / unionCount;
}

/**
 * Check if a candidate song matches any existing song in library
 */
export function findDuplicateInLibrary(
  candidate: { title: string; romanizedTitle?: string; lyrics: string; artist?: string },
  existingSongs: Song[]
): DuplicateMatch | null {
  const candTitleNorm = normalizeForComparison(candidate.title);
  const candRomNorm = normalizeForComparison(candidate.romanizedTitle || "");

  let bestMatch: DuplicateMatch | null = null;
  let highestScore = 0;

  for (const song of existingSongs) {
    const existingTitleNorm = normalizeForComparison(song.title);
    const existingRomNorm = normalizeForComparison(song.romanizedTitle || "");

    // 1. Exact Title Match
    if (candTitleNorm === existingTitleNorm || (candRomNorm && candRomNorm === existingRomNorm)) {
      return {
        songId: song.id,
        title: song.title,
        artist: song.artist,
        score: 1.0,
        matchType: "exact_title",
      };
    }

    // 2. Fuzzy Title Match
    const titleScore = Math.max(
      stringSimilarity(candidate.title, song.title),
      candidate.romanizedTitle && song.romanizedTitle ? stringSimilarity(candidate.romanizedTitle, song.romanizedTitle) : 0
    );

    // 3. Lyrics Similarity
    const lyricsScore = tokenJaccardSimilarity(candidate.lyrics, song.lyrics || "");

    // Combined score
    const combinedScore = titleScore * 0.6 + lyricsScore * 0.4;

    if (combinedScore > 0.75 && combinedScore > highestScore) {
      highestScore = combinedScore;
      bestMatch = {
        songId: song.id,
        title: song.title,
        artist: song.artist,
        score: Math.round(combinedScore * 100) / 100,
        matchType: combinedScore > 0.9 ? "fuzzy_title" : "fuzzy_lyrics",
      };
    }
  }

  return bestMatch;
}

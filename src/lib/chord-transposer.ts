// WorshipFlow Chords & Transposition Engine

const CHROMATIC_SCALE_SHARPS = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const CHROMATIC_SCALE_FLATS = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];

const ENHARMONIC_MAP: Record<string, string> = {
  "B#": "C",
  "Cb": "B",
  "E#": "F",
  "Fb": "E",
};

// Regex to match chord names with extensions
export const CHORD_REGEX = /^[A-G][b#]?(?:m|maj|min|dim|aug|sus|add)?(?:[0-9]|11|13)*(?:(?:maj|min|dim|aug|sus|add)?[0-9]*)?(?:\/[A-G][b#]?)?$/;
export const BRACKETED_CHORD_REGEX = /\[([A-G][b#]?(?:m|maj|min|dim|aug|sus|add)?(?:[0-9]|11|13)*(?:(?:maj|min|dim|aug|sus|add)?[0-9]*)?(?:\/[A-G][b#]?)?)\]/g;

/**
 * Transpose a single chord root by given semitones
 */
export function transposeChordRoot(root: string, semitones: number, preferFlats = false): string {
  const cleanRoot = ENHARMONIC_MAP[root] || root;
  let index = CHROMATIC_SCALE_SHARPS.indexOf(cleanRoot);
  if (index === -1) {
    index = CHROMATIC_SCALE_FLATS.indexOf(cleanRoot);
  }
  if (index === -1) return root;

  let newIndex = (index + semitones) % 12;
  if (newIndex < 0) newIndex += 12;

  return preferFlats ? CHROMATIC_SCALE_FLATS[newIndex] : CHROMATIC_SCALE_SHARPS[newIndex];
}

/**
 * Transpose full chord token (e.g., C#m7/G# -> Dm7/A with +1)
 */
export function transposeChord(chord: string, semitones: number, preferFlats = false): string {
  if (semitones === 0) return chord;

  const slashParts = chord.split("/");
  const mainPart = slashParts[0];
  const bassPart = slashParts[1];

  // Match root note and suffix
  const match = mainPart.match(/^([A-G][b#]?)(.*)$/);
  if (!match) return chord;

  const root = match[1];
  const suffix = match[2];
  const transposedRoot = transposeChordRoot(root, semitones, preferFlats);

  let result = transposedRoot + suffix;

  if (bassPart) {
    const bassMatch = bassPart.match(/^([A-G][b#]?)(.*)$/);
    if (bassMatch) {
      const transposedBass = transposeChordRoot(bassMatch[1], semitones, preferFlats);
      result += "/" + transposedBass + bassMatch[2];
    } else {
      result += "/" + bassPart;
    }
  }

  return result;
}

/**
 * Transpose all ChordPro bracketed chords in a text string
 */
export function transposeTextChords(text: string, semitones: number, preferFlats = false): string {
  if (!text || semitones === 0) return text;
  return text.replace(BRACKETED_CHORD_REGEX, (_, chord) => {
    return `[${transposeChord(chord, semitones, preferFlats)}]`;
  });
}

export interface ParsedChordSegment {
  chord?: string;
  lyric: string;
}

export interface ParsedChordLine {
  segments: ParsedChordSegment[];
  hasChords: boolean;
  raw: string;
}

/**
 * Parse a line of ChordPro text into aligned chord/lyric segments
 */
export function parseChordProLine(line: string): ParsedChordLine {
  if (!line) {
    return { segments: [{ lyric: "" }], hasChords: false, raw: "" };
  }

  const segments: ParsedChordSegment[] = [];
  let lastIndex = 0;
  let hasChords = false;

  const regex = /\[([A-G][b#]?[^\]]*)\]/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(line)) !== null) {
    hasChords = true;
    const lyricBefore = line.substring(lastIndex, match.index);
    if (lyricBefore || segments.length === 0) {
      segments.push({ lyric: lyricBefore });
    }

    const chord = match[1];
    const nextMatch = line.indexOf("[", regex.lastIndex);
    const lyricAfter = nextMatch !== -1 ? line.substring(regex.lastIndex, nextMatch) : line.substring(regex.lastIndex);

    segments.push({
      chord,
      lyric: lyricAfter,
    });

    lastIndex = nextMatch !== -1 ? nextMatch : line.length;
    regex.lastIndex = lastIndex;
  }

  if (segments.length === 0) {
    segments.push({ lyric: line });
  }

  return {
    segments,
    hasChords,
    raw: line,
  };
}

/**
 * Strip chords from ChordPro text and return clean lyrics only
 */
export function stripChords(text: string): string {
  if (!text) return "";
  return text.replace(BRACKETED_CHORD_REGEX, "").replace(/\s{2,}/g, " ").trim();
}

export type DetectedLanguage = "telugu" | "english" | "romanized-telugu" | "mixed";

export interface LyricLine {
  id: string;
  text: string;
  language: DetectedLanguage;
}

export type SectionConfidence = "high" | "medium" | "low";

export interface DetectedSection {
  id: string;
  type: "verse" | "chorus" | "bridge" | "intro" | "outro" | "tag" | "pre-chorus" | "custom";
  label: string;
  lines: LyricLine[];
  order: number;
  confidence: SectionConfidence;
}

export interface GeneratedSlide {
  id: string;
  sectionOrder: number;
  slideNumber: number;
  primaryText: string;
  secondaryText?: string;
  lineIds: string[];
}

const TELUGU_REGEX = /[\u0C00-\u0C7F]/;
const ROMANIZED_PATTERNS = [
  /\b(naa|nee|mii|nii|ee|oo|ai|au)\b/i,
  /\b(yesu|jeevitham|praanam|balam|aashrayam|chethilo|kosame|nadipinche|kaapade|rakshakudavu|daatudavu|devudavu|prema|krupa)\b/i,
  /\b\w*(ch|th|dh|bh|ph|kh)\w*\b/i,
  /\b\w*(aa|ee|oo|ai|au)\w*\b/i,
];

const SECTION_HEADINGS: { pattern: RegExp; type: DetectedSection["type"]; label: string; confidence: SectionConfidence }[] = [
  { pattern: /^(verse\s*\d*|v\s*\d*|v\d+)$/i, type: "verse", label: "Verse", confidence: "high" },
  { pattern: /^(pre\s*-?\s*chorus|pre\s+chorus|prechorus)$/i, type: "verse", label: "Pre-Chorus", confidence: "high" },
  { pattern: /^(chorus|refrain)$/i, type: "chorus", label: "Chorus", confidence: "high" },
  { pattern: /^(bridge)$/i, type: "bridge", label: "Bridge", confidence: "high" },
  { pattern: /^(intro)$/i, type: "intro", label: "Intro", confidence: "high" },
  { pattern: /^(interlude)$/i, type: "custom", label: "Interlude", confidence: "high" },
  { pattern: /^(outro|ending|coda)$/i, type: "outro", label: "Outro", confidence: "high" },
  { pattern: /^(tag|break)$/i, type: "tag", label: "Tag", confidence: "high" },
];

const TELUGU_HEADINGS: { pattern: RegExp; type: DetectedSection["type"]; label: string; confidence: SectionConfidence }[] = [
  { pattern: /^(చరణం)$/u, type: "verse", label: "Charanam", confidence: "high" },
  { pattern: /^(పల్లవి)$/u, type: "chorus", label: "Pallavi", confidence: "high" },
  { pattern: /^(వంతెన)$/u, type: "bridge", label: "Vantena", confidence: "high" },
  { pattern: /^(ముగింపు)$/u, type: "outro", label: "Mugimpu", confidence: "high" },
];

const ROMANIZED_HEADINGS: { pattern: RegExp; type: DetectedSection["type"]; label: string; confidence: SectionConfidence }[] = [
  { pattern: /^(pallavi)$/i, type: "chorus", label: "Pallavi", confidence: "high" },
  { pattern: /^(charanam)$/i, type: "verse", label: "Charanam", confidence: "high" },
  { pattern: /^(vantena)$/i, type: "bridge", label: "Vantena", confidence: "high" },
  { pattern: /^(mugimpu)$/i, type: "outro", label: "Mugimpu", confidence: "high" },
];

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

function normalizeHeadingText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[\s-]/g, "")
    .replace(/^(verse|v)/, "verse")
    .replace(/^(pre\s*-?\s*chorus|pre\s+chorus|prechorus)/, "pre-chorus")
    .replace(/^(chorus|refrain)/, "chorus")
    .replace(/^(bridge)/, "bridge")
    .replace(/^(intro)/, "intro")
    .replace(/^(interlude)/, "interlude")
    .replace(/^(outro|ending|coda)/, "outro")
    .replace(/^(tag|break)/, "tag");
}

export function detectLanguage(text: string): DetectedLanguage {
  const trimmed = text.trim();
  if (!trimmed) return "english";

  const hasTelugu = TELUGU_REGEX.test(trimmed);
  const words = trimmed.split(/\s+/).filter(Boolean);
  const latinWords = words.filter((w) => !TELUGU_REGEX.test(w));

  if (!hasTelugu && latinWords.length === 0) {
    return "english";
  }

  if (hasTelugu && latinWords.length > 0) {
    return "mixed";
  }

  if (!hasTelugu && latinWords.length > 0) {
    const romanizedCount = latinWords.filter((w) =>
      ROMANIZED_PATTERNS.some((p) => p.test(w))
    ).length;
    const ratio = romanizedCount / latinWords.length;

    if (ratio > 0.25) {
      return "romanized-telugu";
    }

    return "english";
  }

  return "telugu";
}

export function normalizeText(raw: string): string {
  const lines = raw.split(/\r?\n/);
  const cleaned: string[] = [];
  let previousEmpty = false;

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed === "") {
      if (!previousEmpty && cleaned.length > 0) {
        cleaned.push("");
        previousEmpty = true;
      }
      continue;
    }

    cleaned.push(trimmed);
    previousEmpty = false;
  }

  while (cleaned.length > 0 && cleaned[cleaned.length - 1] === "") {
    cleaned.pop();
  }

  return cleaned.join("\n");
}

export function cleanDuplicateLines(text: string): string {
  const lines = text.split("\n");
  const cleaned: string[] = [];
  let lastContent = "";

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed === "" || trimmed.toLowerCase() !== lastContent.toLowerCase()) {
      cleaned.push(line);
      if (trimmed !== "") lastContent = trimmed;
    }
  }

  return cleaned.join("\n");
}

function findHeadingMatch(trimmed: string): { type: DetectedSection["type"]; label: string; confidence: SectionConfidence } | null {
  const exactMatch = SECTION_HEADINGS.find(({ pattern }) => pattern.test(trimmed));
  if (exactMatch) {
    return { type: exactMatch.type, label: exactMatch.label, confidence: exactMatch.confidence };
  }

  const teluguMatch = TELUGU_HEADINGS.find(({ pattern }) => pattern.test(trimmed));
  if (teluguMatch) {
    return { type: teluguMatch.type, label: teluguMatch.label, confidence: teluguMatch.confidence };
  }

  const romanizedMatch = ROMANIZED_HEADINGS.find(({ pattern }) => pattern.test(trimmed));
  if (romanizedMatch) {
    return { type: romanizedMatch.type, label: romanizedMatch.label, confidence: romanizedMatch.confidence };
  }

  const normalized = normalizeHeadingText(trimmed);
  if (normalized !== trimmed.toLowerCase().replace(/[\s-]/g, "")) {
    const normalizedMatch = SECTION_HEADINGS.find(({ pattern }) => {
      const basePattern = pattern.source.replace(/^\^/, "").replace(/\$$/, "");
      return normalized === basePattern || normalized.startsWith(basePattern);
    });
    if (normalizedMatch) {
      return { type: normalizedMatch.type, label: normalizedMatch.label, confidence: "medium" };
    }
  }

  const customHeading = trimmed.match(/^([A-Za-z][A-Za-z0-9\- ]*)$/i);
  if (
    customHeading &&
    customHeading[1].length <= 24 &&
    (customHeading[1].includes(" ") ? customHeading[1].split(/\s+/).length <= 2 : true)
  ) {
    return { type: "custom", label: customHeading[1].trim(), confidence: "medium" };
  }

  return null;
}

function findRepeatedChorus(blocks: string[][]): { startIndex: number; length: number; confidence: SectionConfidence } | null {
  const textBlocks = blocks.map((b) => b.join("\n").trim()).filter((b) => b.length > 0);

  for (let length = 1; length <= Math.floor(textBlocks.length / 2); length++) {
    for (let start = 0; start <= textBlocks.length - length * 2; start++) {
      const candidate = textBlocks.slice(start, start + length).join("\n");
      const repeated = textBlocks.slice(start + length, start + length * 2).join("\n");

      if (candidate === repeated && candidate.length > 10) {
        const occurrences = textBlocks.filter((b, i) => {
          const idx = textBlocks.indexOf(b);
          return idx >= start && idx < start + length * 2 && (idx - start) % length === 0;
        }).length;

        if (occurrences >= 2) {
          return { startIndex: start, length, confidence: occurrences >= 3 ? "high" : "medium" };
        }
      }
    }
  }

  return null;
}

export function detectSections(raw: string): DetectedSection[] {
  const lines = raw.split("\n");
  const sections: DetectedSection[] = [];
  let currentSection: DetectedSection | null = null;
  let sectionOrder = 0;

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed === "") {
      if (currentSection) {
        currentSection.lines.push({
          id: generateId(),
          text: "",
          language: "english",
        });
      }
      continue;
    }

    if (/^పాట\s*[:\s]\s*\d+\s*$/u.test(trimmed)) {
      continue;
    }

    if (/^(?:Song\s+(?:No\.?\s*)?\d+|No\.\s*\d+)\s*$/i.test(trimmed)) {
      continue;
    }

    const matchedHeading = findHeadingMatch(trimmed);

    if (matchedHeading) {
      if (currentSection) {
        sections.push(currentSection);
      }

      currentSection = {
        id: generateId(),
        type: matchedHeading.type,
        label: matchedHeading.label,
        lines: [],
        order: sectionOrder++,
        confidence: matchedHeading.confidence,
      };
      continue;
    }

    if (!currentSection) {
      currentSection = {
        id: generateId(),
        type: "custom",
        label: "Section",
        lines: [],
        order: sectionOrder++,
        confidence: "low",
      };
    }

    currentSection.lines.push({
      id: generateId(),
      text: trimmed,
      language: detectLanguage(trimmed),
    });
  }

  if (currentSection) {
    sections.push(currentSection);
  }

  if (sections.length === 0 && raw.trim().length > 0) {
    const allLines = raw
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .map((text) => ({
        id: generateId(),
        text,
        language: detectLanguage(text) as DetectedLanguage,
      }));

    if (allLines.length > 0) {
      sections.push({
        id: generateId(),
        type: "custom",
        label: "Section",
        lines: allLines,
        order: 0,
        confidence: "low",
      });
    }
  }

  const nonEmptySections = sections.filter((s) => s.lines.some((l) => l.text.trim() !== ""));

  if (nonEmptySections.length <= 1) {
    return nonEmptySections.map((s) => ({ ...s, confidence: s.confidence === "medium" ? "low" : s.confidence }));
  }

  const lyricBlocks: string[][] = [];
  let currentBlock: string[] = [];

  for (const section of nonEmptySections) {
    for (const line of section.lines) {
      if (line.text.trim() === "") {
        if (currentBlock.length > 0) {
          lyricBlocks.push(currentBlock);
          currentBlock = [];
        }
      } else {
        currentBlock.push(line.text.trim());
      }
    }
  }

  if (currentBlock.length > 0) {
    lyricBlocks.push(currentBlock);
  }

  const repeatedChorus = findRepeatedChorus(lyricBlocks);

  if (repeatedChorus && nonEmptySections.length >= 3) {
    const startBlockIndex = repeatedChorus.startIndex;
    const endBlockIndex = startBlockIndex + repeatedChorus.length - 1;

    let lineCursor = 0;
    for (const section of nonEmptySections) {
      const sectionStartLine = lineCursor;
      const sectionEndLine = lineCursor + section.lines.length;

      const blockStart = lyricBlocks.findIndex((_, i) => {
        const blockLineStart = lyricBlocks.slice(0, i).reduce((sum, b) => sum + b.length + 1, 0);
        return blockLineStart >= sectionStartLine;
      });

      if (blockStart >= startBlockIndex && blockStart <= endBlockIndex && section.type === "custom") {
        section.type = "chorus";
        section.label = "Chorus";
        section.confidence = repeatedChorus.confidence;
      }

      lineCursor = sectionEndLine;
    }
  }

  return nonEmptySections;
}

export function groupLinesIntoSections(
  raw: string,
  mode: "auto" | "verse" | "chorus" | "custom" = "auto"
): DetectedSection[] {
  if (mode !== "auto") {
    const lines = raw
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .map((text) => ({
        id: generateId(),
        text,
        language: detectLanguage(text) as DetectedLanguage,
      }));

    return [
      {
        id: generateId(),
        type: mode === "custom" ? "custom" : (mode as DetectedSection["type"]),
        label: mode === "custom" ? "Custom" : mode.charAt(0).toUpperCase() + mode.slice(1),
        lines,
        order: 0,
        confidence: "low",
      },
    ];
  }

  return detectSections(raw);
}

export function generateSlides(
  sections: DetectedSection[],
  mode: "one-line" | "two-line" | "smart-fit" = "smart-fit",
  maxCharsPerLine = 48
): GeneratedSlide[] {
  const slides: GeneratedSlide[] = [];
  let globalSlideNumber = 1;

  const MAX_CHARS_TWO_LINE = maxCharsPerLine * 2;
  const MAX_WORDS_TWO_LINE = 12;
  const MAX_CHARS_ONE_LINE = maxCharsPerLine;
  const MAX_WORDS_ONE_LINE = 8;
  const TELUGU_CHAR_WIDTH_FACTOR = 0.85;

  function estimateRenderWidth(text: string): number {
    const hasTelugu = /[\u0C00-\u0C7F]/.test(text);
    const factor = hasTelugu ? TELUGU_CHAR_WIDTH_FACTOR : 1;
    return text.length * factor;
  }

  function fitsTwoLines(line1: string, line2: string): boolean {
    const combined = line1 + " " + line2;
    const charWidth = estimateRenderWidth(combined);
    const words = combined.split(/\s+/).filter(Boolean).length;

    if (charWidth > MAX_CHARS_TWO_LINE) return false;
    if (words > MAX_WORDS_TWO_LINE) return false;
    if (line1.length > MAX_CHARS_ONE_LINE && line2.length > MAX_CHARS_ONE_LINE) return false;

    return true;
  }

  for (const section of sections) {
    const nonEmptyLines = section.lines.filter((l) => l.text.trim() !== "");

    if (nonEmptyLines.length === 0) continue;

    let currentLines: LyricLine[] = [];

    const pushSlide = () => {
      if (currentLines.length === 0) return;

      const primary = currentLines[0].text;
      const secondary = currentLines.length > 1 ? currentLines[1].text : undefined;

      slides.push({
        id: generateId(),
        sectionOrder: section.order,
        slideNumber: globalSlideNumber++,
        primaryText: primary,
        secondaryText: secondary,
        lineIds: currentLines.map((l) => l.id),
      });

      currentLines = [];
    };

    for (let i = 0; i < nonEmptyLines.length; i++) {
      const line = nonEmptyLines[i];

      if (mode === "one-line") {
        currentLines = [line];
        pushSlide();
        continue;
      }

      if (mode === "two-line") {
        currentLines.push(line);

        if (currentLines.length >= 2) {
          pushSlide();
        }
        continue;
      }

      if (mode === "smart-fit") {
        const nextLine = nonEmptyLines[i + 1];
        const isCurrentLong = line.text.length > MAX_CHARS_ONE_LINE;
        const isNextLong = nextLine ? nextLine.text.length > MAX_CHARS_ONE_LINE : false;

        if (isCurrentLong) {
          if (currentLines.length > 0) {
            pushSlide();
          }
          currentLines = [line];
          pushSlide();
          continue;
        }

        if (nextLine && !isNextLong && fitsTwoLines(line.text, nextLine.text)) {
          currentLines.push(line);
          if (currentLines.length >= 2) {
            pushSlide();
          }
          continue;
        }

        currentLines.push(line);
        if (currentLines.length >= 2) {
          pushSlide();
        }
      }
    }

    if (currentLines.length > 0) {
      pushSlide();
    }
  }

  return slides;
}

export function processRawLyrics(raw: string, mode: "one-line" | "two-line" | "smart-fit" = "smart-fit") {
  const normalized = normalizeText(raw);
  const cleaned = cleanDuplicateLines(normalized);
  const sections = detectSections(cleaned);
  const language = detectLanguage(cleaned);
  const slides = generateSlides(sections, mode);

  return {
    raw,
    normalized: cleaned,
    language,
    sections,
    slides,
  };
}

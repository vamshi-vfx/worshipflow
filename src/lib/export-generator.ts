// WorshipFlow Export Engine: PowerPoint (.pptx), PDF & TXT Exporter
import pptxgen from "pptxgenjs";
import { jsPDF } from "jspdf";
import type { Song, Theme } from "@/types";
import { generateSlides } from "@/lib/lyrics-parser";

/**
 * Generate and download a PowerPoint presentation (.pptx)
 */
export async function exportSongToPowerPoint(song: Song, theme?: Theme): Promise<void> {
  const pptx = new pptxgen();

  // Set widescreen 16:9 layout
  pptx.layout = "LAYOUT_16x9";
  pptx.title = song.title;
  pptx.author = song.artist || song.author || "WorshipFlow";

  const isDark = !theme || theme.background.type === "solid" ? (theme?.background.value !== "#FFFFFF") : true;
  const bgColor = theme?.background.type === "solid" && theme.background.value.startsWith("#")
    ? theme.background.value.replace("#", "")
    : "0A0A0A";
  const textColor = isDark ? "FFFFFF" : "111111";
  const goldColor = "D4AF37";
  const mutedColor = isDark ? "A1A1AA" : "71717A";

  // Slide 1: Title Slide
  const titleSlide = pptx.addSlide();
  titleSlide.background = { color: bgColor };

  titleSlide.addText(song.title, {
    x: "10%",
    y: "30%",
    w: "80%",
    h: 1.5,
    fontSize: 44,
    bold: true,
    color: goldColor,
    align: "center",
    valign: "middle",
  });

  if (song.romanizedTitle && song.romanizedTitle !== song.title) {
    titleSlide.addText(song.romanizedTitle, {
      x: "10%",
      y: "45%",
      w: "80%",
      h: 0.8,
      fontSize: 24,
      italic: true,
      color: textColor,
      align: "center",
      valign: "middle",
    });
  }

  const metaText = [
    song.artist ? `Artist: ${song.artist}` : "",
    song.category ? `Category: ${song.category.toUpperCase()}` : "",
    song.key ? `Key: ${song.key}` : "",
  ].filter(Boolean).join("  •  ");

  if (metaText) {
    titleSlide.addText(metaText, {
      x: "10%",
      y: "65%",
      w: "80%",
      h: 0.6,
      fontSize: 14,
      color: mutedColor,
      align: "center",
      valign: "middle",
    });
  }

  // Generate 1-2 line slides from song sections
  const slides = generateSlides(
    song.sections.map((s, idx) => ({
      id: s.id,
      type: s.type,
      label: s.label,
      lines: s.lines.map((l) => ({
        id: l.id,
        text: l.primaryText,
        language: (l.language === "telugu" ? "telugu" : l.language === "hindi" ? "mixed" : "english") as any,
      })),
      order: idx,
      confidence: "high" as const,
    })),
    "two-line",
    50
  );

  slides.forEach((slideItem, index) => {
    const slide = pptx.addSlide();
    slide.background = { color: bgColor };

    // Slide Counter
    slide.addText(`${index + 1} / ${slides.length}`, {
      x: "85%",
      y: "5%",
      w: "10%",
      h: 0.4,
      fontSize: 10,
      color: mutedColor,
      align: "right",
    });

    const linesContent: string[] = [slideItem.primaryText];
    if (slideItem.secondaryText) {
      linesContent.push(slideItem.secondaryText);
    }

    slide.addText(linesContent.join("\n\n"), {
      x: "8%",
      y: "20%",
      w: "84%",
      h: "60%",
      fontSize: 36,
      bold: true,
      color: textColor,
      align: "center",
      valign: "middle",
      lineSpacingMultiple: 1.3,
    });
  });

  const filename = `${song.slug || song.title.toLowerCase().replace(/[^a-z0-9]/g, "-")}-lyrics.pptx`;
  await pptx.writeFile({ fileName: filename });
}

/**
 * Generate and download a PDF lyrics document
 */
export function exportSongToPDF(song: Song): void {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 20;

  // Title
  doc.setFontSize(22);
  doc.setTextColor(212, 175, 55); // Gold
  doc.text(song.title, pageWidth / 2, y, { align: "center" });
  y += 8;

  if (song.romanizedTitle && song.romanizedTitle !== song.title) {
    doc.setFontSize(13);
    doc.setTextColor(100, 100, 100);
    doc.text(song.romanizedTitle, pageWidth / 2, y, { align: "center" });
    y += 6;
  }

  // Metadata
  const meta: string[] = [];
  if (song.artist) meta.push(`Artist: ${song.artist}`);
  if (song.category) meta.push(`Category: ${song.category}`);
  if (song.key) meta.push(`Key: ${song.key}`);
  if (song.tempo) meta.push(`Tempo: ${song.tempo} BPM`);

  if (meta.length > 0) {
    doc.setFontSize(10);
    doc.setTextColor(120, 120, 120);
    doc.text(meta.join("  |  "), pageWidth / 2, y, { align: "center" });
    y += 10;
  }

  // Divider
  doc.setDrawColor(212, 175, 55);
  doc.setLineWidth(0.5);
  doc.line(20, y, pageWidth - 20, y);
  y += 10;

  // Sections
  doc.setFontSize(12);
  doc.setTextColor(30, 30, 30);

  for (const section of song.sections || []) {
    if (y > 260) {
      doc.addPage();
      y = 20;
    }

    doc.setFontSize(11);
    doc.setTextColor(180, 140, 20);
    doc.text(section.label.toUpperCase(), 20, y);
    y += 6;

    doc.setFontSize(11);
    doc.setTextColor(20, 20, 20);

    for (const line of section.lines || []) {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      doc.text(line.primaryText, 25, y);
      y += 5;
      if (line.secondaryText) {
        doc.setFontSize(9);
        doc.setTextColor(120, 120, 120);
        doc.text(line.secondaryText, 25, y);
        doc.setFontSize(11);
        doc.setTextColor(20, 20, 20);
        y += 5;
      }
    }
    y += 5;
  }

  // Footer / Copyright
  const footerText = song.copyrightNotice || "WorshipFlow • Christian Worship Lyrics Platform";
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text(footerText, pageWidth / 2, 285, { align: "center" });

  const filename = `${song.slug || song.title.toLowerCase().replace(/[^a-z0-9]/g, "-")}-lyrics.pdf`;
  doc.save(filename);
}

/**
 * Generate and download Plain Text (.txt) lyrics
 */
export function exportSongToTXT(song: Song): void {
  let content = `${song.title.toUpperCase()}\n`;
  if (song.romanizedTitle) content += `${song.romanizedTitle}\n`;
  content += "=".repeat(40) + "\n";
  if (song.artist) content += `Artist: ${song.artist}\n`;
  if (song.category) content += `Category: ${song.category}\n`;
  if (song.key) content += `Key: ${song.key}\n`;
  content += "\n";

  for (const section of song.sections || []) {
    content += `[${section.label}]\n`;
    for (const line of section.lines || []) {
      content += `${line.primaryText}\n`;
      if (line.secondaryText) {
        content += `${line.secondaryText}\n`;
      }
    }
    content += "\n";
  }

  if (song.copyrightNotice) {
    content += `\nCopyright: ${song.copyrightNotice}\n`;
  }

  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${song.slug || song.title.toLowerCase().replace(/[^a-z0-9]/g, "-")}-lyrics.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

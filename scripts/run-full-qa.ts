import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import { processRawLyrics } from "../src/lib/lyrics-parser";
import { parseRawPastedSongs, parseCSVContent, parseJSONContent } from "../src/lib/content-importer";
import { extractSongInfo } from "../src/lib/title-extractor";
import { findDuplicateInLibrary } from "../src/lib/duplicate-detector";
import {
  ALL_BIBLE_BOOKS,
  CORE_TELUGU_SCRIPTURES,
  queryBibleScriptures,
  parseBibleJson,
  parseBibleCsv,
} from "../src/lib/telugu-bible-data";

// 1. Load .env.local
const envPath = path.resolve(process.cwd(), ".env.local");
let env: Record<string, string> = {};
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, "utf-8");
  content.split("\n").forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
      const idx = trimmed.indexOf("=");
      const k = trimmed.slice(0, idx).trim();
      const v = trimmed.slice(idx + 1).trim();
      env[k] = v;
    }
  });
}

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

console.log("========================================");
console.log("WORSHIPFLOW COMPLETE QA & TITLE TEST SUITE");
console.log("========================================");

let passed = 0;
let failed = 0;

function assert(name: string, condition: boolean, extra: string = "") {
  if (condition) {
    console.log(`[PASS] ${name} ${extra ? "— " + extra : ""}`);
    passed++;
  } else {
    console.error(`[FAIL] ${name} ${extra ? "— " + extra : ""}`);
    failed++;
  }
}

async function runSuite() {
  // TEST 1: ENVIRONMENT & CREDENTIALS
  assert("Supabase URL Configured", !!supabaseUrl && supabaseUrl.startsWith("https://"));
  assert("Supabase Anon Key Configured", !!supabaseAnonKey && supabaseAnonKey.length > 20);

  // Check client bundle files for leaked service role keys
  const clientFiles = ["src/lib/supabase.ts", "src/services/database.ts", "src/app/providers.tsx"];
  let hasServiceRoleLeaked = false;
  clientFiles.forEach((file) => {
    const filePath = path.resolve(process.cwd(), file);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, "utf-8");
      if (content.includes("service_role") || content.includes("SUPABASE_SERVICE_ROLE_KEY")) {
        hasServiceRoleLeaked = true;
      }
    }
  });
  assert("Security: No Service-Role Key in Frontend", !hasServiceRoleLeaked);

  // TEST 2: SONG TITLE & NUMBER EXTRACTION ACCURACY
  const test1 = extractSongInfo(`పాట:98\nఅంకితం నీకే దేవా\nనా ప్రాణేశ్వరుడా`);
  assert(
    "Title Extractor: Multi-line Telugu Song Number (పాట:98 -> Real Title)",
    test1.songNumber === 98 && test1.title === "అంకితం నీకే దేవా",
    `Extracted Title: "${test1.title}", Song #: ${test1.songNumber}`
  );

  const test2 = extractSongInfo(`పాట: 1 - మహిమ నీకే ప్రభువా\nఘనత నీకే యేసయ్యా`);
  assert(
    "Title Extractor: Same-line Telugu Song Number & Title",
    test2.songNumber === 1 && test2.title === "మహిమ నీకే ప్రభువా",
    `Extracted Title: "${test2.title}", Song #: ${test2.songNumber}`
  );

  const test3 = extractSongInfo(`Song 42\nAmazing Grace\nHow sweet the sound`);
  assert(
    "Title Extractor: English Song Number (Song 42 -> Real Title)",
    test3.songNumber === 42 && test3.title === "Amazing Grace",
    `Extracted Title: "${test3.title}", Song #: ${test3.songNumber}`
  );

  const test4 = extractSongInfo(`12. Neeve Naa Sangeetham\nNeeve naa aashrayam`);
  assert(
    "Title Extractor: Numbered Prefix (12. Title)",
    test4.songNumber === 12 && test4.title === "Neeve Naa Sangeetham",
    `Extracted Title: "${test4.title}", Song #: ${test4.songNumber}`
  );

  const test5 = extractSongInfo(`పాట: 99\n[పల్లవి]\nదేవుని స్తుతించుడి\nఆయన పరిశుద్ధ స్థలమున`);
  assert(
    "Title Extractor: Skip Section Heading to find Real Title",
    test5.songNumber === 99 && test5.title === "దేవుని స్తుతించుడి",
    `Extracted Title: "${test5.title}"`
  );

  // TEST 3: MULTI-SONG BULK PARSING
  const multiSongTxt = `పాట: 1
మహిమ నీకే ప్రభువా
ఘనత నీకే యేసయ్యా
[Chorus]
యేసయ్యా యేసయ్యా
నిన్నే ఆరాధింతును

---
పాట: 98
అంకితం నీకే దేవా
పరిశుద్ధుడా పరమ తండ్రి
నీ నామము స్తుతించెదము

Song 3
Amazing grace how sweet the sound
That saved a wretch like me`;

  const parsedBatch = parseRawPastedSongs(multiSongTxt, []);
  assert(
    "Bulk Song Import: Real Titles on every song (No 'పాట:98' titles)",
    parsedBatch.length === 3 &&
      parsedBatch[0].title === "మహిమ నీకే ప్రభువా" &&
      parsedBatch[1].title === "అంకితం నీకే దేవా" &&
      parsedBatch[2].title === "Amazing grace how sweet the sound",
    `Titles: ${parsedBatch.map((s) => s.title).join(" | ")}`
  );

  // TEST 4: SLIDE GENERATION
  const testLyrics = `మహిమ నీకే ప్రభువా\nఘనత నీకే యేసయ్యా\nనీ కృప నన్ను కాపాడెను\nనా బలం నీవే దేవా`;
  const smartFitRes = processRawLyrics(testLyrics, "smart-fit");
  const oneLineRes = processRawLyrics(testLyrics, "one-line");
  const twoLineRes = processRawLyrics(testLyrics, "two-line");

  assert("Slide Generation: Smart Fit", !!smartFitRes && smartFitRes.slides.length > 0);
  assert("Slide Generation: One Line Per Slide", oneLineRes.slides.length === 4);
  assert("Slide Generation: Two Lines Per Slide", twoLineRes.slides.length === 2);

  // TEST 5: CSV & JSON PARSERS
  const testCSV = `title,lyrics,language,artist\n"Neeve Naa Sangeetham","Neeve naa sangeetham\\nNeeve naa aashrayam",telugu,"Worship"\n"Great Are You Lord","You give life You are love",english,"All Sons & Daughters"`;
  const csvSongs = parseCSVContent(testCSV, []);
  assert("CSV Parser: Header Mapping & Song Count", csvSongs.length === 2 && csvSongs[0].title === "Neeve Naa Sangeetham");

  const testJSON = JSON.stringify([
    { title: "Krupa Krupa", lyrics: "Krupa krupa nee krupa", language: "telugu" },
    { title: "How Great Is Our God", lyrics: "The splendor of a King", language: "english" },
  ]);
  const jsonSongs = parseJSONContent(testJSON, []);
  assert("JSON Parser: Valid JSON Import", jsonSongs.length === 2 && jsonSongs[0].title === "Krupa Krupa");

  // TEST 6: DUPLICATE DETECTION
  const existingList: any[] = [{ id: "1", title: "Neeve Naa Sangeetham", lyrics: "Neeve naa sangeetham", language: "telugu" }];
  const dupCheck = findDuplicateInLibrary({ title: "Neeve Naa Sangeetham", lyrics: "Neeve naa sangeetham" }, existingList);
  assert("Duplicate Detection: Exact Match Detected", !!dupCheck && dupCheck.score === 1.0);

  const nonDupCheck = findDuplicateInLibrary({ title: "Completely Unique Song Title 99", lyrics: "Different lyrics here" }, existingList);
  assert("Duplicate Detection: Unique Song No False Positive", dupCheck !== null && nonDupCheck === null);

  // TEST 7: TELUGU BIBLE ENGINE
  assert("Bible Data: 66 Books Available", ALL_BIBLE_BOOKS.length === 66);
  assert("Bible Data: Core Scriptures Available", CORE_TELUGU_SCRIPTURES.length > 10);

  const john316 = queryBibleScriptures("John 3:16");
  assert(
    "Bible Search: English Reference 'John 3:16'",
    john316.length === 1 && john316[0].verse === 16 && john316[0].textTe.includes("దేవుడు లోకమును ఎంతో ప్రేమించెను")
  );

  const teluguJohn = queryBibleScriptures("యోహాను 3:16");
  assert(
    "Bible Search: Telugu Reference 'యోహాను 3:16'",
    teluguJohn.length === 1 && teluguJohn[0].verse === 16
  );

  const psalm23 = queryBibleScriptures("Psalms 23");
  assert(
    "Bible Search: Full Chapter 'Psalms 23' (All 6 Verses)",
    psalm23.length === 6 && psalm23[0].textTe.includes("యెహోవా నా కాపరి")
  );

  const bibleJsonTest = parseBibleJson(
    JSON.stringify([
      { book: "John", bookTe: "యోహాను", chapter: 1, verse: 1, textTe: "ఆదియందు వాక్యము ఉండెను", textEn: "In the beginning was the Word" },
    ])
  );
  assert("Bible Import: JSON Parser", !bibleJsonTest.error && bibleJsonTest.verses.length === 1);

  const bibleCsvTest = parseBibleCsv(`book,chapter,verse,telugu_text,english_text\n"John",1,1,"ఆదియందు వాక్యము ఉండెను","In the beginning was the Word"`);
  assert("Bible Import: CSV Parser", !bibleCsvTest.error && bibleCsvTest.verses.length === 1);

  // TEST 8: SUPABASE DATABASE CONNECTION & AUXILIARY TABLES READ
  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  try {
    const { data: themes, error: themeError } = await supabase.from("themes").select("id, name").limit(1);
    assert("Themes Module: Database Read", !themeError, `Found ${themes?.length || 0} themes`);

    const { data: services, error: serviceError } = await supabase.from("services").select("id, name").limit(1);
    assert("Services Module: Database Read", !serviceError, `Found ${services?.length || 0} services`);

    const { data: announcements, error: annError } = await supabase.from("announcements").select("id, title").limit(1);
    assert("Announcements Module: Database Read", !annError, `Found ${announcements?.length || 0} announcements`);

    const { data: bibles, error: bibleError } = await supabase.from("bible_presentations").select("id, book").limit(1);
    assert("Bible Module: Database Read", !bibleError, `Found ${bibles?.length || 0} bible presentations`);
  } catch (e: any) {
    assert("Auxiliary Tables Read", false, e.message);
  }

  console.log("========================================");
  console.log(`QA SUITE FINISHED: ${passed} PASSED, ${failed} FAILED`);
  console.log("========================================");
}

runSuite();

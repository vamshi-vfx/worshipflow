import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import { processRawLyrics } from "../src/lib/lyrics-parser";
import { parseCSVContent, parseJSONContent } from "../src/lib/content-importer";
import { findDuplicateInLibrary } from "../src/lib/duplicate-detector";

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
console.log("WORSHIPFLOW COMPLETE QA TEST SUITE");
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

  // TEST 2: TXT PARSER & TELUGU DELIMITERS
  const multiSongTxt = `పాట: 1
మహిమ నీకే ప్రభువా
ఘనత నీకే యేసయ్యా
[Chorus]
యేసయ్యా యేసయ్యా
నిన్నే ఆరాధింతును

---
పాట: 2
పరిశుద్ధుడా పరమ తండ్రి
నీ నామము స్తుతించెదము
హల్లెలూయా ఆమెన్

Song 3
Amazing grace how sweet the sound
That saved a wretch like me`;

  const songBlocks = multiSongTxt
    .split(/(?:\n\s*---\s*\n|\n?(?=పాట\s*[:\s]\s*\d+)|\n?(?=Song\s+\d+))/gmi)
    .map((s) => s.trim())
    .filter((s) => s.length > 10);

  assert("Telugu Songbook Delimiter Recognition (పాట: 1, ---, Song N)", songBlocks.length >= 3, `Detected ${songBlocks.length} songs`);

  // TEST 3: SLIDE GENERATION
  const testLyrics = `మహిమ నీకే ప్రభువా\nఘనత నీకే యేసయ్యా\nనీ కృప నన్ను కాపాడెను\nనా బలం నీవే దేవా`;
  const smartFitRes = processRawLyrics(testLyrics, "smart-fit");
  const oneLineRes = processRawLyrics(testLyrics, "one-line");
  const twoLineRes = processRawLyrics(testLyrics, "two-line");

  assert("Slide Generation: Smart Fit", !!smartFitRes && smartFitRes.slides.length > 0);
  assert("Slide Generation: One Line Per Slide", oneLineRes.slides.length === 4);
  assert("Slide Generation: Two Lines Per Slide", twoLineRes.slides.length === 2);

  // TEST 4: CSV PARSER
  const testCSV = `title,lyrics,language,artist\n"Neeve Naa Sangeetham","Neeve naa sangeetham\\nNeeve naa aashrayam",telugu,"Worship"\n"Great Are You Lord","You give life You are love",english,"All Sons & Daughters"`;
  const csvSongs = parseCSVContent(testCSV, []);
  assert("CSV Parser: Header Mapping & Song Count", csvSongs.length === 2 && csvSongs[0].title === "Neeve Naa Sangeetham");

  // TEST 5: JSON PARSER
  const testJSON = JSON.stringify([
    { title: "Krupa Krupa", lyrics: "Krupa krupa nee krupa", language: "telugu" },
    { title: "How Great Is Our God", lyrics: "The splendor of a King", language: "english" }
  ]);
  const jsonSongs = parseJSONContent(testJSON, []);
  assert("JSON Parser: Valid JSON Import", jsonSongs.length === 2 && jsonSongs[0].title === "Krupa Krupa");

  // TEST 6: DUPLICATE DETECTION
  const existingList: any[] = [{ id: "1", title: "Neeve Naa Sangeetham", lyrics: "Neeve naa sangeetham", language: "telugu" }];
  const dupCheck = findDuplicateInLibrary({ title: "Neeve Naa Sangeetham", lyrics: "Neeve naa sangeetham" }, existingList);
  assert("Duplicate Detection: Exact Match Detected", !!dupCheck && dupCheck.score === 1.0);

  const nonDupCheck = findDuplicateInLibrary({ title: "Completely Unique Song Title 99", lyrics: "Different lyrics here" }, existingList);
  assert("Duplicate Detection: Unique Song No False Positive", dupCheck !== null && nonDupCheck === null);

  // TEST 7: SUPABASE DATABASE CONNECTION & AUXILIARY TABLES READ
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

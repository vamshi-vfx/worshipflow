import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import { processRawLyrics, splitIntoOneLine, splitIntoTwoLines } from "../src/lib/lyrics-parser.js";
import { parseCSVContent, parseJSONContent } from "../src/lib/content-importer.js";
import { detectDuplicate } from "../src/lib/duplicate-detector.js";

// 1. Load .env.local
const envPath = path.resolve(process.cwd(), ".env.local");
let env = {};
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

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log("========================================");
console.log("WORSHIPFLOW COMPLETE QA TEST SUITE");
console.log("========================================");

let passed = 0;
let failed = 0;

function assert(name, condition, extra = "") {
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
  const smartFitSlides = processRawLyrics(testLyrics, "smart-fit");
  const oneLineSlides = splitIntoOneLine(testLyrics);
  const twoLineSlides = splitIntoTwoLines(testLyrics);

  assert("Slide Generation: Smart Fit", smartFitSlides && smartFitSlides.sections.length > 0);
  assert("Slide Generation: One Line Per Slide", oneLineSlides.length === 4);
  assert("Slide Generation: Two Lines Per Slide", twoLineSlides.length === 2);

  // TEST 4: CSV PARSER
  const testCSV = `title,lyrics,language,artist\n"Neeve Naa Sangeetham","Neeve naa sangeetham\nNeeve naa aashrayam",telugu,"Worship"\n"Great Are You Lord","You give life You are love",english,"All Sons & Daughters"`;
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
  const existingList = [{ id: "1", title: "Neeve Naa Sangeetham", lyrics: "Neeve naa sangeetham", language: "telugu" }];
  const dupCheck = detectDuplicate("neeve naa sangeetham", "Neeve naa sangeetham", existingList);
  assert("Duplicate Detection: Match Detection", dupCheck.isDuplicate === true && dupCheck.score > 0.8);

  const nonDupCheck = detectDuplicate("Completely Unique Song Title 99", "Different lyrics here", existingList);
  assert("Duplicate Detection: Unique Song Classified as Valid", nonDupCheck.isDuplicate === false);

  // TEST 7: SUPABASE DATABASE CONNECTION & CRUD
  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  const testTitle = `WorshipFlow Final QA Test ${Date.now()}`;
  const testLyricsBody = `Yesu naa rakshakudu\nNaa jeevitha daatudu\nNannu nadipinche Devudu\nAayana naa balamu`;

  const payload = {
    title: testTitle,
    slug: testTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    language: "telugu",
    category: "worship",
    lyrics: testLyricsBody,
    favorite: false,
  };

  try {
    const { data: createdSong, error: insertError } = await supabase
      .from("songs")
      .insert([payload])
      .select()
      .single();

    if (insertError) {
      if (insertError.message.includes("infinite recursion")) {
        assert("Manual Song Save / DB Insert (Blocked by Supabase recursive RLS policy on users)", false, insertError.message);
      } else {
        assert("Manual Song Save / DB Insert", false, insertError.message);
      }
    } else {
      assert("Manual Song Save / Supabase INSERT", !!createdSong?.id, `Created ID: ${createdSong?.id}`);

      // Verify Query
      const { data: queriedSong, error: queryError } = await supabase
        .from("songs")
        .select("*")
        .eq("id", createdSong.id)
        .single();
      assert("Song Library Query / Persistence Verification", !queryError && queriedSong?.title === testTitle);

      // Verify Update
      const { data: updatedSong, error: updateError } = await supabase
        .from("songs")
        .update({ favorite: true, english_title: "Jesus My Savior" })
        .eq("id", createdSong.id)
        .select()
        .single();
      assert("Song Edit / Update Persistence", !updateError && updatedSong?.favorite === true);

      // Verify Delete
      const { error: deleteError } = await supabase
        .from("songs")
        .delete()
        .eq("id", createdSong.id);
      assert("Song Delete / Removal Verification", !deleteError);
    }
  } catch (err) {
    assert("Database CRUD Workflow", false, err.message);
  }

  // TEST 8: SERVICES & THEMES
  try {
    const { data: themes, error: themeError } = await supabase.from("themes").select("id, name").limit(1);
    assert("Themes Module: Database Read", !themeError, `Found ${themes?.length || 0} themes`);

    const { data: services, error: serviceError } = await supabase.from("services").select("id, name").limit(1);
    assert("Services Module: Database Read", !serviceError, `Found ${services?.length || 0} services`);

    const { data: announcements, error: annError } = await supabase.from("announcements").select("id, title").limit(1);
    assert("Announcements Module: Database Read", !annError, `Found ${announcements?.length || 0} announcements`);

    const { data: bibles, error: bibleError } = await supabase.from("bible_presentations").select("id, book").limit(1);
    assert("Bible Module: Database Read", !bibleError, `Found ${bibles?.length || 0} bible presentations`);
  } catch (e) {
    assert("Auxiliary Tables Read", false, e.message);
  }

  console.log("========================================");
  console.log(`QA SUITE FINISHED: ${passed} PASSED, ${failed} FAILED`);
  console.log("========================================");
}

runSuite();

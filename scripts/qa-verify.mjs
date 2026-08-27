import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

// Load .env.local
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
console.log("WORSHIPFLOW AUTOMATED QA SUITE");
console.log("========================================");

async function runTests() {
  let passed = 0;
  let failed = 0;

  function assert(name, condition, extra = "") {
    if (condition) {
      console.log(`[PASS] ${name} ${extra}`);
      passed++;
    } else {
      console.error(`[FAIL] ${name} ${extra}`);
      failed++;
    }
  }

  // 1. ENV CHECK
  assert("Supabase URL configured", !!supabaseUrl && supabaseUrl.startsWith("https://"));
  assert("Supabase Anon Key configured", !!supabaseAnonKey && supabaseAnonKey.length > 20);

  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  // 2. SUPABASE CONNECTION & TABLES CHECK
  try {
    const { data: songs, error: songErr } = await supabase.from("songs").select("id, title").limit(5);
    assert("Query songs table", !songErr, songErr ? songErr.message : `Found ${songs?.length} songs`);

    const { error: secErr } = await supabase.from("song_sections").select("id").limit(1);
    assert("Query song_sections table", !secErr, secErr?.message);

    const { error: lineErr } = await supabase.from("song_lines").select("id").limit(1);
    assert("Query song_lines table", !lineErr, lineErr?.message);

    const { error: srvErr } = await supabase.from("services").select("id").limit(1);
    assert("Query services table", !srvErr, srvErr?.message);

    const { error: themeErr } = await supabase.from("themes").select("id").limit(1);
    assert("Query themes table", !themeErr, themeErr?.message);

    const { error: jobErr } = await supabase.from("import_jobs").select("id").limit(1);
    assert("Query import_jobs table", !jobErr, jobErr?.message);

    const { error: itemErr } = await supabase.from("import_items").select("id").limit(1);
    assert("Query import_items table", !itemErr, itemErr?.message);
  } catch (e) {
    assert("Supabase Connection", false, e.message);
  }

  // 3. PARSER TESTS (Telugu Songbook & Multi-Song TXT)
  const teluguSongBook = `పాట: 1
మహిమ నీకే ప్రభువా
ఘనత నీకే యేసయ్యా
నీ కృప నన్ను కాపాడెను

[Chorus]
యేసయ్యా యేసయ్యా
నిన్నే ఆరాధింతును

పాట: 2
పరిశుద్ధుడా పరమ తండ్రి
నీ నామము స్తుతించెదము
హల్లెలూయా ఆమెన్`;

  // Delimiter test
  const isMultiSong =
    /\n\s*---\s*\n/.test(teluguSongBook) ||
    /\n?పాట\s*[:\s]\s*\d+\s*(\n|$)/mu.test(teluguSongBook) ||
    /\n(?:Song\s+(?:No\.?\s*)?\d+|No\.\s*\d+)\s*(\n|$)/im.test(teluguSongBook);

  assert("Telugu Songbook Delimiter Recognition", isMultiSong);

  // Split test
  const chunks = teluguSongBook
    .split(/(?:\n|^)(?=పాట\s*[:\s]\s*\d+)/u)
    .map((c) => c.trim())
    .filter(Boolean);

  assert("Telugu Songbook Splitting into individual songs", chunks.length === 2, `Split into ${chunks.length} songs`);

  // 4. DATABASE CRUD TEST
  const testTitle = `WORSHIPFLOW_QA_TEST_${Date.now()}`;
  const testPayload = {
    title: testTitle,
    slug: testTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    language: "telugu",
    category: "worship",
    lyrics: "మహిమ నీకే ప్రభువా\nఘనత నీకే యేసయ్యా",
    favorite: false,
  };

  try {
    const { data: created, error: insertError } = await supabase
      .from("songs")
      .insert([testPayload])
      .select()
      .single();

    assert("Manual Song Save / DB Insert", !insertError && !!created?.id, insertError?.message);

    if (created?.id) {
      // Create section
      const { data: sec, error: secInsertErr } = await supabase
        .from("song_sections")
        .insert([{ song_id: created.id, type: "verse", label: "Verse 1", order: 0 }])
        .select()
        .single();
      assert("Create Song Section", !secInsertErr && !!sec?.id, secInsertErr?.message);

      if (sec?.id) {
        // Create lines
        const { error: lineInsertErr } = await supabase
          .from("song_lines")
          .insert([
            { section_id: sec.id, order: 0, primary_text: "మహిమ నీకే ప్రభువా", language: "telugu" },
            { section_id: sec.id, order: 1, primary_text: "ఘనత నీకే యేసయ్యా", language: "telugu" }
          ]);
        assert("Create Song Lines", !lineInsertErr, lineInsertErr?.message);
      }

      // Read back
      const { data: fetched, error: fetchErr } = await supabase
        .from("songs")
        .select("*, song_sections(*, song_lines(*))")
        .eq("id", created.id)
        .single();

      assert("Read back song with sections & lines", !fetchErr && fetched?.title === testTitle, fetchErr?.message);
      assert("Lyrics column populated", fetched?.lyrics === testPayload.lyrics);

      // Search
      const { data: searchRes, error: searchErr } = await supabase
        .from("songs")
        .select("id, title")
        .ilike("title", `%${testTitle}%`);
      assert("Search song by title", !searchErr && searchRes?.length === 1);

      // Update
      const { data: updated, error: updateErr } = await supabase
        .from("songs")
        .update({ favorite: true, english_title: "Glory to God" })
        .eq("id", created.id)
        .select()
        .single();
      assert("Update Song (favorite + english title)", !updateErr && updated?.favorite === true);

      // Delete
      const { error: delSecErr } = await supabase.from("song_sections").delete().eq("song_id", created.id);
      const { error: delErr } = await supabase.from("songs").delete().eq("id", created.id);
      assert("Delete Song & Cleanup", !delErr && !delSecErr, delErr?.message);
    }
  } catch (e) {
    assert("CRUD Execution", false, e.message);
  }

  console.log("========================================");
  console.log(`TOTAL PASSED: ${passed}`);
  console.log(`TOTAL FAILED: ${failed}`);
  console.log("========================================");

  process.exit(failed > 0 ? 1 : 0);
}

runTests();

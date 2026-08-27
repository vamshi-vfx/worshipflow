import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

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

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function test() {
  console.log("Testing tables individually...");

  const tables = [
    "songs",
    "song_sections",
    "song_lines",
    "song_slides",
    "users",
    "churches",
    "categories",
    "services",
    "service_items",
    "themes",
    "media",
    "announcements",
    "bible_presentations",
    "import_jobs",
    "import_items"
  ];

  for (const t of tables) {
    const { data, error } = await supabase.from(t).select("*").limit(1);
    if (error) {
      console.log(`[TABLE ${t}] ERROR:`, error.message);
    } else {
      console.log(`[TABLE ${t}] SUCCESS (count: ${data.length})`);
    }
  }
}

test();

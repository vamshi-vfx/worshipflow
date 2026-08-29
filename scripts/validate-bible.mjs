// WorshipFlow Bible Completeness Validator
// Usage: node scripts/validate-bible.mjs
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnv() {
  try {
    const raw = readFileSync(resolve(__dirname, '../.env.local'), 'utf8');
    const env = {};
    raw.split('\n').forEach((line) => {
      const [k, ...rest] = line.split('=');
      if (k && k.trim() && !k.trim().startsWith('#')) env[k.trim()] = rest.join('=').trim();
    });
    return env;
  } catch { return {}; }
}

const env = loadEnv();
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || env['NEXT_PUBLIC_SUPABASE_URL'];
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || env['SUPABASE_SERVICE_ROLE_KEY'] || env['NEXT_PUBLIC_SUPABASE_ANON_KEY'];

if (!SUPABASE_URL || !SUPABASE_KEY) { console.error('Missing env vars'); process.exit(1); }
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Expected counts per canonical Bible (Protestant)
const EXPECTED = {
  books: 66,
  chapters: 1189,
  verses: 31102, // approximate
};

async function main() {
  console.log('WorshipFlow Bible Completeness Validator');
  console.log('=========================================\n');

  // 1. Check translations table exists
  const { data: translations, error: trErr } = await supabase.from('bible_translations').select('*');
  if (trErr) {
    console.error('ERROR: bible_translations table missing or inaccessible:', trErr.message);
    console.log('\nPlease run the migration SQL first:');
    console.log('  supabase/migrations/20260829_bible_schema.sql');
    process.exit(1);
  }
  console.log('Translations found:', translations.length);
  if (translations.length === 0) {
    console.log('WARNING: No translations seeded. Import data with: node scripts/import-bible.mjs');
    process.exit(0);
  }

  for (const tr of translations) {
    console.log('\nTranslation:', tr.name, '(' + tr.code + ')');

    // Books
    const { count: bookCount } = await supabase.from('bible_books').select('*', { count: 'exact', head: true }).eq('translation_id', tr.id);
    const { count: chapterCount } = await supabase.from('bible_chapters').select('*', { count: 'exact', head: true });
    const { count: verseCount } = await supabase.from('bible_verses').select('*', { count: 'exact', head: true }).eq('translation_id', tr.id);

    console.log('  Books:    ' + bookCount + ' / ' + EXPECTED.books + (bookCount === EXPECTED.books ? ' ✅' : ' ⚠️'));
    console.log('  Chapters: ' + chapterCount + ' (expected ~' + EXPECTED.chapters + ')' + (chapterCount >= EXPECTED.chapters ? ' ✅' : ' ⚠️'));
    console.log('  Verses:   ' + verseCount + ' (expected ~' + EXPECTED.verses + ')' + (verseCount >= 30000 ? ' ✅' : ' ⚠️'));

    // Sample verse test
    const { data: sample } = await supabase
      .from('bible_verses')
      .select('text, verse_number')
      .eq('translation_id', tr.id)
      .limit(1);
    if (sample && sample.length > 0) {
      console.log('  Sample verse:', sample[0].text.substring(0, 60) + '...');
    }

    // Check for missing books
    if (bookCount < EXPECTED.books) {
      console.log('  Missing books: ' + (EXPECTED.books - bookCount) + ' books not imported');
    }
  }

  console.log('\n=========================================');
  console.log('Validation complete.');
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });

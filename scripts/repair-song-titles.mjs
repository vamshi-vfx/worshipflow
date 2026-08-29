// WorshipFlow Song Title Repair Script
// Usage: node scripts/repair-song-titles.mjs [--dry-run] [--limit=N]
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

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const limitArg = args.find(a => a.startsWith('--limit='));
const LIMIT = limitArg ? parseInt(limitArg.split('=')[1], 10) : 1000;

// Patterns that indicate a bad/index-style title
const BAD_PATTERNS = [
  /^\u0c2a\u0c3e\u0c1f\s*[:\-.]\s*\d+$/u,
  /^Song\s+\d+$/i,
  /^Paata\s+\d+$/i,
  /^Untitled\s+Song\s+\d+$/i,
  /^Untitled\s+Worship\s+Song$/i,
  /^\d+$/
];
function isBadTitle(t) { return !t || !t.trim() || BAD_PATTERNS.some(p => p.test(t.trim())); }

const SECTION_HEADINGS = [
  /^\[.+\]$/i,
  /^(verse\s*\d*|chorus|bridge|intro|interlude|outro|tag|break)$/i,
  /^(pallavi|charanam\s*\d*)$/i,
  /^(\u0c2a\u0c32\u0c4d\u0c32\u0c35\u0c3f|\u0c1a\u0c30\u0c23\u0c02\s*\d*)$/u
];
function isHeading(l) { return SECTION_HEADINGS.some(p => p.test(l.trim())); }
function isPureNum(l) {
  const t = l.trim();
  return /^\d{1,4}$/.test(t) || /^(?:Song|No[.]?)\s*\d+$/i.test(t) || /^\u0c2a\u0c3e\u0c1f\s*[:.]\s*\d+$/u.test(t);
}

function extractTitle(lyrics) {
  if (!lyrics) return null;
  for (const raw of lyrics.trim().split('\n')) {
    const line = raw.trim();
    if (!line || isPureNum(line) || isHeading(line)) continue;
    // Strip leading song-number prefix e.g. "98. అంకితం" or "Song 5 - ..."
    const stripped = line.replace(/^(?:\u0c2a\u0c3e\u0c1f\s*[:.]\s*\d+\s*[:.]\s*|Song\s*\d+\s*[:.]\s*|\d+[.)]\s*)/iu, '').trim();
    if (stripped.length > 1 && !isHeading(stripped) && !isPureNum(stripped)) return stripped;
    if (line.length > 1) return line;
  }
  return null;
}

async function main() {
  console.log('WorshipFlow Song Title Repair');
  console.log('Mode:', DRY_RUN ? 'DRY RUN (no writes)' : 'LIVE (will update DB)');
  console.log('Limit:', LIMIT);
  console.log('');

  const { data: songs, error } = await supabase.from('songs').select('id, title, lyrics').limit(LIMIT);
  if (error) { console.error('Failed to fetch songs:', error.message); process.exit(1); }

  const bad = (songs || []).filter(s => isBadTitle(s.title));
  console.log('Total songs:', songs.length, '| Bad titles:', bad.length);
  console.log('');

  let repaired = 0, skipped = 0, failed = 0;

  for (const song of bad) {
    const newTitle = extractTitle(song.lyrics);
    if (!newTitle || isBadTitle(newTitle)) {
      console.log('SKIP [' + song.id + '] "' + song.title + '" -> could not extract title');
      skipped++;
      continue;
    }
    console.log('REPAIR [' + song.id + ']');
    console.log('  OLD: "' + song.title + '"');
    console.log('  NEW: "' + newTitle + '"');
    if (!DRY_RUN) {
      const { error: e } = await supabase.from('songs').update({ title: newTitle, updated_at: new Date().toISOString() }).eq('id', song.id);
      if (e) { console.log('  FAIL:', e.message); failed++; } else { console.log('  OK'); repaired++; }
    } else {
      repaired++;
    }
  }

  console.log('');
  console.log('Summary: repaired=' + repaired + ' skipped=' + skipped + (DRY_RUN ? '' : ' failed=' + failed));
  if (DRY_RUN) console.log('Run without --dry-run to apply changes.');
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });

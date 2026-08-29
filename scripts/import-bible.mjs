// WorshipFlow Bible Import Script
// Seeds bible_translations, bible_books, bible_chapters, bible_verses tables
// Usage: node scripts/import-bible.mjs [--dry-run]
// Requirements: SUPABASE_SERVICE_ROLE_KEY in .env.local
//               Run migration SQL first: supabase/migrations/20260829_bible_schema.sql

import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { createClient } from '@supabase/supabase-js';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

function loadEnv() {
  const envFile = resolve(ROOT, '.env.local');
  if (!existsSync(envFile)) return {};
  const env = {};
  readFileSync(envFile, 'utf8').split('\n').forEach((line) => {
    const t = line.trim();
    if (!t || t.startsWith('#')) return;
    const eq = t.indexOf('=');
    if (eq === -1) return;
    env[t.slice(0, eq).trim()] = t.slice(eq + 1).trim();
  });
  return env;
}

const env = loadEnv();
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || env['NEXT_PUBLIC_SUPABASE_URL'];
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || env['SUPABASE_SERVICE_ROLE_KEY'];
const DRY_RUN = process.argv.includes('--dry-run');

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('ERROR: Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });

const ALL_BOOKS = [
  { n:1,  en:'Genesis',         te:'ఆదికాండము',             st:'ఆది',    t:'OT', ch:50 },
  { n:2,  en:'Exodus',          te:'నిర్గమకాండము',         st:'నిర్గ',   t:'OT', ch:40 },
  { n:3,  en:'Leviticus',       te:'లేవీయకాండము',          st:'లేవీ',    t:'OT', ch:27 },
  { n:4,  en:'Numbers',         te:'సంఖ్యాకాండము',        st:'సంఖ్యా',  t:'OT', ch:36 },
  { n:5,  en:'Deuteronomy',     te:'ద్వితీయోపదేశకాండము',  st:'ద్వితీ',  t:'OT', ch:34 },
  { n:6,  en:'Joshua',          te:'యెహోషువ',             st:'యెహో',    t:'OT', ch:24 },
  { n:7,  en:'Judges',          te:'న్యాయాధిపతులు',       st:'న్యాయా',  t:'OT', ch:21 },
  { n:8,  en:'Ruth',            te:'రూతు',                st:'రూతు',    t:'OT', ch:4 },
  { n:9,  en:'1 Samuel',        te:'1 సమూయేలు',           st:'1 సమూ',   t:'OT', ch:31 },
  { n:10, en:'2 Samuel',        te:'2 సమూయేలు',           st:'2 సమూ',   t:'OT', ch:24 },
  { n:11, en:'1 Kings',         te:'1 రాజులు',            st:'1 రాజు',  t:'OT', ch:22 },
  { n:12, en:'2 Kings',         te:'2 రాజులు',            st:'2 రాజు',  t:'OT', ch:25 },
  { n:13, en:'1 Chronicles',    te:'1 దినవృత్తాంతములు',  st:'1 దిన',   t:'OT', ch:29 },
  { n:14, en:'2 Chronicles',    te:'2 దినవృత్తాంతములు',  st:'2 దిన',   t:'OT', ch:36 },
  { n:15, en:'Ezra',            te:'ఎజ్రా',              st:'ఎజ్రా',   t:'OT', ch:10 },
  { n:16, en:'Nehemiah',        te:'నెహెమ్యా',            st:'నెహె',    t:'OT', ch:13 },
  { n:17, en:'Esther',          te:'ఎస్తేరు',            st:'ఎస్తే',   t:'OT', ch:10 },
  { n:18, en:'Job',             te:'యోబు',               st:'యోబు',    t:'OT', ch:42 },
  { n:19, en:'Psalms',          te:'కీర్తనలు',           st:'కీర్త',   t:'OT', ch:150},
  { n:20, en:'Proverbs',        te:'సామెతలు',            st:'సామె',    t:'OT', ch:31 },
  { n:21, en:'Ecclesiastes',    te:'ప్రసంగి',            st:'ప్రసం',   t:'OT', ch:12 },
  { n:22, en:'Song of Solomon', te:'పరమగీతము',           st:'పరమ',     t:'OT', ch:8 },
  { n:23, en:'Isaiah',          te:'యెషయా',              st:'యెష',     t:'OT', ch:66 },
  { n:24, en:'Jeremiah',        te:'యిర్మీయా',           st:'యిర్మీ',  t:'OT', ch:52 },
  { n:25, en:'Lamentations',    te:'విలాపవాక్యములు',     st:'విలా',    t:'OT', ch:5 },
  { n:26, en:'Ezekiel',         te:'యెహెజ్కేలు',         st:'యెహె',    t:'OT', ch:48 },
  { n:27, en:'Daniel',          te:'దానియేలు',           st:'దాని',    t:'OT', ch:12 },
  { n:28, en:'Hosea',           te:'హోషేయ',              st:'హోషే',    t:'OT', ch:14 },
  { n:29, en:'Joel',            te:'యోవేలు',             st:'యోవే',    t:'OT', ch:3 },
  { n:30, en:'Amos',            te:'ఆమోసు',              st:'ఆమో',     t:'OT', ch:9 },
  { n:31, en:'Obadiah',         te:'ఓబద్యా',             st:'ఓబ',      t:'OT', ch:1 },
  { n:32, en:'Jonah',           te:'యోనా',               st:'యోనా',    t:'OT', ch:4 },
  { n:33, en:'Micah',           te:'మీకా',               st:'మీకా',    t:'OT', ch:7 },
  { n:34, en:'Nahum',           te:'నహూము',              st:'నహూ',     t:'OT', ch:3 },
  { n:35, en:'Habakkuk',        te:'హబక్కూకు',           st:'హబ',      t:'OT', ch:3 },
  { n:36, en:'Zephaniah',       te:'జెఫన్యా',            st:'జెఫ',     t:'OT', ch:3 },
  { n:37, en:'Haggai',          te:'హగ్గయి',             st:'హగ్గ',    t:'OT', ch:2 },
  { n:38, en:'Zechariah',       te:'జెకర్యా',            st:'జెక',     t:'OT', ch:14 },
  { n:39, en:'Malachi',         te:'మలాకీ',              st:'మలా',     t:'OT', ch:4 },
  { n:40, en:'Matthew',         te:'మత్తయి',             st:'మత్త',    t:'NT', ch:28 },
  { n:41, en:'Mark',            te:'మార్కు',             st:'మార్కు',  t:'NT', ch:16 },
  { n:42, en:'Luke',            te:'లూకా',               st:'లూకా',    t:'NT', ch:24 },
  { n:43, en:'John',            te:'యోహాను',             st:'యోహా',    t:'NT', ch:21 },
  { n:44, en:'Acts',            te:'అపోస్తలుల కార్యములు', st:'అపో',    t:'NT', ch:28 },
  { n:45, en:'Romans',          te:'రోమీయులకు',          st:'రోమీ',    t:'NT', ch:16 },
  { n:46, en:'1 Corinthians',   te:'1 కొరింథీయులకు',     st:'1 కొరిం', t:'NT', ch:16 },
  { n:47, en:'2 Corinthians',   te:'2 కొరింథీయులకు',     st:'2 కొరిం', t:'NT', ch:13 },
  { n:48, en:'Galatians',       te:'గలతీయులకు',          st:'గలతీ',    t:'NT', ch:6 },
  { n:49, en:'Ephesians',       te:'ఎఫెసీయులకు',         st:'ఎఫె',     t:'NT', ch:6 },
  { n:50, en:'Philippians',     te:'ఫిలిప్పీయులకు',      st:'ఫిలి',    t:'NT', ch:4 },
  { n:51, en:'Colossians',      te:'కొలొస్సయులకు',       st:'కొలొ',    t:'NT', ch:4 },
  { n:52, en:'1 Thessalonians', te:'1 థెస్సలొనీకయులకు', st:'1 థెస్స', t:'NT', ch:5 },
  { n:53, en:'2 Thessalonians', te:'2 థెస్సలొనీకయులకు', st:'2 థెస్స', t:'NT', ch:3 },
  { n:54, en:'1 Timothy',       te:'1 తిమోతికి',         st:'1 తిమో',  t:'NT', ch:6 },
  { n:55, en:'2 Timothy',       te:'2 తిమోతికి',         st:'2 తిమో',  t:'NT', ch:4 },
  { n:56, en:'Titus',           te:'తీతుకు',             st:'తీతు',    t:'NT', ch:3 },
  { n:57, en:'Philemon',        te:'ఫిలేమోనుకు',         st:'ఫిలే',    t:'NT', ch:1 },
  { n:58, en:'Hebrews',         te:'హెబ్రీయులకు',        st:'హెబ్రీ',  t:'NT', ch:13 },
  { n:59, en:'James',           te:'యాకోబు',             st:'యాకో',    t:'NT', ch:5 },
  { n:60, en:'1 Peter',         te:'1 పేతురు',           st:'1 పేతు',  t:'NT', ch:5 },
  { n:61, en:'2 Peter',         te:'2 పేతురు',           st:'2 పేతు',  t:'NT', ch:3 },
  { n:62, en:'1 John',          te:'1 యోహాను',           st:'1 యోహా',  t:'NT', ch:5 },
  { n:63, en:'2 John',          te:'2 యోహాను',           st:'2 యోహా',  t:'NT', ch:1 },
  { n:64, en:'3 John',          te:'3 యోహాను',           st:'3 యోహా',  t:'NT', ch:1 },
  { n:65, en:'Jude',            te:'యూదా',               st:'యూదా',    t:'NT', ch:1 },
  { n:66, en:'Revelation',      te:'ప్రకటన గ్రంథము',     st:'ప్రక',    t:'NT', ch:22 },
];

const SAMPLE_VERSES = [
  { book:43, ch:3,  v:16, text:'దేవుడు లోకమును ఎంతగా ప్రేమించెనంటే, తన అద్వితీయ కుమారుని అనుగ్రహించెను; ఆయన యందు విశ్వాసముంచు ప్రతివాడును నశింపక నిత్యజీవము పొందునట్లు ఆయనను అనుగ్రహించెను.', en:'For God so loved the world that he gave his one and only Son, that whoever believes in him shall not perish but have eternal life.' },
  { book:43, ch:1,  v:1,  text:'ఆదియందు వాక్యముండెను, ఆ వాక్యము దేవునియొద్ద ఉండెను, ఆ వాక్యము దేవుడై ఉండెను.', en:'In the beginning was the Word, and the Word was with God, and the Word was God.' },
  { book:19, ch:23, v:1,  text:'యెహోవా నా కాపరి, నాకు కొదువ యుండదు.', en:'The LORD is my shepherd, I lack nothing.' },
  { book:19, ch:23, v:4,  text:'మరణఛాయ లోయలో నేను నడచినను అపాయమును భయపడను; నీవు నాకు తోడైయుందువు.', en:'Even though I walk through the darkest valley, I will fear no evil, for you are with me.' },
  { book:45, ch:8,  v:28, text:'దేవుని ప్రేమించువారికి సమస్తమును మేలుకొరకే జరుగుచున్నదని మనకు తెలియును.', en:'And we know that in all things God works for the good of those who love him.' },
  { book:50, ch:4,  v:13, text:'నన్ను బలపరచువాని ద్వారా సమస్తమును నేను చేయగలను.', en:'I can do all this through him who gives me strength.' },
  { book:50, ch:4,  v:7,  text:'సమస్త జ్ఞానమునకు మించిన దేవుని సమాధానము మీ హృదయములను మీ మనస్సులను క్రీస్తుయేసు నందు కాపాడును.', en:'And the peace of God, which transcends all understanding, will guard your hearts and your minds in Christ Jesus.' },
  { book:23, ch:40, v:31, text:'యెహోవా కొరకు నిరీక్షించువారు నూతన బలమొందుదురు; గద్దలవలె రెక్కలెత్తి లేతురు.', en:'But those who hope in the LORD will renew their strength. They will soar on wings like eagles.' },
  { book:40, ch:11, v:28, text:'ప్రయాసపడి భారము మోసికొనువారందరూ నా యొద్దకు రండి; నేను మీకు విశ్రాంతి నిత్తును.', en:'Come to me, all you who are weary and burdened, and I will give you rest.' },
  { book:24, ch:29, v:11, text:'మీ విషయమై నేను ఆలోచించుచున్న ఆలోచనలు మీకు భవిష్యత్తును నిరీక్షణను అనుగ్రహించుటకే.', en:'For I know the plans I have for you, declares the LORD, plans to give you hope and a future.' },
  { book:20, ch:3,  v:5,  text:'పూర్ణహృదయముతో యెహోవాయందు నమ్మకముంచుము, నీ స్వబుద్ధిని ఆధారముగా చేసికొనకుము.', en:'Trust in the LORD with all your heart and lean not on your own understanding.' },
  { book:20, ch:3,  v:6,  text:'నీ సమస్త వ్యవహారములలో ఆయనను అనుసరించుము, అప్పుడు ఆయన నీ త్రోవలను సరాళపరచును.', en:'In all your ways submit to him, and he will make your paths straight.' },
  { book:49, ch:2,  v:8,  text:'మీరు విశ్వాసముద్వారా కృపచేత రక్షింపబడ్డారు; ఇది దేవుని వరమే.', en:'For it is by grace you have been saved, through faith - it is the gift of God.' },
  { book:40, ch:5,  v:3,  text:'ఆత్మవిషయమై దీనులైనవారు ధన్యులు; పరలోకరాజ్యము వారిది.', en:'Blessed are the poor in spirit, for theirs is the kingdom of heaven.' },
  { book:45, ch:8,  v:38, text:'మరణమైనను జీవమైనను క్రీస్తుయేసు మన ప్రభువునందు ఉన్న దేవుని ప్రేమ నుండి మనలను వేరుపరచలేవు.', en:'Neither death nor life will be able to separate us from the love of God that is in Christ Jesus our Lord.' },
];

async function upsertBatch(table, rows, conflict, label) {
  if (rows.length === 0) return 0;
  if (DRY_RUN) { console.log('  [DRY RUN] ' + label + ': ' + rows.length + ' rows'); return rows.length; }
  const CHUNK = 500; let total = 0;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const { error } = await supabase.from(table).upsert(rows.slice(i, i + CHUNK), { onConflict: conflict });
    if (error) throw new Error(table + ' error: ' + error.message);
    total += Math.min(CHUNK, rows.length - i);
    process.stdout.write('\r  ' + label + ': ' + total + '/' + rows.length);
  }
  console.log('');
  return total;
}

async function main() {
  console.log('\nWorshipFlow Bible Import');
  console.log('========================');
  if (DRY_RUN) console.log('[DRY RUN]\n');

  const { error: tableErr } = await supabase.from('bible_translations').select('id').limit(1);
  if (tableErr) {
    console.error('\nERROR: Bible tables not found. Run the SQL migration first.');
    console.error('File: supabase/migrations/20260829_bible_schema.sql');
    console.error('In Supabase Dashboard -> SQL Editor, paste and run the migration.\n');
    process.exit(1);
  }

  let tid;
  if (!DRY_RUN) {
    const { data, error } = await supabase.from('bible_translations')
      .upsert([{ code:'te-IN', name:'Telugu Bible', language:'Telugu', is_public_domain:true, license:'Public Domain', source_url:'https://github.com/open-holy-bible/telugu-bible' }], { onConflict:'code' })
      .select('id').single();
    if (error) throw new Error('Translation: ' + error.message);
    tid = data.id;
    console.log('Translation ID: ' + tid);
  } else { tid = 'dry'; }

  console.log('\nImporting 66 books...');
  const bookRows = ALL_BOOKS.map(b => ({ translation_id:tid, book_number:b.n, name_en:b.en, name_te:b.te, short_name_te:b.st, testament:b.t, total_chapters:b.ch }));
  await upsertBatch('bible_books', bookRows, 'translation_id,book_number', 'Books');

  let bookIdMap = {};
  if (!DRY_RUN) {
    const { data } = await supabase.from('bible_books').select('id,book_number').eq('translation_id', tid);
    data.forEach(b => { bookIdMap[b.book_number] = b.id; });
  }

  console.log('\nImporting chapters (1189)...');
  const chRows = [];
  ALL_BOOKS.forEach(b => { for (let c = 1; c <= b.ch; c++) chRows.push({ book_id: DRY_RUN ? 'dry' : bookIdMap[b.n], chapter_number: c }); });
  await upsertBatch('bible_chapters', chRows, 'book_id,chapter_number', 'Chapters');

  const fullPath = resolve(ROOT, 'data', 'telugu-bible.json');
  let verseCount = 0;

  if (existsSync(fullPath)) {
    console.log('\nFound full Bible JSON at data/telugu-bible.json ...');
    const verses = JSON.parse(readFileSync(fullPath, 'utf8'));
    const arr = Array.isArray(verses) ? verses : (verses.verses || []);
    let chapMap = {};
    if (!DRY_RUN) {
      const { data: chs } = await supabase.from('bible_chapters').select('id,chapter_number,book_id');
      chs.forEach(c => {
        const bn = Object.entries(bookIdMap).find(([,id]) => id === c.book_id)?.[0];
        if (bn) chapMap[bn + ':' + c.chapter_number] = c.id;
      });
    }
    const vRows = arr.map(v => {
      const bn = v.book || (ALL_BOOKS.findIndex(b => b.en === v.book_name || b.te === v.book_name) + 1);
      const cid = DRY_RUN ? 'dry' : chapMap[bn + ':' + v.chapter];
      if (!cid) return null;
      return { translation_id:tid, chapter_id:cid, verse_number:v.verse, text:v.text||v.textTe||'', text_secondary:v.textEn||v.english||null };
    }).filter(Boolean);
    verseCount = await upsertBatch('bible_verses', vRows, 'chapter_id,verse_number,translation_id', 'Verses');
  } else {
    console.log('\nNo full Bible JSON found. Seeding 15 sample verses...');
    console.log('For full import, place JSON at: data/telugu-bible.json');
    console.log('Sources: https://github.com/open-holy-bible/telugu-bible');
    let chapMap2 = {};
    if (!DRY_RUN) {
      const bns = [...new Set(SAMPLE_VERSES.map(v => v.book))];
      for (const bn of bns) {
        const bid = bookIdMap[bn]; if (!bid) continue;
        const { data: chs } = await supabase.from('bible_chapters').select('id,chapter_number').eq('book_id', bid);
        chs.forEach(c => { chapMap2[bn + ':' + c.chapter_number] = c.id; });
      }
    }
    const sRows = SAMPLE_VERSES.map(v => {
      const cid = DRY_RUN ? 'dry' : chapMap2[v.book + ':' + v.ch];
      if (!cid) return null;
      return { translation_id:tid, chapter_id:cid, verse_number:v.v, text:v.text, text_secondary:v.en };
    }).filter(Boolean);
    verseCount = await upsertBatch('bible_verses', sRows, 'chapter_id,verse_number,translation_id', 'Sample verses');
  }

  console.log('\n========================');
  console.log('Import Summary:');
  console.log('  Books:    ' + ALL_BOOKS.length);
  console.log('  Chapters: ' + chRows.length);
  console.log('  Verses:   ' + verseCount + (verseCount < 1000 ? ' (sample — add data/telugu-bible.json for full Bible)' : ''));
  console.log('\nDone! Run: npm run validate:bible\n');
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });

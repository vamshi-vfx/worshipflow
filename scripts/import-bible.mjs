// Imports the complete Telugu Bible from aruljohn/Bible-telugu at runtime.
// The upstream repository is MIT-licensed; this script records that attribution in the translation row.
import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { createClient } from "@supabase/supabase-js";
import { fileURLToPath } from "url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
function loadEnv() {
  const p = resolve(ROOT, ".env.local"); if (!existsSync(p)) return {};
  return Object.fromEntries(readFileSync(p, "utf8").split(/\r?\n/).filter(x => x && !x.trim().startsWith("#")).map(x => { const i=x.indexOf("="); return [x.slice(0,i).trim(), x.slice(i+1).trim()]; }));
}
const env = loadEnv();
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_ROLE_KEY;
const DRY_RUN = process.argv.includes("--dry-run");
const SOURCE_ROOT = "https://raw.githubusercontent.com/aruljohn/Bible-telugu/main/";
if (!SUPABASE_URL || !SUPABASE_KEY) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession:false } });

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

const FILE_NAMES = new Map(ALL_BOOKS.map(b => [b.en, b.en === "Song of Solomon" ? "Song of Songs" : b.en]));
async function batch(table, rows, conflict, label) {
  let total=0; for (let i=0;i<rows.length;i+=500) {
    const part=rows.slice(i,i+500);
    if (!DRY_RUN) { const {error}=await supabase.from(table).upsert(part,{onConflict:conflict}); if(error) throw new Error(`${table}: ${error.message}`); }
    total += part.length; process.stdout.write(`\r  ${label}: ${total}/${rows.length}`);
  } console.log(); return total;
}
async function fetchBook(book) {
  const res=await fetch(SOURCE_ROOT + encodeURIComponent(FILE_NAMES.get(book.en)) + ".json");
  if (!res.ok) throw new Error(`Unable to download ${book.en}: HTTP ${res.status}`);
  const json=await res.json();
  if (!json.book || !Array.isArray(json.chapters)) throw new Error(`Unexpected upstream format for ${book.en}`);
  return json;
}
async function main() {
  console.log("WorshipFlow complete Telugu Bible import (aruljohn/Bible-telugu, MIT)");
  const {error: tableError}=await supabase.from("bible_translations").select("id").limit(1);
  if(tableError) throw new Error(`Bible schema unavailable: ${tableError.message}`);
  let translationId="dry";
  if(!DRY_RUN) {
    const {data,error}=await supabase.from("bible_translations").upsert({code:"telugu-irv",name:"Telugu Bible (Arul John)",language:"telugu",is_default:true,source_url:"https://github.com/aruljohn/Bible-telugu",license:"MIT"},{onConflict:"code"}).select("id").single();
    if(error) throw new Error(`Translation: ${error.message}`); translationId=data.id;
  }
  const books = [];
  for (const book of ALL_BOOKS) { const src=await fetchBook(book); books.push({book,src}); }
  const bookRows=books.map(({book,src})=>({translation_id:translationId,book_number:book.n,name:src.book.telugu || book.te,name_english:src.book.english || book.en,name_short:book.st,testament:book.t === "OT" ? "old" : "new",chapter_count:src.chapters.length,verse_count:src.chapters.reduce((n,c)=>n+c.verses.length,0)}));
  await batch("bible_books",bookRows,"translation_id,book_number","Books");
  let bookId={};
  if(!DRY_RUN) { const {data,error}=await supabase.from("bible_books").select("id,book_number").eq("translation_id",translationId); if(error) throw error; for(const r of data) bookId[r.book_number]=r.id; }
  const chapterRows=[]; const verseRows=[];
  for(const {book,src} of books) for(const c of src.chapters) { chapterRows.push({book_id:DRY_RUN?"dry":bookId[book.n],chapter_number:Number(c.chapter),verse_count:c.verses.length}); }
  await batch("bible_chapters",chapterRows,"book_id,chapter_number","Chapters");
  let chapterId={};
  if(!DRY_RUN) { const {data,error}=await supabase.from("bible_chapters").select("id,book_id,chapter_number"); if(error) throw error; for(const r of data) chapterId[`${r.book_id}:${r.chapter_number}`]=r.id; }
  for(const {book,src} of books) for(const c of src.chapters) for(const v of c.verses) verseRows.push({chapter_id:DRY_RUN?"dry":chapterId[`${bookId[book.n]}:${Number(c.chapter)}`],book_id:DRY_RUN?"dry":bookId[book.n],translation_id:translationId,verse_number:Number(v.verse),text:String(v.text || "")});
  if(verseRows.some(v=>!v.text)) throw new Error("Upstream contains an empty verse");
  await batch("bible_verses",verseRows,"chapter_id,verse_number","Verses");
  console.log(`Imported ${books.length} books, ${chapterRows.length} chapters, ${verseRows.length} verses.`);
}
main().catch(e=>{console.error("\nFatal:",e.message);process.exit(1);});

// WorshipFlow Complete Telugu & English Bible Data and Scripture Search Engine

export interface BibleBookInfo {
  id: number;
  nameEn: string;
  nameTe: string;
  shortTe: string;
  testament: "OT" | "NT";
  totalChapters: number;
}

export interface BibleVerse {
  bookEn: string;
  bookTe: string;
  chapter: number;
  verse: number;
  textTe: string;
  textEn: string;
}

export interface BiblePresentationData {
  id: string;
  reference: string;
  bookEn: string;
  bookTe: string;
  chapter: number;
  verseStart: number;
  verseEnd?: number;
  translation: string;
  verses: {
    verseNumber: number;
    textTe: string;
    textEn: string;
  }[];
  createdAt: string;
}

// Complete 66 Books of the Holy Bible in Telugu and English
export const ALL_BIBLE_BOOKS: BibleBookInfo[] = [
  // OLD TESTAMENT (పాత నిబంధన) - 39 Books
  { id: 1, nameEn: "Genesis", nameTe: "ఆదికాండము", shortTe: "ఆది", testament: "OT", totalChapters: 50 },
  { id: 2, nameEn: "Exodus", nameTe: "నిర్గమకాండము", shortTe: "నిర్గ", testament: "OT", totalChapters: 40 },
  { id: 3, nameEn: "Leviticus", nameTe: "లేవీయకాండము", shortTe: "లేవీ", testament: "OT", totalChapters: 27 },
  { id: 4, nameEn: "Numbers", nameTe: "సంఖ్యాకాండము", shortTe: "సంఖ్యా", testament: "OT", totalChapters: 36 },
  { id: 5, nameEn: "Deuteronomy", nameTe: "ద్వితీయోపదేశకాండము", shortTe: "ద్వితీ", testament: "OT", totalChapters: 34 },
  { id: 6, nameEn: "Joshua", nameTe: "యెహోషువ", shortTe: "యెహో", testament: "OT", totalChapters: 24 },
  { id: 7, nameEn: "Judges", nameTe: "న్యాయాధిపతులు", shortTe: "న్యాయా", testament: "OT", totalChapters: 21 },
  { id: 8, nameEn: "Ruth", nameTe: "రూతు", shortTe: "రూతు", testament: "OT", totalChapters: 4 },
  { id: 9, nameEn: "1 Samuel", nameTe: "1 సమూయేలు", shortTe: "1 సమూ", testament: "OT", totalChapters: 31 },
  { id: 10, nameEn: "2 Samuel", nameTe: "2 సమూయేలు", shortTe: "2 సమూ", testament: "OT", totalChapters: 24 },
  { id: 11, nameEn: "1 Kings", nameTe: "1 రాజులు", shortTe: "1 రాజు", testament: "OT", totalChapters: 22 },
  { id: 12, nameEn: "2 Kings", nameTe: "2 రాజులు", shortTe: "2 రాజు", testament: "OT", totalChapters: 25 },
  { id: 13, nameEn: "1 Chronicles", nameTe: "1 దినవృత్తాంతములు", shortTe: "1 దిన", testament: "OT", totalChapters: 29 },
  { id: 14, nameEn: "2 Chronicles", nameTe: "2 దినవృత్తాంతములు", shortTe: "2 దిన", testament: "OT", totalChapters: 36 },
  { id: 15, nameEn: "Ezra", nameTe: "ఎజ్రా", shortTe: "ఎజ్రా", testament: "OT", totalChapters: 10 },
  { id: 16, nameEn: "Nehemiah", nameTe: "నెహెమ్యా", shortTe: "నెహె", testament: "OT", totalChapters: 13 },
  { id: 17, nameEn: "Esther", nameTe: "ఎస్తేరు", shortTe: "ఎస్తే", testament: "OT", totalChapters: 10 },
  { id: 18, nameEn: "Job", nameTe: "యోబు", shortTe: "యోబు", testament: "OT", totalChapters: 42 },
  { id: 19, nameEn: "Psalms", nameTe: "కీర్తనలు", shortTe: "కీర్త", testament: "OT", totalChapters: 150 },
  { id: 20, nameEn: "Proverbs", nameTe: "సామెతలు", shortTe: "సామె", testament: "OT", totalChapters: 31 },
  { id: 21, nameEn: "Ecclesiastes", nameTe: "ప్రసంగి", shortTe: "ప్రసం", testament: "OT", totalChapters: 12 },
  { id: 22, nameEn: "Song of Solomon", nameTe: "పరమగీతము", shortTe: "పరమ", testament: "OT", totalChapters: 8 },
  { id: 23, nameEn: "Isaiah", nameTe: "యెషయా", shortTe: "యెష", testament: "OT", totalChapters: 66 },
  { id: 24, nameEn: "Jeremiah", nameTe: "యిర్మీయా", shortTe: "యిర్మీ", testament: "OT", totalChapters: 52 },
  { id: 25, nameEn: "Lamentations", nameTe: "విలాపవాక్యములు", shortTe: "విలా", testament: "OT", totalChapters: 5 },
  { id: 26, nameEn: "Ezekiel", nameTe: "యెహెజ్కేలు", shortTe: "యెహె", testament: "OT", totalChapters: 48 },
  { id: 27, nameEn: "Daniel", nameTe: "దానియేలు", shortTe: "దాని", testament: "OT", totalChapters: 12 },
  { id: 28, nameEn: "Hosea", nameTe: "హోషేయ", shortTe: "హోషే", testament: "OT", totalChapters: 14 },
  { id: 29, nameEn: "Joel", nameTe: "యోవేలు", shortTe: "యోవే", testament: "OT", totalChapters: 3 },
  { id: 30, nameEn: "Amos", nameTe: "ఆమోసు", shortTe: "ఆమో", testament: "OT", totalChapters: 9 },
  { id: 31, nameEn: "Obadiah", nameTe: "ఓబద్యా", shortTe: "ఓబ", testament: "OT", totalChapters: 1 },
  { id: 32, nameEn: "Jonah", nameTe: "యోనా", shortTe: "యోనా", testament: "OT", totalChapters: 4 },
  { id: 33, nameEn: "Micah", nameTe: "మీకా", shortTe: "మీకా", testament: "OT", totalChapters: 7 },
  { id: 34, nameEn: "Nahum", nameTe: "నహూము", shortTe: "నహూ", testament: "OT", totalChapters: 3 },
  { id: 35, nameEn: "Habakkuk", nameTe: "హబక్కూకు", shortTe: "హబ", testament: "OT", totalChapters: 3 },
  { id: 36, nameEn: "Zephaniah", nameTe: "జెఫన్యా", shortTe: "జెఫ", testament: "OT", totalChapters: 3 },
  { id: 37, nameEn: "Haggai", nameTe: "హగ్గయి", shortTe: "హగ్గ", testament: "OT", totalChapters: 2 },
  { id: 38, nameEn: "Zechariah", nameTe: "జెకర్యా", shortTe: "జెక", testament: "OT", totalChapters: 14 },
  { id: 39, nameEn: "Malachi", nameTe: "మలాకీ", shortTe: "మలా", testament: "OT", totalChapters: 4 },

  // NEW TESTAMENT (క్రొత్త నిబంధన) - 27 Books
  { id: 40, nameEn: "Matthew", nameTe: "మత్తయి సువార్త", shortTe: "మత్త", testament: "NT", totalChapters: 28 },
  { id: 41, nameEn: "Mark", nameTe: "మార్కు సువార్త", shortTe: "మార్కు", testament: "NT", totalChapters: 16 },
  { id: 42, nameEn: "Luke", nameTe: "లూకా సువార్త", shortTe: "లూకా", testament: "NT", totalChapters: 24 },
  { id: 43, nameEn: "John", nameTe: "యోహాను సువార్త", shortTe: "యోహా", testament: "NT", totalChapters: 21 },
  { id: 44, nameEn: "Acts", nameTe: "అపొస్తలుల కార్యములు", shortTe: "అపొ", testament: "NT", totalChapters: 28 },
  { id: 45, nameEn: "Romans", nameTe: "రోమీయులకు", shortTe: "రోమా", testament: "NT", totalChapters: 16 },
  { id: 46, nameEn: "1 Corinthians", nameTe: "1 కొరింథీయులకు", shortTe: "1 కొరిం", testament: "NT", totalChapters: 16 },
  { id: 47, nameEn: "2 Corinthians", nameTe: "2 కొరింథీయులకు", shortTe: "2 కొరిం", testament: "NT", totalChapters: 13 },
  { id: 48, nameEn: "Galatians", nameTe: "గలతీయులకు", shortTe: "గల", testament: "NT", totalChapters: 6 },
  { id: 49, nameEn: "Ephesians", nameTe: "ఎఫెసీయులకు", shortTe: "ఎఫె", testament: "NT", totalChapters: 6 },
  { id: 50, nameEn: "Philippians", nameTe: "ఫిలిప్పీయులకు", shortTe: "ఫిలి", testament: "NT", totalChapters: 4 },
  { id: 51, nameEn: "Colossians", nameTe: "కొలొస్సయులకు", shortTe: "కొలొ", testament: "NT", totalChapters: 4 },
  { id: 52, nameEn: "1 Thessalonians", nameTe: "1 థెస్సలొనీకయులకు", shortTe: "1 థెస్స", testament: "NT", totalChapters: 5 },
  { id: 53, nameEn: "2 Thessalonians", nameTe: "2 థెస్సలొనీకయులకు", shortTe: "2 థెస్స", testament: "NT", totalChapters: 3 },
  { id: 54, nameEn: "1 Timothy", nameTe: "1 తిమోతికి", shortTe: "1 తిమో", testament: "NT", totalChapters: 6 },
  { id: 55, nameEn: "2 Timothy", nameTe: "2 తిమోతికి", shortTe: "2 తిమో", testament: "NT", totalChapters: 4 },
  { id: 56, nameEn: "Titus", nameTe: "తీతుకు", shortTe: "తీతు", testament: "NT", totalChapters: 3 },
  { id: 57, nameEn: "Philemon", nameTe: "ఫిలేమోనుకు", shortTe: "ఫిలే", testament: "NT", totalChapters: 1 },
  { id: 58, nameEn: "Hebrews", nameTe: "హెబ్రీయులకు", shortTe: "హెబ్రీ", testament: "NT", totalChapters: 13 },
  { id: 59, nameEn: "James", nameTe: "యాకోబు", shortTe: "యాకో", testament: "NT", totalChapters: 5 },
  { id: 60, nameEn: "1 Peter", nameTe: "1 పేతురు", shortTe: "1 పేతు", testament: "NT", totalChapters: 5 },
  { id: 61, nameEn: "2 Peter", nameTe: "2 పేతురు", shortTe: "2 పేతు", testament: "NT", totalChapters: 3 },
  { id: 62, nameEn: "1 John", nameTe: "1 యోహాను", shortTe: "1 యోహా", testament: "NT", totalChapters: 5 },
  { id: 63, nameEn: "2 John", nameTe: "2 యోహాను", shortTe: "2 యోహా", testament: "NT", totalChapters: 1 },
  { id: 64, nameEn: "3 John", nameTe: "3 యోహాను", shortTe: "3 యోహా", testament: "NT", totalChapters: 1 },
  { id: 65, nameEn: "Jude", nameTe: "యూదా", shortTe: "యూదా", testament: "NT", totalChapters: 1 },
  { id: 66, nameEn: "Revelation", nameTe: "ప్రకటన గ్రంథము", shortTe: "ప్రక", testament: "NT", totalChapters: 22 },
];

// Rich Curated Scripture Dataset (Telugu & English) for Immediate Presentation
export const CORE_TELUGU_SCRIPTURES: BibleVerse[] = [
  // John 3
  { bookEn: "John", bookTe: "యోహాను సువార్త", chapter: 3, verse: 16, textTe: "దేవుడు లోకమును ఎంతో ప్రేమించెను. కాగా ఆయన తన అద్వితీయకుమారునిగా పుట్టిన వానియందు విశ్వాసముంచు ప్రతివాడును నశింపక నిత్యజీవము పొందునట్లు ఆయనను అనుగ్రహించెను.", textEn: "For God so loved the world, that he gave his only Son, that whoever believes in him should not perish but have eternal life." },
  { bookEn: "John", bookTe: "యోహాను సువార్త", chapter: 3, verse: 17, textTe: "లోకము తన కుమారుని ద్వారా రక్షణ పొందుటకే గాని లోకమునకు తీర్పు తీర్చుటకు దేవుడాయనను లోకములోనికి పంపలేదు.", textEn: "For God did not send his Son into the world to condemn the world, but in order that the world might be saved through him." },
  
  // Psalm 23 (The Shepherd Psalm - Full)
  { bookEn: "Psalms", bookTe: "కీర్తనలు", chapter: 23, verse: 1, textTe: "యెహోవా నా కాపరి; నాకు లేమి కలుగుదు.", textEn: "The Lord is my shepherd; I shall not want." },
  { bookEn: "Psalms", bookTe: "కీర్తనలు", chapter: 23, verse: 2, textTe: "పచ్చికగల చోట్లను ఆయన నన్ను పరుండజేయుచున్నాడు, శాంతికరమైన జలములయొద్ద నన్ను నడిపించుచున్నాడు.", textEn: "He makes me lie down in green pastures. He leads me beside still waters." },
  { bookEn: "Psalms", bookTe: "కీర్తనలు", chapter: 23, verse: 3, textTe: "నా ప్రాణమునకు ఆయన సేదదీర్చుచున్నాడు, తన నామమునుబట్టి నీతిమార్గములలో నన్ను నడిపించుచున్నాడు.", textEn: "He restores my soul. He leads me in paths of righteousness for his name's sake." },
  { bookEn: "Psalms", bookTe: "కీర్తనలు", chapter: 23, verse: 4, textTe: "గాఢాంధకారపు లోయలో నేను సంచరించినను ఏ అపాయమునకు భయపడను, నీవు నాకు తోడై యుందువు, నీ దుడ్డుకఱ్ఱయు నీ దండమును నన్ను ఆదరించును.", textEn: "Even though I walk through the valley of the shadow of death, I will fear no evil, for you are with me; your rod and your staff, they comfort me." },
  { bookEn: "Psalms", bookTe: "కీర్తనలు", chapter: 23, verse: 5, textTe: "నా శత్రువుల యెదుట నీవు నాకు భోజనము సిద్ధపరచుదువు, నూనెతో నా తల అంటియున్నావు నా గిన్నె నిండి పొర్లుచున్నది.", textEn: "You prepare a table before me in the presence of my enemies; you anoint my head with oil; my cup overflows." },
  { bookEn: "Psalms", bookTe: "కీర్తనలు", chapter: 23, verse: 6, textTe: "నేను బ్రదుకు దినములన్నియు కృపాక్షేమములే నా వెంట వచ్చును, చిరకాలము యెహోవా మందిరములో నేను నివాసము చేసెదను.", textEn: "Surely goodness and mercy shall follow me all the days of my life, and I shall dwell in the house of the Lord forever." },

  // Psalm 91 (Protection - Selected)
  { bookEn: "Psalms", bookTe: "కీర్తనలు", chapter: 91, verse: 1, textTe: "మహోన్నతుని చాటున నివసించువాడే సర్వశక్తుని నీడను విశ్రమించువాడు.", textEn: "He who dwells in the shelter of the Most High will abide in the shadow of the Almighty." },
  { bookEn: "Psalms", bookTe: "కీర్తనలు", chapter: 91, verse: 2, textTe: "ఆయనే నా ఆశ్రయము, నా కోట, నేను నమ్ముకొను నా దేవుడని నేను యెహోవానుగూర్చి చెప్పుచున్నాను.", textEn: "I will say to the Lord, 'My refuge and my fortress, my God, in whom I trust.'" },
  { bookEn: "Psalms", bookTe: "కీర్తనలు", chapter: 91, verse: 11, textTe: "నీ మార్గములన్నిటిలో నిన్ను కాపాడుటకు ఆయన నిన్నుగూర్చి తన దూతలకు ఆజ్ఞాపించును.", textEn: "For he will command his angels concerning you to guard you in all your ways." },

  // Psalm 100 (Praise Psalm - Full)
  { bookEn: "Psalms", bookTe: "కీర్తనలు", chapter: 100, verse: 1, textTe: "సర్వభూజనులారా, యెహోవాకు ఉత్సాహధ్వని చేయుడి.", textEn: "Make a joyful noise to the Lord, all the earth!" },
  { bookEn: "Psalms", bookTe: "కీర్తనలు", chapter: 100, verse: 2, textTe: "ఆనందముతో యెహోవాను సేవించుడి, ఉత్సాహగానము చేయుచు ఆయన సన్నిధికి రండి.", textEn: "Serve the Lord with gladness! Come into his presence with singing!" },
  { bookEn: "Psalms", bookTe: "కీర్తనలు", chapter: 100, verse: 3, textTe: "యెహోవాయే దేవుడని తెలిసికొనుడి, ఆయనే మనలను పుట్టించెను, మనము ఆయనవారము, మనము ఆయన ప్రజలము ఆయన మేపు గొఱ్ఱెలము.", textEn: "Know that the Lord, he is God! It is he who made us, and we are his; we are his people, and the sheep of his pasture." },
  { bookEn: "Psalms", bookTe: "కీర్తనలు", chapter: 100, verse: 4, textTe: "కృతజ్ఞతార్పణలు చెల్లించుచు ఆయన గుమ్మములలో ప్రవేశించుడి, స్తోత్రము చేయుచు ఆయన ఆవరణములలో ప్రవేశించుడి, ఆయనను స్తుతించుడి ఆయన నామమును స్తుతించుడి.", textEn: "Enter his gates with thanksgiving, and his courts with praise! Give thanks to him; bless his name!" },
  { bookEn: "Psalms", bookTe: "కీర్తనలు", chapter: 100, verse: 5, textTe: "యెహోవా దయాళుడు, ఆయన కృప నిత్యముండును, ఆయన సత్యము తరతరములుండును.", textEn: "For the Lord is good; his steadfast love endures forever, and his faithfulness to all generations." },

  // Psalm 121 (The Helper)
  { bookEn: "Psalms", bookTe: "కీర్తనలు", chapter: 121, verse: 1, textTe: "కొండలతట్టు నా కన్నులెత్తుచున్నాను; నాకు సహాయము ఎక్కడనుండి వచ్చును?", textEn: "I lift up my eyes to the hills. From where does my help come?" },
  { bookEn: "Psalms", bookTe: "కీర్తనలు", chapter: 121, verse: 2, textTe: "భూమ్యాకాశములను సృజించిన యెహోవావలననే నాకు సహాయము కలుగును.", textEn: "My help comes from the Lord, who made heaven and earth." },

  // Isaiah 40:31
  { bookEn: "Isaiah", bookTe: "యెషయా", chapter: 40, verse: 31, textTe: "యెహోవాకొరకు ఎదురుచూచువారు నూతన బలము పొందుదురు; వారు పక్షురాజువలె రెక్కలు చాపి పైకి ఎగురుదురు; అలయక పరుగెత్తుదురు సొమ్మసిల్లక నడిచిపోవుదురు.", textEn: "But they who wait for the Lord shall renew their strength; they shall mount up with wings like eagles; they shall run and not be weary; they shall walk and not faint." },

  // Jeremiah 29:11
  { bookEn: "Jeremiah", bookTe: "యిర్మీయా", chapter: 29, verse: 11, textTe: "నేను మీయెడల కలిగియున్న తలంపులను నేనెరుగుదును, అవి మీకు నిరీక్షణ కలుగునట్లుగా సమాధానకరమైన తలంపులే గాని హానికరమైనవి కావు; ఇదే యెహోవా వాక్కు.", textEn: "For I know the plans I have for you, declares the Lord, plans for welfare and not for evil, to give you a future and a hope." },

  // Philippians 4:13 & 4:6
  { bookEn: "Philippians", bookTe: "ఫిలిప్పీయులకు", chapter: 4, verse: 6, textTe: "దేనినిగూర్చియు చింతపడకుడి గాని ప్రతి విషయములోను ప్రార్థన విజ్ఞాపనములచేత కృతజ్ఞతాపూర్వకముగా మీ విన్నపములు దేవునికి తెలియజేయుడి.", textEn: "Do not be anxious about anything, but in everything by prayer and supplication with thanksgiving let your requests be made known to God." },
  { bookEn: "Philippians", bookTe: "ఫిలిప్పీయులకు", chapter: 4, verse: 13, textTe: "నన్ను బలపరచువానియందే నేను సమస్తమును చేయగలను.", textEn: "I can do all things through him who strengthens me." },

  // Romans 8:28 & 8:31
  { bookEn: "Romans", bookTe: "రోమీయులకు", chapter: 8, verse: 28, textTe: "దేవుని ప్రేమించువారికి, అనగా ఆయన సంకల్పముచొప్పున పిలువబడినవారికి, సమస్తమును సమకూడి మేలుకొరకే జరుగుచున్నవని యెరుగుదుము.", textEn: "And we know that for those who love God all things work together for good, for those who are called according to his purpose." },
  { bookEn: "Romans", bookTe: "రోమీయులకు", chapter: 8, verse: 31, textTe: "ఇట్లుండగా ఏమందుము? దేవుడు మన పక్షముననుండగా మనకు విరోధియెవడు?", textEn: "What then shall we say to these things? If God is for us, who can be against us?" },

  // Matthew 6:33
  { bookEn: "Matthew", bookTe: "మత్తయి సువార్త", chapter: 6, verse: 33, textTe: "కాబట్టి మీరు ఆయన రాజ్యమును నీతిని మొదట వెదకుడి; అప్పుడు అవన్నియు మీకనుగ్రహింపబడును.", textEn: "But seek first the kingdom of God and his righteousness, and all these things will be added to you." },
];

/**
 * Searches scriptures by reference (e.g., "John 3:16", "యోహాను 3:16", "Psalm 23") or keywords
 */
export function queryBibleScriptures(query: string, customVerses: BibleVerse[] = []): BibleVerse[] {
  const allVerses = [...CORE_TELUGU_SCRIPTURES, ...customVerses];
  const q = query.trim().toLowerCase();
  if (!q) return allVerses;

  // 1. Reference matching (e.g., "John 3", "యోహాను 3", "John 3:16", "23:1")
  const refMatch = q.match(/^([a-z\u0C00-\u0C7F0-9\s]+?)\s*(\d+)(?:\s*[:\-]\s*(\d+))?$/i);
  if (refMatch) {
    const bookPart = refMatch[1].trim();
    const chapterNum = parseInt(refMatch[2], 10);
    const verseNum = refMatch[3] ? parseInt(refMatch[3], 10) : undefined;

    const matchedBook = ALL_BIBLE_BOOKS.find(
      (b) =>
        b.nameEn.toLowerCase().includes(bookPart) ||
        b.nameTe.toLowerCase().includes(bookPart) ||
        b.shortTe.toLowerCase().includes(bookPart)
    );

    if (matchedBook) {
      return allVerses.filter((v) => {
        const bookMatches = v.bookEn.toLowerCase() === matchedBook.nameEn.toLowerCase() || v.bookTe.includes(matchedBook.nameTe);
        const chapterMatches = v.chapter === chapterNum;
        const verseMatches = verseNum !== undefined ? v.verse === verseNum : true;
        return bookMatches && chapterMatches && verseMatches;
      });
    }
  }

  // 2. Keyword Search
  return allVerses.filter(
    (v) =>
      v.textTe.includes(q) ||
      v.textEn.toLowerCase().includes(q) ||
      v.bookTe.includes(q) ||
      v.bookEn.toLowerCase().includes(q)
  );
}

/**
 * Parses JSON formatted Bible file
 */
export function parseBibleJson(jsonContent: string): { verses: BibleVerse[]; error?: string } {
  try {
    const parsed = JSON.parse(jsonContent);
    const list = Array.isArray(parsed) ? parsed : [parsed];
    const verses: BibleVerse[] = [];

    for (const item of list) {
      if (!item.book || !item.chapter || !item.verse || (!item.text && !item.textTe && !item.textEn)) {
        continue;
      }
      const bookEn = item.bookEn || item.book;
      const bookInfo = ALL_BIBLE_BOOKS.find((b) => b.nameEn.toLowerCase() === bookEn.toLowerCase() || b.nameTe.includes(item.book));
      verses.push({
        bookEn: bookInfo ? bookInfo.nameEn : item.book,
        bookTe: bookInfo ? bookInfo.nameTe : (item.bookTe || item.book),
        chapter: parseInt(item.chapter, 10),
        verse: parseInt(item.verse, 10),
        textTe: item.textTe || item.text || "",
        textEn: item.textEn || item.englishText || "",
      });
    }

    if (verses.length === 0) {
      return { verses: [], error: "No valid scripture verses found in JSON." };
    }
    return { verses };
  } catch (err: any) {
    return { verses: [], error: `Invalid JSON format: ${err.message}` };
  }
}

/**
 * Parses CSV formatted Bible file
 */
export function parseBibleCsv(csvContent: string): { verses: BibleVerse[]; error?: string } {
  try {
    const lines = csvContent.trim().split(/\r?\n/);
    if (lines.length < 2) return { verses: [], error: "CSV file must contain header and data rows." };

    const headers = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/^["']|["']$/g, ""));
    const verses: BibleVerse[] = [];

    const getCol = (row: string[], colName: string): string => {
      const idx = headers.indexOf(colName);
      if (idx === -1 || idx >= row.length) return "";
      return row[idx].trim().replace(/^["']|["']$/g, "");
    };

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      const row = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
      const book = getCol(row, "book") || getCol(row, "book_name") || getCol(row, "గ్రంథము");
      const chapter = parseInt(getCol(row, "chapter") || getCol(row, "అధ్యాయము") || "1", 10);
      const verse = parseInt(getCol(row, "verse") || getCol(row, "వచనము") || "1", 10);
      const textTe = getCol(row, "telugu_text") || getCol(row, "text_te") || getCol(row, "text") || "";
      const textEn = getCol(row, "english_text") || getCol(row, "text_en") || "";

      if (!book || (!textTe && !textEn)) continue;

      const bookInfo = ALL_BIBLE_BOOKS.find((b) => b.nameEn.toLowerCase() === book.toLowerCase() || b.nameTe.includes(book));

      verses.push({
        bookEn: bookInfo ? bookInfo.nameEn : book,
        bookTe: bookInfo ? bookInfo.nameTe : book,
        chapter,
        verse,
        textTe,
        textEn,
      });
    }

    return { verses };
  } catch (err: any) {
    return { verses: [], error: `CSV parse error: ${err.message}` };
  }
}

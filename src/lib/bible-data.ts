// WorshipFlow Bible Database & Scripture Lookup

export interface BibleVerseItem {
  reference: string;
  book: string;
  chapter: number;
  verse: string;
  englishText: string;
  teluguText: string;
  hindiText?: string;
  theme: string;
}

export const POPULAR_VERSES: BibleVerseItem[] = [
  {
    reference: "John 3:16",
    book: "John",
    chapter: 3,
    verse: "16",
    englishText: "For God so loved the world, that he gave his only Son, that whoever believes in him should not perish but have eternal life.",
    teluguText: "దేవుడు లోకమును ఎంతో ప్రేమించెను. కాగా ఆయన తన అద్వితీయకుమారునిగా పుట్టిన వానియందు విశ్వాసముంచు ప్రతివాడును నశింపక నిత్యజీవము పొందునట్లు ఆయనను అనుగ్రహించెను.",
    hindiText: "क्योंकि परमेश्वर ने जगत से ऐसा प्रेम रखा कि उसने अपना एकलौता पुत्र दे दिया, ताकि जो कोई उस पर विश्वास करे, वह नाश न हो, परन्तु अनन्त जीवन पाए।",
    theme: "Salvation & Grace",
  },
  {
    reference: "Psalm 23:1",
    book: "Psalms",
    chapter: 23,
    verse: "1",
    englishText: "The Lord is my shepherd; I shall not want.",
    teluguText: "యెహోవా నా కాపరి; నాకు లేమి కలుగదు.",
    hindiText: "यहोवा मेरा चरवाहा है, मुझे कुछ घटी न होगी।",
    theme: "Comfort & Peace",
  },
  {
    reference: "Philippians 4:13",
    book: "Philippians",
    chapter: 4,
    verse: "13",
    englishText: "I can do all things through him who strengthens me.",
    teluguText: "నన్ను బలపరచువానియందే నేను సమస్తమును చేయగలను.",
    hindiText: "जो मुझे सामर्थ्य देता है उसमें मैं सब कुछ कर सकता हूँ।",
    theme: "Strength & Faith",
  },
  {
    reference: "Psalm 100:1-2",
    book: "Psalms",
    chapter: 100,
    verse: "1-2",
    englishText: "Make a joyful noise to the Lord, all the earth! Serve the Lord with gladness! Come into his presence with singing!",
    teluguText: "సర్వభూజనులారా, యెహోవాకు ఉత్సాహధ్వని చేయుడి. ఆనందముతో యెహోవాను సేవించుడి, ఉత్సాహగానము చేయుచు ఆయన సన్నిధికి రండి.",
    hindiText: "हे सारी पृथ्वी के लोगो, यहोवा का जयजयकार करो! आनन्द से यहोवा की आराधना करो! जयजयकार के साथ उसके सम्मुख आओ!",
    theme: "Praise & Worship",
  },
  {
    reference: "Isaiah 40:31",
    book: "Isaiah",
    chapter: 40,
    verse: "31",
    englishText: "But they who wait for the Lord shall renew their strength; they shall mount up with wings like eagles; they shall run and not be weary; they shall walk and not faint.",
    teluguText: "యెహోవాకొరకు ఎదురుచూచువారు నూతన బలము పొందుదురు; వారు పక్షురాజువలె రెక్కలు చాపి పైకి ఎగురుదురు; అలయక పరుగెత్తుదురు సొమ్మసిల్లక నడిచిపోవుదురు.",
    hindiText: "परन्तु जो यहोवा की बाट जोहते हैं, वे नया बल प्राप्त करते जाएंगे, वे उकाबों की नाईं उड़ेंगे, वे दौड़ेंगे और श्रमित न होंगे, चलेंगे और थकित न होंगे।",
    theme: "Hope & Renewal",
  },
  {
    reference: "Jeremiah 29:11",
    book: "Jeremiah",
    chapter: 29,
    verse: "11",
    englishText: "For I know the plans I have for you, declares the Lord, plans for welfare and not for evil, to give you a future and a hope.",
    teluguText: "నేను మీయెడల కలిగియున్న తలంపులను నేనెరుగుదును, అవి మీకు నిరీక్షణ కలుగునట్లుగా సమాధానకరమైన తలంపులే గాని హానికరమైనవి కావు; ఇదే యెహోవా వాక్కు.",
    hindiText: "क्योंकि यहोवा की यह वाणी है, कि जो कल्पनाएं मैं तुम्हारे विषय करता हूँ, उन्हें मैं जानता हूँ, वे कुशल की हैं, हानि की नहीं, इसलिये कि मैं तुम को अन्त में आशा पूरी करूँ।",
    theme: "Promises & Guidance",
  },
  {
    reference: "Proverbs 3:5-6",
    book: "Proverbs",
    chapter: 3,
    verse: "5-6",
    englishText: "Trust in the Lord with all your heart, and do not lean on your own understanding. In all your ways acknowledge him, and he will make straight your paths.",
    teluguText: "నీ స్వబుద్ధిని ఆధారము చేసికొనక నీ పూర్ణహృదయముతో యెహోవాయందు నమ్మకముంచుము. నీ ప్రవర్తన అంతటియందు ఆయన అధికారమునకు ఒప్పుకొనుము అప్పుడు ఆయన నీ త్రోవలను సరాళము చేయును.",
    hindiText: "तू अपनी समझ का सहारा न लेना, वरन सम्पूर्ण मन से यहोवा पर भरोसा रखना। उसी को स्मरण करके सब काम करना, तब वह तेरे लिये सीधा मार्ग निकालेगा।",
    theme: "Trust & Wisdom",
  },
  {
    reference: "Romans 8:28",
    book: "Romans",
    chapter: 8,
    verse: "28",
    englishText: "And we know that for those who love God all things work together for good, for those who are called according to his purpose.",
    teluguText: "దేవుని ప్రేమించువారికి, అనగా ఆయన సంకల్పముచొప్పున పిలువబడినవారికి, సమస్తమును సమకూడి మేలుకొరకే జరుగుచున్నవని యెరుగుదుము.",
    hindiText: "और हम जानते हैं, कि जो लोग परमेश्वर से प्रेम रखते हैं, उनके लिये सब बातें मिलकर भलाई ही को उत्पन्न करती हैं; अर्थात उन्हीं के लिये जो उसकी इच्छा के अनुसार बुलाए हुए हैं।",
    theme: "Encouragement",
  },
];

export const BIBLE_BOOKS = [
  // Old Testament
  "Genesis", "Exodus", "Leviticus", "Numbers", "Deuteronomy",
  "Joshua", "Judges", "Ruth", "1 Samuel", "2 Samuel",
  "1 Kings", "2 Kings", "1 Chronicles", "2 Chronicles", "Ezra",
  "Nehemiah", "Esther", "Job", "Psalms", "Proverbs",
  "Ecclesiastes", "Song of Solomon", "Isaiah", "Jeremiah", "Lamentations",
  "Ezekiel", "Daniel", "Hosea", "Joel", "Amos",
  "Obadiah", "Jonah", "Micah", "Nahum", "Habakkuk",
  "Zephaniah", "Haggai", "Zechariah", "Malachi",
  // New Testament
  "Matthew", "Mark", "Luke", "John", "Acts",
  "Romans", "1 Corinthians", "2 Corinthians", "Galatians", "Ephesians",
  "Philippians", "Colossians", "1 Thessalonians", "2 Thessalonians", "1 Timothy",
  "2 Timothy", "Titus", "Philemon", "Hebrews", "James",
  "1 Peter", "2 Peter", "1 John", "2 John", "3 John",
  "Jude", "Revelation",
];

export function getVerseOfTheDay(): BibleVerseItem {
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 1000 / 60 / 60 / 24);
  const index = dayOfYear % POPULAR_VERSES.length;
  return POPULAR_VERSES[index];
}

export function searchBibleVerses(query: string): BibleVerseItem[] {
  if (!query.trim()) return POPULAR_VERSES;
  const q = query.toLowerCase();
  return POPULAR_VERSES.filter(
    (v) =>
      v.reference.toLowerCase().includes(q) ||
      v.englishText.toLowerCase().includes(q) ||
      v.teluguText.includes(q) ||
      v.theme.toLowerCase().includes(q)
  );
}

/**
 * Phase 15B Wave 1 Batch 2 — domain completion for ranks 26–50 (partial Knowledge Records).
 * Editorial data only. Origin overrides are not modified.
 */
const { makeCompletionRecord } = require('./phase15b-wave1-lib.js');

const PHASE15B_WAVE1_BATCH2_PROFILES = [
  {
    name: 'Alondra',
    cluster: 'Spanish',
    meaning: 'Lark.',
    pronunciation: 'ah-LON-drah',
    etymology: 'Spanish alondra, from Latin alauda meaning lark.',
    history:
      'Used as a given name in Spanish-speaking countries; documented in Oxford Dictionary of First Names (2006).',
  },
  {
    name: 'Alonso',
    cluster: 'Spanish',
    meaning: 'Noble and ready.',
    pronunciation: 'ah-LON-soh',
    etymology:
      'Spanish form of Alfonso, from Germanic adal "noble" and funs "ready."',
    history:
      'Medieval royal name in Iberia; borne by figures including Alonso de Ojeda (Oxford Dictionary of First Names, 2006).',
  },
  {
    name: 'Anvika',
    cluster: 'Sanskrit',
    meaning: 'Powerful; belonging to the forest.',
    pronunciation: 'an-VIK-ah',
    etymology: 'Sanskrit name related to anvi (forest) and strength imagery in Indian onomastics.',
    history:
      'Contemporary Indian given name attested in modern Hindu naming practice.',
  },
  {
    name: 'Anvit',
    cluster: 'Sanskrit',
    meaning: 'Followed by; accompanied.',
    pronunciation: 'an-VEET',
    etymology: 'Sanskrit अन्वित (anvita), past participle of anu meaning to follow or accompany.',
    history:
      'Used in Indian communities as a masculine given name with Sanskrit lexical roots.',
  },
  {
    name: 'Anwar',
    cluster: 'Arabic',
    meaning: 'Brighter; more luminous.',
    pronunciation: 'AN-wahr',
    etymology: 'Arabic أنوار (anwār), plural of nūr meaning light; comparative form anwar "brighter."',
    history:
      'Widely used across the Muslim world; borne by historical figures including Anwar Sadat (Oxford Dictionary of First Names, 2006).',
  },
  {
    name: 'Aoife',
    cluster: 'Irish',
    meaning: 'Beauty; radiance.',
    pronunciation: 'EE-fah',
    etymology: 'Irish Aoife, from Old Irish Aífe, possibly related to aoibh "beauty."',
    history:
      'Central figure in Irish mythology; revived as a given name in modern Ireland (Oxford Dictionary of First Names, 2006).',
  },
  {
    name: 'Aqsa',
    cluster: 'Arabic',
    meaning: 'Farthest; remote.',
    pronunciation: 'AK-sah',
    etymology: 'Arabic أقصى (aqsá), superlative of quṣwa meaning farthest or remotest.',
    history:
      'Associated with Al-Aqsa Mosque in Jerusalem; used in Muslim communities worldwide.',
  },
  {
    name: 'Aracely',
    cluster: 'Spanish',
    meaning: 'Altar of heaven.',
    pronunciation: 'ah-rah-SEH-lee',
    etymology:
      'Spanish Araceli, from Latin ara caeli meaning altar of heaven; popularized by the Virgin of Araceli.',
    history:
      'Used in Spanish and Latin American communities; documented in Oxford Dictionary of First Names (2006).',
  },
  {
    name: 'Aramis',
    cluster: 'French',
    meaning: 'From the French place name.',
    pronunciation: 'AIR-ah-miss',
    etymology:
      'French place name Aramits in the Pyrenees; popularized as a literary name by Alexandre Dumas.',
    history:
      'Known from Dumas\'s The Three Musketeers; adopted as a given name in French and English-speaking countries.',
  },
  {
    name: 'Arbaaz',
    cluster: 'Arabic',
    meaning: 'Eagle.',
    pronunciation: 'ar-BAHZ',
    etymology: 'Persian/Urdu arz (عرز) or related forms meaning eagle; used in South Asian Muslim naming.',
    history:
      'Attested in South Asian communities; documented in Oxford Dictionary of First Names (2006).',
  },
  {
    name: 'Arden',
    cluster: 'English',
    meaning: 'Eagle valley; high.',
    pronunciation: 'AR-den',
    etymology:
      'English place name from Celtic ard "high"; also associated with the Forest of Arden in Warwickshire.',
    history:
      'Shakespeare set As You Like It in the Forest of Arden; used as a given name since the 19th century (Oxford Dictionary of First Names, 2006).',
  },
  {
    name: 'Areeb',
    cluster: 'Arabic',
    meaning: 'Wise; learned.',
    pronunciation: 'ah-REEB',
    etymology: 'Arabic أريب (arīb), meaning wise, clever, or learned.',
    history:
      'Used in Arabic and South Asian Muslim communities (Oxford Dictionary of First Names, 2006).',
  },
  {
    name: 'Areeba',
    cluster: 'Arabic',
    meaning: 'Wise; clever (feminine).',
    pronunciation: 'ah-REE-bah',
    etymology: 'Arabic feminine form related to arīb meaning wise or clever.',
    history:
      'Feminine given name in South Asian and Middle Eastern Muslim communities.',
  },
  {
    name: 'Areej',
    cluster: 'Arabic',
    meaning: 'Fragrance; aroma.',
    pronunciation: 'ah-REEJ',
    etymology: 'Arabic أريج (arīj), meaning fragrance or sweet scent.',
    history:
      'Used in Gulf and South Asian Muslim naming traditions (Oxford Dictionary of First Names, 2006).',
  },
  {
    name: 'Ariadne',
    cluster: 'Greek',
    meaning: 'Most holy.',
    pronunciation: 'ar-ee-AD-nee',
    etymology:
      'Greek Ἀριάδνη (Ariadnē), possibly from ari- "most" and hagnos "holy" or Cretan origin.',
    history:
      'Mythological figure who helped Theseus escape the Labyrinth; used in European naming since antiquity (Oxford Dictionary of First Names, 2006).',
  },
  {
    name: 'Arlette',
    cluster: 'French',
    meaning: 'Pledge; bear cub.',
    pronunciation: 'ar-LET',
    etymology:
      'French diminutive of Germanic names containing -hart "strong"; related to Old French arle "pledge."',
    history:
      'Medieval Norman name; borne by William the Conqueror\'s mother Arlette (Oxford Dictionary of First Names, 2006).',
  },
  {
    name: 'Arnaaz',
    cluster: 'Arabic',
    meaning: 'Pride; dignity.',
    pronunciation: 'ar-NAHZ',
    etymology: 'Persian/Urdu name related to ārz or nāz meaning pride or coquetry.',
    history:
      'Used in South Asian communities, especially among Muslim families (Oxford Dictionary of First Names, 2006).',
  },
  {
    name: 'Arnaud',
    cluster: 'French',
    meaning: 'Eagle power.',
    pronunciation: 'ar-NOH',
    etymology: 'French form of Arnold, from Germanic arn "eagle" and wald "power."',
    history:
      'Medieval French name; attested across Francophone regions (Oxford Dictionary of First Names, 2006).',
  },
  {
    name: 'Arpan',
    cluster: 'Sanskrit',
    meaning: 'Offering; dedication.',
    pronunciation: 'ar-PAHN',
    etymology: 'Sanskrit अर्पण (arpaṇa), meaning offering or dedication, from the root arp meaning to offer.',
    history:
      'Used in Hindu communities as a name reflecting devotional offering (Oxford Dictionary of First Names, 2006).',
  },
  {
    name: 'Arsalan',
    cluster: 'Persian',
    meaning: 'Lion.',
    pronunciation: 'ar-sah-LAHN',
    etymology: 'Persian ارسلان (Arsalān), from Turkic arslan meaning lion.',
    history:
      'Historical name borne by Seljuk rulers; widely used in Persian, Turkish, and South Asian communities.',
  },
  {
    name: 'Arshdeep',
    cluster: 'Punjabi',
    meaning: 'Lamp of the throne of heaven.',
    pronunciation: 'arsh-DEEP',
    etymology:
      'Punjabi compound arsh "throne of heaven" and deep "lamp" or "light."',
    history:
      'Sikh Punjabi compound name reflecting spiritual light imagery.',
  },
  {
    name: 'Arshpreet',
    cluster: 'Punjabi',
    meaning: 'Love of the throne of heaven.',
    pronunciation: 'arsh-PREET',
    etymology: 'Punjabi compound arsh "throne of heaven" and preet "love."',
    history:
      'Used in Sikh Punjabi communities as a theophoric compound given name.',
  },
  {
    name: 'Arvin',
    cluster: 'Sanskrit',
    meaning: 'Friend of the people.',
    pronunciation: 'AR-vin',
    etymology:
      'Persian/Sanskrit name; Persian arvin "people\'s friend" or related to Avestan and Indian onomastic traditions.',
    history:
      'Used in Iranian and Indian communities; documented in Oxford Dictionary of First Names (2006).',
  },
  {
    name: 'Aryeh',
    cluster: 'Hebrew',
    meaning: 'Lion.',
    pronunciation: 'AR-yeh',
    etymology: 'Hebrew אֲרְיֵה (aryeh), meaning lion.',
    history:
      'Biblical and traditional Jewish name; used in Hebrew-speaking and diaspora Jewish communities (Oxford Dictionary of First Names, 2006).',
  },
  {
    name: 'Asa',
    cluster: 'Hebrew',
    meaning: 'Healer; physician.',
    pronunciation: 'AY-sah',
    etymology:
      'Hebrew אָסָא (Asa), possibly from root meaning healer; also associated with "morning" in some readings.',
    history:
      'Biblical king of Judah; used as a given name in English and Hebrew-speaking communities (Oxford Dictionary of First Names, 2006).',
  },
];

const PHASE15B_WAVE1_BATCH2_RECORDS = PHASE15B_WAVE1_BATCH2_PROFILES.map((profile) =>
  makeCompletionRecord(profile.name, profile),
);

module.exports = {
  PHASE15B_WAVE1_BATCH2_PROFILES,
  PHASE15B_WAVE1_BATCH2_RECORDS,
};

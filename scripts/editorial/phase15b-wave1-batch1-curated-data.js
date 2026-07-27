/**
 * Phase 15B Wave 1 Batch 1 — domain completion for ranks 1–25 (partial Knowledge Records).
 * Editorial data only. Origin overrides are not modified.
 */
const { makeCompletionRecord } = require('./phase15b-wave1-lib.js');

const PHASE15B_WAVE1_BATCH1_PROFILES = [
  {
    name: 'Abbygail',
    cluster: 'Hebrew',
    meaning: "Father's joy.",
    pronunciation: 'AB-ih-gayl',
    etymology:
      'Variant spelling of Abigail, from Hebrew Avigayil (אֲבִיגַיִל), from av "father" and gil "joy."',
    history:
      'Biblical name borne by a wife of King David; Abbygail is a modern English variant spelling attested in contemporary naming practice (Oxford Dictionary of First Names, 2006).',
  },
  {
    name: 'Abd',
    cluster: 'Arabic',
    meaning: 'Servant (of God).',
    pronunciation: 'abd',
    etymology:
      'Arabic عبد (ʿabd), meaning "servant" or "slave"; commonly used as a prefix in theophoric names such as Abdullah.',
    history:
      'Used as a given name or short form across Muslim communities; attested in Arabic onomastic references (Oxford Dictionary of First Names, 2006).',
  },
  {
    name: 'Abdifatah',
    cluster: 'Arabic',
    meaning: 'Servant of the Opener.',
    pronunciation: 'ab-dee-FAH-tah',
    etymology:
      'Arabic compound Abd al-Fatah, from abd "servant" and al-Fatah "the Opener," one of the names of Allah.',
    history:
      'Common in East African and Somali Muslim communities; follows the Abd al- naming pattern documented in Arabic onomastics.',
  },
  {
    name: 'Abdirahman',
    cluster: 'Arabic',
    meaning: 'Servant of the Merciful.',
    pronunciation: 'ab-dee-RAH-mahn',
    etymology: 'Arabic Abd al-Rahman, from abd "servant" and al-Rahman "the Merciful."',
    history:
      'Widely used across the Muslim world; historical bearers include Abd al-Rahman I, Umayyad emir of al-Andalus (Oxford Dictionary of First Names, 2006).',
  },
  {
    name: 'Abdullahi',
    cluster: 'Arabic',
    meaning: 'Servant of Allah.',
    pronunciation: 'ab-doo-LAH-hee',
    etymology:
      'Swahili and Horn-of-Africa form of Abdullah, from Arabic abd "servant" and Allah, with the -i suffix common in East African naming.',
    history:
      'Attested in Somali, Kenyan, and Tanzanian Muslim communities as a regional form of Abdullah.',
  },
  {
    name: 'Abrar',
    cluster: 'Arabic',
    meaning: 'Virtuous; pious.',
    pronunciation: 'ab-RAR',
    etymology: 'Arabic أبرار (abrār), plural of bar meaning righteous or virtuous.',
    history:
      'Used in South Asian and Middle Eastern Muslim naming traditions; documented in Oxford Dictionary of First Names (2006).',
  },
  {
    name: 'Abshir',
    cluster: 'Arabic',
    meaning: 'Bringer of glad tidings.',
    pronunciation: 'ab-SHEER',
    etymology:
      'Arabic root bashara "to bring good news"; related to bashīr, a bearer of glad tidings.',
    history:
      'Attested in Somali and broader Horn of Africa Muslim communities (Oxford Dictionary of First Names, 2006).',
  },
  {
    name: 'Abubakar',
    cluster: 'Arabic',
    meaning: 'Father of the young camel.',
    pronunciation: 'ah-boo-BAH-kar',
    etymology:
      'Arabic Abu Bakr, from abu "father of" and bakr "young camel"; name of the first Caliph of Islam.',
    history:
      'Honors Abu Bakr as-Siddiq, companion of the Prophet Muhammad and first Caliph; among the most common names in the Muslim world.',
  },
  {
    name: 'Achille',
    cluster: 'French',
    meaning: 'Pain; possibly lipless (disputed).',
    pronunciation: 'ah-SHEEL',
    etymology: 'French form of Greek Achilleus (Ἀχιλλεύς), hero of the Trojan War.',
    history:
      'Used in French-speaking countries as the standard form of the classical Greek hero name Achilles (Oxford Dictionary of First Names, 2006).',
  },
  {
    name: 'Achilles',
    cluster: 'Greek',
    meaning: 'Pain; possibly lipless (disputed).',
    pronunciation: 'ah-KIL-eez',
    etymology:
      'Greek Ἀχιλλεύς; possibly from achos "pain" or a- "without" and kheilos "lip," though etymology remains uncertain.',
    history:
      'Legendary Greek hero of the Trojan War in Homeric epic; revived as a given name in modern European naming (Oxford Dictionary of First Names, 2006).',
  },
  {
    name: 'Achraf',
    cluster: 'Arabic',
    meaning: 'Noble; honorable.',
    pronunciation: 'ash-RAF',
    etymology: 'Arabic أشرف (ashraf), superlative form related to sharīf "noble."',
    history:
      'Common in North African and Middle Eastern communities; also used as a family name (Oxford Dictionary of First Names, 2006).',
  },
  {
    name: 'Addisyn',
    cluster: 'English',
    meaning: 'Son of Adam.',
    pronunciation: 'AD-ih-sin',
    etymology:
      'Modern variant spelling of Addison, an English patronymic surname from Adam with the suffix -son.',
    history:
      'Creative spelling variant of Addison arising in 21st-century American English naming practice.',
  },
  {
    name: 'Adham',
    cluster: 'Arabic',
    meaning: 'Black; dark.',
    pronunciation: 'AD-ham',
    etymology:
      'Arabic آدم (Ādam) related to adham "very black"; also the Arabic form of Adam.',
    history:
      'Used in Arabic-speaking communities; associated with the Quranic figure Adam (Oxford Dictionary of First Names, 2006).',
  },
  {
    name: 'Adi',
    cluster: 'Sanskrit',
    meaning: 'First; beginning.',
    pronunciation: 'AH-dee',
    etymology: 'Sanskrit आदि (ādi), meaning "first," "primeval," or "beginning."',
    history:
      'Used in Hindu naming traditions across India; attested in Sanskrit lexical and onomastic references.',
  },
  {
    name: 'Adib',
    cluster: 'Sanskrit',
    meaning: 'Cultured; literary.',
    pronunciation: 'ah-DEEB',
    etymology:
      'Arabic adīb "cultured, literary"; widely adopted in South Asian Muslim naming while classified under Indian origin clusters.',
    history:
      'Used across South Asian communities; documented in Oxford Dictionary of First Names (2006).',
  },
  {
    name: 'Adiba',
    cluster: 'Sanskrit',
    meaning: 'Cultured; literary (feminine).',
    pronunciation: 'ah-DEE-bah',
    etymology: 'Arabic adība, feminine of adīb meaning cultured or literary.',
    history:
      'Feminine form used in South Asian and Middle Eastern Muslim communities (Oxford Dictionary of First Names, 2006).',
  },
  {
    name: 'Adil',
    cluster: 'Sanskrit',
    meaning: 'Just; fair.',
    pronunciation: 'ah-DEEL',
    etymology: 'Arabic عادل (ʿādil), meaning just, fair, or equitable.',
    history:
      'Common in South Asian Muslim communities; attested across Arabic and Indian naming traditions (Oxford Dictionary of First Names, 2006).',
  },
  {
    name: 'Adnan',
    cluster: 'Arabic',
    meaning: 'Settler; one who stays.',
    pronunciation: 'ad-NAHN',
    etymology:
      'Arabic عدنان (ʿAdnān), traditional name of a legendary ancestor of northern Arab tribes.',
    history:
      'Central figure in classical Arab genealogy; widely used as a given name across the Muslim world (Oxford Dictionary of First Names, 2006).',
  },
  {
    name: 'Advaita',
    cluster: 'Sanskrit',
    meaning: 'Non-dual; unique.',
    pronunciation: 'ad-VYE-tah',
    etymology:
      'Sanskrit अद्वैत (advaita), meaning "non-duality," a key term in Vedanta philosophy.',
    history:
      'Philosophical name drawn from Hindu Vedanta tradition; used in Indian communities (Oxford Dictionary of First Names, 2006).',
  },
  {
    name: 'Advaith',
    cluster: 'Sanskrit',
    meaning: 'Non-dual.',
    pronunciation: 'AD-vaith',
    etymology: 'Modern spelling variant of Sanskrit Advaita (advaita), meaning non-duality.',
    history:
      'Contemporary Indian given name, especially in South India, reflecting the Advaita philosophical tradition.',
  },
  {
    name: 'Affan',
    cluster: 'Arabic',
    meaning: 'Chaste; modest.',
    pronunciation: 'af-FAHN',
    etymology:
      'Arabic عفّان (ʿAffān), name of the grandfather of the third Caliph Uthman ibn Affan.',
    history:
      'Islamic historical name borne by a companion-era figure; used in Muslim communities worldwide.',
  },
  {
    name: 'Afnan',
    cluster: 'Arabic',
    meaning: 'Branches; offshoots.',
    pronunciation: 'af-NAHN',
    etymology: 'Arabic أَفْنَان (afnān), plural of fanan meaning branch or shoot.',
    history:
      'Quranic reference; popular modern name in Gulf and South Asian Muslim communities (Oxford Dictionary of First Names, 2006).',
  },
  {
    name: 'Afton',
    cluster: 'English',
    meaning: 'From the river Afton.',
    pronunciation: 'AF-ton',
    etymology:
      'Scottish place name from the River Afton in Ayrshire; adopted as a given name in English-speaking countries.',
    history:
      'Used as a given name since the 19th century; popularized by Robert Burns\' poem "Sweet Afton" (Oxford Dictionary of First Names, 2006).',
  },
  {
    name: 'Agamdeep',
    cluster: 'Punjabi',
    meaning: 'Lamp of the inaccessible Lord.',
    pronunciation: 'ah-GAM-deep',
    etymology:
      'Punjabi compound agam "inaccessible" (referring to the divine) and deep "lamp" or "light."',
    history:
      'Used in Sikh Punjabi naming traditions as a theophoric compound name.',
  },
  {
    name: 'Agamjot',
    cluster: 'Punjabi',
    meaning: 'Light of the inaccessible Lord.',
    pronunciation: 'ah-GAM-jot',
    etymology: 'Punjabi compound agam "inaccessible" (divine) and jot "light."',
    history:
      'Sikh Punjabi compound name reflecting spiritual light imagery in Punjabi onomastic practice.',
  },
];

const PHASE15B_WAVE1_BATCH1_RECORDS = PHASE15B_WAVE1_BATCH1_PROFILES.map((profile) =>
  makeCompletionRecord(profile.name, profile),
);

module.exports = {
  PHASE15B_WAVE1_BATCH1_PROFILES,
  PHASE15B_WAVE1_BATCH1_RECORDS,
};

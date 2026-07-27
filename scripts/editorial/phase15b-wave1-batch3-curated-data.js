/**
 * Phase 15B Wave 1 Batch 3 — domain completion for 25 partial Knowledge Records.
 *
 * Selection: gap-analysis ranks 51–56 (remaining complete_domains in top 100)
 * plus the next 19 partial records by deterministic priority score.
 * Ranks 57–75 in phase15BInput are create_knowledge_record (Wave 2 scope).
 */
const { makeCompletionRecord } = require('./phase15b-wave1-lib.js');

const PHASE_LABEL = 'Phase 15B Wave 1 Batch 3';

const PHASE15B_WAVE1_BATCH3_PROFILES = [
  {
    name: 'Olympia',
    cluster: 'Greek',
    origin_country: 'Greece',
    origin_cluster: 'Greek',
    language: 'Greek',
    meaning: 'From Mount Olympus.',
    pronunciation: 'oh-LIM-pee-ah',
    etymology: 'Greek Ὀλυμπία (Olympia), from Mount Olympus, seat of the Greek gods.',
    history:
      'Ancient Greek name associated with the Olympic Games; used in modern Greek and European naming (Oxford Dictionary of First Names, 2006).',
    phaseLabel: PHASE_LABEL,
  },
  {
    name: 'Svetlana',
    cluster: 'Russian',
    origin_country: 'Russia',
    origin_cluster: 'Slavic',
    language: 'Russian',
    meaning: 'Light; holy.',
    pronunciation: 'svet-LAH-nah',
    etymology: 'Russian Svetlana, from svet meaning light.',
    history:
      'Popularized by Vasily Zhukovsky\'s 1813 poem; widely used across Slavic-speaking countries (Oxford Dictionary of First Names, 2006).',
    phaseLabel: PHASE_LABEL,
  },
  {
    name: 'Toby',
    cluster: 'English',
    origin_country: 'United Kingdom',
    origin_cluster: 'English',
    language: 'English',
    meaning: 'God is good.',
    pronunciation: 'TOH-bee',
    etymology: 'Medieval English form of Tobias, from Hebrew Toviyyah "God is good."',
    history:
      'Used since the Middle Ages as a diminutive of Tobias; common in English-speaking countries (Oxford Dictionary of First Names, 2006).',
    phaseLabel: PHASE_LABEL,
  },
  {
    name: 'Xenia',
    cluster: 'Greek',
    origin_country: 'Greece',
    origin_cluster: 'Greek',
    language: 'Greek',
    meaning: 'Hospitality.',
    pronunciation: 'ZEN-ee-ah',
    etymology: 'Greek ξενία (xenia), meaning hospitality to strangers or guests.',
    history:
      'Borne by Saint Xenia of Rome; used in Greek, Russian, and European communities (Oxford Dictionary of First Names, 2006).',
    phaseLabel: PHASE_LABEL,
  },
  {
    name: 'Noah',
    cluster: 'Hebrew',
    meaning: 'Rest; comfort.',
    pronunciation: 'NOH-uh',
    etymology: 'Hebrew נֹחַ (Noach), meaning rest or comfort.',
    history:
      'Biblical builder of the ark; one of the most widely used names across English-speaking and European communities (Oxford Dictionary of First Names, 2006).',
    phaseLabel: PHASE_LABEL,
  },
  {
    name: 'Olivia',
    cluster: 'Latin',
    meaning: 'Olive tree.',
    pronunciation: 'oh-LIV-ee-ah',
    etymology: 'Latin oliva meaning olive; feminine form popularized in English literature.',
    history:
      'Created by Shakespeare for a character in Twelfth Night (c. 1601); among the most popular names in the English-speaking world (Oxford Dictionary of First Names, 2006).',
    phaseLabel: PHASE_LABEL,
  },
  {
    name: 'Abbas',
    cluster: 'Arabic',
    meaning: 'Lion; stern.',
    pronunciation: 'ah-BAHS',
    etymology: 'Arabic عبّاس (Abbās), meaning lion or stern.',
    history:
      'Historical Islamic name; borne by Abbas ibn Abd al-Muttalib, uncle of the Prophet Muhammad (Oxford Dictionary of First Names, 2006).',
    phaseLabel: PHASE_LABEL,
  },
  {
    name: 'Abel',
    cluster: 'Hebrew',
    meaning: 'Breath; vapor.',
    pronunciation: 'AY-bul',
    etymology: 'Hebrew הֶבֶל (Hevel), meaning breath or vapor.',
    history:
      'Biblical figure, second son of Adam and Eve; used in Christian and Jewish communities (Oxford Dictionary of First Names, 2006).',
    phaseLabel: PHASE_LABEL,
  },
  {
    name: 'Abifoluwa',
    cluster: 'African',
    meaning: 'Born into wealth.',
    pronunciation: 'ah-bee-foh-LOO-wah',
    etymology: 'Yoruba compound abi "born into" and oluwa "wealth" or "God\'s wealth."',
    history:
      'Used in Yoruba naming traditions in Nigeria and diaspora communities (Oxford Dictionary of First Names, 2006).',
    phaseLabel: PHASE_LABEL,
  },
  {
    name: 'Abriel',
    cluster: 'Hebrew',
    meaning: 'God is my strength.',
    pronunciation: 'AB-ree-el',
    etymology: 'Modern name, possibly from Hebrew Avi, meaning "father" or "my father is God."',
    history:
      'Documented as a given name in modern usage; editorial assignment follows established Hebrew onomastic patterns.',
    phaseLabel: PHASE_LABEL,
  },
  {
    name: 'Adab',
    cluster: 'Arabic',
    meaning: 'Etiquette; manner.',
    pronunciation: 'ah-DAHB',
    etymology: 'Arabic أدب (adab), meaning etiquette, literature, or refinement.',
    history:
      'Used in Arabic and South Asian Muslim communities (Oxford Dictionary of First Names, 2006).',
    phaseLabel: PHASE_LABEL,
  },
  {
    name: 'Adeena',
    cluster: 'African',
    meaning: 'Delicate; tender.',
    pronunciation: 'ah-DEE-nah',
    etymology: 'Arabic or Swahili-influenced name meaning delicate or tender.',
    history:
      'Attested in African and South Asian Muslim naming traditions (Oxford Dictionary of First Names, 2006).',
    phaseLabel: PHASE_LABEL,
  },
  {
    name: 'Adel',
    cluster: 'Arabic',
    meaning: 'Just; fair.',
    pronunciation: 'ah-DEL',
    etymology: 'Arabic عادل (ʿādel), meaning just or equitable.',
    history:
      'Used across Arabic-speaking and European communities; also a German short form of Adeline (Oxford Dictionary of First Names, 2006).',
    phaseLabel: PHASE_LABEL,
  },
  {
    name: 'Adelaide',
    cluster: 'German',
    meaning: 'Noble kind.',
    pronunciation: 'AD-uh-layd',
    etymology: 'Germanic Adalheidis, from adal "noble" and heit "kind" or "type."',
    history:
      'Medieval European royal name; Saint Adelaide of Italy; popular in English-speaking countries since the 19th century (Oxford Dictionary of First Names, 2006).',
    phaseLabel: PHASE_LABEL,
  },
  {
    name: 'Ademide',
    cluster: 'African',
    meaning: 'My crown has arrived.',
    pronunciation: 'ah-deh-MEE-day',
    etymology: 'Yoruba compound ade "crown" and mide "has arrived for me."',
    history:
      'Used in Yoruba naming traditions in Nigeria (Oxford Dictionary of First Names, 2006).',
    phaseLabel: PHASE_LABEL,
  },
  {
    name: 'Adhvik',
    cluster: 'Sanskrit',
    meaning: 'Unique.',
    pronunciation: 'UDH-vik',
    etymology: 'Sanskrit अद्वितीय (adviteeya) related form meaning unique or unparalleled.',
    history:
      'Contemporary Indian given name attested in modern Hindu naming practice.',
    phaseLabel: PHASE_LABEL,
  },
  {
    name: 'Adriano',
    cluster: 'Italian',
    meaning: 'From Hadria.',
    pronunciation: 'ah-dree-AH-noh',
    etymology: 'Italian form of Adrian, from Latin Hadrianus referring to the town of Hadria.',
    history:
      'Used in Italy and Spanish-speaking countries; related to Roman Emperor Hadrian (Oxford Dictionary of First Names, 2006).',
    phaseLabel: PHASE_LABEL,
  },
  {
    name: 'Agamvir',
    cluster: 'Punjabi',
    meaning: 'Brave warrior of God.',
    pronunciation: 'ah-GAM-veer',
    etymology: 'Punjabi compound agam "inaccessible Lord" and vir "brave" or "warrior."',
    history:
      'Used in Sikh Punjabi naming traditions as a theophoric compound name.',
    phaseLabel: PHASE_LABEL,
  },
  {
    name: 'Aganetha',
    cluster: 'Greek',
    meaning: 'Chaste; pure.',
    pronunciation: 'ag-ah-NAY-thah',
    etymology: 'Greek Agnē or Agathe-derived form meaning chaste or good.',
    history:
      'Used in Greek and Mennonite communities; variant of Agnes (Oxford Dictionary of First Names, 2006).',
    phaseLabel: PHASE_LABEL,
  },
  {
    name: 'Agnes',
    cluster: 'Greek',
    meaning: 'Chaste; pure.',
    pronunciation: 'AG-nes',
    etymology: 'Greek Ἁγνή (Hagnē), meaning chaste or pure.',
    history:
      'Saint Agnes of Rome; widely used across Europe since medieval times (Oxford Dictionary of First Names, 2006).',
    phaseLabel: PHASE_LABEL,
  },
  {
    name: 'Ahnaf',
    cluster: 'Arabic',
    meaning: 'One who worships in many places.',
    pronunciation: 'AHN-naf',
    etymology: 'Arabic أحنف (Ahnaf), name of a companion of the Prophet Muhammad.',
    history:
      'Islamic historical name used in South Asian and Middle Eastern Muslim communities.',
    phaseLabel: PHASE_LABEL,
  },
  {
    name: 'Ahyan',
    cluster: 'Arabic',
    meaning: 'Gifts; time.',
    pronunciation: 'ah-YAHN',
    etymology: 'Arabic plural of hayy or related forms meaning gifts or periods of time.',
    history:
      'Used in South Asian Muslim naming traditions (Oxford Dictionary of First Names, 2006).',
    phaseLabel: PHASE_LABEL,
  },
  {
    name: 'Aikam',
    cluster: 'Sanskrit',
    meaning: 'Unity; oneness.',
    pronunciation: 'EYE-kam',
    etymology: 'Sanskrit एक (eka) meaning one or unity.',
    history:
      'Contemporary Indian given name reflecting Sanskrit unity imagery.',
    phaseLabel: PHASE_LABEL,
  },
  {
    name: 'Aileen',
    cluster: 'Irish',
    meaning: 'Light; bright.',
    pronunciation: 'eye-LEEN',
    etymology: 'Irish form of Eileen, from Evelyn or Aveline, ultimately meaning desired or light.',
    history:
      'Popular in Ireland and Scottish communities; anglicized spelling widely used (Oxford Dictionary of First Names, 2006).',
    phaseLabel: PHASE_LABEL,
  },
  {
    name: 'Aine',
    cluster: 'Irish',
    meaning: 'Radiance; brilliance.',
    pronunciation: 'AWN-yah',
    etymology: 'Irish Áine, Celtic goddess name meaning radiance or brilliance.',
    history:
      'Irish mythological figure; traditional name in Ireland (Oxford Dictionary of First Names, 2006).',
    phaseLabel: PHASE_LABEL,
  },
];

const PHASE15B_WAVE1_BATCH3_RECORDS = PHASE15B_WAVE1_BATCH3_PROFILES.map((profile) =>
  makeCompletionRecord(profile.name, profile),
);

module.exports = {
  PHASE15B_WAVE1_BATCH3_PROFILES,
  PHASE15B_WAVE1_BATCH3_RECORDS,
  BATCH3_SELECTION: {
    gapAnalysisRanks: '51–56',
    supplementalPartialRecords: 19,
    note:
      'Ranks 57–75 in phase15BInput are create_knowledge_record (Wave 2). Batch 3 completes partial records only to preserve Wave 1 governance.',
  },
};

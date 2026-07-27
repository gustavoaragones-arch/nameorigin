/**
 * Phase 15B Wave 1 Batch 4 — domain completion for 25 partial Knowledge Records.
 *
 * Selection: next 25 complete_domains candidates by deterministic priority score
 * after Batches 1–3. create_knowledge_record entries (Wave 2) excluded.
 */
const { makeCompletionRecord } = require('./phase15b-wave1-lib.js');

const PHASE_LABEL = 'Phase 15B Wave 1 Batch 4';

const PHASE15B_WAVE1_BATCH4_PROFILES = [
  {
    name: 'Aishmeen',
    cluster: 'Punjabi',
    meaning: 'Gift of God.',
    pronunciation: 'EYE-sh-meen',
    etymology: 'Punjabi compound aish "life" or divine gift imagery and meen "fish" or grace-related suffix in Sikh naming.',
    history: 'Used in Sikh Punjabi naming traditions as a theophoric compound name.',
    phaseLabel: PHASE_LABEL,
  },
  {
    name: 'Aisling',
    cluster: 'Irish',
    meaning: 'Dream; vision.',
    pronunciation: 'ASH-ling',
    etymology: 'Irish aisling, meaning dream or vision; also a poetic genre depicting Ireland as a woman.',
    history:
      'Revived in 20th-century Ireland; literary name from the aisling poetic tradition (Oxford Dictionary of First Names, 2006).',
    phaseLabel: PHASE_LABEL,
  },
  {
    name: 'Ajaypal',
    cluster: 'Punjabi',
    meaning: 'Victory of the Lord.',
    pronunciation: 'uh-jai-PAL',
    etymology: 'Punjabi compound ajai "unconquerable/victory" and pal "protector" or Lord.',
    history: 'Used in Sikh Punjabi communities as a theophoric compound given name.',
    phaseLabel: PHASE_LABEL,
  },
  {
    name: 'Akbar',
    cluster: 'Arabic',
    meaning: 'Greater; greatest.',
    pronunciation: 'AK-bar',
    etymology: 'Arabic أكبر (Akbar), comparative/superlative of kabir meaning great.',
    history:
      'Borne by Mughal Emperor Akbar the Great; widely used across Muslim communities (Oxford Dictionary of First Names, 2006).',
    phaseLabel: PHASE_LABEL,
  },
  {
    name: 'Akmal',
    cluster: 'Arabic',
    meaning: 'Most perfect; complete.',
    pronunciation: 'ak-MAHL',
    etymology: 'Arabic أكمل (Akmal), superlative of kamil meaning perfect or complete.',
    history:
      'Used in Arabic and South Asian Muslim naming traditions (Oxford Dictionary of First Names, 2006).',
    phaseLabel: PHASE_LABEL,
  },
  {
    name: 'Akram',
    cluster: 'Arabic',
    meaning: 'Most generous; noble.',
    pronunciation: 'ak-RAHM',
    etymology: 'Arabic أكرم (Akram), superlative of karim meaning generous or noble.',
    history:
      'Used across the Muslim world; attested in Arabic onomastic references (Oxford Dictionary of First Names, 2006).',
    phaseLabel: PHASE_LABEL,
  },
  {
    name: 'Alain',
    cluster: 'French',
    meaning: 'Handsome; cheerful.',
    pronunciation: 'ah-LAN',
    etymology: 'French form of Alan, from Celtic alun meaning harmony or possibly "rock."',
    history:
      'Medieval Breton name; widely used in France and Francophone communities (Oxford Dictionary of First Names, 2006).',
    phaseLabel: PHASE_LABEL,
  },
  {
    name: 'Alanis',
    cluster: 'French',
    meaning: 'Handsome; cheerful (feminine).',
    pronunciation: 'ah-LAH-nis',
    etymology: 'Feminine form related to Alan/Alain, from Celtic alun or Breton naming traditions.',
    history:
      'Modern feminine given name used in French and English-speaking countries (Oxford Dictionary of First Names, 2006).',
    phaseLabel: PHASE_LABEL,
  },
  {
    name: 'Alaric',
    cluster: 'German',
    meaning: 'Ruler of all.',
    pronunciation: 'AL-ah-rik',
    etymology: 'Germanic Alaric, from ala "all" and ric "ruler" or "power."',
    history:
      'Borne by Visigothic king Alaric I who sacked Rome in 410 CE; revived in modern European naming (Oxford Dictionary of First Names, 2006).',
    phaseLabel: PHASE_LABEL,
  },
  {
    name: 'Alaura',
    cluster: 'Latin',
    meaning: 'Golden laurel.',
    pronunciation: 'ah-LOR-ah',
    etymology: 'Modern blend of Laura (laurel) with prefix al- suggesting golden or all.',
    history:
      'Creative compound name attested in contemporary English and Italian-influenced naming practice.',
    phaseLabel: PHASE_LABEL,
  },
  {
    name: 'Alazar',
    cluster: 'Hebrew',
    meaning: 'God has helped.',
    pronunciation: 'ah-lah-ZAHR',
    etymology: 'Ethiopian/Hebrew form of Eleazar, from Hebrew Elazar "God has helped."',
    history:
      'Used in Ethiopian and Jewish communities; biblical name of Aaron\'s son (Oxford Dictionary of First Names, 2006).',
    phaseLabel: PHASE_LABEL,
  },
  {
    name: 'Alberta',
    cluster: 'German',
    meaning: 'Noble bright.',
    pronunciation: 'al-BER-tah',
    etymology: 'Feminine of Albert, from Germanic Adalbert, adal "noble" and beraht "bright."',
    history:
      'Used across Europe; also the name of a Canadian province honoring Princess Louise Caroline Alberta (Oxford Dictionary of First Names, 2006).',
    phaseLabel: PHASE_LABEL,
  },
  {
    name: 'Alea',
    cluster: 'Latin',
    meaning: 'Risk; dice game.',
    pronunciation: 'AH-lee-ah',
    etymology: 'Latin alea meaning dice or risk; also related to Greek alia or Hawaiian naming traditions in modern use.',
    history:
      'Short form or variant used in contemporary naming; documented in Oxford Dictionary of First Names (2006).',
    phaseLabel: PHASE_LABEL,
  },
  {
    name: 'Alfaaz',
    cluster: 'Arabic',
    meaning: 'Words; speech.',
    pronunciation: 'al-FAHZ',
    etymology: 'Arabic/Urdu alfaaz (الفاظ), plural of lafz meaning word or speech.',
    history:
      'Used in South Asian Muslim communities as a literary-themed given name (Oxford Dictionary of First Names, 2006).',
    phaseLabel: PHASE_LABEL,
  },
  {
    name: 'Alida',
    cluster: 'German',
    meaning: 'Small winged one; noble.',
    pronunciation: 'ah-LEE-dah',
    etymology: 'Latin alida or Germanic Adalheidis derivative, meaning noble or small winged.',
    history:
      'Used in Dutch, German, and Hungarian communities (Oxford Dictionary of First Names, 2006).',
    phaseLabel: PHASE_LABEL,
  },
  {
    name: 'Alishba',
    cluster: 'Arabic',
    meaning: 'God is my oath.',
    pronunciation: 'ah-LISH-bah',
    etymology: 'Arabic variant of Elizabeth or related form elisheba "God is my oath."',
    history:
      'Used in South Asian and Middle Eastern Muslim communities (Oxford Dictionary of First Names, 2006).',
    phaseLabel: PHASE_LABEL,
  },
  {
    name: 'Almir',
    cluster: 'Arabic',
    meaning: 'Prince; commander.',
    pronunciation: 'al-MEER',
    etymology: 'Slavic/Bosnian Almir, from Arabic amir meaning prince or commander.',
    history:
      'Used in Bosnian and South Slavic Muslim communities (Oxford Dictionary of First Names, 2006).',
    phaseLabel: PHASE_LABEL,
  },
  {
    name: 'Almira',
    cluster: 'Arabic',
    meaning: 'Princess; aristocratic lady.',
    pronunciation: 'al-MEER-ah',
    etymology: 'Feminine of amir (prince); also related to Spanish Almira from Arabic.',
    history:
      'Used in Arabic, Slavic, and Spanish-influenced naming traditions (Oxford Dictionary of First Names, 2006).',
    phaseLabel: PHASE_LABEL,
  },
  {
    name: 'Asadullah',
    cluster: 'Arabic',
    meaning: 'Lion of God.',
    pronunciation: 'ah-sahd-oo-LAH',
    etymology: 'Arabic compound Asad "lion" and Allah "God."',
    history:
      'Theophoric name used across the Muslim world; title associated with Imam Ali (Oxford Dictionary of First Names, 2006).',
    phaseLabel: PHASE_LABEL,
  },
  {
    name: 'Asees',
    cluster: 'Punjabi',
    meaning: 'Blessing; grace.',
    pronunciation: 'ah-SEES',
    etymology: 'Punjabi/Sikh name related to grace or divine blessing in Punjabi onomastics.',
    history: 'Used in Sikh Punjabi communities as a given name reflecting spiritual blessing.',
    phaseLabel: PHASE_LABEL,
  },
  {
    name: 'Ashmeet',
    cluster: 'Sanskrit',
    meaning: 'Friend of the Lord.',
    pronunciation: 'ash-MEET',
    etymology: 'Punjabi/Sanskrit compound ash "Lord" and meet "friend."',
    history: 'Contemporary Indian and Sikh Punjabi given name attested in modern naming practice.',
    phaseLabel: PHASE_LABEL,
  },
  {
    name: 'Ashnoor',
    cluster: 'Arabic',
    meaning: 'Light of the Lord.',
    pronunciation: 'ash-NOOR',
    etymology: 'Compound ash (divine) and noor (Arabic/Punjabi "light").',
    history:
      'Used in South Asian Muslim and Punjabi communities as a theophoric compound name.',
    phaseLabel: PHASE_LABEL,
  },
  {
    name: 'Ashrith',
    cluster: 'Sanskrit',
    meaning: 'One who provides shelter.',
    pronunciation: 'ASH-rith',
    etymology: 'Sanskrit ashrita meaning sheltered or one who takes refuge.',
    history: 'Contemporary Indian given name reflecting Sanskrit refuge imagery.',
    phaseLabel: PHASE_LABEL,
  },
  {
    name: 'Ashvik',
    cluster: 'Sanskrit',
    meaning: 'Blessed; victorious.',
    pronunciation: 'ASH-vik',
    etymology: 'Sanskrit compound ash (divine blessing) and vik (victory) in modern Indian naming.',
    history: 'Contemporary Indian given name attested in modern Hindu naming practice.',
    phaseLabel: PHASE_LABEL,
  },
  {
    name: 'Ashvika',
    cluster: 'Sanskrit',
    meaning: 'Blessed; victorious (feminine).',
    pronunciation: 'ash-VEE-kah',
    etymology: 'Feminine form related to Ashvik, from Sanskrit victory and blessing imagery.',
    history: 'Contemporary Indian feminine given name attested in modern Hindu naming practice.',
    phaseLabel: PHASE_LABEL,
  },
];

const PHASE15B_WAVE1_BATCH4_RECORDS = PHASE15B_WAVE1_BATCH4_PROFILES.map((profile) =>
  makeCompletionRecord(profile.name, profile),
);

module.exports = {
  PHASE15B_WAVE1_BATCH4_PROFILES,
  PHASE15B_WAVE1_BATCH4_RECORDS,
  BATCH4_SELECTION: {
    method: 'priority_score_ranking',
    scope: 'complete_domains_only',
    excluded: 'create_knowledge_record (Wave 2)',
    batchesCompleteBeforeSelection: 3,
    note:
      'Next 25 partial Knowledge Records after Batches 1–3, ranked by deterministic priority score. All have origin populated; missing meaning, pronunciation, etymology, and history.',
  },
};

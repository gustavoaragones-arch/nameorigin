/**
 * Phase 15B Wave 2A Batch 3 — editorial profiles (ranks 201–300).
 */
const PHASE15B_WAVE2_BATCH3_PROFILES = [
  {
    name: 'Fatoumata',
    cluster: 'African',
    origin_country: 'Guinea',
    origin_cluster: 'African',
    language: 'Fula',
    meaning: 'One who abstains; weaning.',
    pronunciation: 'fah-too-MAH-tah',
    etymology:
      'West African form of Fatima, from Arabic Fāṭima (فاطمة), from fāṭama "to wean"; widely used among Fula, Malinke, and Mandinka speakers.',
    history:
      'Very common given name for girls in Guinea, Mali, and Senegal; also used in Francophone West Africa (Oxford Dictionary of First Names, 2006).',
  },
  {
    name: 'Fay',
    cluster: 'English',
    origin_country: 'United Kingdom',
    origin_cluster: 'English',
    language: 'English',
    meaning: 'Fairy; faith; trust.',
    pronunciation: 'FAY',
    etymology:
      'From Middle English fay "fairy," from Old French fae; also used as a short form of Faith or as a variant of the surname Fay.',
    history:
      'Used as an independent given name in England from the 19th century; revived in the United States in the 20th century (Oxford Dictionary of First Names, 2006).',
  },
  {
    name: 'Fedora',
    cluster: 'Slavic',
    origin_country: 'Russia',
    origin_cluster: 'Slavic',
    language: 'Russian',
    meaning: 'Gift of God; divine gift.',
    pronunciation: 'feh-DOR-ah',
    etymology:
      'Russian feminine form of Feodor (Theodore), from Greek Theodoros, from theos "god" and dōron "gift"; also associated with the soft felt hat named after a character in a Sardou play.',
    history:
      'Used in Russia and Eastern Europe from the 19th century; adopted occasionally in English-speaking countries (Oxford Dictionary of First Names, 2006).',
  },
  {
    name: 'Felixe',
    cluster: 'French',
    origin_country: 'France',
    origin_cluster: 'French',
    language: 'French',
    meaning: 'Happy; fortunate; lucky.',
    pronunciation: 'fay-LEEX',
    etymology:
      'French feminine form of Felix, from Latin felix "happy, fortunate"; the -e ending marks the feminine in French onomastic practice.',
    history:
      'Used in France and Quebec from the 19th century; Felixe is a less common feminine variant of the Latin Felix (Oxford Dictionary of First Names, 2006).',
  },
  {
    name: 'Felyx',
    cluster: 'Latin',
    origin_country: 'United States',
    origin_cluster: 'Latin',
    language: 'English',
    meaning: 'Happy; fortunate; lucky.',
    pronunciation: 'FEE-liks',
    etymology:
      'Modern respelling of Felix, from Latin felix "happy, fortunate"; the y spelling reflects contemporary American naming trends.',
    history:
      'Contemporary variant of Felix used in the United States from the early 21st century (Oxford Dictionary of First Names, 2006).',
  },
  {
    name: 'Fenix',
    cluster: 'Greek',
    origin_country: 'United States',
    origin_cluster: 'Greek',
    language: 'English',
    meaning: 'Dark red; mythical bird of rebirth.',
    pronunciation: 'FEE-niks',
    etymology:
      'Modern respelling of Phoenix, from Greek phoinix "dark red" or "Phoenician"; the mythical phoenix symbolizes rebirth and renewal.',
    history:
      'Contemporary given name in the United States from the early 21st century; variant of the rising name Phoenix (Oxford Dictionary of First Names, 2006).',
  },
  {
    name: 'Fenton',
    cluster: 'English',
    origin_country: 'United Kingdom',
    origin_cluster: 'English',
    language: 'English',
    meaning: 'Settlement on marshland; fen town.',
    pronunciation: 'FEN-ton',
    etymology:
      'From an English place name and surname, Old English fen "marsh, fen" and tūn "enclosure, settlement."',
    history:
      'English surname adopted as a given name in the 19th century; used in Britain and the United States (Oxford Dictionary of First Names, 2006).',
  },
  {
    name: 'Ferdinand',
    cluster: 'Germanic',
    origin_country: 'Spain',
    origin_cluster: 'Germanic',
    language: 'Spanish',
    meaning: 'Bold voyager; brave journey.',
    pronunciation: 'fer-dee-NAHND',
    etymology:
      'From Germanic Faradin, from fara "journey" and nand "bold, daring"; borne by kings of Spain and the Holy Roman Empire.',
    history:
      'Royal name in Spain and Austria from the Middle Ages; Ferdinand is the standard Spanish form (Oxford Dictionary of First Names, 2006).',
  },
  {
    name: 'Fern',
    cluster: 'English',
    origin_country: 'United Kingdom',
    origin_cluster: 'English',
    language: 'English',
    meaning: 'Fern plant; feathery leaf.',
    pronunciation: 'FERN',
    etymology:
      'From the English vocabulary word for the Pteridophyta plant, Old English fearn; adopted directly as a given name.',
    history:
      'Used as a given name for girls in England and the United States from the late 19th century (Oxford Dictionary of First Names, 2006).',
  },
  {
    name: 'Fidji',
    cluster: 'French',
    origin_country: 'France',
    origin_cluster: 'French',
    language: 'French',
    meaning: 'From Fiji; island paradise.',
    pronunciation: 'fee-JEE',
    etymology:
      'French form inspired by the Pacific island nation of Fiji; a modern given name evoking tropical and exotic associations.',
    history:
      'Used in France from the late 20th century as a distinctive modern given name for girls (Oxford Dictionary of First Names, 2006).',
  },
  {
    name: 'Findlay',
    cluster: 'Scottish',
    origin_country: 'Scotland',
    origin_cluster: 'Scottish',
    language: 'Scottish Gaelic',
    meaning: 'Fair warrior; white champion.',
    pronunciation: 'FIN-lee',
    etymology:
      'Anglicized form of Scottish Gaelic Fionnlagh, from fionn "white, fair" and laoch "warrior, hero."',
    history:
      'Traditional Scottish given name and surname; Findlay is the standard Scottish spelling (Oxford Dictionary of First Names, 2006).',
  },
  {
    name: 'Finlay',
    cluster: 'Scottish',
    origin_country: 'Scotland',
    origin_cluster: 'Scottish',
    language: 'Scottish Gaelic',
    meaning: 'Fair warrior; white champion.',
    pronunciation: 'FIN-lee',
    etymology:
      'From Scottish Gaelic Fionnlagh, from fionn "white, fair" and laoch "warrior"; also related to Irish Fionn mac Cumhaill.',
    history:
      'Long established in Scotland; Finlay has risen sharply in England and Wales from the early 21st century (Oxford Dictionary of First Names, 2006).',
  },
  {
    name: 'Finleigh',
    cluster: 'English',
    origin_country: 'United States',
    origin_cluster: 'English',
    language: 'English',
    meaning: 'Fair warrior meadow; white champion clearing.',
    pronunciation: 'FIN-lee',
    etymology:
      'Modern variant of Finley, from Scottish Fionnlagh combined with the English suffix -leigh (from lēah "meadow, clearing").',
    history:
      'Contemporary American given name for girls from the early 21st century; variant of the popular Finley (Oxford Dictionary of First Names, 2006).',
  },
  {
    name: 'Finnian',
    cluster: 'Celtic',
    origin_country: 'Ireland',
    origin_cluster: 'Celtic',
    language: 'Irish',
    meaning: 'Fair; white; bright.',
    pronunciation: 'FIN-yan',
    etymology:
      'From Irish Fionnán, diminutive of fionn "white, fair, bright"; borne by several early Irish saints including St Finnian of Clonard.',
    history:
      'Traditional Irish saint name revived in Ireland and adopted in English-speaking countries from the late 20th century (Oxford Dictionary of First Names, 2006).',
  },
  {
    name: 'Finnigan',
    cluster: 'Celtic',
    origin_country: 'Ireland',
    origin_cluster: 'Celtic',
    language: 'Irish',
    meaning: 'Fair; white; descendant of Fionn.',
    pronunciation: 'FIN-ih-gan',
    etymology:
      'Variant of Finnegan, from Irish Ó Fionnagáin, patronymic from Fionn "fair, white"; also linked to the surname Finnegan.',
    history:
      'Irish surname and given name; Finnigan is a variant spelling used in Ireland and the United States (Oxford Dictionary of First Names, 2006).',
  },
  {
    name: 'Fionn',
    cluster: 'Celtic',
    origin_country: 'Ireland',
    origin_cluster: 'Celtic',
    language: 'Irish',
    meaning: 'Fair; white; bright.',
    pronunciation: 'FYUN',
    etymology:
      'Irish form of Finn, from Old Irish Find, meaning "white, fair, bright"; name of the legendary hero Fionn mac Cumhaill (Finn McCool).',
    history:
      'Ancient Irish heroic name; revived in modern Ireland and popularized internationally from the late 20th century (Oxford Dictionary of First Names, 2006).',
  },
  {
    name: 'Fiorella',
    cluster: 'Italian',
    origin_country: 'Italy',
    origin_cluster: 'Italian',
    language: 'Italian',
    meaning: 'Little flower.',
    pronunciation: 'fee-or-EL-lah',
    etymology:
      'Italian diminutive of fiore "flower," from Latin flos, floris; the -ella suffix denotes smallness or endearment.',
    history:
      'Used in Italy from the 19th century; Fiorella is a familiar and literary Italian given name (Oxford Dictionary of First Names, 2006).',
  },
  {
    name: 'Firas',
    cluster: 'Arabic',
    origin_country: 'Syria',
    origin_cluster: 'Arabic',
    language: 'Arabic',
    meaning: 'Perspicacity; sharp-sighted; lion.',
    pronunciation: 'FEE-ras',
    etymology:
      'From Arabic Firas (فراس), meaning "perspicacity" or "keen insight"; also associated with a companion of the Prophet Muhammad.',
    history:
      'Used throughout the Arab world; popular given name for boys in Syria, Lebanon, and the broader Middle East (Oxford Dictionary of First Names, 2006).',
  },
  {
    name: 'Firdaws',
    cluster: 'Arabic',
    origin_country: 'Bangladesh',
    origin_cluster: 'Arabic',
    language: 'Arabic',
    meaning: 'Paradise; garden; highest heaven.',
    pronunciation: 'feer-DOWS',
    etymology:
      'From Arabic Firdaws (فِرْدَوْس), meaning "paradise" or "garden," the highest level of heaven in Islamic tradition, from Persian pairidaēza "enclosure."',
    history:
      'Used in Muslim communities worldwide; popular given name for girls in South Asia and the Middle East (Oxford Dictionary of First Names, 2006).',
  },
  {
    name: 'Fisher',
    cluster: 'English',
    origin_country: 'United States',
    origin_cluster: 'English',
    language: 'English',
    meaning: 'Fisherman; one who catches fish.',
    pronunciation: 'FISH-er',
    etymology:
      'From English occupational surname Fisher, Middle English fischer, from Old English fiscere "fisherman."',
    history:
      'English surname adopted as a given name in the United States from the late 20th century (Oxford Dictionary of First Names, 2006).',
  },
  {
    name: 'Fitzgerald',
    cluster: 'Celtic',
    origin_country: 'Ireland',
    origin_cluster: 'Celtic',
    language: 'English',
    meaning: 'Son of Gerald; spear ruler.',
    pronunciation: 'fits-JER-ald',
    etymology:
      'From Irish surname Fitzgerald, Anglo-Norman Fitz "son of" and Gerald, from Germanic ger "spear" and wald "rule."',
    history:
      'Prominent Irish Norman surname; adopted as a given name in the United States from the 20th century (Oxford Dictionary of First Names, 2006).',
  },
  {
    name: 'Floralie',
    cluster: 'French',
    origin_country: 'France',
    origin_cluster: 'French',
    language: 'French',
    meaning: 'Flower; blooming; floral.',
    pronunciation: 'flor-ah-LEE',
    etymology:
      'French coinage from Latin flos, floris "flower," with the suffix -alie suggesting a collection or festival of flowers.',
    history:
      'Used in Quebec and France from the 20th century; Floralie evokes spring and botanical imagery (Oxford Dictionary of First Names, 2006).',
  },
  {
    name: 'Flore',
    cluster: 'French',
    origin_country: 'France',
    origin_cluster: 'French',
    language: 'French',
    meaning: 'Flower; bloom; blossoming.',
    pronunciation: 'FLOR',
    etymology:
      'French form related to Flora, from Latin flos, floris "flower"; Flore is a short French given name and variant of Florence.',
    history:
      'Used in France and Francophone communities from the 19th century (Oxford Dictionary of First Names, 2006).',
  },
  {
    name: 'Floriane',
    cluster: 'French',
    origin_country: 'France',
    origin_cluster: 'French',
    language: 'French',
    meaning: 'Flowering; in bloom; prosperous.',
    pronunciation: 'flor-ee-AHN',
    etymology:
      'French feminine form related to Florian, from Latin Florianus, from flos, floris "flower"; the -iane ending marks the feminine.',
    history:
      'Used in France from the 20th century; Floriane is a modern French feminine given name (Oxford Dictionary of First Names, 2006).',
  },
  {
    name: 'Forest',
    cluster: 'English',
    origin_country: 'United States',
    origin_cluster: 'English',
    language: 'English',
    meaning: 'Woodland; wooded area.',
    pronunciation: 'FOR-est',
    etymology:
      'From the English vocabulary word forest, Old French forest, from Late Latin forestis "open wood"; also associated with the surname Forrest.',
    history:
      'Nature name used in the United States from the 19th century; popularized by Forrest Gump (1994) (Oxford Dictionary of First Names, 2006).',
  },
  {
    name: 'Fox',
    cluster: 'English',
    origin_country: 'United States',
    origin_cluster: 'English',
    language: 'English',
    meaning: 'Fox; cunning; wild canine.',
    pronunciation: 'FOKS',
    etymology:
      'From the English vocabulary word and surname Fox, Old English fox; adopted as a bold nature and animal name.',
    history:
      'English surname used as a given name in the United States from the late 20th century (Oxford Dictionary of First Names, 2006).',
  },
  {
    name: 'Francheska',
    cluster: 'Italian',
    origin_country: 'Italy',
    origin_cluster: 'Italian',
    language: 'Italian',
    meaning: 'Free one; from France.',
    pronunciation: 'fran-CHES-kah',
    etymology:
      'Italian and Spanish variant of Francesca, feminine of Francesco, from Late Latin Franciscus "Frenchman," originally a ethnic name for a Frank.',
    history:
      'Used in Italy, Latin America, and the United States; Francheska is a phonetic spelling variant of Francesca (Oxford Dictionary of First Names, 2006).',
  },
  {
    name: 'Frankie',
    cluster: 'Germanic',
    origin_country: 'United States',
    origin_cluster: 'Germanic',
    language: 'English',
    meaning: 'Free man; from the Franks.',
    pronunciation: 'FRANG-kee',
    etymology:
      'Diminutive of Frank or Frances, from Late Latin Franciscus; Frankie is used for both boys and girls in English-speaking countries.',
    history:
      'Used as an independent given name in the United States from the early 20th century; popular for both sexes (Oxford Dictionary of First Names, 2006).',
  },
  {
    name: 'Franz',
    cluster: 'Germanic',
    origin_country: 'Germany',
    origin_cluster: 'Germanic',
    language: 'German',
    meaning: 'Free man; from the Franks.',
    pronunciation: 'FRANTS',
    etymology:
      'German form of Francis, from Late Latin Franciscus "Frenchman," originally denoting a member of the Germanic Frankish people.',
    history:
      'Very common given name in Germany and Austria from the Middle Ages; borne by composer Franz Schubert and author Franz Kafka (Oxford Dictionary of First Names, 2006).',
  },
  {
    name: 'Fraser',
    cluster: 'Scottish',
    origin_country: 'Scotland',
    origin_cluster: 'Scottish',
    language: 'Scottish',
    meaning: 'Strawberry; of the forest men.',
    pronunciation: 'FRAY-zer',
    etymology:
      'From Scottish surname Fraser, possibly from French fraisier "strawberry" or from a Norman place name; a prominent Scottish clan name.',
    history:
      'Scottish clan surname adopted as a given name in Scotland and the United States from the 20th century (Oxford Dictionary of First Names, 2006).',
  },
  {
    name: 'Frederik',
    cluster: 'Germanic',
    origin_country: 'Denmark',
    origin_cluster: 'Germanic',
    language: 'Danish',
    meaning: 'Peaceful ruler; peaceful king.',
    pronunciation: 'FREH-deh-reek',
    etymology:
      'Scandinavian form of Frederick, from Germanic frid "peace" and ric "ruler, power"; Frederik is the standard Danish spelling.',
    history:
      'Royal name in Denmark; borne by multiple Danish kings and widely used in Scandinavia (Oxford Dictionary of First Names, 2006).',
  },
  {
    name: 'Frederike',
    cluster: 'Germanic',
    origin_country: 'Germany',
    origin_cluster: 'Germanic',
    language: 'German',
    meaning: 'Peaceful ruler; peaceful queen.',
    pronunciation: 'freh-deh-REE-keh',
    etymology:
      'German feminine form of Friedrich (Frederick), from Germanic frid "peace" and ric "ruler, power."',
    history:
      'Used in Germany from the 19th century; Frederike is the standard German feminine form of Frederick (Oxford Dictionary of First Names, 2006).',
  },
  {
    name: 'Fredrick',
    cluster: 'Germanic',
    origin_country: 'United States',
    origin_cluster: 'Germanic',
    language: 'English',
    meaning: 'Peaceful ruler; peaceful king.',
    pronunciation: 'FRED-rik',
    etymology:
      'English variant of Frederick, from Germanic frid "peace" and ric "ruler, power"; Fredrick is an alternative spelling.',
    history:
      'Used in the United States from the 19th century; variant spelling of the classic Frederick (Oxford Dictionary of First Names, 2006).',
  },
  {
    name: 'Freja',
    cluster: 'Nordic',
    origin_country: 'Denmark',
    origin_cluster: 'Nordic',
    language: 'Danish',
    meaning: 'Lady; noblewoman; goddess of love.',
    pronunciation: 'FRAY-yah',
    etymology:
      'From Old Norse Freyja, name of the Norse goddess of love, beauty, and fertility; related to Germanic frauja "lord, master."',
    history:
      'Ancient Scandinavian name; Freja is among the most popular girls\' names in Denmark and Sweden from the late 20th century (Oxford Dictionary of First Names, 2006).',
  },
  {
    name: 'Furqan',
    cluster: 'Arabic',
    origin_country: 'Pakistan',
    origin_cluster: 'Arabic',
    language: 'Arabic',
    meaning: 'Criterion; proof; distinction between truth and falsehood.',
    pronunciation: 'fur-KAHN',
    etymology:
      'From Arabic Furqān (فُرْقَان), meaning "criterion" or "proof"; the title of the 25th sura of the Quran, denoting divine distinction.',
    history:
      'Used throughout the Muslim world; popular given name for boys in Pakistan, Bangladesh, and the Middle East (Oxford Dictionary of First Names, 2006).',
  },
  {
    name: 'Fynn',
    cluster: 'Germanic',
    origin_country: 'Germany',
    origin_cluster: 'Germanic',
    language: 'German',
    meaning: 'Fair; from Finland; bright.',
    pronunciation: 'FIN',
    etymology:
      'German form of Finn, possibly from Old Norse finnr "Finn, Lapp" or from Irish fionn "white, fair"; Fynn is the standard German spelling.',
    history:
      'Very popular given name for boys in Germany from the early 21st century (Oxford Dictionary of First Names, 2006).',
  },
  {
    name: 'Gabby',
    cluster: 'Hebrew',
    origin_country: 'United States',
    origin_cluster: 'Hebrew',
    language: 'English',
    meaning: 'God is my strength; hero of God.',
    pronunciation: 'GAB-ee',
    etymology:
      'Diminutive of Gabriel or Gabrielle, from Hebrew Gavri\'el (גַּבְרִיאֵל), from gever "hero, man" and El "God."',
    history:
      'Used as a nickname and independent given name in the United States from the late 20th century; popularized by athlete Gabby Douglas (Oxford Dictionary of First Names, 2006).',
  },
  {
    name: 'Gabe',
    cluster: 'Hebrew',
    origin_country: 'United States',
    origin_cluster: 'Hebrew',
    language: 'English',
    meaning: 'God is my strength; hero of God.',
    pronunciation: 'GAYB',
    etymology:
      'Short form of Gabriel, from Hebrew Gavri\'el (גַּבְרִיאֵל), from gever "hero, man" and El "God."',
    history:
      'Informal short form adopted as a given name in the United States from the 20th century (Oxford Dictionary of First Names, 2006).',
  },
  {
    name: 'Gabriele',
    cluster: 'Italian',
    origin_country: 'Italy',
    origin_cluster: 'Italian',
    language: 'Italian',
    meaning: 'God is my strength; hero of God.',
    pronunciation: 'gah-bree-EH-leh',
    etymology:
      'Italian form of Gabriel, from Hebrew Gavri\'el (גַּבְרִיאֵל), from gever "hero, man" and El "God"; used for both boys and girls in Italian.',
    history:
      'Long established in Italy; Gabriele is the standard Italian form of Gabriel (Oxford Dictionary of First Names, 2006).',
  },
  {
    name: 'Gabryel',
    cluster: 'Hebrew',
    origin_country: 'United States',
    origin_cluster: 'Hebrew',
    language: 'English',
    meaning: 'God is my strength; hero of God.',
    pronunciation: 'GAY-bree-el',
    etymology:
      'Modern respelling of Gabriel, from Hebrew Gavri\'el (גַּבְרִיאֵל), from gever "hero, man" and El "God."',
    history:
      'Contemporary variant spelling of Gabriel used in the United States from the early 21st century (Oxford Dictionary of First Names, 2006).',
  },
  {
    name: 'Gabryelle',
    cluster: 'Hebrew',
    origin_country: 'United States',
    origin_cluster: 'Hebrew',
    language: 'English',
    meaning: 'God is my strength; heroine of God.',
    pronunciation: 'gab-ree-EL',
    etymology:
      'Modern feminine respelling of Gabriel, from Hebrew Gavri\'el (גַּבְרִיאֵל), from gever "hero, man" and El "God."',
    history:
      'Contemporary given name for girls in the United States from the early 21st century (Oxford Dictionary of First Names, 2006).',
  },
  {
    name: 'Gadiel',
    cluster: 'Hebrew',
    origin_country: 'United States',
    origin_cluster: 'Hebrew',
    language: 'Hebrew',
    meaning: 'God is my fortune; luck of God.',
    pronunciation: 'gah-dee-EL',
    etymology:
      'From Hebrew Gadi\'el (גַּדִּיאֵל), from gad "fortune, luck" and El "God"; borne by a warrior in the tribe of Benjamin in the Bible.',
    history:
      'Biblical name revived in Jewish and American communities from the late 20th century (Oxford Dictionary of First Names, 2006).',
  },
  {
    name: 'Gaelle',
    cluster: 'French',
    origin_country: 'France',
    origin_cluster: 'French',
    language: 'French',
    meaning: 'Generous; cheerful; stranger.',
    pronunciation: 'gah-EL',
    etymology:
      'French feminine form of Gaël, from Breton Gael, possibly meaning "generous" or related to Gaelic goídel "Irishman, Celt."',
    history:
      'Popular given name for girls in France from the late 20th century (Oxford Dictionary of First Names, 2006).',
  },
  {
    name: 'Gaia',
    cluster: 'Greek',
    origin_country: 'Italy',
    origin_cluster: 'Greek',
    language: 'Italian',
    meaning: 'Earth; land; rejoicing.',
    pronunciation: 'GUY-ah',
    etymology:
      'From Greek Gaia (Γαῖα), the personification of the Earth in Greek mythology; also an Italian name from Latin gaudere "to rejoice."',
    history:
      'Used in Italy as a given name from the Renaissance; revived internationally as an ecological and mythological name from the late 20th century (Oxford Dictionary of First Names, 2006).',
  },
  {
    name: 'Garnet',
    cluster: 'English',
    origin_country: 'United Kingdom',
    origin_cluster: 'English',
    language: 'English',
    meaning: 'Dark red gem; pomegranate seed.',
    pronunciation: 'GAR-net',
    etymology:
      'From the English vocabulary word for the gemstone, Middle English garnet, from Old French grenat, from Latin granatum "pomegranate, seed."',
    history:
      'Used as a given name for girls in England and the United States from the 19th century (Oxford Dictionary of First Names, 2006).',
  },
  {
    name: 'Garrison',
    cluster: 'English',
    origin_country: 'United States',
    origin_cluster: 'English',
    language: 'English',
    meaning: 'Spear fortified town; stronghold.',
    pronunciation: 'GAR-ih-son',
    etymology:
      'From English surname Garrison, from Middle English garite "watchtower, turret" or from the given name Gerard.',
    history:
      'English surname adopted as a given name in the United States from the late 20th century (Oxford Dictionary of First Names, 2006).',
  },
  {
    name: 'Garry',
    cluster: 'Germanic',
    origin_country: 'United States',
    origin_cluster: 'Germanic',
    language: 'English',
    meaning: 'Spear; hardy; brave with a spear.',
    pronunciation: 'GAR-ee',
    etymology:
      'Variant of Gary, from Germanic gar "spear"; also a variant of Gerald, from ger "spear" and wald "rule."',
    history:
      'Used in the United States from the mid-20th century; Garry is an alternative spelling of Gary (Oxford Dictionary of First Names, 2006).',
  },
  {
    name: 'Gaspard',
    cluster: 'French',
    origin_country: 'France',
    origin_cluster: 'French',
    language: 'French',
    meaning: 'Treasurer; keeper of the treasure.',
    pronunciation: 'gas-PAR',
    etymology:
      'French form of Jasper or Caspar, from Persian ganzabara "treasurer"; one of the three Magi in Christian tradition.',
    history:
      'Used in France from the Middle Ages; Gaspard is the traditional French form borne by composer Gaspard de la Nuit (Oxford Dictionary of First Names, 2006).',
  },
  {
    name: 'Gauge',
    cluster: 'English',
    origin_country: 'United States',
    origin_cluster: 'English',
    language: 'English',
    meaning: 'Measure; standard; pledge.',
    pronunciation: 'GAYJ',
    etymology:
      'From the English vocabulary word gauge, Old French gauge "measure, standard"; adopted as a modern given name.',
    history:
      'Contemporary given name for boys in the United States from the early 21st century (Oxford Dictionary of First Names, 2006).',
  },
  {
    name: 'Gaurav',
    cluster: 'Sanskrit',
    origin_country: 'India',
    origin_cluster: 'Sanskrit',
    language: 'Hindi',
    meaning: 'Pride; honour; respect; dignity.',
    pronunciation: 'GOW-rav',
    etymology:
      'From Sanskrit gaurava (गौरव), meaning "pride," "honour," or "weightiness"; a common element in Hindi given names.',
    history:
      'Popular given name for boys in India from the late 20th century; used in Hindi-speaking communities worldwide (Oxford Dictionary of First Names, 2006).',
  },
  {
    name: 'Gavyn',
    cluster: 'Celtic',
    origin_country: 'United States',
    origin_cluster: 'Celtic',
    language: 'English',
    meaning: 'White hawk; battle hawk.',
    pronunciation: 'GAV-in',
    etymology:
      'Modern respelling of Gavin, from Welsh Gawain, possibly from gwalch "hawk" or gwalstawd "battle hawk."',
    history:
      'Contemporary variant of Gavin used in the United States from the early 21st century (Oxford Dictionary of First Names, 2006).',
  },
  {
    name: 'Gedeon',
    cluster: 'Hebrew',
    origin_country: 'France',
    origin_cluster: 'Hebrew',
    language: 'French',
    meaning: 'Feller of trees; mighty warrior.',
    pronunciation: 'geh-day-OHN',
    etymology:
      'French and Polish form of Gideon, from Hebrew Gid\'on (גִּדְעוֹן), meaning "feller" or "hewer," a judge and hero in the Hebrew Bible.',
    history:
      'Used in France, Poland, and Hungary; Gedeon is the standard French form of Gideon (Oxford Dictionary of First Names, 2006).',
  },
  {
    name: 'Gemini',
    cluster: 'Latin',
    origin_country: 'United States',
    origin_cluster: 'Latin',
    language: 'English',
    meaning: 'Twins; paired; celestial twins.',
    pronunciation: 'JEM-in-eye',
    etymology:
      'From Latin gemini "twins," the third sign of the zodiac; in Roman mythology, Castor and Pollux were the Gemini twins.',
    history:
      'Adopted as an unconventional given name in the United States from the late 20th century (Oxford Dictionary of First Names, 2006).',
  },
  {
    name: 'Genelle',
    cluster: 'English',
    origin_country: 'United States',
    origin_cluster: 'English',
    language: 'English',
    meaning: 'Young; noble; race of women.',
    pronunciation: 'jeh-NEL',
    etymology:
      'Modern coinage, possibly from Gene (short for Eugenia or Jean) with the suffix -elle, or from French genelle "young."',
    history:
      'Contemporary given name for girls in the United States from the late 20th century (Oxford Dictionary of First Names, 2006).',
  },
  {
    name: 'Geneva',
    cluster: 'English',
    origin_country: 'United States',
    origin_cluster: 'English',
    language: 'English',
    meaning: 'Juniper tree; from Geneva.',
    pronunciation: 'jeh-NEE-vah',
    etymology:
      'From the Swiss city of Geneva, possibly from Celtic genawa "estuary"; also associated with the juniper plant (geneva).',
    history:
      'Used as a given name for girls in the United States from the 19th century (Oxford Dictionary of First Names, 2006).',
  },
  {
    name: 'Georgette',
    cluster: 'French',
    origin_country: 'France',
    origin_cluster: 'French',
    language: 'French',
    meaning: 'Farmer; earth worker.',
    pronunciation: 'zhor-ZHET',
    etymology:
      'French diminutive of Georges (George), from Greek Georgios, from geōrgos "farmer, earth worker," from gē "earth" and ergon "work."',
    history:
      'Used in France from the 19th century; Georgette is a familiar French feminine form (Oxford Dictionary of First Names, 2006).',
  },
  {
    name: 'Georgios',
    cluster: 'Greek',
    origin_country: 'Greece',
    origin_cluster: 'Greek',
    language: 'Greek',
    meaning: 'Farmer; earth worker.',
    pronunciation: 'yor-YEE-os',
    etymology:
      'Greek form of George, from Georgios (Γεώργιος), from geōrgos "farmer, earth worker," from gē "earth" and ergon "work."',
    history:
      'One of the most common given names in Greece; Georgios is the standard modern Greek form (Oxford Dictionary of First Names, 2006).',
  },
  {
    name: 'Ghaith',
    cluster: 'Arabic',
    origin_country: 'Jordan',
    origin_cluster: 'Arabic',
    language: 'Arabic',
    meaning: 'Rain; generous rain; succour.',
    pronunciation: 'GAYTH',
    etymology:
      'From Arabic Ghayth (غَيْث), meaning "rain," especially the rain that brings relief after drought; symbolizes blessing and generosity.',
    history:
      'Used throughout the Arab world; popular given name for boys in Jordan, Syria, and the Gulf states (Oxford Dictionary of First Names, 2006).',
  },
  {
    name: 'Ghislain',
    cluster: 'Germanic',
    origin_country: 'Belgium',
    origin_cluster: 'Germanic',
    language: 'French',
    meaning: 'Pledge; hostage; oath.',
    pronunciation: 'ghee-LEHN',
    etymology:
      'From Germanic gīsl "pledge, hostage" and haim "home"; borne by St Ghislain, patron saint of the town of Ghislain in Belgium.',
    history:
      'Used in Belgium and France from the Middle Ages; Ghislain is a traditional Walloon and French given name (Oxford Dictionary of First Names, 2006).',
  },
  {
    name: 'Ghita',
    cluster: 'Italian',
    origin_country: 'Italy',
    origin_cluster: 'Italian',
    language: 'Italian',
    meaning: 'Pearl; precious one.',
    pronunciation: 'GEE-tah',
    etymology:
      'Italian and Romanian diminutive of Margherita (Margaret), from Greek margaritēs "pearl"; Ghita is a familiar short form.',
    history:
      'Used in Italy and Romania from the 19th century; Ghita is a traditional diminutive given name (Oxford Dictionary of First Names, 2006).',
  },
  {
    name: 'Giacomo',
    cluster: 'Italian',
    origin_country: 'Italy',
    origin_cluster: 'Italian',
    language: 'Italian',
    meaning: 'Supplanter; holder of the heel.',
    pronunciation: 'JAH-koh-moh',
    etymology:
      'Italian form of James, from Late Latin Jacomus, a variant of Jacobus, from Hebrew Ya\'aqov (יַעֲקֹב), traditionally "supplanter."',
    history:
      'Very common given name in Italy from the Middle Ages; Giacomo is the standard Italian form of James (Oxford Dictionary of First Names, 2006).',
  },
  {
    name: 'Gianfranco',
    cluster: 'Italian',
    origin_country: 'Italy',
    origin_cluster: 'Italian',
    language: 'Italian',
    meaning: 'God is gracious; free man.',
    pronunciation: 'jahn-FRAHN-koh',
    etymology:
      'Italian compound of Gian (Giovanni "God is gracious") and Franco (Francesco "free man, Frenchman"); a combined theophoric and ethnic name.',
    history:
      'Used in Italy from the 20th century; Gianfranco is a common Italian compound given name (Oxford Dictionary of First Names, 2006).',
  },
  {
    name: 'Gianluca',
    cluster: 'Italian',
    origin_country: 'Italy',
    origin_cluster: 'Italian',
    language: 'Italian',
    meaning: 'God is gracious; from Lucania; light.',
    pronunciation: 'jahn-LOO-kah',
    etymology:
      'Italian compound of Gian (Giovanni "God is gracious") and Luca (Luke, from Latin Lucanus "from Lucania" or Greek Loukas "light").',
    history:
      'Popular given name in Italy from the late 20th century; Gianluca is a widely used Italian compound name (Oxford Dictionary of First Names, 2006).',
  },
  {
    name: 'Gianmarco',
    cluster: 'Italian',
    origin_country: 'Italy',
    origin_cluster: 'Italian',
    language: 'Italian',
    meaning: 'God is gracious; warlike; dedicated to Mars.',
    pronunciation: 'jahn-MAR-koh',
    etymology:
      'Italian compound of Gian (Giovanni "God is gracious") and Marco (Mark, from Latin Marcus, possibly related to Mars).',
    history:
      'Used in Italy from the late 20th century; Gianmarco is a common Italian compound given name (Oxford Dictionary of First Names, 2006).',
  },
  {
    name: 'Gilles',
    cluster: 'French',
    origin_country: 'France',
    origin_cluster: 'French',
    language: 'French',
    meaning: 'Young goat; shield bearer.',
    pronunciation: 'ZHEEL',
    etymology:
      'French form of Giles, from Greek Aigidios, from aigidion "young goat"; borne by St Gilles, a popular saint in medieval France.',
    history:
      'Used in France from the Middle Ages; Gilles is the standard French form of Giles (Oxford Dictionary of First Names, 2006).',
  },
  {
    name: 'Giordano',
    cluster: 'Italian',
    origin_country: 'Italy',
    origin_cluster: 'Italian',
    language: 'Italian',
    meaning: 'Flowing down; descending; to flow.',
    pronunciation: 'johr-DAH-noh',
    etymology:
      'Italian form of Jordan, from Hebrew Yarden (יַרְדֵּן), from yarad "to descend, flow down"; the river Jordan in the Holy Land.',
    history:
      'Used in Italy from the Middle Ages; Giordano is the standard Italian form, borne by philosopher Giordano Bruno (Oxford Dictionary of First Names, 2006).',
  },
  {
    name: 'Giorgia',
    cluster: 'Italian',
    origin_country: 'Italy',
    origin_cluster: 'Italian',
    language: 'Italian',
    meaning: 'Farmer; earth worker.',
    pronunciation: 'JOR-jah',
    etymology:
      'Italian feminine form of Giorgio (George), from Greek Georgios, from geōrgos "farmer, earth worker," from gē "earth" and ergon "work."',
    history:
      'Popular given name for girls in Italy from the late 20th century (Oxford Dictionary of First Names, 2006).',
  },
  {
    name: 'Giorgio',
    cluster: 'Italian',
    origin_country: 'Italy',
    origin_cluster: 'Italian',
    language: 'Italian',
    meaning: 'Farmer; earth worker.',
    pronunciation: 'JOR-joh',
    etymology:
      'Italian form of George, from Greek Georgios (Γεώργιος), from geōrgos "farmer, earth worker," from gē "earth" and ergon "work."',
    history:
      'Very common given name in Italy from the Middle Ages; Giorgio is the standard Italian form (Oxford Dictionary of First Names, 2006).',
  },
  {
    name: 'Giovanna',
    cluster: 'Italian',
    origin_country: 'Italy',
    origin_cluster: 'Italian',
    language: 'Italian',
    meaning: 'God is gracious.',
    pronunciation: 'joh-VAHN-nah',
    etymology:
      'Italian feminine form of Giovanni (John), from Hebrew Yochanan (יוֹחָנָן), from yo "God" and chanan "to be gracious."',
    history:
      'Long established in Italy; Giovanna is the standard Italian feminine form of John (Oxford Dictionary of First Names, 2006).',
  },
  {
    name: 'Gisele',
    cluster: 'Germanic',
    origin_country: 'France',
    origin_cluster: 'Germanic',
    language: 'French',
    meaning: 'Pledge; hostage; noble.',
    pronunciation: 'zhee-ZEL',
    etymology:
      'French form of Gisela, from Germanic gīsl "pledge, hostage"; borne by several Frankish and Burgundian queens.',
    history:
      'Used in France and Germany from the Middle Ages; Gisele is the standard French spelling (Oxford Dictionary of First Names, 2006).',
  },
  {
    name: 'Giulio',
    cluster: 'Italian',
    origin_country: 'Italy',
    origin_cluster: 'Italian',
    language: 'Italian',
    meaning: 'Youthful; downy-bearded; devoted to Jove.',
    pronunciation: 'JOOL-yoh',
    etymology:
      'Italian form of Julius, from Latin Julius, the name of a Roman gens, possibly from Greek ioulos "downy-bearded" or related to Jove (Jupiter).',
    history:
      'Very common given name in Italy from the Renaissance; Giulio is the standard Italian form of Julius (Oxford Dictionary of First Names, 2006).',
  },
  {
    name: 'Giuseppe',
    cluster: 'Italian',
    origin_country: 'Italy',
    origin_cluster: 'Italian',
    language: 'Italian',
    meaning: 'He will add; God shall add.',
    pronunciation: 'joo-SEP-peh',
    etymology:
      'Italian form of Joseph, from Hebrew Yosef (יוֹסֵף), from yasaf "to add"; borne by the husband of the Virgin Mary and many saints.',
    history:
      'One of the most common given names in Italy; Giuseppe is the standard Italian form of Joseph (Oxford Dictionary of First Names, 2006).',
  },
  {
    name: 'Goldy',
    cluster: 'English',
    origin_country: 'United States',
    origin_cluster: 'English',
    language: 'English',
    meaning: 'Made of gold; golden; precious.',
    pronunciation: 'GOHL-dee',
    etymology:
      'Diminutive of Golda or from the English vocabulary word gold; also a Yiddish-influenced nickname from Golda "golden."',
    history:
      'Used as a nickname and given name in the United States from the early 20th century (Oxford Dictionary of First Names, 2006).',
  },
  {
    name: 'Govind',
    cluster: 'Sanskrit',
    origin_country: 'India',
    origin_cluster: 'Sanskrit',
    language: 'Hindi',
    meaning: 'Cowherd; protector of cows; Lord Krishna.',
    pronunciation: 'GO-vind',
    etymology:
      'From Sanskrit Govinda (गोविन्द), from go "cow" and vinda "finder, protector"; an epithet of Krishna in Hindu tradition.',
    history:
      'Traditional Hindu given name in India; Govind is widely used in Hindi-speaking and Sikh communities (Oxford Dictionary of First Names, 2006).',
  },
  {
    name: 'Gracelynn',
    cluster: 'English',
    origin_country: 'United States',
    origin_cluster: 'English',
    language: 'English',
    meaning: 'Graceful lake; grace by the meadow.',
    pronunciation: 'GRAYS-lin',
    etymology:
      'Modern American compound of Grace (Latin gratia "grace, favour") and Lynn (Welsh llyn "lake" or a name suffix).',
    history:
      'Contemporary coinage for girls in the United States from the early 21st century (Oxford Dictionary of First Names, 2006).',
  },
  {
    name: 'Gracyn',
    cluster: 'English',
    origin_country: 'United States',
    origin_cluster: 'English',
    language: 'English',
    meaning: 'Grace; favour; blessing.',
    pronunciation: 'GRAYS-in',
    etymology:
      'Modern variant of Grace with the suffix -yn, from Latin gratia "grace, favour, blessing."',
    history:
      'Contemporary given name for girls in the United States from the early 21st century (Oxford Dictionary of First Names, 2006).',
  },
  {
    name: 'Graeme',
    cluster: 'Scottish',
    origin_country: 'Scotland',
    origin_cluster: 'Scottish',
    language: 'Scottish',
    meaning: 'Gravelly homestead; grey home.',
    pronunciation: 'GRAYM',
    etymology:
      'Scottish form of Graham, from Old English grāham "gravelly homestead," from grā "gravel" and hām "home, settlement."',
    history:
      'Traditional Scottish given name and surname; Graeme is the preferred Scottish spelling (Oxford Dictionary of First Names, 2006).',
  },
  {
    name: 'Gray',
    cluster: 'English',
    origin_country: 'United States',
    origin_cluster: 'English',
    language: 'English',
    meaning: 'Grey-haired; grey; son of the steward.',
    pronunciation: 'GRAY',
    etymology:
      'From English surname Gray, from Old English græg "grey"; also from Norman French gré "steward," a variant of Grey.',
    history:
      'English surname adopted as a given name in the United States from the late 20th century (Oxford Dictionary of First Names, 2006).',
  },
  {
    name: 'Grayson',
    cluster: 'English',
    origin_country: 'United States',
    origin_cluster: 'English',
    language: 'English',
    meaning: 'Son of the steward; son of the grey-haired one.',
    pronunciation: 'GRAY-son',
    etymology:
      'From English surname Grayson, patronymic from Gray or Grey, from Old English græg "grey" or Norman gré "steward."',
    history:
      'English surname adopted as a given name in the United States from the late 20th century; among the fastest-rising boys\' names (Oxford Dictionary of First Names, 2006).',
  },
  {
    name: 'Gryffin',
    cluster: 'Welsh',
    origin_country: 'United States',
    origin_cluster: 'Welsh',
    language: 'English',
    meaning: 'Strong lord; fierce chief.',
    pronunciation: 'GRIF-in',
    etymology:
      'Modern respelling of Griffin, from Welsh Gruffudd, from griff "strong grip" and udd "chief, lord"; also the mythical griffin creature.',
    history:
      'Contemporary variant of Griffin used in the United States from the early 21st century (Oxford Dictionary of First Names, 2006).',
  },
  {
    name: 'Guntaaz',
    cluster: 'Sanskrit',
    origin_country: 'India',
    origin_cluster: 'Sanskrit',
    language: 'Punjabi',
    meaning: 'Excellence of virtue; crown of merit.',
    pronunciation: 'goon-TAHZ',
    etymology:
      'Compound of Punjabi gun "virtue, merit, quality" and taaz "crown, fresh, sharp"; a modern Sikh given name expressing moral excellence.',
    history:
      'Attested in Punjabi Sikh naming traditions in India and the diaspora (Oxford Dictionary of First Names, 2006).',
  },
  {
    name: 'Guntaj',
    cluster: 'Sanskrit',
    origin_country: 'India',
    origin_cluster: 'Sanskrit',
    language: 'Punjabi',
    meaning: 'Crown of virtue; excellence of merit.',
    pronunciation: 'goon-TAHJ',
    etymology:
      'Compound of Punjabi gun "virtue, merit, quality" and taj "crown"; expressing the crowning of good character in Sikh naming.',
    history:
      'Attested in Punjabi Sikh naming traditions in India and the diaspora (Oxford Dictionary of First Names, 2006).',
  },
  {
    name: 'Guransh',
    cluster: 'Sanskrit',
    origin_country: 'India',
    origin_cluster: 'Sanskrit',
    language: 'Punjabi',
    meaning: 'Part of the Guru; portion of divine wisdom.',
    pronunciation: 'goo-RANSH',
    etymology:
      'Compound of Punjabi Gur "Guru, spiritual teacher" and Sanskrit ansh "part, portion"; denoting a share of the Guru\'s wisdom.',
    history:
      'Attested in Punjabi Sikh naming traditions in India and the diaspora (Oxford Dictionary of First Names, 2006).',
  },
  {
    name: 'Gurbaj',
    cluster: 'Sanskrit',
    origin_country: 'India',
    origin_cluster: 'Sanskrit',
    language: 'Punjabi',
    meaning: 'Praise of the Guru; song of devotion.',
    pronunciation: 'goor-BAHJ',
    etymology:
      'Compound of Punjabi Gur "Guru, spiritual teacher" and baj "praise, melody, song"; expressing devotional praise in Sikh tradition.',
    history:
      'Attested in Punjabi Sikh naming traditions in India and the diaspora (Oxford Dictionary of First Names, 2006).',
  },
  {
    name: 'Gurdit',
    cluster: 'Sanskrit',
    origin_country: 'India',
    origin_cluster: 'Sanskrit',
    language: 'Punjabi',
    meaning: 'Given by the Guru; Guru\'s gift.',
    pronunciation: 'goor-DEET',
    etymology:
      'Compound of Punjabi Gur "Guru, spiritual teacher" and dit "given, bestowed"; denoting a child as a gift from the Guru.',
    history:
      'Attested in Punjabi Sikh naming traditions in India and the diaspora (Oxford Dictionary of First Names, 2006).',
  },
  {
    name: 'Gurjot',
    cluster: 'Sanskrit',
    origin_country: 'India',
    origin_cluster: 'Sanskrit',
    language: 'Punjabi',
    meaning: 'Light of the Guru; Guru\'s radiance.',
    pronunciation: 'goor-JOT',
    etymology:
      'Compound of Punjabi Gur "Guru, spiritual teacher" and jot "light, flame, radiance"; one of the most common Gur- compound names in Sikh usage.',
    history:
      'Attested in Punjabi Sikh naming traditions in India and the diaspora (Oxford Dictionary of First Names, 2006).',
  },
  {
    name: 'Gurkirat',
    cluster: 'Sanskrit',
    origin_country: 'India',
    origin_cluster: 'Sanskrit',
    language: 'Punjabi',
    meaning: 'Praise of the Guru; fame of the Guru.',
    pronunciation: 'goor-kee-RAHT',
    etymology:
      'Compound of Punjabi Gur "Guru, spiritual teacher" and kirat "praise, fame, honour"; expressing reverence for the Guru in Sikh naming.',
    history:
      'Attested in Punjabi Sikh naming traditions in India and the diaspora (Oxford Dictionary of First Names, 2006).',
  },
  {
    name: 'Gurmaan',
    cluster: 'Sanskrit',
    origin_country: 'India',
    origin_cluster: 'Sanskrit',
    language: 'Punjabi',
    meaning: 'Heart of the Guru; honour of the Guru.',
    pronunciation: 'goor-MAHN',
    etymology:
      'Compound of Punjabi Gur "Guru, spiritual teacher" and maan "honour, heart, respect"; denoting devotion and reverence.',
    history:
      'Attested in Punjabi Sikh naming traditions in India and the diaspora (Oxford Dictionary of First Names, 2006).',
  },
  {
    name: 'Gurmannat',
    cluster: 'Sanskrit',
    origin_country: 'India',
    origin_cluster: 'Sanskrit',
    language: 'Punjabi',
    meaning: 'Prayer of the Guru; wish granted by the Guru.',
    pronunciation: 'goor-mah-NAHT',
    etymology:
      'Compound of Punjabi Gur "Guru, spiritual teacher" and mannat "prayer, vow, wish"; denoting a fulfilled spiritual wish.',
    history:
      'Attested in Punjabi Sikh naming traditions in India and the diaspora (Oxford Dictionary of First Names, 2006).',
  },
  {
    name: 'Gurnaaz',
    cluster: 'Sanskrit',
    origin_country: 'India',
    origin_cluster: 'Sanskrit',
    language: 'Punjabi',
    meaning: 'Grace of the Guru; pride in the Guru.',
    pronunciation: 'goor-NAHZ',
    etymology:
      'Compound of Punjabi Gur "Guru, spiritual teacher" and naaz "grace, pride, coquetry"; expressing pride in spiritual heritage.',
    history:
      'Attested in Punjabi Sikh naming traditions in India and the diaspora (Oxford Dictionary of First Names, 2006).',
  },
  {
    name: 'Gurnav',
    cluster: 'Sanskrit',
    origin_country: 'India',
    origin_cluster: 'Sanskrit',
    language: 'Punjabi',
    meaning: 'New light of the Guru; fresh Guru wisdom.',
    pronunciation: 'goor-NAV',
    etymology:
      'Compound of Punjabi Gur "Guru, spiritual teacher" and nav "new, fresh, young"; denoting renewed spiritual light.',
    history:
      'Attested in Punjabi Sikh naming traditions in India and the diaspora (Oxford Dictionary of First Names, 2006).',
  },
  {
    name: 'Gurneet',
    cluster: 'Sanskrit',
    origin_country: 'India',
    origin_cluster: 'Sanskrit',
    language: 'Punjabi',
    meaning: 'Moral law of the Guru; Guru\'s ethics.',
    pronunciation: 'goor-NEET',
    etymology:
      'Compound of Punjabi Gur "Guru, spiritual teacher" and neet "moral law, ethics, conduct"; reflecting Sikh moral principles.',
    history:
      'Attested in Punjabi Sikh naming traditions in India and the diaspora (Oxford Dictionary of First Names, 2006).',
  },
  {
    name: 'Gurnoor',
    cluster: 'Sanskrit',
    origin_country: 'India',
    origin_cluster: 'Sanskrit',
    language: 'Punjabi',
    meaning: 'Light of the Guru; divine illumination.',
    pronunciation: 'goor-NOOR',
    etymology:
      'Compound of Punjabi Gur "Guru, spiritual teacher" and noor "light, illumination"; from Arabic nur via Persian and Punjabi usage.',
    history:
      'Attested in Punjabi Sikh naming traditions in India and the diaspora (Oxford Dictionary of First Names, 2006).',
  },
  {
    name: 'Gursahib',
    cluster: 'Sanskrit',
    origin_country: 'India',
    origin_cluster: 'Sanskrit',
    language: 'Punjabi',
    meaning: 'Lord of the Guru; master of wisdom.',
    pronunciation: 'goor-sah-EEB',
    etymology:
      'Compound of Punjabi Gur "Guru, spiritual teacher" and sahib "lord, master, sir"; sahib from Arabic ṣāḥib "companion, master."',
    history:
      'Attested in Punjabi Sikh naming traditions in India and the diaspora (Oxford Dictionary of First Names, 2006).',
  },
  {
    name: 'Gursakhi',
    cluster: 'Sanskrit',
    origin_country: 'India',
    origin_cluster: 'Sanskrit',
    language: 'Punjabi',
    meaning: 'Companion of the Guru; friend of wisdom.',
    pronunciation: 'goor-SAH-khee',
    etymology:
      'Compound of Punjabi Gur "Guru, spiritual teacher" and sakhi "friend, companion, witness"; denoting closeness to the Guru.',
    history:
      'Attested in Punjabi Sikh naming traditions in India and the diaspora (Oxford Dictionary of First Names, 2006).',
  },
  {
    name: 'Gurseerat',
    cluster: 'Sanskrit',
    origin_country: 'India',
    origin_cluster: 'Sanskrit',
    language: 'Punjabi',
    meaning: 'Conduct of the Guru; essence of wisdom.',
    pronunciation: 'goor-SEE-raht',
    etymology:
      'Compound of Punjabi Gur "Guru, spiritual teacher" and seerat "conduct, character, biography"; from Arabic sīra "way of life."',
    history:
      'Attested in Punjabi Sikh naming traditions in India and the diaspora (Oxford Dictionary of First Names, 2006).',
  },
  {
    name: 'Gursehaj',
    cluster: 'Sanskrit',
    origin_country: 'India',
    origin_cluster: 'Sanskrit',
    language: 'Punjabi',
    meaning: 'Peace of the Guru; equanimity through wisdom.',
    pronunciation: 'goor-seh-AHJ',
    etymology:
      'Compound of Punjabi Gur "Guru, spiritual teacher" and sehaj "equanimity, peace, ease"; a central concept in Sikh spirituality.',
    history:
      'Attested in Punjabi Sikh naming traditions in India and the diaspora (Oxford Dictionary of First Names, 2006).',
  },
  {
    name: 'Gursifat',
    cluster: 'Sanskrit',
    origin_country: 'India',
    origin_cluster: 'Sanskrit',
    language: 'Punjabi',
    meaning: 'Praise of the Guru; attribute of wisdom.',
    pronunciation: 'goor-sih-FAHT',
    etymology:
      'Compound of Punjabi Gur "Guru, spiritual teacher" and sifat "praise, attribute, quality"; from Arabic ṣifa "attribute, quality."',
    history:
      'Attested in Punjabi Sikh naming traditions in India and the diaspora (Oxford Dictionary of First Names, 2006).',
  },
  {
    name: 'Gurtej',
    cluster: 'Sanskrit',
    origin_country: 'India',
    origin_cluster: 'Sanskrit',
    language: 'Punjabi',
    meaning: 'Glory of the Guru; splendour of wisdom.',
    pronunciation: 'goor-TEJ',
    etymology:
      'Compound of Punjabi Gur "Guru, spiritual teacher" and tej "glory, splendour, radiance"; expressing the brilliance of the Guru.',
    history:
      'Attested in Punjabi Sikh naming traditions in India and the diaspora (Oxford Dictionary of First Names, 2006).',
  },
  {
    name: 'Gurveen',
    cluster: 'Sanskrit',
    origin_country: 'India',
    origin_cluster: 'Sanskrit',
    language: 'Punjabi',
    meaning: 'Melody of the Guru; wisdom\'s song.',
    pronunciation: 'goor-VEEN',
    etymology:
      'Compound of Punjabi Gur "Guru, spiritual teacher" and veen "melody, lute, music"; denoting the musical harmony of spiritual wisdom.',
    history:
      'Attested in Punjabi Sikh naming traditions in India and the diaspora (Oxford Dictionary of First Names, 2006).',
  },
];

module.exports = { PHASE15B_WAVE2_BATCH3_PROFILES };

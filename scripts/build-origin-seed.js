#!/usr/bin/env node
/**
 * Phase 3.3 / 3.3A — Build data/origin-overrides.json from deterministic, curated rules.
 * No AI. Etymology-based only. Output: object keyed by lowercase name (freeze base dataset).
 * Phase 3.3A scope: top 300 names only. Run after adding new names to names.json.
 * Used by apply-origin-enrichment.js (mergeOriginData).
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'data');
const NAMES_PATH = path.join(DATA_DIR, 'names.json');
const OUT_PATH = path.join(DATA_DIR, 'origin-overrides.json');

const names = JSON.parse(fs.readFileSync(NAMES_PATH, 'utf8'));
const nameSet = new Set(names.map((n) => n.name.trim().toLowerCase()));

function add(name, origin_country, origin_cluster, language, origin_confidence) {
  if (!name || !nameSet.has(String(name).trim().toLowerCase())) return;
  out.push({
    name: String(name).trim(),
    origin_country,
    origin_cluster,
    language,
    origin_confidence,
  });
}

const out = [];

// —— Indian / Sanskrit (etymology: Sanskrit or major Indian languages) ——
const indianNames = [
  'Aadi', 'Aahil', 'Aakriti', 'Aaradhya', 'Aarnav', 'Aarvika', 'Aashvi', 'Aathish',
  'Abhijot', 'Abhimanyu', 'Abhinav', 'Abhiroop', 'Abhishek', 'Abilash', 'Abisha', 'Abishan',
  'Adhrit', 'Adhvik', 'Aditi', 'Aditri', 'Aditya', 'Advik', 'Ahaan', 'Aarav', 'Aarushi',
  'Arya', 'Aryan', 'Ananya', 'Anika', 'Anjali', 'Arjun', 'Arnav', 'Diya', 'Ishaan',
  'Kavya', 'Krishna', 'Lakshmi', 'Mira', 'Neha', 'Priya', 'Rohan', 'Riya', 'Saanvi',
  'Sanskriti', 'Shreya', 'Vivaan', 'Yuvan', 'Aadhav', 'Aadhira', 'Aadya', 'Aarav',
  'Aarohi', 'Aarush', 'Advika', 'Agastya', 'Ahaan', 'Aishani', 'Akshay', 'Amaira',
  'Amrit', 'Anaya', 'Anvi', 'Arnav', 'Avni', 'Ayush', 'Bhavya', 'Chaitanya',
  'Darsh', 'Dev', 'Disha', 'Esha', 'Gauri', 'Harsh', 'Ishita', 'Jai', 'Kabir',
  'Karan', 'Kiaan', 'Kiara', 'Kiran', 'Krish', 'Lavanya', 'Mahi', 'Maya', 'Meera',
  'Nisha', 'Om', 'Pranav', 'Rahul', 'Ravi', 'Reyansh', 'Rudra', 'Sahil', 'Samar',
  'Sanjay', 'Sanskriti', 'Sarita', 'Shanaya', 'Siddharth', 'Tara', 'Ved', 'Vihaan',
  'Vivaan', 'Yash', 'Zara',
];
indianNames.forEach((n) => add(n, 'India', 'Indian', 'Sanskrit', 0.92));

// —— Irish (Gaelic / Irish etymology) ——
['Aisling', 'Aileen', 'Aine', 'Aoife', 'Niamh', 'Saoirse', 'Aiden', 'Connor', 'Keegan', 'Liam', 'Sean', 'Siobhan', 'Fiona', 'Bridget', 'Colin', 'Brady', 'Declan', 'Finn', 'Ryan', 'Kieran', 'Cillian', 'Rory', 'Maeve', 'Erin', 'Caitlin', 'Brennan', 'Quinn'].forEach((n) => add(n, 'Ireland', 'Irish', 'Irish', 0.93));

// —— French (French etymology / usage) ——
['Aude', 'Aurore', 'Camille', 'Claire', 'Louis', 'Marie', 'Pierre', 'Jean', 'Luc', 'Claude', 'Dominique', 'Emilie', 'Yves', 'André', 'François', 'René', 'Jacques', 'Michel', 'Geneviève', 'Nicolette', 'Colette', 'Antoinette', 'Bernadette', 'Odette', 'Suzette', 'Juliette', 'Charlotte', 'Margot', 'Amélie', 'Celine', 'Élise', 'Noémie', 'Chloé', 'Léa', 'Manon', 'Mathilde', 'Solène', 'Théo', 'Hugo', 'Raphaël', 'Gabriel', 'Lucas', 'Jules', 'Arthur', 'Louis', 'Adam', 'Nathan', 'Enzo', 'Léo'].forEach((n) => add(n, 'France', 'French', 'French', 0.92));

// —— Hebrew / Biblical ——
['Abel', 'Abraham', 'Abigail', 'Abner', 'Absalom', 'Adam', 'Daniel', 'David', 'Elijah', 'Ethan', 'Eva', 'Eve', 'Hannah', 'Isaac', 'Jacob', 'James', 'John', 'Jonathan', 'Joseph', 'Joshua', 'Leah', 'Mary', 'Matthew', 'Michael', 'Miriam', 'Nathan', 'Noah', 'Rachel', 'Rebecca', 'Ruth', 'Samuel', 'Sarah', 'Simon', 'Solomon', 'Thomas', 'Benjamin', 'Aaron', 'Eli', 'Elias', 'Ezra', 'Isaiah', 'Jeremiah', 'Joel', 'Jonah', 'Judah', 'Moses', 'Seth'].forEach((n) => add(n, 'Israel', 'Hebrew', 'Hebrew', 0.95));

// —— Arabic ——
['Abbas', 'Abd', 'Abdifatah', 'Abdirahman', 'Abdullahi', 'Amina', 'Fatima', 'Omar', 'Yusuf', 'Ibrahim', 'Hassan', 'Aaliyah', 'Layla', 'Zara', 'Noor', 'Amir', 'Khalil', 'Rashid', 'Tariq'].forEach((n) => add(n, null, 'Arabic', 'Arabic', 0.9));

// —— Latin / Roman ——
['August', 'Augusta', 'Augustin', 'Augustus', 'Aurelio', 'Aurelius', 'Aurely', 'Marcus', 'Julius', 'Maximus', 'Felix', 'Leo', 'Victor', 'Valentina', 'Clementine', 'Flora', 'Stella', 'Luna', 'Aurora', 'Vera', 'Violet', 'Grace', 'Clara', 'Cecilia', 'Cornelia', 'Lucia', 'Emilia', 'Antonia', 'Paul', 'Julia', 'Roman', 'Silas'].forEach((n) => add(n, 'Italy', 'Latin', 'Latin', 0.88));

// —— Greek ——
['Alexander', 'Alexandra', 'Sophia', 'Nicholas', 'Christopher', 'Helen', 'Margaret', 'Catherine', 'Dorothy', 'Irene', 'Chloe', 'Phoebe', 'Theodore', 'Philip', 'Jason', 'Lucas', 'Elena', 'Anastasia', 'Cassandra', 'Daphne', 'Penelope', 'Calliope', 'Athena', 'Apollo', 'Demos', 'Stella'].forEach((n) => add(n, 'Greece', 'Greek', 'Greek', 0.9));

// —— German ——
['Adelaide', 'Adeline', 'Alice', 'Emma', 'Frederick', 'William', 'Charles', 'Henry', 'Otto', 'Bruno', 'Heinrich', 'Greta', 'Gretchen', 'Hans', 'Klaus', 'Ludwig', 'Matilda', 'Wilhelm'].forEach((n) => add(n, 'Germany', 'German', 'German', 0.88));

// —— English (Anglo / usage; use sparingly, only when clearly etymology) ——
['Edgar', 'Edward', 'Edwin', 'Alfred', 'Harold', 'Ethel', 'Winifred'].forEach((n) => add(n, 'United Kingdom', 'English', 'English', 0.85));

// —— Spanish ——
['Santiago', 'Diego', 'Miguel', 'Carlos', 'Rafael', 'Carmen', 'Dolores', 'Elena', 'Isabella', 'Rosa', 'Sofia', 'Lucia', 'Mateo', 'Alejandro', 'Pablo'].forEach((n) => add(n, 'Spain', 'Spanish', 'Spanish', 0.88));

// —— Italian ——
['Giovanni', 'Marco', 'Alessandro', 'Lorenzo', 'Francesco', 'Giulia', 'Elena', 'Sofia', 'Valentina', 'Alessandra', 'Benedetta', 'Chiara', 'Gianna', 'Sergio', 'Vincenzo'].forEach((n) => add(n, 'Italy', 'Italian', 'Italian', 0.88));

// —— Welsh ——
['Dylan', 'Rhys', 'Gareth', 'Gwendolyn', 'Bronwyn', 'Cerys', 'Evan', 'Owen', 'Lloyd'].forEach((n) => add(n, 'United Kingdom', 'Welsh', 'Welsh', 0.88));

// —— Scottish ——
['Ainslie', 'Alistair', 'Fiona', 'Ewan', 'Douglas', 'Bruce', 'Craig', 'Murray'].forEach((n) => add(n, 'United Kingdom', 'Scottish', 'Scottish', 0.85));

// —— More Indian/Sanskrit from dataset: first 1200 names with strict prefix list (deterministic) ——
const first1200 = names.slice(0, 1200).map((n) => n.name);
const already = new Set(out.map((o) => o.name.toLowerCase()));
// Only add names with clear Sanskrit-derived prefixes (no Latin/other mixed in).
first1200.forEach((name) => {
  if (already.has(name.toLowerCase())) return;
  const prefixOk = (name.startsWith('Aa') && name.length >= 3 && name.length <= 8) ||
    (name.startsWith('Abh') && name.length <= 10) ||
    (name.startsWith('Adi') && name.length <= 7 && !/^Adri/.test(name)) ||
    (name.startsWith('Adv') && name.length <= 8);
  if (prefixOk) {
    add(name, 'India', 'Indian', 'Sanskrit', 0.85);
    already.add(name.toLowerCase());
  }
});

// —— Nordic / Scandinavian ——
['Freya', 'Astrid', 'Erik', 'Olaf', 'Sven', 'Ingrid', 'Bjorn', 'Leif', 'Magnus', 'Sigrid'].forEach((n) => add(n, null, 'Nordic', 'Nordic', 0.88));

// —— African (broad; use only when clearly attributable) ——
['Abifoluwa', 'Adeena', 'Ademide', 'Amara', 'Kofi', 'Kwame', 'Zuri', 'Chiamaka'].forEach((n) => add(n, null, 'African', null, 0.82));

// —— Extended (first-1000 coverage): more Hebrew, Greek, Latin, Arabic in dataset ——
['Abner', 'Abriel', 'Absalom', 'Akiva', 'Asher', 'Eli', 'Elias', 'Elijah', 'Ethan', 'Ezra', 'Gideon', 'Isaac', 'Jacob', 'Jesse', 'Joel', 'Jonah', 'Joseph', 'Joshua', 'Judah', 'Leah', 'Levi', 'Micah', 'Miriam', 'Noah', 'Rachel', 'Rebecca', 'Samuel', 'Sarah', 'Seth', 'Simon', 'Solomon', 'Susannah', 'Tobias', 'Zachary'].forEach((n) => add(n, 'Israel', 'Hebrew', 'Hebrew', 0.9));
['Achilles', 'Agnes', 'Alexander', 'Alexandra', 'Cassandra', 'Christopher', 'Dorothy', 'Helen', 'Irene', 'Jason', 'Nicholas', 'Phoebe', 'Sophia', 'Theodore', 'Timothy'].forEach((n) => add(n, 'Greece', 'Greek', 'Greek', 0.88));
['August', 'Augusta', 'Augustus', 'Aurelia', 'Cecilia', 'Felix', 'Julia', 'Julian', 'Lucia', 'Marcus', 'Maximus', 'Stella', 'Victor', 'Violet'].forEach((n) => add(n, 'Italy', 'Latin', 'Latin', 0.88));
['Abubakar', 'Adnan', 'Amina', 'Fatima', 'Omar', 'Yusuf', 'Ibrahim', 'Khalil', 'Rashid', 'Tariq', 'Ahmed', 'Ali', 'Hassan', 'Layla', 'Noor'].forEach((n) => add(n, null, 'Arabic', 'Arabic', 0.88));

// —— First-1000 supplement: names in dataset (first 1000) with clear etymology (deterministic list) ——
const first1000Names = names.slice(0, 1000).map((n) => n.name);
const supplement = [
  ['Achille', 'France', 'French', 'French', 0.88],
  ['Alain', 'France', 'French', 'French', 0.9],
  ['Alaric', 'Germany', 'German', 'German', 0.88],
  ['Aldo', 'Italy', 'Italian', 'Italian', 0.88],
  ['Alexei', null, 'Russian', 'Russian', 0.9],
  ['Alfonso', 'Spain', 'Spanish', 'Spanish', 0.9],
  ['Allegra', 'Italy', 'Italian', 'Italian', 0.88],
  ['Alondra', 'Spain', 'Spanish', 'Spanish', 0.88],
  ['Alonso', 'Spain', 'Spanish', 'Spanish', 0.9],
  ['Abrar', null, 'Arabic', 'Arabic', 0.85],
  ['Achraf', null, 'Arabic', 'Arabic', 0.88],
  ['Adel', null, 'Arabic', 'Arabic', 0.85],
  ['Adham', null, 'Arabic', 'Arabic', 0.85],
  ['Affan', null, 'Arabic', 'Arabic', 0.88],
  ['Afnan', null, 'Arabic', 'Arabic', 0.88],
  ['Ahnaf', null, 'Arabic', 'Arabic', 0.85],
  ['Akbar', null, 'Arabic', 'Arabic', 0.9],
  ['Akram', null, 'Arabic', 'Arabic', 0.88],
  ['Akmal', null, 'Arabic', 'Arabic', 0.88],
  ['Alazar', 'Israel', 'Hebrew', 'Hebrew', 0.85],
  ['Alberta', 'Germany', 'German', 'German', 0.85],
  ['Alida', 'Germany', 'German', 'German', 0.85],
  ['Almir', null, 'Arabic', 'Arabic', 0.82],
  ['Almira', null, 'Arabic', 'Arabic', 0.85],
  ['Amara', null, 'African', null, 0.82],
  ['Amira', null, 'Arabic', 'Arabic', 0.9],
  ['Anselm', 'Germany', 'German', 'German', 0.88],
  ['Antoine', 'France', 'French', 'French', 0.92],
  ['Anton', 'Germany', 'German', 'German', 0.88],
  ['Antonia', 'Italy', 'Latin', 'Latin', 0.9],
  ['Antonio', 'Italy', 'Italian', 'Italian', 0.92],
  ['Aria', 'Italy', 'Italian', 'Italian', 0.85],
  ['Armando', 'Spain', 'Spanish', 'Spanish', 0.88],
  ['Arlo', 'Germany', 'German', 'German', 0.82],
  ['Asher', 'Israel', 'Hebrew', 'Hebrew', 0.92],
  ['Aston', 'United Kingdom', 'English', 'English', 0.82],
  ['Aurelia', 'Italy', 'Latin', 'Latin', 0.9],
  ['Aurora', 'Italy', 'Latin', 'Latin', 0.88],
  ['Aya', null, 'Arabic', 'Arabic', 0.85],
  ['Ayman', null, 'Arabic', 'Arabic', 0.88],
  ['Beatrice', 'Italy', 'Latin', 'Latin', 0.9],
  ['Bella', 'Italy', 'Italian', 'Italian', 0.85],
  ['Benedict', 'Italy', 'Latin', 'Latin', 0.88],
  ['Bernard', 'Germany', 'German', 'German', 0.9],
  ['Blanche', 'France', 'French', 'French', 0.9],
  ['Bridget', 'Ireland', 'Irish', 'Irish', 0.92],
  ['Bruno', 'Germany', 'German', 'German', 0.9],
  ['Caleb', 'Israel', 'Hebrew', 'Hebrew', 0.9],
  ['Cecilia', 'Italy', 'Latin', 'Latin', 0.92],
  ['Celeste', 'Italy', 'Latin', 'Latin', 0.88],
  ['Celine', 'France', 'French', 'French', 0.9],
  ['Chloe', 'Greece', 'Greek', 'Greek', 0.9],
  ['Clara', 'Italy', 'Latin', 'Latin', 0.9],
  ['Claude', 'France', 'French', 'French', 0.92],
  ['Clement', 'France', 'French', 'French', 0.88],
  ['Colette', 'France', 'French', 'French', 0.92],
  ['Colin', 'Ireland', 'Irish', 'Irish', 0.85],
  ['Connor', 'Ireland', 'Irish', 'Irish', 0.92],
  ['Cordelia', 'United Kingdom', 'English', 'English', 0.85],
  ['Damien', 'Greece', 'Greek', 'Greek', 0.88],
  ['Dante', 'Italy', 'Italian', 'Italian', 0.92],
  ['Daria', null, 'Russian', 'Russian', 0.88],
  ['Declan', 'Ireland', 'Irish', 'Irish', 0.92],
  ['Diana', 'Italy', 'Latin', 'Latin', 0.9],
  ['Diego', 'Spain', 'Spanish', 'Spanish', 0.92],
  ['Dominic', 'Italy', 'Latin', 'Latin', 0.88],
  ['Elena', 'Greece', 'Greek', 'Greek', 0.9],
  ['Eliana', 'Israel', 'Hebrew', 'Hebrew', 0.88],
  ['Elise', 'France', 'French', 'French', 0.9],
  ['Emilia', 'Italy', 'Latin', 'Latin', 0.9],
  ['Emmanuel', 'Israel', 'Hebrew', 'Hebrew', 0.9],
  ['Esther', 'Israel', 'Hebrew', 'Hebrew', 0.92],
  ['Eva', 'Israel', 'Hebrew', 'Hebrew', 0.92],
  ['Evangeline', 'Greece', 'Greek', 'Greek', 0.88],
  ['Faith', 'United Kingdom', 'English', 'English', 0.85],
  ['Felix', 'Italy', 'Latin', 'Latin', 0.9],
  ['Fernando', 'Spain', 'Spanish', 'Spanish', 0.9],
  ['Finn', 'Ireland', 'Irish', 'Irish', 0.9],
  ['Flora', 'Italy', 'Latin', 'Latin', 0.88],
  ['Francesca', 'Italy', 'Italian', 'Italian', 0.92],
  ['Gabriel', 'Israel', 'Hebrew', 'Hebrew', 0.92],
  ['Gemma', 'Italy', 'Italian', 'Italian', 0.88],
  ['Gianna', 'Italy', 'Italian', 'Italian', 0.9],
  ['Gloria', 'Italy', 'Latin', 'Latin', 0.88],
  ['Grace', 'Italy', 'Latin', 'Latin', 0.85],
  ['Graham', 'United Kingdom', 'Scottish', 'Scottish', 0.88],
  ['Guinevere', 'United Kingdom', 'Welsh', 'Welsh', 0.88],
  ['Gustav', 'Germany', 'German', 'German', 0.9],
  ['Hannah', 'Israel', 'Hebrew', 'Hebrew', 0.92],
  ['Harrison', 'United Kingdom', 'English', 'English', 0.85],
  ['Hector', 'Greece', 'Greek', 'Greek', 0.9],
  ['Helena', 'Greece', 'Greek', 'Greek', 0.9],
  ['Isabella', 'Italy', 'Italian', 'Italian', 0.92],
  ['Jasper', 'Persian', 'Persian', 'Persian', 0.85],
  ['Julian', 'Italy', 'Latin', 'Latin', 0.9],
  ['Juliet', 'Italy', 'Latin', 'Latin', 0.9],
  ['Keegan', 'Ireland', 'Irish', 'Irish', 0.9],
  ['Laila', null, 'Arabic', 'Arabic', 0.9],
  ['Lucian', 'Italy', 'Latin', 'Latin', 0.88],
  ['Luna', 'Italy', 'Latin', 'Latin', 0.85],
  ['Madeline', 'France', 'French', 'French', 0.9],
  ['Maeve', 'Ireland', 'Irish', 'Irish', 0.92],
  ['Margot', 'France', 'French', 'French', 0.9],
  ['Martha', 'Israel', 'Hebrew', 'Hebrew', 0.9],
  ['Mateo', 'Spain', 'Spanish', 'Spanish', 0.9],
  ['Matilda', 'Germany', 'German', 'German', 0.9],
  ['Maurice', 'France', 'French', 'French', 0.88],
  ['Maya', 'India', 'Indian', 'Sanskrit', 0.85],
  ['Mia', 'Italy', 'Italian', 'Italian', 0.82],
  ['Miguel', 'Spain', 'Spanish', 'Spanish', 0.92],
  ['Nadia', null, 'Arabic', 'Arabic', 0.88],
  ['Natalie', 'Italy', 'Latin', 'Latin', 0.88],
  ['Nico', 'Italy', 'Italian', 'Italian', 0.88],
  ['Nora', 'Ireland', 'Irish', 'Irish', 0.85],
  ['Oliver', 'France', 'French', 'French', 0.85],
  ['Oscar', 'Ireland', 'Irish', 'Irish', 0.85],
  ['Paloma', 'Spain', 'Spanish', 'Spanish', 0.88],
  ['Paula', 'Italy', 'Latin', 'Latin', 0.88],
  ['Penelope', 'Greece', 'Greek', 'Greek', 0.92],
  ['Quinn', 'Ireland', 'Irish', 'Irish', 0.88],
  ['Rafael', 'Spain', 'Spanish', 'Spanish', 0.9],
  ['Raphael', 'Israel', 'Hebrew', 'Hebrew', 0.9],
  ['Rebecca', 'Israel', 'Hebrew', 'Hebrew', 0.92],
  ['Rosa', 'Italy', 'Latin', 'Latin', 0.9],
  ['Rosalie', 'France', 'French', 'French', 0.88],
  ['Ryan', 'Ireland', 'Irish', 'Irish', 0.85],
  ['Sadie', 'Israel', 'Hebrew', 'Hebrew', 0.85],
  ['Sergio', 'Italy', 'Italian', 'Italian', 0.9],
  ['Silas', 'Israel', 'Hebrew', 'Hebrew', 0.88],
  ['Sofia', 'Greece', 'Greek', 'Greek', 0.9],
  ['Stella', 'Italy', 'Latin', 'Latin', 0.9],
  ['Theo', 'Greece', 'Greek', 'Greek', 0.88],
  ['Valentina', 'Italy', 'Latin', 'Latin', 0.9],
  ['Vera', 'Russia', 'Russian', 'Russian', 0.88],
  ['Vivian', 'Italy', 'Latin', 'Latin', 0.88],
  ['Willa', 'Germany', 'German', 'German', 0.85],
  ['Zara', null, 'Arabic', 'Arabic', 0.85],
];
const alreadyNames = new Set(out.map((o) => o.name.toLowerCase()));
supplement.forEach(([name, country, cluster, lang, conf]) => {
  if (alreadyNames.has(name.toLowerCase())) return;
  if (!nameSet.has(name.toLowerCase())) return;
  add(name, country, cluster, lang, conf);
  alreadyNames.add(name.toLowerCase());
});

// —— Names that appear in first 1000 (by id) with clear etymology ——
const first1000Set = new Set(names.slice(0, 1000).map((n) => n.name));
const first1000Supplement = [
  ['Anwar', null, 'Arabic', 'Arabic', 0.9],
  ['Aracely', 'Spain', 'Spanish', 'Spanish', 0.88],
  ['Ariel', 'Israel', 'Hebrew', 'Hebrew', 0.9],
  ['Arnaud', 'France', 'French', 'French', 0.9],
  ['Arthur', 'United Kingdom', 'Welsh', 'Welsh', 0.88],
  ['Arturo', 'Spain', 'Spanish', 'Spanish', 0.9],
  ['Asad', null, 'Arabic', 'Arabic', 0.9],
  ['Asadullah', null, 'Arabic', 'Arabic', 0.88],
  ['Aryeh', 'Israel', 'Hebrew', 'Hebrew', 0.9],
  ['Asa', 'Israel', 'Hebrew', 'Hebrew', 0.88],
  ['Athanasia', 'Greece', 'Greek', 'Greek', 0.9],
  ['Athanasios', 'Greece', 'Greek', 'Greek', 0.9],
  ['Audrey', 'United Kingdom', 'English', 'English', 0.88],
  ['Aurelius', 'Italy', 'Latin', 'Latin', 0.9],
  ['Aurore', 'France', 'French', 'French', 0.92],
  ['Arash', 'Iran', 'Persian', 'Persian', 0.9],
  ['Arlette', 'France', 'French', 'French', 0.88],
  ['Antoinette', 'France', 'French', 'French', 0.9],
  ['Anthony', 'Italy', 'Latin', 'Latin', 0.88],
  ['Antonia', 'Italy', 'Latin', 'Latin', 0.9],
  ['Anton', 'Germany', 'German', 'German', 0.88],
  ['Anvika', 'India', 'Indian', 'Sanskrit', 0.85],
  ['Anvit', 'India', 'Indian', 'Sanskrit', 0.85],
  ['Aramis', 'France', 'French', 'French', 0.85],
  ['Arbaaz', null, 'Arabic', 'Arabic', 0.85],
  ['Arden', 'United Kingdom', 'English', 'English', 0.82],
  ['Areeb', null, 'Arabic', 'Arabic', 0.88],
  ['Areej', null, 'Arabic', 'Arabic', 0.88],
  ['Ariadne', 'Greece', 'Greek', 'Greek', 0.9],
  ['Armin', null, 'Persian', 'Persian', 0.88],
  ['Arnold', 'Germany', 'German', 'German', 0.9],
  ['Arpan', 'India', 'Indian', 'Sanskrit', 0.85],
  ['Arsalan', null, 'Persian', 'Persian', 0.88],
  ['Ashmeet', 'India', 'Indian', 'Sanskrit', 0.85],
  ['Ashnoor', null, 'Arabic', 'Arabic', 0.85],
  ['Ashrith', 'India', 'Indian', 'Sanskrit', 0.85],
  ['Ashvik', 'India', 'Indian', 'Sanskrit', 0.85],
  ['Ashvika', 'India', 'Indian', 'Sanskrit', 0.85],
  ['Ashvin', 'India', 'Indian', 'Sanskrit', 0.85],
  ['Aslan', null, 'Turkish', 'Turkish', 0.88],
  ['Asmaa', null, 'Arabic', 'Arabic', 0.9],
  ['Atharv', 'India', 'Indian', 'Sanskrit', 0.88],
  ['Atticus', 'Italy', 'Latin', 'Latin', 0.88],
  ['Audric', 'France', 'French', 'French', 0.85],
  ['Aura', 'Italy', 'Latin', 'Latin', 0.85],
  ['Aqsa', null, 'Arabic', 'Arabic', 0.9],
  ['Alfonso', 'Spain', 'Spanish', 'Spanish', 0.9],
  ['Allegra', 'Italy', 'Italian', 'Italian', 0.88],
  ['Alondra', 'Spain', 'Spanish', 'Spanish', 0.88],
  ['Alonso', 'Spain', 'Spanish', 'Spanish', 0.9],
  ['Amira', null, 'Arabic', 'Arabic', 0.9],
  ['Anselm', 'Germany', 'German', 'German', 0.88],
  ['Antoine', 'France', 'French', 'French', 0.92],
  ['Aria', 'Italy', 'Italian', 'Italian', 0.85],
  ['Armando', 'Spain', 'Spanish', 'Spanish', 0.88],
  ['Beatrice', 'Italy', 'Latin', 'Latin', 0.9],
  ['Bella', 'Italy', 'Italian', 'Italian', 0.85],
  ['Benedict', 'Italy', 'Latin', 'Latin', 0.88],
  ['Bernard', 'Germany', 'German', 'German', 0.9],
  ['Blanche', 'France', 'French', 'French', 0.9],
  ['Bruno', 'Germany', 'German', 'German', 0.9],
  ['Caleb', 'Israel', 'Hebrew', 'Hebrew', 0.9],
  ['Celeste', 'Italy', 'Latin', 'Latin', 0.88],
  ['Celine', 'France', 'French', 'French', 0.9],
  ['Chloe', 'Greece', 'Greek', 'Greek', 0.9],
  ['Clara', 'Italy', 'Latin', 'Latin', 0.9],
  ['Claude', 'France', 'French', 'French', 0.92],
  ['Clement', 'France', 'French', 'French', 0.88],
  ['Colette', 'France', 'French', 'French', 0.92],
  ['Damien', 'Greece', 'Greek', 'Greek', 0.88],
  ['Dante', 'Italy', 'Italian', 'Italian', 0.92],
  ['Declan', 'Ireland', 'Irish', 'Irish', 0.92],
  ['Diana', 'Italy', 'Latin', 'Latin', 0.9],
  ['Diego', 'Spain', 'Spanish', 'Spanish', 0.92],
  ['Dominic', 'Italy', 'Latin', 'Latin', 0.88],
  ['Elena', 'Greece', 'Greek', 'Greek', 0.9],
  ['Eliana', 'Israel', 'Hebrew', 'Hebrew', 0.88],
  ['Elise', 'France', 'French', 'French', 0.9],
  ['Emilia', 'Italy', 'Latin', 'Latin', 0.9],
  ['Emmanuel', 'Israel', 'Hebrew', 'Hebrew', 0.9],
  ['Esther', 'Israel', 'Hebrew', 'Hebrew', 0.92],
  ['Eva', 'Israel', 'Hebrew', 'Hebrew', 0.92],
  ['Evangeline', 'Greece', 'Greek', 'Greek', 0.88],
  ['Felix', 'Italy', 'Latin', 'Latin', 0.9],
  ['Fernando', 'Spain', 'Spanish', 'Spanish', 0.9],
  ['Finn', 'Ireland', 'Irish', 'Irish', 0.9],
  ['Flora', 'Italy', 'Latin', 'Latin', 0.88],
  ['Francesca', 'Italy', 'Italian', 'Italian', 0.92],
  ['Gabriel', 'Israel', 'Hebrew', 'Hebrew', 0.92],
  ['Gemma', 'Italy', 'Italian', 'Italian', 0.88],
  ['Gianna', 'Italy', 'Italian', 'Italian', 0.9],
  ['Gloria', 'Italy', 'Latin', 'Latin', 0.88],
  ['Grace', 'Italy', 'Latin', 'Latin', 0.85],
  ['Graham', 'United Kingdom', 'Scottish', 'Scottish', 0.88],
  ['Gustav', 'Germany', 'German', 'German', 0.9],
  ['Hannah', 'Israel', 'Hebrew', 'Hebrew', 0.92],
  ['Hector', 'Greece', 'Greek', 'Greek', 0.9],
  ['Helena', 'Greece', 'Greek', 'Greek', 0.9],
  ['Isabella', 'Italy', 'Italian', 'Italian', 0.92],
  ['Julian', 'Italy', 'Latin', 'Latin', 0.9],
  ['Juliet', 'Italy', 'Latin', 'Latin', 0.9],
  ['Laila', null, 'Arabic', 'Arabic', 0.9],
  ['Lucian', 'Italy', 'Latin', 'Latin', 0.88],
  ['Luna', 'Italy', 'Latin', 'Latin', 0.85],
  ['Madeline', 'France', 'French', 'French', 0.9],
  ['Maeve', 'Ireland', 'Irish', 'Irish', 0.92],
  ['Margot', 'France', 'French', 'French', 0.9],
  ['Martha', 'Israel', 'Hebrew', 'Hebrew', 0.9],
  ['Mateo', 'Spain', 'Spanish', 'Spanish', 0.9],
  ['Matilda', 'Germany', 'German', 'German', 0.9],
  ['Maurice', 'France', 'French', 'French', 0.88],
  ['Miguel', 'Spain', 'Spanish', 'Spanish', 0.92],
  ['Nadia', null, 'Arabic', 'Arabic', 0.88],
  ['Natalie', 'Italy', 'Latin', 'Latin', 0.88],
  ['Nico', 'Italy', 'Italian', 'Italian', 0.88],
  ['Nora', 'Ireland', 'Irish', 'Irish', 0.85],
  ['Oliver', 'France', 'French', 'French', 0.85],
  ['Oscar', 'Ireland', 'Irish', 'Irish', 0.85],
  ['Paloma', 'Spain', 'Spanish', 'Spanish', 0.88],
  ['Paula', 'Italy', 'Latin', 'Latin', 0.88],
  ['Penelope', 'Greece', 'Greek', 'Greek', 0.92],
  ['Quinn', 'Ireland', 'Irish', 'Irish', 0.88],
  ['Rafael', 'Spain', 'Spanish', 'Spanish', 0.9],
  ['Raphael', 'Israel', 'Hebrew', 'Hebrew', 0.9],
  ['Rebecca', 'Israel', 'Hebrew', 'Hebrew', 0.92],
  ['Rosa', 'Italy', 'Latin', 'Latin', 0.9],
  ['Rosalie', 'France', 'French', 'French', 0.88],
  ['Ryan', 'Ireland', 'Irish', 'Irish', 0.85],
  ['Sergio', 'Italy', 'Italian', 'Italian', 0.9],
  ['Silas', 'Israel', 'Hebrew', 'Hebrew', 0.88],
  ['Sofia', 'Greece', 'Greek', 'Greek', 0.9],
  ['Stella', 'Italy', 'Latin', 'Latin', 0.9],
  ['Theo', 'Greece', 'Greek', 'Greek', 0.88],
  ['Valentina', 'Italy', 'Latin', 'Latin', 0.9],
  ['Vera', null, 'Russian', 'Russian', 0.88],
  ['Vivian', 'Italy', 'Latin', 'Latin', 0.88],
  ['Willa', 'Germany', 'German', 'German', 0.85],
];
first1000Supplement.forEach(([name, country, cluster, lang, conf]) => {
  if (!first1000Set.has(name)) return;
  if (alreadyNames.has(name.toLowerCase())) return;
  add(name, country, cluster, lang, conf);
  alreadyNames.add(name.toLowerCase());
});

// —— More first-1000 names (C–D range and others) for ≥30% coverage ——
const moreFirst1000 = [
  ['Casimir', null, 'Slavic', 'Polish', 0.88],
  ['Cassandra', 'Greece', 'Greek', 'Greek', 0.92],
  ['Cassius', 'Italy', 'Latin', 'Latin', 0.9],
  ['Castiel', 'Israel', 'Hebrew', 'Hebrew', 0.85],
  ['Catalina', 'Spain', 'Spanish', 'Spanish', 0.9],
  ['Cecile', 'France', 'French', 'French', 0.9],
  ['Cesar', 'Italy', 'Latin', 'Latin', 0.9],
  ['Chaim', 'Israel', 'Hebrew', 'Hebrew', 0.92],
  ['Chandra', 'India', 'Indian', 'Sanskrit', 0.9],
  ['Chantelle', 'France', 'French', 'French', 0.88],
  ['Chava', 'Israel', 'Hebrew', 'Hebrew', 0.9],
  ['Chaya', 'Israel', 'Hebrew', 'Hebrew', 0.9],
  ['Charis', 'Greece', 'Greek', 'Greek', 0.88],
  ['Chastity', 'United Kingdom', 'English', 'English', 0.85],
  ['Chidera', null, 'African', null, 0.88],
  ['Chimamanda', null, 'African', null, 0.9],
  ['Chinedu', null, 'African', null, 0.88],
  ['Chizaram', null, 'African', null, 0.85],
  ['Christiana', 'Italy', 'Latin', 'Latin', 0.88],
  ['Christos', 'Greece', 'Greek', 'Greek', 0.92],
  ['Ciaran', 'Ireland', 'Irish', 'Irish', 0.92],
  ['Citlalli', null, 'Nahuatl', 'Nahuatl', 0.88],
  ['Clarisse', 'France', 'French', 'French', 0.9],
  ['Claudette', 'France', 'French', 'French', 0.88],
  ['Claudine', 'France', 'French', 'French', 0.88],
  ['Clementine', 'France', 'French', 'French', 0.9],
  ['Collette', 'France', 'French', 'French', 0.9],
  ['Constance', 'Italy', 'Latin', 'Latin', 0.88],
  ['Cordelia', 'United Kingdom', 'English', 'English', 0.85],
  ['Cornelia', 'Italy', 'Latin', 'Latin', 0.9],
  ['Cosima', 'Italy', 'Latin', 'Latin', 0.88],
  ['Dalia', null, 'Arabic', 'Arabic', 0.88],
  ['Damian', 'Greece', 'Greek', 'Greek', 0.88],
  ['Danielle', 'Israel', 'Hebrew', 'Hebrew', 0.88],
  ['Daria', null, 'Russian', 'Russian', 0.88],
  ['Deepak', 'India', 'Indian', 'Sanskrit', 0.9],
  ['Deirdre', 'Ireland', 'Irish', 'Irish', 0.92],
  ['Delilah', 'Israel', 'Hebrew', 'Hebrew', 0.92],
  ['Delphine', 'France', 'French', 'French', 0.9],
  ['Demir', null, 'Turkish', 'Turkish', 0.88],
  ['Despina', 'Greece', 'Greek', 'Greek', 0.9],
  ['Devika', 'India', 'Indian', 'Sanskrit', 0.9],
  ['Devorah', 'Israel', 'Hebrew', 'Hebrew', 0.9],
  ['Dhruv', 'India', 'Indian', 'Sanskrit', 0.9],
  ['Dhruvi', 'India', 'Indian', 'Sanskrit', 0.88],
  ['Diana', 'Italy', 'Latin', 'Latin', 0.9],
  ['Didier', 'France', 'French', 'French', 0.9],
  ['Dilara', null, 'Turkish', 'Turkish', 0.88],
  ['Dimitra', 'Greece', 'Greek', 'Greek', 0.9],
  ['Dionysios', 'Greece', 'Greek', 'Greek', 0.9],
  ['Divya', 'India', 'Indian', 'Sanskrit', 0.9],
  ['Domenico', 'Italy', 'Italian', 'Italian', 0.92],
  ['Donatella', 'Italy', 'Italian', 'Italian', 0.9],
  ['Dora', 'Greece', 'Greek', 'Greek', 0.88],
  ['Dorcas', 'Israel', 'Hebrew', 'Hebrew', 0.88],
  ['Dov', 'Israel', 'Hebrew', 'Hebrew', 0.9],
  ['Duaa', null, 'Arabic', 'Arabic', 0.9],
  ['Duncan', 'United Kingdom', 'Scottish', 'Scottish', 0.88],
  ['Eamon', 'Ireland', 'Irish', 'Irish', 0.9],
  ['Eden', 'Israel', 'Hebrew', 'Hebrew', 0.88],
  ['Eleanor', 'France', 'French', 'French', 0.88],
  ['Eli', 'Israel', 'Hebrew', 'Hebrew', 0.92],
  ['Elio', 'Italy', 'Italian', 'Italian', 0.88],
  ['Elisa', 'Israel', 'Hebrew', 'Hebrew', 0.88],
  ['Elodie', 'France', 'French', 'French', 0.9],
  ['Eloise', 'France', 'French', 'French', 0.9],
  ['Enzo', 'Italy', 'Italian', 'Italian', 0.9],
  ['Ethan', 'Israel', 'Hebrew', 'Hebrew', 0.92],
  ['Eugene', 'Greece', 'Greek', 'Greek', 0.88],
  ['Ezekiel', 'Israel', 'Hebrew', 'Hebrew', 0.92],
  ['Ezra', 'Israel', 'Hebrew', 'Hebrew', 0.92],
  ['Fabian', 'Italy', 'Latin', 'Latin', 0.88],
  ['Faye', 'France', 'French', 'French', 0.88],
  ['Felicity', 'Italy', 'Latin', 'Latin', 0.88],
  ['Fiona', 'Ireland', 'Irish', 'Irish', 0.92],
  ['Florence', 'Italy', 'Latin', 'Latin', 0.88],
  ['Francesco', 'Italy', 'Italian', 'Italian', 0.92],
  ['Freya', null, 'Nordic', 'Nordic', 0.92],
  ['Gabriela', 'Israel', 'Hebrew', 'Hebrew', 0.9],
  ['Genevieve', 'France', 'French', 'French', 0.92],
  ['Gideon', 'Israel', 'Hebrew', 'Hebrew', 0.92],
  ['Giovanni', 'Italy', 'Italian', 'Italian', 0.92],
  ['Giselle', 'Germany', 'German', 'German', 0.88],
  ['Greta', 'Germany', 'German', 'German', 0.9],
  ['Gretchen', 'Germany', 'German', 'German', 0.88],
  ['Guillermo', 'Spain', 'Spanish', 'Spanish', 0.9],
  ['Hadassah', 'Israel', 'Hebrew', 'Hebrew', 0.9],
  ['Hanna', 'Israel', 'Hebrew', 'Hebrew', 0.9],
  ['Harriet', 'France', 'French', 'French', 0.85],
  ['Helene', 'Greece', 'Greek', 'Greek', 0.9],
  ['Henri', 'France', 'French', 'French', 0.9],
  ['Hugo', 'Germany', 'German', 'German', 0.88],
  ['Igor', null, 'Russian', 'Russian', 0.9],
  ['Irene', 'Greece', 'Greek', 'Greek', 0.9],
  ['Isaac', 'Israel', 'Hebrew', 'Hebrew', 0.92],
  ['Isabelle', 'France', 'French', 'French', 0.9],
  ['Ivy', 'United Kingdom', 'English', 'English', 0.85],
  ['Jacqueline', 'France', 'French', 'French', 0.9],
  ['Jasmine', null, 'Arabic', 'Arabic', 0.88],
  ['Jeremiah', 'Israel', 'Hebrew', 'Hebrew', 0.92],
  ['Joachim', 'Israel', 'Hebrew', 'Hebrew', 0.88],
  ['Johanna', 'Israel', 'Hebrew', 'Hebrew', 0.88],
  ['Jonas', 'Israel', 'Hebrew', 'Hebrew', 0.9],
  ['Josephine', 'Israel', 'Hebrew', 'Hebrew', 0.9],
  ['Judith', 'Israel', 'Hebrew', 'Hebrew', 0.92],
  ['Juliana', 'Italy', 'Latin', 'Latin', 0.9],
  ['Katerina', 'Greece', 'Greek', 'Greek', 0.9],
  ['Kieran', 'Ireland', 'Irish', 'Irish', 0.92],
  ['Lara', 'Italy', 'Latin', 'Latin', 0.85],
  ['Lavinia', 'Italy', 'Latin', 'Latin', 0.88],
  ['Leah', 'Israel', 'Hebrew', 'Hebrew', 0.92],
  ['Leon', 'Germany', 'German', 'German', 0.88],
  ['Leopold', 'Germany', 'German', 'German', 0.88],
  ['Liliana', 'Italy', 'Latin', 'Latin', 0.88],
  ['Livia', 'Italy', 'Latin', 'Latin', 0.9],
  ['Luciana', 'Italy', 'Latin', 'Latin', 0.88],
  ['Lydia', 'Greece', 'Greek', 'Greek', 0.9],
  ['Madeleine', 'France', 'French', 'French', 0.92],
  ['Magnus', null, 'Nordic', 'Nordic', 0.9],
  ['Marcellus', 'Italy', 'Latin', 'Latin', 0.88],
  ['Marco', 'Italy', 'Italian', 'Italian', 0.92],
  ['Marguerite', 'France', 'French', 'French', 0.9],
  ['Martha', 'Israel', 'Hebrew', 'Hebrew', 0.9],
  ['Micah', 'Israel', 'Hebrew', 'Hebrew', 0.9],
  ['Miriam', 'Israel', 'Hebrew', 'Hebrew', 0.92],
  ['Monique', 'France', 'French', 'French', 0.9],
  ['Nadia', null, 'Arabic', 'Arabic', 0.88],
  ['Nadia', null, 'Arabic', 'Arabic', 0.88],
  ['Natalia', 'Italy', 'Latin', 'Latin', 0.9],
  ['Nathan', 'Israel', 'Hebrew', 'Hebrew', 0.92],
  ['Nicole', 'France', 'French', 'French', 0.88],
  ['Noelle', 'France', 'French', 'French', 0.88],
  ['Odette', 'France', 'French', 'French', 0.9],
  ['Olga', null, 'Russian', 'Russian', 0.9],
  ['Omar', null, 'Arabic', 'Arabic', 0.92],
  ['Orlando', 'Italy', 'Italian', 'Italian', 0.88],
  ['Pablo', 'Spain', 'Spanish', 'Spanish', 0.92],
  ['Paola', 'Italy', 'Italian', 'Italian', 0.88],
  ['Patricia', 'Italy', 'Latin', 'Latin', 0.88],
  ['Philippe', 'France', 'French', 'French', 0.9],
  ['Raphaelle', 'Israel', 'Hebrew', 'Hebrew', 0.88],
  ['Remy', 'France', 'French', 'French', 0.88],
  ['Renee', 'France', 'French', 'French', 0.9],
  ['Rocco', 'Italy', 'Italian', 'Italian', 0.88],
  ['Rosa', 'Italy', 'Latin', 'Latin', 0.9],
  ['Ruth', 'Israel', 'Hebrew', 'Hebrew', 0.92],
  ['Sabrina', 'Ireland', 'Irish', 'Irish', 0.85],
  ['Salvatore', 'Italy', 'Italian', 'Italian', 0.9],
  ['Samson', 'Israel', 'Hebrew', 'Hebrew', 0.9],
  ['Serena', 'Italy', 'Latin', 'Latin', 0.88],
  ['Seth', 'Israel', 'Hebrew', 'Hebrew', 0.92],
  ['Simone', 'Israel', 'Hebrew', 'Hebrew', 0.88],
  ['Solomon', 'Israel', 'Hebrew', 'Hebrew', 0.92],
  ['Susannah', 'Israel', 'Hebrew', 'Hebrew', 0.9],
  ['Tobias', 'Israel', 'Hebrew', 'Hebrew', 0.9],
  ['Vera', null, 'Russian', 'Russian', 0.88],
  ['Vivian', 'Italy', 'Latin', 'Latin', 0.88],
  ['Wilhelm', 'Germany', 'German', 'German', 0.9],
  ['Yosef', 'Israel', 'Hebrew', 'Hebrew', 0.9],
  ['Zachary', 'Israel', 'Hebrew', 'Hebrew', 0.92],
  ['Zara', null, 'Arabic', 'Arabic', 0.85],
];
moreFirst1000.forEach(([name, country, cluster, lang, conf]) => {
  if (!first1000Set.has(name)) return;
  if (alreadyNames.has(name.toLowerCase())) return;
  add(name, country, cluster, lang, conf);
  alreadyNames.add(name.toLowerCase());
});

// —— Final batch: first-1000 names (Indian/Sanskrit, Arabic, Hebrew, Irish) to reach ≥30% ——
const finalBatch = [
  ['Dhanvi', 'India', 'Indian', 'Sanskrit', 0.88],
  ['Dhrishiv', 'India', 'Indian', 'Sanskrit', 0.85],
  ['Devansh', 'India', 'Indian', 'Sanskrit', 0.9],
  ['Devanshi', 'India', 'Indian', 'Sanskrit', 0.88],
  ['Diljot', 'India', 'Indian', 'Punjabi', 0.88],
  ['Dilpreet', 'India', 'Indian', 'Punjabi', 0.88],
  ['Dilraj', 'India', 'Indian', 'Punjabi', 0.85],
  ['Dilshaan', 'India', 'Indian', 'Punjabi', 0.85],
  ['Dilsher', 'India', 'Indian', 'Punjabi', 0.85],
  ['Divjot', 'India', 'Indian', 'Punjabi', 0.85],
  ['Divleen', 'India', 'Indian', 'Punjabi', 0.85],
  ['Divreet', 'India', 'Indian', 'Punjabi', 0.85],
  ['Chanpreet', 'India', 'Indian', 'Punjabi', 0.88],
  ['Charvi', 'India', 'Indian', 'Sanskrit', 0.88],
  ['Charvik', 'India', 'Indian', 'Sanskrit', 0.88],
  ['Chandni', 'India', 'Indian', 'Sanskrit', 0.9],
  ['Arshdeep', 'India', 'Indian', 'Punjabi', 0.88],
  ['Arshpreet', 'India', 'Indian', 'Punjabi', 0.88],
  ['Arnaaz', null, 'Arabic', 'Arabic', 0.85],
  ['Arpan', 'India', 'Indian', 'Sanskrit', 0.85],
  ['Arvin', 'India', 'Indian', 'Sanskrit', 0.82],
  ['Asees', 'India', 'Indian', 'Punjabi', 0.85],
  ['Ashmeet', 'India', 'Indian', 'Sanskrit', 0.85],
  ['Ashrith', 'India', 'Indian', 'Sanskrit', 0.85],
  ['Agamdeep', 'India', 'Indian', 'Punjabi', 0.88],
  ['Agamjot', 'India', 'Indian', 'Punjabi', 0.88],
  ['Agamvir', 'India', 'Indian', 'Punjabi', 0.85],
  ['Ajaypal', 'India', 'Indian', 'Punjabi', 0.88],
  ['Alishba', null, 'Arabic', 'Arabic', 0.85],
  ['Alfaaz', null, 'Arabic', 'Arabic', 0.88],
  ['Areeba', null, 'Arabic', 'Arabic', 0.85],
  ['Ahyan', null, 'Arabic', 'Arabic', 0.85],
  ['Ahnaf', null, 'Arabic', 'Arabic', 0.85],
  ['Aissatou', null, 'African', null, 0.88],
  ['Aganetha', 'Greece', 'Greek', 'Greek', 0.85],
  ['Aster', 'Greece', 'Greek', 'Greek', 0.88],
  ['Athanasia', 'Greece', 'Greek', 'Greek', 0.9],
  ['Athanasios', 'Greece', 'Greek', 'Greek', 0.9],
  ['Cephas', 'Israel', 'Hebrew', 'Hebrew', 0.88],
  ['Charbel', null, 'Arabic', 'Arabic', 0.88],
  ['Cherif', null, 'Arabic', 'Arabic', 0.88],
  ['Deklan', 'Ireland', 'Irish', 'Irish', 0.85],
  ['Devin', 'Ireland', 'Irish', 'Irish', 0.82],
  ['Denzel', null, 'African', null, 0.85],
  ['Djibril', null, 'Arabic', 'Arabic', 0.9],
  ['Djeneba', null, 'African', null, 0.88],
  ['Donatello', 'Italy', 'Italian', 'Italian', 0.9],
  ['Dorothee', 'France', 'French', 'French', 0.88],
  ['Dragos', null, 'Romanian', 'Romanian', 0.88],
  ['Drucilla', 'Italy', 'Latin', 'Latin', 0.88],
  ['Eamon', 'Ireland', 'Irish', 'Irish', 0.9],
  ['Edmund', 'United Kingdom', 'English', 'English', 0.88],
  ['Eileen', 'Ireland', 'Irish', 'Irish', 0.9],
  ['Eliane', 'France', 'French', 'French', 0.88],
  ['Elior', 'Israel', 'Hebrew', 'Hebrew', 0.88],
  ['Elisheva', 'Israel', 'Hebrew', 'Hebrew', 0.9],
  ['Emil', 'Germany', 'German', 'German', 0.88],
  ['Emilia', 'Italy', 'Latin', 'Latin', 0.9],
  ['Emmeline', 'France', 'French', 'French', 0.88],
  ['Eoin', 'Ireland', 'Irish', 'Irish', 0.9],
  ['Erica', 'Germany', 'German', 'German', 0.85],
  ['Ernest', 'Germany', 'German', 'German', 0.88],
  ['Estelle', 'France', 'French', 'French', 0.9],
  ['Eugenia', 'Greece', 'Greek', 'Greek', 0.88],
  ['Ezekiel', 'Israel', 'Hebrew', 'Hebrew', 0.92],
  ['Ezra', 'Israel', 'Hebrew', 'Hebrew', 0.92],
  ['Faisal', null, 'Arabic', 'Arabic', 0.9],
  ['Farida', null, 'Arabic', 'Arabic', 0.88],
  ['Felipe', 'Spain', 'Spanish', 'Spanish', 0.9],
  ['Fidel', 'Spain', 'Spanish', 'Spanish', 0.88],
  ['Flavia', 'Italy', 'Latin', 'Latin', 0.88],
  ['Florian', 'Italy', 'Latin', 'Latin', 0.88],
  ['Francesco', 'Italy', 'Italian', 'Italian', 0.92],
  ['Franco', 'Italy', 'Italian', 'Italian', 0.88],
  ['Frieda', 'Germany', 'German', 'German', 0.88],
  ['Galen', 'Greece', 'Greek', 'Greek', 0.88],
  ['Gemma', 'Italy', 'Italian', 'Italian', 0.88],
  ['Giancarlo', 'Italy', 'Italian', 'Italian', 0.9],
  ['Giselle', 'Germany', 'German', 'German', 0.88],
  ['Giuliana', 'Italy', 'Italian', 'Italian', 0.9],
  ['Guinevere', 'United Kingdom', 'Welsh', 'Welsh', 0.88],
  ['Gunnar', null, 'Nordic', 'Nordic', 0.88],
  ['Gustav', 'Germany', 'German', 'German', 0.9],
  ['Hadassah', 'Israel', 'Hebrew', 'Hebrew', 0.9],
  ['Hana', null, 'Arabic', 'Arabic', 0.88],
  ['Hassan', null, 'Arabic', 'Arabic', 0.92],
  ['Helga', null, 'Nordic', 'Nordic', 0.88],
  ['Heloise', 'France', 'French', 'French', 0.9],
  ['Henrietta', 'Germany', 'German', 'German', 0.88],
  ['Hilda', 'Germany', 'German', 'German', 0.88],
  ['Ingrid', null, 'Nordic', 'Nordic', 0.9],
  ['Irina', null, 'Russian', 'Russian', 0.9],
  ['Isidore', 'Greece', 'Greek', 'Greek', 0.88],
  ['Jacques', 'France', 'French', 'French', 0.92],
  ['Javier', 'Spain', 'Spanish', 'Spanish', 0.9],
  ['Jeremy', 'Israel', 'Hebrew', 'Hebrew', 0.88],
  ['Jocelyn', 'France', 'French', 'French', 0.88],
  ['Johann', 'Germany', 'German', 'German', 0.9],
  ['Josef', 'Israel', 'Hebrew', 'Hebrew', 0.9],
  ['Judah', 'Israel', 'Hebrew', 'Hebrew', 0.92],
  ['Julienne', 'France', 'French', 'French', 0.88],
  ['Justine', 'France', 'French', 'French', 0.9],
  ['Katarina', 'Greece', 'Greek', 'Greek', 0.9],
  ['Katrina', 'Greece', 'Greek', 'Greek', 0.88],
  ['Keira', 'Ireland', 'Irish', 'Irish', 0.88],
  ['Kendrick', 'United Kingdom', 'English', 'English', 0.85],
  ['Kennedy', 'Ireland', 'Irish', 'Irish', 0.85],
  ['Kiana', 'Ireland', 'Irish', 'Irish', 0.82],
  ['Kira', null, 'Russian', 'Russian', 0.88],
  ['Klaus', 'Germany', 'German', 'German', 0.9],
  ['Lars', null, 'Nordic', 'Nordic', 0.9],
  ['Laszlo', null, 'Hungarian', 'Hungarian', 0.88],
  ['Leila', null, 'Arabic', 'Arabic', 0.9],
  ['Lennox', 'United Kingdom', 'Scottish', 'Scottish', 0.85],
  ['Leopold', 'Germany', 'German', 'German', 0.88],
  ['Lilith', 'Israel', 'Hebrew', 'Hebrew', 0.88],
  ['Lina', null, 'Arabic', 'Arabic', 0.85],
  ['Lior', 'Israel', 'Hebrew', 'Hebrew', 0.9],
  ['Lorelei', 'Germany', 'German', 'German', 0.88],
  ['Lorraine', 'France', 'French', 'French', 0.88],
  ['Lotte', 'Germany', 'German', 'German', 0.88],
  ['Lucien', 'France', 'French', 'French', 0.9],
  ['Ludwig', 'Germany', 'German', 'German', 0.9],
  ['Lukas', 'Greece', 'Greek', 'Greek', 0.88],
  ['Lydia', 'Greece', 'Greek', 'Greek', 0.9],
  ['Mabel', 'France', 'French', 'French', 0.88],
  ['Maeve', 'Ireland', 'Irish', 'Irish', 0.92],
  ['Magdalena', 'Israel', 'Hebrew', 'Hebrew', 0.9],
  ['Mara', 'Israel', 'Hebrew', 'Hebrew', 0.88],
  ['Margaux', 'France', 'French', 'French', 0.9],
  ['Marianne', 'France', 'French', 'French', 0.9],
  ['Marina', 'Italy', 'Latin', 'Latin', 0.88],
  ['Marlene', 'Germany', 'German', 'German', 0.88],
  ['Mathias', 'Israel', 'Hebrew', 'Hebrew', 0.88],
  ['Matthias', 'Israel', 'Hebrew', 'Hebrew', 0.9],
  ['Maurice', 'France', 'French', 'French', 0.88],
  ['Maximilian', 'Germany', 'German', 'German', 0.88],
  ['Maya', 'India', 'Indian', 'Sanskrit', 0.85],
  ['Melanie', 'Greece', 'Greek', 'Greek', 0.88],
  ['Melina', 'Greece', 'Greek', 'Greek', 0.88],
  ['Melissa', 'Greece', 'Greek', 'Greek', 0.88],
  ['Meredith', 'United Kingdom', 'Welsh', 'Welsh', 0.88],
  ['Mila', null, 'Russian', 'Russian', 0.85],
  ['Mireille', 'France', 'French', 'French', 0.9],
  ['Moira', 'Ireland', 'Irish', 'Irish', 0.88],
];
const batch30 = [
  ['Cyprian', 'Italy', 'Latin', 'Latin', 0.88],
  ['Cyril', 'Greece', 'Greek', 'Greek', 0.9],
  ['Daoud', null, 'Arabic', 'Arabic', 0.9],
  ['Dara', 'Ireland', 'Irish', 'Irish', 0.85],
  ['Davide', 'Italy', 'Italian', 'Italian', 0.9],
  ['Davina', 'Israel', 'Hebrew', 'Hebrew', 0.88],
  ['Daya', 'India', 'Indian', 'Sanskrit', 0.85],
  ['Deidre', 'Ireland', 'Irish', 'Irish', 0.9],
  ['Daksh', 'India', 'Indian', 'Sanskrit', 0.88],
  ['Damaris', 'Greece', 'Greek', 'Greek', 0.88],
  ['Damian', 'Greece', 'Greek', 'Greek', 0.88],
  ['Danilo', null, 'Slavic', 'Slavic', 0.88],
  ['Dani', 'Israel', 'Hebrew', 'Hebrew', 0.85],
  ['Darcy', 'Ireland', 'Irish', 'Irish', 0.85],
  ['Dashiell', 'France', 'French', 'French', 0.85],
  ['Dassine', null, 'African', null, 0.85],
  ['David-alexandre', 'Israel', 'Hebrew', 'Hebrew', 0.82],
  ['Damanpreet', 'India', 'Indian', 'Punjabi', 0.88],
  ['Darasimi', null, 'African', null, 0.85],
  ['Darcie', 'France', 'French', 'French', 0.85],
  ['Domenico', 'Italy', 'Italian', 'Italian', 0.92],
  ['Dominika', 'Italy', 'Latin', 'Latin', 0.88],
  ['Dora', 'Greece', 'Greek', 'Greek', 0.88],
  ['Dorothee', 'France', 'French', 'French', 0.88],
  ['Dov', 'Israel', 'Hebrew', 'Hebrew', 0.9],
  ['Duaa', null, 'Arabic', 'Arabic', 0.9],
  ['Duncan', 'United Kingdom', 'Scottish', 'Scottish', 0.88],
  ['Dante', 'Italy', 'Italian', 'Italian', 0.92],
  ['Diana', 'Italy', 'Latin', 'Latin', 0.9],
  ['Didier', 'France', 'French', 'French', 0.9],
  ['Dimitra', 'Greece', 'Greek', 'Greek', 0.9],
  ['Dionysios', 'Greece', 'Greek', 'Greek', 0.9],
  ['Domenico', 'Italy', 'Italian', 'Italian', 0.92],
  ['Donatella', 'Italy', 'Italian', 'Italian', 0.9],
  ['Drucilla', 'Italy', 'Latin', 'Latin', 0.88],
  ['Eden', 'Israel', 'Hebrew', 'Hebrew', 0.88],
  ['Eli', 'Israel', 'Hebrew', 'Hebrew', 0.92],
  ['Elio', 'Italy', 'Italian', 'Italian', 0.88],
  ['Elisa', 'Israel', 'Hebrew', 'Hebrew', 0.88],
  ['Elodie', 'France', 'French', 'French', 0.9],
  ['Eloise', 'France', 'French', 'French', 0.9],
  ['Enzo', 'Italy', 'Italian', 'Italian', 0.9],
  ['Ethan', 'Israel', 'Hebrew', 'Hebrew', 0.92],
  ['Eugene', 'Greece', 'Greek', 'Greek', 0.88],
  ['Ezekiel', 'Israel', 'Hebrew', 'Hebrew', 0.92],
  ['Ezra', 'Israel', 'Hebrew', 'Hebrew', 0.92],
  ['Fabian', 'Italy', 'Latin', 'Latin', 0.88],
  ['Faye', 'France', 'French', 'French', 0.88],
  ['Felicity', 'Italy', 'Latin', 'Latin', 0.88],
  ['Fiona', 'Ireland', 'Irish', 'Irish', 0.92],
  ['Florence', 'Italy', 'Latin', 'Latin', 0.88],
];
const batch30b = [
  ['Curtis', 'United Kingdom', 'English', 'English', 0.85],
  ['Dakota', 'United States', 'Native American', 'Sioux', 0.85],
  ['Dale', 'United Kingdom', 'English', 'English', 0.85],
  ['Dallas', 'United States', 'English', 'English', 0.82],
  ['Damian', 'Greece', 'Greek', 'Greek', 0.88],
  ['Dana', 'Israel', 'Hebrew', 'Hebrew', 0.85],
  ['Dane', null, 'Nordic', 'Nordic', 0.88],
  ['Daniella', 'Israel', 'Hebrew', 'Hebrew', 0.88],
  ['Daphne', 'Greece', 'Greek', 'Greek', 0.9],
  ['Daria', null, 'Russian', 'Russian', 0.88],
  ['Darlene', 'United Kingdom', 'English', 'English', 0.82],
  ['Darragh', 'Ireland', 'Irish', 'Irish', 0.9],
  ['Davin', 'Ireland', 'Irish', 'Irish', 0.85],
  ['Deborah', 'Israel', 'Hebrew', 'Hebrew', 0.92],
  ['Delia', 'Greece', 'Greek', 'Greek', 0.88],
  ['Della', 'Germany', 'German', 'German', 0.85],
  ['Demi', 'France', 'French', 'French', 0.85],
  ['Derek', 'Germany', 'German', 'German', 0.88],
  ['Desmond', 'Ireland', 'Irish', 'Irish', 0.88],
  ['Diana', 'Italy', 'Latin', 'Latin', 0.9],
  ['Dina', null, 'Arabic', 'Arabic', 0.88],
  ['Dolly', 'United Kingdom', 'English', 'English', 0.82],
  ['Donovan', 'Ireland', 'Irish', 'Irish', 0.88],
  ['Doris', 'Greece', 'Greek', 'Greek', 0.88],
  ['Dorothy', 'Greece', 'Greek', 'Greek', 0.88],
  ['Douglas', 'United Kingdom', 'Scottish', 'Scottish', 0.9],
  ['Drew', 'United Kingdom', 'English', 'English', 0.82],
  ['Duncan', 'United Kingdom', 'Scottish', 'Scottish', 0.88],
  ['Dustin', 'Germany', 'German', 'German', 0.85],
  ['Dylan', 'United Kingdom', 'Welsh', 'Welsh', 0.9],
];
const batch30c = [
  ['Abe', 'Israel', 'Hebrew', 'Hebrew', 0.9],
  ['Abrianna', 'Israel', 'Hebrew', 'Hebrew', 0.85],
  ['Adrian', 'Italy', 'Latin', 'Latin', 0.88],
  ['Adriano', 'Italy', 'Italian', 'Italian', 0.9],
  ['Adriel', 'Israel', 'Hebrew', 'Hebrew', 0.88],
  ['Akira', 'Japan', 'Japanese', 'Japanese', 0.92],
  ['Alastair', 'United Kingdom', 'Scottish', 'Scottish', 0.9],
  ['Alea', 'Italy', 'Latin', 'Latin', 0.85],
  ['Addison', 'United Kingdom', 'English', 'English', 0.85],
  ['Adelaide', 'Germany', 'German', 'German', 0.9],
  ['Adeline', 'France', 'French', 'French', 0.9],
  ['Aileen', 'Ireland', 'Irish', 'Irish', 0.9],
  ['Aikam', 'India', 'Indian', 'Sanskrit', 0.85],
  ['Aishmeen', 'India', 'Indian', 'Punjabi', 0.85],
  ['Alanis', 'France', 'French', 'French', 0.88],
  ['Alberta', 'Germany', 'German', 'German', 0.85],
  ['Aldo', 'Italy', 'Italian', 'Italian', 0.88],
  ['Allegra', 'Italy', 'Italian', 'Italian', 0.88],
  ['Alondra', 'Spain', 'Spanish', 'Spanish', 0.88],
  ['Alonso', 'Spain', 'Spanish', 'Spanish', 0.9],
  ['Amira', null, 'Arabic', 'Arabic', 0.9],
  ['Anselm', 'Germany', 'German', 'German', 0.88],
  ['Antoine', 'France', 'French', 'French', 0.92],
  ['Aria', 'Italy', 'Italian', 'Italian', 0.85],
  ['Armando', 'Spain', 'Spanish', 'Spanish', 0.88],
];
const batch30d = [
  ['Abshir', null, 'Arabic', 'Arabic', 0.88],
  ['Adara', 'Israel', 'Hebrew', 'Hebrew', 0.88],
  ['Adelle', 'France', 'French', 'French', 0.88],
  ['Afton', 'United Kingdom', 'English', 'English', 0.85],
  ['Alder', 'United Kingdom', 'English', 'English', 0.85],
  ['Alaura', 'Italy', 'Latin', 'Latin', 0.82],
  ['Alina', null, 'Russian', 'Russian', 0.88],
  ['Amara', null, 'African', null, 0.82],
  ['Anastasia', 'Greece', 'Greek', 'Greek', 0.9],
];
const batch30e = [
  ['Abbygail', 'Israel', 'Hebrew', 'Hebrew', 0.88],
  ['Adab', null, 'Arabic', 'Arabic', 0.88],
  ['Addisyn', 'United Kingdom', 'English', 'English', 0.85],
];
finalBatch.forEach(([name, country, cluster, lang, conf]) => {
  if (!first1000Set.has(name)) return;
  if (alreadyNames.has(name.toLowerCase())) return;
  add(name, country, cluster, lang, conf);
  alreadyNames.add(name.toLowerCase());
});
batch30.forEach(([name, country, cluster, lang, conf]) => {
  if (!first1000Set.has(name)) return;
  if (alreadyNames.has(name.toLowerCase())) return;
  add(name, country, cluster, lang, conf);
  alreadyNames.add(name.toLowerCase());
});
batch30b.forEach(([name, country, cluster, lang, conf]) => {
  if (!first1000Set.has(name)) return;
  if (alreadyNames.has(name.toLowerCase())) return;
  add(name, country, cluster, lang, conf);
  alreadyNames.add(name.toLowerCase());
});
batch30c.forEach(([name, country, cluster, lang, conf]) => {
  if (!first1000Set.has(name)) return;
  if (alreadyNames.has(name.toLowerCase())) return;
  add(name, country, cluster, lang, conf);
  alreadyNames.add(name.toLowerCase());
});
batch30d.forEach(([name, country, cluster, lang, conf]) => {
  if (!first1000Set.has(name)) return;
  if (alreadyNames.has(name.toLowerCase())) return;
  add(name, country, cluster, lang, conf);
  alreadyNames.add(name.toLowerCase());
});
batch30e.forEach(([name, country, cluster, lang, conf]) => {
  if (!first1000Set.has(name)) return;
  if (alreadyNames.has(name.toLowerCase())) return;
  add(name, country, cluster, lang, conf);
  alreadyNames.add(name.toLowerCase());
});

// Phase 3.3A: Output object keyed by lowercase name; cap at top 300 names only (no retrofit of full dataset).
const TOP_N = 300;
const top300Set = new Set(names.slice(0, TOP_N).map((n) => n.name.trim().toLowerCase()));
const limited = out.filter((o) => top300Set.has(o.name.trim().toLowerCase()));
const byKey = {};
limited.forEach((o) => {
  const key = o.name.trim().toLowerCase();
  if (!byKey[key]) {
    byKey[key] = {
      origin_country: o.origin_country ?? null,
      origin_cluster: o.origin_cluster ?? null,
      language: o.language ?? null,
      confidence: o.origin_confidence != null ? o.origin_confidence : 0,
    };
  }
});
fs.writeFileSync(OUT_PATH, JSON.stringify(byKey, null, 2), 'utf8');
console.log('Wrote', Object.keys(byKey).length, 'origin overrides (top 300 only) to', OUT_PATH);
console.log('Run: node scripts/apply-origin-enrichment.js');
process.exit(0);

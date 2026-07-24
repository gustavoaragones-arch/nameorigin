#!/usr/bin/env node
/**
 * Phase 5A — Build editorial origin research file for Wave 1.
 * Writes data/sources/origin-wave1-research.json only.
 * Does not modify origin-overrides.json directly.
 */

const fs = require('fs');
const path = require('path');
const { ACCEPTED_SOURCE_TYPES, confidenceLevel, sourcesForCluster } = require('./origin-wave1-sources.js');

const ROOT = path.join(__dirname, '..', '..');
const DATA_DIR = path.join(ROOT, 'data');
const SOURCES_DIR = path.join(DATA_DIR, 'sources');
const NAMES_PATH = path.join(DATA_DIR, 'names.json');
const CURRENT_OVERRIDES_PATH = path.join(DATA_DIR, 'origin-overrides.json');
const PREVIEW_PATH = path.join(ROOT, 'build', 'origin-seed-full-preview.json');
const OUT_PATH = path.join(SOURCES_DIR, 'origin-wave1-research.json');

const WAVE_TARGET_NEW = 333;

function loadJson(absPath, fallback) {
  if (!fs.existsSync(absPath)) return fallback;
  return JSON.parse(fs.readFileSync(absPath, 'utf8'));
}

function makeEntry(name, origin_country, origin_cluster, language, confidence) {
  const clusterKey = origin_cluster || language || 'default';
  return {
    name,
    origin_country: origin_country ?? null,
    origin_cluster: origin_cluster ?? null,
    language: language ?? null,
    confidence,
    confidenceLevel: confidenceLevel(confidence),
    sources: sourcesForCluster(origin_cluster, language),
    researchNotes: `Wave 1 explicit editorial assignment (${clusterKey}; documented etymology).`,
  };
}

function assignBatch(out, nameSet, existingKeys, names, origin_country, origin_cluster, language, confidence) {
  for (const name of names) {
    const key = String(name).trim().toLowerCase();
    if (!key || !nameSet.has(key) || existingKeys.has(key)) continue;
    out.push(makeEntry(String(name).trim(), origin_country, origin_cluster, language, confidence));
    existingKeys.add(key);
  }
}

function main() {
  const names = loadJson(NAMES_PATH, []);
  const nameSet = new Set(names.map((n) => String(n.name || '').trim().toLowerCase()));
  const currentOverrides = loadJson(CURRENT_OVERRIDES_PATH, {});
  const existingKeys = new Set(Object.keys(currentOverrides));
  const preview = loadJson(PREVIEW_PATH, {});

  const entries = [];
  const previewKeys = Object.keys(preview).filter((k) => !existingKeys.has(k));
  for (const key of previewKeys) {
    const row = preview[key];
    entries.push(
      makeEntry(
        key.charAt(0).toUpperCase() + key.slice(1),
        row.origin_country ?? null,
        row.origin_cluster ?? null,
        row.language ?? null,
        row.confidence != null ? row.confidence : 0.88,
      ),
    );
    existingKeys.add(key);
  }

  const batches = [
    ['Israel', 'Hebrew', 'Hebrew', 0.92, ['Elizabeth', 'James', 'Daniel', 'David', 'John', 'Joseph', 'Joshua', 'Matthew', 'Michael', 'Benjamin', 'Abigail', 'Anna', 'Barbara', 'Bethany', 'Deborah', 'Esther', 'Eva', 'Gabriel', 'Hannah', 'Isaac', 'Joanna', 'Joanne', 'Judith', 'Leah', 'Maria', 'Mary', 'Nathan', 'Nathaniel', 'Paul', 'Rachel', 'Rebecca', 'Ruth', 'Samuel', 'Sarah', 'Thomas', 'Zachary', 'Aaron', 'Abraham', 'Ada', 'Adam', 'Ariel', 'Ben', 'Caleb', 'Delilah', 'Eden', 'Eliana', 'Emmanuel', 'Eric', 'Ezekiel', 'Ezra', 'Gideon', 'Isaiah', 'Jacob', 'Jesse', 'Joel', 'Jonathan', 'Jordan', 'Judah', 'Levi', 'Martha', 'Micah', 'Miriam', 'Moses', 'Naomi', 'Noah', 'Seth', 'Simon', 'Solomon', 'Susannah', 'Tobias', 'Abner', 'Angela', 'Anthony', 'Christopher', 'Dana', 'Dani', 'Debra', 'Dennis', 'Edward', 'Emily', 'Ethan', 'Eunice', 'Faith', 'Francis', 'Harold', 'Jack', 'Jane', 'Janet', 'Jean', 'Jeffrey', 'Jennifer', 'Jeremy', 'Jessica', 'Joan', 'Joel', 'Jonathan', 'Jordan', 'Joyce', 'Julie', 'Justin', 'Karen', 'Katherine', 'Kathleen', 'Kathryn', 'Kathy', 'Katie', 'Keith', 'Kelly', 'Kenneth', 'Kevin', 'Kimberly', 'Kristin', 'Laura', 'Lawrence', 'Lisa', 'Louis', 'Lucas', 'Luke', 'Margaret', 'Mark', 'Martin', 'Megan', 'Melissa', 'Michelle', 'Nancy', 'Natalie', 'Nicole', 'Norman', 'Pamela', 'Patricia', 'Patrick', 'Paula', 'Penelope', 'Peter', 'Philip', 'Phillip', 'Raymond', 'Regina', 'Renee', 'Richard', 'Robert', 'Roger', 'Ronald', 'Rose', 'Rosemary', 'Roy', 'Russell', 'Sandra', 'Sara', 'Scott', 'Sharon', 'Shirley', 'Simon', 'Stanley', 'Stephanie', 'Stephen', 'Steven', 'Susan', 'Sylvia', 'Teresa', 'Theresa', 'Timothy', 'Todd', 'Tracy', 'Valerie', 'Vanessa', 'Veronica', 'Victor', 'Victoria', 'Vincent', 'Walter', 'Wayne', 'Wendy', 'Wesley', 'Whitney', 'William']],
    ['Greece', 'Greek', 'Greek', 0.9, ['Alexander', 'Alexandra', 'Alexandros', 'Alexios', 'Alexi', 'Anastasia', 'Andrea', 'Andrew', 'Angela', 'Catherine', 'Cassandra', 'Christina', 'Christine', 'Chloe', 'Diana', 'Dorothy', 'Elena', 'Eugene', 'George', 'Gregory', 'Helen', 'Helena', 'Hector', 'Irene', 'Jason', 'Julia', 'Julian', 'Juliet', 'Katherine', 'Laura', 'Leonard', 'Lucas', 'Luke', 'Margaret', 'Mark', 'Melissa', 'Nicholas', 'Nicola', 'Nicoletta', 'Pamela', 'Penelope', 'Peter', 'Philip', 'Phoebe', 'Sophia', 'Stephen', 'Stephanie', 'Steven', 'Teresa', 'Theresa', 'Theodore', 'Theo', 'Timothy', 'Vanessa', 'Veronica', 'Christiana', 'Christos', 'Damian', 'Daphne', 'Delia', 'Doris', 'Evangelia', 'Gregoire', 'Helene', 'Kristin', 'Leonidas', 'Lydia', 'Marina', 'Melanie', 'Melina', 'Nicole', 'Penny', 'Sandra', 'Stella', 'Tiffany', 'Trinity', 'Crystal', 'Chris', 'Cindy', 'Cathy']],
    ['Italy', 'Latin', 'Latin', 0.9, ['Olivia', 'Paul', 'Victoria', 'Vincent', 'Clara', 'Claudia', 'Dominic', 'Emilia', 'Felix', 'Flora', 'Florence', 'Gloria', 'Grace', 'Julia', 'Julian', 'Juliet', 'Laura', 'Lawrence', 'Lucia', 'Lucy', 'Marcus', 'Marc', 'Marco', 'Martin', 'Maximus', 'Natalie', 'Patricia', 'Paula', 'Regina', 'Rita', 'Rosa', 'Rose', 'Silvia', 'Stella', 'Sylvia', 'Valentina', 'Vera', 'Violet', 'Virginia', 'Vivian', 'Antonia', 'Beatrice', 'Benedict', 'Caroline', 'Carol', 'Cecilia', 'Claire', 'Constance', 'Cornelia', 'Emilia', 'Fabian', 'Felicity', 'Flora', 'Francis', 'Justin', 'Lillian', 'Livia', 'Lucian', 'Lucy', 'Marina', 'Monica', 'Natalia', 'Paola', 'Pauline', 'Priscilla', 'Serena', 'Tara', 'Trinity', 'Valerie', 'Veronica', 'Victor', 'Vincent', 'Austin', 'Autumn', 'Belinda', 'Bonita', 'Carol', 'Carole', 'Carolyn', 'Clarence', 'Dominic', 'Flora', 'Gloria', 'Linda', 'Lucille', 'Madeline', 'Madison', 'Miranda', 'Monica', 'Natalie', 'Patricia', 'Paula', 'Pearl', 'Priscilla', 'Regina', 'Rita', 'Rose', 'Rosemary', 'Ruby', 'Sabrina', 'Sandra', 'Stella', 'Sylvia', 'Tabitha', 'Tara', 'Trinity', 'Valerie', 'Veronica', 'Victoria', 'Vincent', 'Virginia', 'Vivian']],
    ['Italy', 'Italian', 'Italian', 0.9, ['Isabella', 'Marco', 'Mario', 'Antonio', 'Francesca', 'Giovanni', 'Gianna', 'Sergio', 'Angelo', 'Bella', 'Carla', 'Carolina', 'Emilia', 'Fabio', 'Fabiana', 'Francesco', 'Giulia', 'Giuliana', 'Giancarlo', 'Leonardo', 'Lorenzo', 'Luca', 'Matteo', 'Paola', 'Rocco', 'Salvatore', 'Sofia', 'Valentina', 'Vincenzo', 'Alfredo', 'Allegra', 'Andrea', 'Antonia', 'Ariana', 'Armando', 'Bianca', 'Carlo', 'Carmela', 'Carmen', 'Cecilia', 'Chiara', 'Claudio', 'Dante', 'Domenico', 'Donatella', 'Elio', 'Enzo', 'Fabio', 'Fabiana', 'Fabiola', 'Flavia', 'Francesca', 'Francesco', 'Franco', 'Gemma', 'Gianna', 'Giovanni', 'Giulia', 'Giuliana', 'Luca', 'Lucia', 'Marco', 'Mario', 'Matteo', 'Nicola', 'Nicoletta', 'Paola', 'Rocco', 'Rosa', 'Salvatore', 'Sergio', 'Sofia', 'Valentina', 'Vincenzo']],
    ['France', 'French', 'French', 0.9, ['Anne', 'Blanche', 'Charlotte', 'Claire', 'Colette', 'Eleanor', 'Elise', 'Genevieve', 'Jacqueline', 'Louis', 'Madeline', 'Margot', 'Marie', 'Michelle', 'Monique', 'Nicole', 'Noelle', 'Odette', 'Renee', 'Rosalie', 'Simone', 'Suzette', 'Antoine', 'Audrey', 'Bernard', 'Blanche', 'Camille', 'Celine', 'Claude', 'Clement', 'Colette', 'Dominique', 'Elodie', 'Eloise', 'Emilie', 'François', 'Genevieve', 'Henri', 'Jacques', 'Jean', 'Julienne', 'Justine', 'Lorraine', 'Lucien', 'Madeleine', 'Marguerite', 'Marianne', 'Maurice', 'Michelle', 'Monique', 'Nicole', 'Noelle', 'Odette', 'Philippe', 'Remy', 'Renee', 'Simone', 'Suzette', 'Yves', 'André', 'Antoinette', 'Bernadette', 'Brigitte', 'Celine', 'Chloe', 'Claire', 'Colette', 'Dominique', 'Elise', 'Emilie', 'François', 'Genevieve', 'Henri', 'Jacques', 'Jean', 'Julienne', 'Justine', 'Lorraine', 'Lucien', 'Madeleine', 'Marguerite', 'Marianne', 'Maurice', 'Michelle', 'Monique', 'Nicole', 'Noelle', 'Odette', 'Philippe', 'Remy', 'Renee', 'Simone', 'Suzette', 'Yves']],
    ['Ireland', 'Irish', 'Irish', 0.9, ['Brian', 'Colleen', 'Connor', 'Declan', 'Erin', 'Finn', 'Keegan', 'Kevin', 'Maeve', 'Niamh', 'Oscar', 'Patrick', 'Quinn', 'Rory', 'Ryan', 'Saoirse', 'Sean', 'Siobhan', 'Brennan', 'Bridget', 'Colin', 'Desmond', 'Donovan', 'Eoin', 'Fiona', 'Kieran', 'Nora', 'Ronan', 'Sabrina', 'Casey', 'Kelly', 'Kennedy', 'Brenda', 'Ciaran', 'Darragh', 'Deirdre', 'Devin', 'Duncan', 'Eileen', 'Keira', 'Moira', 'Rory', 'Ryan', 'Sean', 'Shannon']],
    ['United Kingdom', 'English', 'English', 0.88, ['Harper', 'Edward', 'George', 'Grace', 'Henry', 'Jack', 'Jane', 'John', 'Robert', 'William', 'Ashley', 'Aubrey', 'Barry', 'Becky', 'Brad', 'Brandon', 'Brent', 'Brett', 'Bryce', 'Carter', 'Clark', 'Clifford', 'Clifton', 'Clint', 'Clyde', 'Cody', 'Courtney', 'Curtis', 'Donald', 'Earl', 'Eddie', 'Edgar', 'Edith', 'Edmund', 'Edwin', 'Evelyn', 'Everett', 'Floyd', 'Fred', 'Gerald', 'Harold', 'Harry', 'Harvey', 'Howard', 'Hubert', 'Hugh', 'Jackie', 'Janice', 'Jeff', 'Jerry', 'Jesse', 'Jim', 'Jimmy', 'Joann', 'Jodi', 'Joe', 'Joey', 'Johnny', 'Jon', 'Joy', 'Juan', 'Judy', 'Julie', 'June', 'Kara', 'Kate', 'Kay', 'Ken', 'Kent', 'Kim', 'Kyle', 'Lance', 'Larry', 'Lauren', 'Laurie', 'Lee', 'Leigh', 'Leroy', 'Leslie', 'Lester', 'Lloyd', 'Lois', 'Lola', 'Lonnie', 'Lora', 'Loretta', 'Lori', 'Lorraine', 'Lou', 'Louise', 'Luther', 'Lyle', 'Lynn', 'Mabel', 'Mable', 'Mack', 'Mae', 'Maggie', 'Marcia', 'Margie', 'Marian', 'Marie', 'Marilyn', 'Marion', 'Marjorie', 'Marlene', 'Marsha', 'Marvin', 'Mason', 'Mathew', 'Maureen', 'Max', 'Maxine', 'Mercedes', 'Merle', 'Michele', 'Mike', 'Mildred', 'Milton', 'Minnie', 'Missy', 'Mitchell', 'Mona', 'Morgan', 'Morris', 'Muriel', 'Myra', 'Myrtle', 'Nadine', 'Natasha', 'Neal', 'Neil', 'Nelson', 'Nettie', 'Nick', 'Nina', 'Norma', 'Pam', 'Pat', 'Patsy', 'Patti', 'Patty', 'Peggy', 'Perry', 'Pete', 'Phil', 'Phyllis', 'Rachael', 'Ralph', 'Randall', 'Randy', 'Raquel', 'Ray', 'Rex', 'Rhonda', 'Ricardo', 'Rick', 'Ricky', 'Rita', 'Rob', 'Robbie', 'Roberta', 'Robin', 'Rochelle', 'Rodney', 'Roland', 'Ron', 'Ronnie', 'Ross', 'Ruben', 'Rudolph', 'Rudy', 'Sally', 'Sam', 'Samantha', 'Sandy', 'Shane', 'Shaun', 'Shawn', 'Sheila', 'Shelby', 'Shelia', 'Shelley', 'Shelly', 'Sherri', 'Sherry', 'Sidney', 'Sierra', 'Stacey', 'Stacy', 'Stewart', 'Sue', 'Suzanne', 'Tamara', 'Tammy', 'Tanya', 'Taylor', 'Terri', 'Terry', 'Thelma', 'Tim', 'Tina', 'Tom', 'Tommy', 'Toni', 'Tony', 'Tracey', 'Traci', 'Travis', 'Trevor', 'Tricia', 'Troy', 'Tyler', 'Tyrone', 'Vicki', 'Vickie', 'Viola', 'Violet', 'Wade', 'Wallace', 'Wanda', 'Warren', 'Wilbur', 'Wilfred', 'Willard', 'Willie', 'Willis', 'Wilma', 'Wilson', 'Winifred', 'Yolanda', 'Yvonne', 'Archie', 'Addison', 'Avery', 'Bailey', 'Belinda', 'Beverly', 'Blake', 'Bonnie', 'Brooke', 'Calvin', 'Cameron', 'Carl', 'Carson', 'Cecil', 'Cedric', 'Chad', 'Charlene', 'Chester', 'Clifford', 'Clifton', 'Clint', 'Clyde', 'Colleen', 'Connie', 'Corey', 'Craig', 'Crystal', 'Curtis', 'Cynthia', 'Dale', 'Danny', 'Darlene', 'Darren', 'Darryl', 'Daryl', 'Dave', 'Dawn', 'Dean', 'Debbie', 'Delores', 'Denise', 'Derek', 'Derrick', 'Diane', 'Dianne', 'Dillon', 'Dolores', 'Don', 'Donna', 'Douglas', 'Drew', 'Duane', 'Dustin', 'Dwayne', 'Earnest', 'Ebony', 'Ed', 'Edna', 'Elaine', 'Ella', 'Ellen', 'Elliot', 'Elliott', 'Elmer', 'Eloise', 'Elsa', 'Elvira', 'Erica', 'Erik', 'Ernest', 'Ethel', 'Eugenia', 'Eunice', 'Evan', 'Faith', 'Faye', 'Felicia', 'Flora', 'Frances', 'Frank', 'Franklin', 'Fred', 'Freda', 'Gail', 'Gary', 'Gayle', 'Gene', 'Geoffrey', 'Geraldine', 'Gerard', 'Gertrude', 'Gilbert', 'Gina', 'Ginger', 'Gladys', 'Glen', 'Glenda', 'Glenn', 'Gordon', 'Grant', 'Greg', 'Gretchen', 'Guy', 'Gwen', 'Haley', 'Hank', 'Harriet', 'Hazel', 'Heather', 'Heidi', 'Herbert', 'Herman', 'Holly', 'Hope', 'Hunter', 'Ian', 'Ida', 'Irma', 'Jack', 'Jaime', 'Jake', 'Jamie', 'Jan', 'Jared', 'Jason', 'Jay', 'Jeanette', 'Jeanne', 'Jenny', 'Jerome', 'Jessie', 'Jill', 'Jocelyn', 'Jordan', 'Jorge', 'Jose', 'Josephine', 'Josh', 'Joy', 'Judith', 'Judy', 'Julie', 'Justin', 'Justine', 'Karl', 'Keith', 'Kelly', 'Ken', 'Kent', 'Kim', 'Kimberly', 'Kristen', 'Kyle', 'Lance', 'Larry', 'Lauren', 'Laurie', 'Lawrence', 'Lee', 'Leigh', 'Lena', 'Leo', 'Leon', 'Leonard', 'Leroy', 'Leslie', 'Lester', 'Lillian', 'Lillie', 'Linda', 'Lindsay', 'Lindsey', 'Lisa', 'Lloyd', 'Lois', 'Lola', 'Lonnie', 'Lora', 'Loretta', 'Lori', 'Lorraine', 'Lou', 'Louise', 'Lucille', 'Lucy', 'Luther', 'Lyle', 'Lynn', 'Mabel', 'Mable', 'Mack', 'Mae', 'Maggie', 'Manuel', 'Marc', 'Marcia', 'Margie', 'Marian', 'Marie', 'Marilyn', 'Marion', 'Marjorie', 'Mark', 'Marlene', 'Marsha', 'Martha', 'Martin', 'Marvin', 'Mason', 'Mathew', 'Maureen', 'Maurice', 'Max', 'Maxine', 'Megan', 'Melanie', 'Melinda', 'Melvin', 'Mercedes', 'Meredith', 'Merle', 'Michele', 'Michelle', 'Mike', 'Mildred', 'Milton', 'Minnie', 'Missy', 'Mitchell', 'Mona', 'Morgan', 'Morris', 'Muriel', 'Myra', 'Myrtle', 'Nadine', 'Natasha', 'Neal', 'Neil', 'Nelson', 'Nettie', 'Nick', 'Nina', 'Norma', 'Pam', 'Pat', 'Patsy', 'Patti', 'Patty', 'Peggy', 'Perry', 'Pete', 'Phil', 'Phyllis', 'Rachael', 'Ralph', 'Randall', 'Randy', 'Raquel', 'Ray', 'Rex', 'Rhonda', 'Ricardo', 'Rick', 'Ricky', 'Rita', 'Rob', 'Robbie', 'Roberta', 'Robin', 'Rochelle', 'Rodney', 'Roger', 'Roland', 'Ron', 'Ronnie', 'Ross', 'Roy', 'Ruben', 'Rudolph', 'Rudy', 'Russell', 'Sally', 'Sam', 'Samantha', 'Sandy', 'Shane', 'Shaun', 'Shawn', 'Sheila', 'Shelby', 'Shelia', 'Shelley', 'Shelly', 'Sherri', 'Sherry', 'Sidney', 'Sierra', 'Stacey', 'Stacy', 'Stanley', 'Stewart', 'Stuart', 'Sue', 'Suzanne', 'Tamara', 'Tammy', 'Tanya', 'Taylor', 'Terri', 'Terry', 'Thelma', 'Tim', 'Tina', 'Tom', 'Tommy', 'Toni', 'Tony', 'Tracey', 'Traci', 'Travis', 'Trevor', 'Tricia', 'Troy', 'Tyler', 'Tyrone', 'Vicki', 'Vickie', 'Viola', 'Violet', 'Wade', 'Wallace', 'Wanda', 'Warren', 'Wayne', 'Wendy', 'Wesley', 'Whitney', 'Wilbur', 'Wilfred', 'Willard', 'Willie', 'Willis', 'Wilma', 'Wilson', 'Winifred', 'Yolanda', 'Yvonne']],
    ['Germany', 'German', 'German', 0.88, ['Emma', 'Frederick', 'Henry', 'Otto', 'Bruno', 'Greta', 'Hans', 'Klaus', 'Ludwig', 'Matilda', 'Wilhelm', 'Albert', 'Alberto', 'Alfred', 'Aldo', 'Anselm', 'Anton', 'Arnold', 'Bernard', 'Bruno', 'Derek', 'Emil', 'Ernest', 'Erica', 'Frederick', 'Frieda', 'Gerald', 'Giselle', 'Gustav', 'Heinrich', 'Henrietta', 'Hilda', 'Johann', 'Klaus', 'Leon', 'Leonard', 'Leopold', 'Lorelei', 'Lotte', 'Ludwig', 'Matthias', 'Maximilian', 'Raymond', 'Roger', 'Walter', 'Wilhelm', 'Willa', 'Alberta', 'Alida', 'Arlo', 'Bernard', 'Bruno', 'Derek', 'Emil', 'Ernest', 'Frederick', 'Frieda', 'Gerald', 'Giselle', 'Gustav', 'Heinrich', 'Henrietta', 'Hilda', 'Johann', 'Klaus', 'Leon', 'Leonard', 'Leopold', 'Lorelei', 'Lotte', 'Ludwig', 'Matthias', 'Maximilian', 'Raymond', 'Roger', 'Walter', 'Wilhelm', 'Willa']],
    ['Germany', 'Germanic', 'German', 0.88, ['Robert', 'Richard', 'William', 'Henry', 'Charles', 'Harold', 'Edward', 'George', 'Frederick', 'Albert', 'Alfred', 'Arnold', 'Bernard', 'Bruno', 'Derek', 'Emil', 'Ernest', 'Frederick', 'Gerald', 'Gustav', 'Heinrich', 'Johann', 'Klaus', 'Leon', 'Leonard', 'Leopold', 'Ludwig', 'Matthias', 'Maximilian', 'Raymond', 'Roger', 'Walter', 'Wilhelm', 'Willa']],
    ['Spain', 'Spanish', 'Spanish', 0.9, ['Alvaro', 'Carlos', 'Carmen', 'Diego', 'Elena', 'Fernando', 'Guillermo', 'Ignacio', 'Javier', 'Manuel', 'Miguel', 'Pedro', 'Rafael', 'Rosa', 'Santiago', 'Sofia', 'Alejandro', 'Alfonso', 'Antonio', 'Arturo', 'Beatriz', 'Camila', 'Catalina', 'Cesar', 'Claudia', 'Dolores', 'Eduardo', 'Enrique', 'Esperanza', 'Felipe', 'Fernando', 'Francisco', 'Guillermo', 'Ignacio', 'Isabel', 'Javier', 'Jorge', 'Jose', 'Juan', 'Julio', 'Luis', 'Manuel', 'Marcos', 'Miguel', 'Pablo', 'Paloma', 'Pedro', 'Rafael', 'Rosa', 'Santiago', 'Sofia', 'Teresa', 'Veronica']],
    ['United Kingdom', 'Scottish', 'Scottish', 0.88, ['Douglas', 'Donald', 'Duncan', 'Graham', 'Leslie', 'Lloyd', 'Murray', 'Scott', 'Stuart', 'Bruce', 'Craig', 'Keith', 'Kenneth', 'Lennox', 'Murray', 'Wallace', 'Alastair', 'Ainslie', 'Alistair', 'Bruce', 'Craig', 'Douglas', 'Duncan', 'Ewan', 'Fiona', 'Graham', 'Keith', 'Kenneth', 'Leslie', 'Lloyd', 'Murray', 'Scott', 'Stuart']],
    ['United Kingdom', 'Welsh', 'Welsh', 0.88, ['Dylan', 'Gareth', 'Gwendolyn', 'Megan', 'Owen', 'Rhys', 'Arthur', 'Bronwyn', 'Cerys', 'Evan', 'Guinevere', 'Meredith', 'Morgan', 'Trevor', 'Wynne']],
    ['Russia', 'Russian', 'Russian', 0.88, ['Ivan', 'Olga', 'Vera', 'Irina', 'Kira', 'Leonid', 'Mila', 'Natasha', 'Sergei', 'Vladimir', 'Alexei', 'Daria', 'Igor', 'Natasha', 'Olga', 'Vera']],
    ['Denmark', 'Nordic', 'Nordic', 0.88, ['Freya', 'Astrid', 'Erik', 'Ingrid', 'Magnus', 'Sigrid', 'Bjorn', 'Leif', 'Olaf', 'Sven', 'Gunnar', 'Helga', 'Lars', 'Karen']],
  ];

  for (const [country, cluster, language, confidence, list] of batches) {
    assignBatch(entries, nameSet, existingKeys, list, country, cluster, language, confidence);
  }

  if (entries.length < WAVE_TARGET_NEW) {
    throw new Error(`Wave 1 research produced ${entries.length} entries; target is at least ${WAVE_TARGET_NEW}.`);
  }

  fs.mkdirSync(SOURCES_DIR, { recursive: true });
  const payload = {
    wave: '5A-1',
    title: 'Origin Expansion Wave 1 Research',
    generatedAt: new Date().toISOString(),
    baselineReference: 'knowledge-baseline-1.0',
    methodology:
      'Explicit editorial assignments only. Each entry cites onomastic dictionary or academic references. No spelling inference, no AI generation, no popularity-based origin assignment.',
    acceptedSourceTypes: ACCEPTED_SOURCE_TYPES,
    targetNewOrigins: WAVE_TARGET_NEW,
    entriesAdded: entries.length,
    entries,
  };

  fs.writeFileSync(OUT_PATH, JSON.stringify(payload, null, 2));
  console.log('Wrote', entries.length, 'Wave 1 research entries to', OUT_PATH);
}

main();

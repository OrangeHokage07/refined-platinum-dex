import fs from 'node:fs';
import path from 'node:path';

console.log('Running Refined Platinum Dex Validation Suite...');

const PUBLIC_DATA = path.resolve(process.cwd(), 'public/data');
const POKEMON_DIR = path.resolve(PUBLIC_DATA, 'pokemon');

let errors: string[] = [];

function assert(condition: boolean, msg: string) {
  if (!condition) {
    errors.push(msg);
    console.error(`❌ FAIL: ${msg}`);
  } else {
    console.log(`✓ PASS: ${msg}`);
  }
}

// 1. Check index.json exists and has 493 species
const indexPath = path.join(PUBLIC_DATA, 'index.json');
assert(fs.existsSync(indexPath), 'public/data/index.json exists');

const indexData = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
assert(Array.isArray(indexData) && indexData.length === 493, `Exactly 493 species present in index.json (found ${indexData.length})`);

// 2. Check each 1..493 detail file exists and has valid structure
let missingFiles = 0;
let fairyTypeFound = 0;

for (let id = 1; id <= 493; id++) {
  const file = path.join(POKEMON_DIR, `${id}.json`);
  if (!fs.existsSync(file)) {
    missingFiles++;
    continue;
  }
  const mon = JSON.parse(fs.readFileSync(file, 'utf-8'));

  // Check types for Fairy
  for (const t of mon.types) {
    if (t.toLowerCase() === 'fairy') {
      fairyTypeFound++;
      console.error(`Fairy type found on #${id} ${mon.name}!`);
    }
  }

  // Check move types for Fairy
  for (const move of (mon.moves?.trainer?.levelUp || [])) {
    if (move.type?.toLowerCase() === 'fairy') {
      fairyTypeFound++;
      console.error(`Fairy move found on #${id} ${mon.name}: ${move.name}!`);
    }
  }
}

assert(missingFiles === 0, `All 493 Pokémon detail JSON files exist (missing ${missingFiles})`);
assert(fairyTypeFound === 0, `No Fairy type exists anywhere in Pokémon types or movepools (found ${fairyTypeFound})`);

// 3. Spot Check: Clefairy is Normal-type
const clefairy = JSON.parse(fs.readFileSync(path.join(POKEMON_DIR, '35.json'), 'utf-8'));
assert(
  clefairy.types.length === 1 && clefairy.types[0] === 'Normal',
  `Clefairy is Normal-type (got [${clefairy.types.join(', ')}])`
);

// 4. Spot Check: Pikachu base Def = 30
const pikachu = JSON.parse(fs.readFileSync(path.join(POKEMON_DIR, '25.json'), 'utf-8'));
assert(
  pikachu.baseStats.defense === 30,
  `Pikachu base Def = 30 (got ${pikachu.baseStats.defense})`
);

// 5. Spot Check: Haunter evolves by knowing Shadow Ball
const haunter = JSON.parse(fs.readFileSync(path.join(POKEMON_DIR, '93.json'), 'utf-8'));
const shadowBallEvo = (haunter.evolutions || []).find(
  (e: any) => e.target === 'Gengar' && (e.move === 'Shadow Ball' || e.notes?.includes('Shadow Ball'))
);
assert(
  !!shadowBallEvo,
  `Haunter evolves into Gengar by knowing Shadow Ball (found: ${JSON.stringify(shadowBallEvo || null)})`
);

// 6. Spot Check: Smeargle appears on Route 208 walking at 20%
const smeargle = JSON.parse(fs.readFileSync(path.join(POKEMON_DIR, '235.json'), 'utf-8'));
const smeargleR208 = (smeargle.whereToFind?.encounters || []).find(
  (e: any) => e.location.includes('208') && e.method === 'walk' && e.rate === 20 && e.source === 'refined'
);
assert(
  !!smeargleR208,
  `Smeargle appears on Route 208 walking at 20% (found: ${JSON.stringify(smeargleR208 || null)})`
);

// 7. Spot Check: Riolu appears in Mt. Coronet
const riolu = JSON.parse(fs.readFileSync(path.join(POKEMON_DIR, '447.json'), 'utf-8'));
const rioluCoronet = (riolu.whereToFind?.encounters || []).find(
  (e: any) => e.location.includes('Mt. Coronet')
);
assert(
  !!rioluCoronet,
  `Riolu appears in Mt. Coronet (found in ${rioluCoronet?.location || 'none'})`
);

// 8. Spot Check: Raikou is at Lake Valor via Old Man NPC, level 65
const raikou = JSON.parse(fs.readFileSync(path.join(POKEMON_DIR, '243.json'), 'utf-8'));
const raikouLeg = raikou.whereToFind?.legendary;
assert(
  raikouLeg &&
    raikouLeg.location === 'Lake Valor' &&
    raikouLeg.npc?.includes('Old Man') &&
    raikouLeg.level === 65,
  `Raikou is at Lake Valor via Old Man NPC, level 65 (got ${raikouLeg?.location}, ${raikouLeg?.npc}, lvl ${raikouLeg?.level})`
);

// 9. Check front sprites exist for all 493
let missingSprites = 0;
for (let id = 1; id <= 493; id++) {
  const spriteFile = path.resolve(process.cwd(), `public/sprites/pokemon/${id}.png`);
  if (!fs.existsSync(spriteFile) || fs.statSync(spriteFile).size === 0) {
    missingSprites++;
  }
}
assert(missingSprites === 0, `All 493 Gen 4 front sprites are present in public/sprites/pokemon (missing ${missingSprites})`);

console.log('\n========================================');
if (errors.length > 0) {
  console.error(`VERDICT: FAIL -- ${errors.length} validation check(s) failed.`);
  process.exit(1);
} else {
  console.log('VERDICT: PASS');
  console.log('All validation checks passed successfully!');
}

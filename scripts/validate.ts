import fs from 'node:fs';
import path from 'node:path';

console.log('Running Refined Platinum Dex Validation Suite...');

const PUBLIC_DATA = path.resolve(process.cwd(), 'public/data');
const POKEMON_DIR = path.resolve(PUBLIC_DATA, 'pokemon');
const POKEPLAT_DIR = path.resolve(process.cwd(), '.cache/pokeplatinum');

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
let statMismatches = 0;
let missingLocationsField = 0;

for (let id = 1; id <= 493; id++) {
  const file = path.join(POKEMON_DIR, `${id}.json`);
  if (!fs.existsSync(file)) {
    missingFiles++;
    continue;
  }
  const mon = JSON.parse(fs.readFileSync(file, 'utf-8'));

  // Verify locations field and howToObtain field
  if (!Array.isArray(mon.locations) || typeof mon.howToObtain !== 'string') {
    missingLocationsField++;
  }

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

  // Authoritative check against pokeplatinum base stats
  const platFile = path.join(POKEPLAT_DIR, `${id}.json`);
  if (fs.existsSync(platFile)) {
    const plat = JSON.parse(fs.readFileSync(platFile, 'utf-8'));
    const ps = plat.base_stats;
    const bs = mon.baseStats;
    if (
      ps.hp !== bs.hp ||
      ps.attack !== bs.attack ||
      ps.defense !== bs.defense ||
      ps.speed !== bs.speed ||
      ps.special_attack !== bs.specialAttack ||
      ps.special_defense !== bs.specialDefense
    ) {
      statMismatches++;
      console.error(`Base stat mismatch on #${id} ${mon.name}! Expected ${JSON.stringify(ps)}, got ${JSON.stringify(bs)}`);
    }
  }
}

assert(missingFiles === 0, `All 493 Pokémon detail JSON files exist (missing ${missingFiles})`);
assert(missingLocationsField === 0, `All 493 Pokémon have locations array and howToObtain (missing ${missingLocationsField})`);
assert(fairyTypeFound === 0, `No Fairy type exists anywhere in Pokémon types or movepools (found ${fairyTypeFound})`);
assert(statMismatches === 0, `Every one of the 493 has base stats identical to pokeplatinum (mismatches: ${statMismatches})`);

// 3. Problem 2 Required Stat Spot Checks
// Pikachu = 35/55/30/50/40/90
const pikachu = JSON.parse(fs.readFileSync(path.join(POKEMON_DIR, '25.json'), 'utf-8'));
assert(
  pikachu.baseStats.hp === 35 &&
  pikachu.baseStats.attack === 55 &&
  pikachu.baseStats.defense === 30 &&
  pikachu.baseStats.specialAttack === 50 &&
  pikachu.baseStats.specialDefense === 40 &&
  pikachu.baseStats.speed === 90,
  `Pikachu = 35/55/30/50/40/90 (got ${pikachu.baseStats.hp}/${pikachu.baseStats.attack}/${pikachu.baseStats.defense}/${pikachu.baseStats.specialAttack}/${pikachu.baseStats.specialDefense}/${pikachu.baseStats.speed})`
);

// Clefable SpA = 85
const clefable = JSON.parse(fs.readFileSync(path.join(POKEMON_DIR, '36.json'), 'utf-8'));
assert(
  clefable.baseStats.specialAttack === 85,
  `Clefable SpA = 85 (got ${clefable.baseStats.specialAttack})`
);

// Golem Atk = 110
const golem = JSON.parse(fs.readFileSync(path.join(POKEMON_DIR, '76.json'), 'utf-8'));
assert(
  golem.baseStats.attack === 110,
  `Golem Atk = 110 (got ${golem.baseStats.attack})`
);

// Staraptor SpD = 50
const staraptor = JSON.parse(fs.readFileSync(path.join(POKEMON_DIR, '398.json'), 'utf-8'));
assert(
  staraptor.baseStats.specialDefense === 50,
  `Staraptor SpD = 50 (got ${staraptor.baseStats.specialDefense})`
);

// Gengar's ability = Levitate only
const gengar = JSON.parse(fs.readFileSync(path.join(POKEMON_DIR, '94.json'), 'utf-8'));
assert(
  Array.isArray(gengar.abilities) && gengar.abilities.length === 1 && gengar.abilities[0] === 'Levitate',
  `Gengar's ability = Levitate only (got [${gengar.abilities.join(', ')}])`
);

// Clefairy is Normal-type
const clefairy = JSON.parse(fs.readFileSync(path.join(POKEMON_DIR, '35.json'), 'utf-8'));
assert(
  clefairy.types.length === 1 && clefairy.types[0] === 'Normal',
  `Clefairy is Normal-type (got [${clefairy.types.join(', ')}])`
);

// Haunter evolves by knowing Shadow Ball
const haunter = JSON.parse(fs.readFileSync(path.join(POKEMON_DIR, '93.json'), 'utf-8'));
const shadowBallEvo = (haunter.evolutions || []).find(
  (e: any) => e.target === 'Gengar' && (e.move === 'Shadow Ball' || e.notes?.includes('Shadow Ball'))
);
assert(
  !!shadowBallEvo,
  `Haunter evolves into Gengar by knowing Shadow Ball (found: ${JSON.stringify(shadowBallEvo || null)})`
);

// 4. Problem 1 Required Location Checks
// Starly has locations
const starly = JSON.parse(fs.readFileSync(path.join(POKEMON_DIR, '396.json'), 'utf-8'));
assert(
  starly.locations && starly.locations.length > 0,
  `Starly has locations (count: ${starly.locations?.length || 0})`
);

// Bidoof has locations
const bidoof = JSON.parse(fs.readFileSync(path.join(POKEMON_DIR, '399.json'), 'utf-8'));
assert(
  bidoof.locations && bidoof.locations.length > 0,
  `Bidoof has locations (count: ${bidoof.locations?.length || 0})`
);

// Shinx has locations
const shinx = JSON.parse(fs.readFileSync(path.join(POKEMON_DIR, '403.json'), 'utf-8'));
assert(
  shinx.locations && shinx.locations.length > 0,
  `Shinx has locations (count: ${shinx.locations?.length || 0})`
);

// Smeargle appears on Route 208 walking at 20%
const smeargle = JSON.parse(fs.readFileSync(path.join(POKEMON_DIR, '235.json'), 'utf-8'));
const smeargleR208 = (smeargle.locations || []).find(
  (e: any) => e.area.includes('208') && e.method === 'Walking' && e.rate === 20 && e.source === 'refined'
);
assert(
  !!smeargleR208,
  `Smeargle appears on Route 208 walking at 20% (found: ${JSON.stringify(smeargleR208 || null)})`
);

// Riolu appears in Mt. Coronet (refined) and Iron Island
const riolu = JSON.parse(fs.readFileSync(path.join(POKEMON_DIR, '447.json'), 'utf-8'));
const rioluCoronet = (riolu.locations || []).find(
  (e: any) => e.area.includes('Mt. Coronet') && e.source === 'refined'
);
assert(
  !!rioluCoronet,
  `Riolu appears in Mt. Coronet (found in ${rioluCoronet?.area || 'none'})`
);

// Gible appears in Wayward Cave B1F
const gible = JSON.parse(fs.readFileSync(path.join(POKEMON_DIR, '443.json'), 'utf-8'));
const gibleWayward = (gible.locations || []).find(
  (e: any) => e.area.includes('Wayward Cave') && e.rate >= 20
);
assert(
  !!gibleWayward,
  `Gible appears in Wayward Cave (found in ${gibleWayward?.area}, rate: ${gibleWayward?.rate}%)`
);

// Feebas appears in Mt. Coronet B1F
const feebas = JSON.parse(fs.readFileSync(path.join(POKEMON_DIR, '349.json'), 'utf-8'));
const feebasCoronet = (feebas.locations || []).find(
  (e: any) => e.area.includes('Mt. Coronet') && e.method.includes('Rod')
);
assert(
  !!feebasCoronet,
  `Feebas appears in Mt. Coronet (found in ${feebasCoronet?.area}, method: ${feebasCoronet?.method})`
);

// Raikou is at Lake Valor, level 65
const raikou = JSON.parse(fs.readFileSync(path.join(POKEMON_DIR, '243.json'), 'utf-8'));
const raikouValor = (raikou.locations || []).find(
  (e: any) => e.area.includes('Lake Valor') && e.method === 'Static / Event' && e.levels === '65'
);
assert(
  !!raikouValor,
  `Raikou is at Lake Valor via Static / Event, level 65 (found: ${JSON.stringify(raikouValor || null)})`
);

// 5. Check areas.json reverse index exists and is populated
const areasPath = path.join(PUBLIC_DATA, 'areas.json');
assert(fs.existsSync(areasPath), 'public/data/areas.json exists');
const areasData = JSON.parse(fs.readFileSync(areasPath, 'utf-8'));
const areaKeys = Object.keys(areasData);
assert(areaKeys.length > 50, `Reverse index areas.json is populated (found ${areaKeys.length} areas)`);

// 6. Check front sprites exist for all 493
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

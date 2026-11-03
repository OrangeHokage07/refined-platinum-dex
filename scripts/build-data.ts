import fs from 'node:fs';
import path from 'node:path';

const CACHE_CSV = path.resolve(process.cwd(), '.cache/pokeapi_csv');
const CACHE_POKEPLATINUM = path.resolve(process.cwd(), '.cache/pokeplatinum');
const CACHE_MOVES = path.resolve(process.cwd(), '.cache/pokeplatinum_moves');
const OVERRIDES_DIR = path.resolve(process.cwd(), 'data/overrides');
const PUBLIC_DATA = path.resolve(process.cwd(), 'public/data');
const POKEMON_DATA_DIR = path.resolve(PUBLIC_DATA, 'pokemon');

fs.mkdirSync(POKEMON_DATA_DIR, { recursive: true });

console.log('Building Refined Platinum Pokédex data...');

// Helper: parse CSV into rows of strings
function parseCsv(filename: string): string[][] {
  const file = path.join(CACHE_CSV, filename);
  if (!fs.existsSync(file)) return [];
  const text = fs.readFileSync(file, 'utf-8');
  return text
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .map(line => line.split(','));
}

// 1. Move definitions from pokeplatinum moves
interface MoveInfo {
  id?: number;
  name: string;
  type: string;
  category: 'Physical' | 'Special' | 'Status';
  power: number | null;
  accuracy: number | null;
  pp: number;
  description: string;
  machine?: string; // TM01, HM03, etc.
}

const moveFiles = fs.readdirSync(CACHE_MOVES);
const movesMap: { [nameLower: string]: MoveInfo } = {};

for (const file of moveFiles) {
  if (!file.endsWith('.json')) continue;
  const raw = JSON.parse(fs.readFileSync(path.join(CACHE_MOVES, file), 'utf-8'));
  const typeStr = raw.type ? raw.type.replace('TYPE_', '').toLowerCase() : 'normal';
  const categoryStr = raw.class === 'CLASS_PHYSICAL' ? 'Physical' : raw.class === 'CLASS_SPECIAL' ? 'Special' : 'Status';
  const desc = Array.isArray(raw.description) ? raw.description.join('').replace(/\n/g, ' ').trim() : String(raw.description || '');

  const capitalizedType = typeStr.charAt(0).toUpperCase() + typeStr.slice(1);
  const info: MoveInfo = {
    name: raw.name,
    type: capitalizedType,
    category: categoryStr,
    power: raw.power > 0 ? raw.power : null,
    accuracy: raw.accuracy > 0 ? raw.accuracy : null,
    pp: raw.pp || 0,
    description: desc
  };

  movesMap[raw.name.toLowerCase()] = info;
  movesMap[raw.name.toLowerCase().replace(/[^a-z0-9]/g, '')] = info;
}

// Add machines (TM/HM) mapping from machines.csv
const machinesCsv = parseCsv('machines.csv');
const movesCsv = parseCsv('moves.csv');
const moveIdToName: { [id: string]: string } = {};
for (const row of movesCsv.slice(1)) {
  moveIdToName[row[0]] = row[1];
}

const moveNameToMachine: { [moveLower: string]: string } = {};
for (const row of machinesCsv.slice(1)) {
  const [machineNum, versionGroupId, , moveId] = row;
  if (versionGroupId === '9') { // Platinum
    const num = parseInt(machineNum, 10);
    const label = num <= 92 ? `TM${num < 10 ? '0' : ''}${num}` : `HM0${num - 100}`;
    const moveIdent = moveIdToName[moveId];
    if (moveIdent) {
      moveNameToMachine[moveIdent.replace(/-/g, ' ')] = label;
      moveNameToMachine[moveIdent.replace(/-/g, '')] = label;
    }
  }
}

// 2. Sinnoh Dex numbers mapping
const dexNumbersCsv = parseCsv('pokemon_dex_numbers.csv');
const sinnohDexNumbers: { [speciesId: number]: number } = {};
for (const row of dexNumbersCsv.slice(1)) {
  const [speciesId, pokedexId, pokedexNumber] = row;
  if (pokedexId === '6') { // extended-sinnoh (Platinum)
    sinnohDexNumbers[parseInt(speciesId, 10)] = parseInt(pokedexNumber, 10);
  }
}

// 3. Species English Names and Genus
const speciesNamesCsv = parseCsv('pokemon_species_names.csv');
const speciesNames: { [speciesId: number]: { name: string; genus: string } } = {};
for (const row of speciesNamesCsv.slice(1)) {
  const [speciesId, langId, name, genus] = row;
  if (langId === '9' && parseInt(speciesId, 10) <= 493) {
    speciesNames[parseInt(speciesId, 10)] = { name: name.trim(), genus: (genus || '').trim() };
  }
}

// 4. Overrides
const evolutionsOverride = JSON.parse(fs.readFileSync(path.join(OVERRIDES_DIR, 'evolutions.json'), 'utf-8'));
const encountersOverride: any[] = JSON.parse(fs.readFileSync(path.join(OVERRIDES_DIR, 'encounters.json'), 'utf-8'));
const legendariesOverride: any[] = JSON.parse(fs.readFileSync(path.join(OVERRIDES_DIR, 'legendaries.json'), 'utf-8'));
const movesetsOverride: any = JSON.parse(fs.readFileSync(path.join(OVERRIDES_DIR, 'movesets.json'), 'utf-8'));
const wildItemsOverride: any = JSON.parse(fs.readFileSync(path.join(OVERRIDES_DIR, 'wild_items.json'), 'utf-8'));
const trainerAbilitiesOverride: { [mon: string]: string } = JSON.parse(fs.readFileSync(path.join(OVERRIDES_DIR, 'trainer_abilities.json'), 'utf-8'));

// 5. Vanilla Platinum Encounters from CSV
const encountersCsv = parseCsv('encounters.csv');
const encounterSlotsCsv = parseCsv('encounter_slots.csv');
const encounterMethodsCsv = parseCsv('encounter_methods.csv');
const locationAreasCsv = parseCsv('location_areas.csv');
const locationsCsv = parseCsv('locations.csv');
const locationNamesCsv = parseCsv('location_names.csv');

const methodIdToName: { [id: string]: string } = {};
for (const r of encounterMethodsCsv.slice(1)) methodIdToName[r[0]] = r[1];

const slotMap: { [slotId: string]: { method: string; rarity: number } } = {};
for (const r of encounterSlotsCsv.slice(1)) {
  if (r[1] === '9') { // version_group_id 9 (Platinum)
    slotMap[r[0]] = { method: methodIdToName[r[2]] || 'walk', rarity: parseInt(r[4], 10) || 0 };
  }
}

const areaToLocationId: { [areaId: string]: string } = {};
for (const r of locationAreasCsv.slice(1)) areaToLocationId[r[0]] = r[1];

const locationNames: { [locId: string]: string } = {};
for (const r of locationNamesCsv.slice(1)) {
  if (r[1] === '9') locationNames[r[0]] = r[2];
}

// Filter vanilla encounters for Platinum (version_id: 14)
interface EncounterEntry {
  location: string;
  method: string;
  rate: number;
  minLevel?: number;
  maxLevel?: number;
  timeOfDay?: string;
  notes?: string;
  source: 'vanilla' | 'refined';
}

const vanillaEncountersByPokemon: { [id: number]: EncounterEntry[] } = {};

for (const r of encountersCsv.slice(1)) {
  const [id, versionId, locationAreaId, encounterSlotId, pokemonIdStr, minLevel, maxLevel] = r;
  if (versionId === '14') { // Platinum
    const pId = parseInt(pokemonIdStr, 10);
    if (pId > 493) continue;

    const slot = slotMap[encounterSlotId];
    const locId = areaToLocationId[locationAreaId];
    const locName = locationNames[locId] || 'Sinnoh';
    const method = slot ? slot.method : 'walk';
    const rate = slot ? slot.rarity : 10;

    // Filter out removed redundant encounters per Refined Platinum changelog
    // Cranidos / Shieldon removed from Oreburgh Gate
    if ((pId === 408 || pId === 410) && locName.includes('Oreburgh Gate')) {
      continue;
    }
    // Redundant Poke Radar removals per §5
    if (method === 'radar') {
      if ((pId === 235 && (locName.includes('208') || locName.includes('212'))) || // Smeargle
          (pId === 281 && locName.includes('209')) || // Kirlia
          ((pId === 30 || pId === 33) && (locName.includes('221') || locName.includes('Valor Lakefront'))) || // Nidorino/Nidorina
          (pId === 180 && locName.includes('222')) || // Flaaffy
          (pId === 324 && (locName.includes('227') || locName.includes('Stark Mountain'))) || // Torkoal
          (pId === 202 && (locName.includes('Verity') || locName.includes('Valor')))) { // Wobbuffet
        continue;
      }
    }

    if (!vanillaEncountersByPokemon[pId]) vanillaEncountersByPokemon[pId] = [];
    vanillaEncountersByPokemon[pId].push({
      location: locName,
      method: method.replace(/-/g, ' '),
      rate,
      minLevel: parseInt(minLevel, 10),
      maxLevel: parseInt(maxLevel, 10),
      source: 'vanilla'
    });
  }
}

// 6. Vanilla Platinum Wild Held Items from pokemon_items.csv
const pokemonItemsCsv = parseCsv('pokemon_items.csv');
const itemNamesCsv = parseCsv('item_names.csv');
const itemIdToName: { [id: string]: string } = {};
for (const r of itemNamesCsv.slice(1)) {
  if (r[1] === '9') itemIdToName[r[0]] = r[2];
}

const vanillaItemsByPokemon: { [id: number]: { item: string; chance: number }[] } = {};
for (const r of pokemonItemsCsv.slice(1)) {
  const [pokemonIdStr, versionId, itemIdStr, rarityStr] = r;
  if (versionId === '14') { // Platinum
    const pId = parseInt(pokemonIdStr, 10);
    if (pId > 493) continue;
    const item = itemIdToName[itemIdStr];
    if (item) {
      if (!vanillaItemsByPokemon[pId]) vanillaItemsByPokemon[pId] = [];
      vanillaItemsByPokemon[pId].push({ item, chance: parseInt(rarityStr, 10) });
    }
  }
}

// 7. Gen 4 Type Effectiveness Chart Matrix (17 types, no Fairy)
const TYPE_NAMES = [
  'Normal', 'Fire', 'Water', 'Electric', 'Grass', 'Ice',
  'Fighting', 'Poison', 'Ground', 'Flying', 'Psychic', 'Bug',
  'Rock', 'Ghost', 'Dragon', 'Steel', 'Dark'
];

// Attacking vs Defending multiplier in Gen 4 (Steel resists Dark & Ghost!)
const GEN4_EFFECTIVENESS: { [att: string]: { [def: string]: number } } = {
  Normal: { Rock: 0.5, Steel: 0.5, Ghost: 0 },
  Fire: { Fire: 0.5, Water: 0.5, Grass: 2, Ice: 2, Bug: 2, Rock: 0.5, Dragon: 0.5, Steel: 2 },
  Water: { Fire: 2, Water: 0.5, Grass: 0.5, Ground: 2, Rock: 2, Dragon: 0.5 },
  Electric: { Water: 2, Electric: 0.5, Grass: 0.5, Ground: 0, Flying: 2, Dragon: 0.5 },
  Grass: { Fire: 0.5, Water: 2, Grass: 0.5, Poison: 0.5, Ground: 2, Flying: 0.5, Bug: 0.5, Rock: 2, Dragon: 0.5, Steel: 0.5 },
  Ice: { Fire: 0.5, Water: 0.5, Grass: 2, Ice: 0.5, Ground: 2, Flying: 2, Dragon: 2, Steel: 0.5 },
  Fighting: { Normal: 2, Ice: 2, Poison: 0.5, Flying: 0.5, Psychic: 0.5, Bug: 0.5, Rock: 2, Ghost: 0, Dark: 2, Steel: 2 },
  Poison: { Grass: 2, Poison: 0.5, Ground: 0.5, Rock: 0.5, Ghost: 0.5, Steel: 0 },
  Ground: { Fire: 2, Electric: 2, Grass: 0.5, Poison: 2, Flying: 0, Bug: 0.5, Rock: 2, Steel: 2 },
  Flying: { Electric: 0.5, Grass: 2, Fighting: 2, Bug: 2, Rock: 0.5, Steel: 0.5 },
  Psychic: { Fighting: 2, Poison: 2, Psychic: 0.5, Steel: 0.5, Dark: 0 },
  Bug: { Fire: 0.5, Grass: 2, Fighting: 0.5, Poison: 0.5, Flying: 0.5, Psychic: 2, Ghost: 0.5, Dark: 2, Steel: 0.5 },
  Rock: { Fire: 2, Ice: 2, Fighting: 0.5, Ground: 0.5, Flying: 2, Bug: 2, Steel: 0.5 },
  Ghost: { Normal: 0, Psychic: 2, Ghost: 2, Dark: 0.5, Steel: 0.5 }, // In Gen 4, Steel resists Ghost!
  Dragon: { Dragon: 2, Steel: 0.5 },
  Steel: { Fire: 0.5, Water: 0.5, Electric: 0.5, Ice: 2, Rock: 2, Steel: 0.5 },
  Dark: { Fighting: 0.5, Psychic: 2, Ghost: 2, Dark: 0.5, Steel: 0.5 } // In Gen 4, Steel resists Dark!
};

function calculateTypeMatchups(types: string[]): { [type: string]: number } {
  const result: { [type: string]: number } = {};
  for (const atk of TYPE_NAMES) {
    let mult = 1.0;
    for (const def of types) {
      if (GEN4_EFFECTIVENESS[atk] && GEN4_EFFECTIVENESS[atk][def] !== undefined) {
        mult *= GEN4_EFFECTIVENESS[atk][def];
      }
    }
    result[atk] = mult;
  }
  return result;
}

// 8. Process All 493 Pokémon
interface IndexPokemon {
  id: number;
  sinnohId: number | null;
  name: string;
  types: string[];
  sprite: string;
  shinySprite: string;
  baseStats: {
    hp: number;
    attack: number;
    defense: number;
    specialAttack: number;
    specialDefense: number;
    speed: number;
    bst: number;
  };
  preE4: boolean;
  generation: number;
  stage: string;
}

const indexEntries: IndexPokemon[] = [];

for (let id = 1; id <= 493; id++) {
  const pokeplatFile = path.join(CACHE_POKEPLATINUM, `${id}.json`);
  if (!fs.existsSync(pokeplatFile)) {
    console.error(`Missing data for Pokémon #${id}!`);
    continue;
  }
  const monRaw = JSON.parse(fs.readFileSync(pokeplatFile, 'utf-8'));
  const speciesMeta = speciesNames[id] || { name: monRaw.pokedex_data?.en?.name || `Pokemon #${id}`, genus: '' };
  const speciesName = speciesMeta.name;
  const sinnohNum = sinnohDexNumbers[id] || null;

  // Types from pokeplatinum (reverting TYPE_ format)
  const types: string[] = monRaw.types
    .map((t: string) => t.replace('TYPE_', '').toLowerCase())
    .map((t: string) => t.charAt(0).toUpperCase() + t.slice(1));
  const uniqueTypes = types[0] === types[1] ? [types[0]] : [types[0], types[1]];

  // Gen 4 Base Stats
  const baseStats = {
    hp: monRaw.base_stats.hp,
    attack: monRaw.base_stats.attack,
    defense: monRaw.base_stats.defense,
    specialAttack: monRaw.base_stats.special_attack,
    specialDefense: monRaw.base_stats.special_defense,
    speed: monRaw.base_stats.speed,
    bst:
      monRaw.base_stats.hp +
      monRaw.base_stats.attack +
      monRaw.base_stats.defense +
      monRaw.base_stats.special_attack +
      monRaw.base_stats.special_defense +
      monRaw.base_stats.speed
  };

  // Abilities (slot 1 and 2 only, with trainer ability note)
  const abilities = monRaw.abilities
    .map((a: string) => a.replace('ABILITY_', '').toLowerCase())
    .filter((a: string) => a !== 'none')
    .map((a: string) =>
      a
        .split('_')
        .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ')
    );

  const trainerAbilityNote = trainerAbilitiesOverride[speciesName] || null;

  // Wild encounters: merge vanilla with Refined overrides
  const vanillaEnc = vanillaEncountersByPokemon[id] || [];
  const refinedEnc = encountersOverride.filter(e => e.pokemon.toLowerCase() === speciesName.toLowerCase());
  const allEncounters = [...vanillaEnc, ...refinedEnc];

  // Legendary encounter check
  const legendaryData = legendariesOverride.find(l => l.pokemon.toLowerCase() === speciesName.toLowerCase());

  // Determine stage and preE4 availability
  let isPreE4 = sinnohNum !== null;
  // Route 208 Smeargle exception mentioned in changelog §1c
  if (speciesName === 'Smeargle') isPreE4 = true;

  let stage = 'post_dex';
  if (sinnohNum !== null) {
    if (sinnohNum <= 50) stage = 'Badges: 0-2';
    else if (sinnohNum <= 100) stage = 'Badges: 3-4';
    else if (sinnohNum <= 160) stage = 'Badges: 5-6';
    else stage = 'Badges: 7-8';
  }
  if (speciesName === 'Smeargle') stage = 'Badges: 2'; // Route 208 Hearthome outskirts
  if (legendaryData) {
    stage = legendaryData.stage;
  }

  // Generation calculation
  let generation = 1;
  if (id > 151 && id <= 251) generation = 2;
  else if (id > 251 && id <= 386) generation = 3;
  else if (id > 386) generation = 4;

  // Small index entry
  indexEntries.push({
    id,
    sinnohId: sinnohNum,
    name: speciesName,
    types: uniqueTypes,
    sprite: `sprites/pokemon/${id}.png`,
    shinySprite: `sprites/pokemon/shiny/${id}.png`,
    baseStats,
    preE4: isPreE4,
    generation,
    stage
  });

  // Wild Held Items
  let heldItems: { item: string; chance: number; notes?: string }[] = vanillaItemsByPokemon[id] || [];
  if (wildItemsOverride[speciesName]) {
    const overrides: any[] = wildItemsOverride[speciesName];
    // check for removals
    for (const ov of overrides) {
      if (ov.removeVanilla) {
        heldItems = heldItems.filter(h => !ov.removeVanilla.includes(h.item));
      }
    }
    // merge additions
    for (const ov of overrides) {
      heldItems.push({ item: ov.item, chance: ov.chance, notes: ov.notes });
    }
  }

  // Learnsets: Vanilla vs Trainer Patch
  interface MonMoveDetail extends MoveInfo {
    level?: number;
  }

  // Vanilla level-up
  const vanillaLevelUp: MonMoveDetail[] = (monRaw.learnset?.by_level || []).map(([lvl, moveConst]: [number, string]) => {
    const moveKey = moveConst.replace('MOVE_', '').toLowerCase().replace(/_/g, ' ');
    const found = movesMap[moveKey] || {
      name: moveConst.replace('MOVE_', '').replace(/_/g, ' '),
      type: 'Normal',
      category: 'Physical',
      power: null,
      accuracy: null,
      pp: 0,
      description: ''
    };
    return { ...found, level: lvl };
  });

  // Trainer Patch level-up overrides
  const movesetOv = movesetsOverride[speciesName];
  let trainerLevelUp = [...vanillaLevelUp];
  if (movesetOv && movesetOv.levelUp && movesetOv.levelUp.length > 0) {
    if (movesetOv.notes && movesetOv.notes[0]?.includes('rewrite')) {
      // Full rewrite (Eeveelutions / Johto starters)
      trainerLevelUp = movesetOv.levelUp.map((m: any) => {
        const found = movesMap[m.move.toLowerCase()] || {
          name: m.move,
          type: 'Normal',
          category: 'Physical',
          power: null,
          accuracy: null,
          pp: 0,
          description: ''
        };
        return { ...found, level: m.level };
      });
    } else {
      // Additions & level updates
      const updated = new Map<string, MonMoveDetail>();
      for (const m of trainerLevelUp) updated.set(m.name.toLowerCase(), m);
      for (const add of movesetOv.levelUp) {
        const found = movesMap[add.move.toLowerCase()] || {
          name: add.move,
          type: 'Normal',
          category: 'Physical',
          power: null,
          accuracy: null,
          pp: 0,
          description: ''
        };
        updated.set(found.name.toLowerCase(), { ...found, level: add.level });
      }
      trainerLevelUp = Array.from(updated.values()).sort((a, b) => (a.level || 0) - (b.level || 0));
    }
  }

  // TM / HM moves
  const tmMovesList: MonMoveDetail[] = (monRaw.learnset?.by_tm || []).map((tmCode: string) => {
    // TM code e.g. "TM01", "HM04"
    return {
      name: tmCode,
      type: 'Normal',
      category: 'Status',
      power: null,
      accuracy: null,
      pp: 0,
      description: '',
      machine: tmCode
    };
  });

  // Egg and Tutor moves from pokeplatinum / pokeapi
  const tutorMovesList: MonMoveDetail[] = (monRaw.learnset?.by_tutor || []).map((tutorConst: string) => {
    const moveKey = tutorConst.replace('MOVE_', '').toLowerCase().replace(/_/g, ' ');
    const found = movesMap[moveKey] || {
      name: tutorConst.replace('MOVE_', '').replace(/_/g, ' '),
      type: 'Normal',
      category: 'Physical',
      power: null,
      accuracy: null,
      pp: 0,
      description: ''
    };
    return { ...found };
  });

  // Evolutions
  const evolutions = evolutionsOverride[speciesName] || (monRaw.evolutions || []).map((e: any[]) => {
    const method = String(e[0] || '').replace('EVO_', '').toLowerCase();
    let target = '';
    let item: string | undefined = undefined;
    let level: number | undefined = undefined;

    if (e.length === 3) {
      if (typeof e[1] === 'number') {
        level = e[1];
      } else if (typeof e[1] === 'string') {
        item = e[1].replace('ITEM_', '').replace(/_/g, ' ');
      }
      target = String(e[2] || '').replace('SPECIES_', '').replace(/_/g, ' ');
    } else if (e.length === 2) {
      target = String(e[1] || '').replace('SPECIES_', '').replace(/_/g, ' ');
    }

    const targetFormatted = target.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');

    return {
      method,
      level,
      item,
      target: targetFormatted
    };
  });

  // Type Matchups
  const typeMatchups = calculateTypeMatchups(uniqueTypes);

  // Full individual Pokémon JSON
  const pokemonDetail = {
    id,
    sinnohId: sinnohNum,
    name: speciesName,
    genus: speciesMeta.genus,
    flavorText: Array.isArray(monRaw.pokedex_data?.en?.entry_text)
      ? monRaw.pokedex_data.en.entry_text.join('').replace(/\n/g, ' ').trim()
      : '',
    types: uniqueTypes,
    height: {
      meters: Number(((monRaw.pokedex_data?.height_inches || 0) * 0.0254).toFixed(2)),
      inches: monRaw.pokedex_data?.height_inches || 0
    },
    weight: {
      kg: Number(((monRaw.pokedex_data?.weight_pounds || 0) * 0.453592).toFixed(1)),
      lbs: monRaw.pokedex_data?.weight_pounds || 0
    },
    abilities,
    trainerAbilityNote,
    catchRate: monRaw.catch_rate || 0,
    genderRatio: monRaw.gender_ratio ? monRaw.gender_ratio.replace('GENDER_RATIO_', '').toLowerCase() : 'genderless',
    eggGroups: (monRaw.egg_groups || []).map((eg: string) =>
      eg.replace('EGG_GROUP_', '').toLowerCase().replace(/_/g, ' ')
    ),
    baseStats,
    typeMatchups,
    evolutions,
    whereToFind: {
      encounters: allEncounters,
      legendary: legendaryData || null
    },
    heldItems,
    moves: {
      trainer: {
        levelUp: trainerLevelUp,
        tmHm: tmMovesList,
        tutor: tutorMovesList
      },
      base: {
        levelUp: vanillaLevelUp,
        tmHm: tmMovesList,
        tutor: tutorMovesList
      }
    }
  };

  fs.writeFileSync(path.join(POKEMON_DATA_DIR, `${id}.json`), JSON.stringify(pokemonDetail, null, 2));
}

// Write index.json
fs.writeFileSync(path.join(PUBLIC_DATA, 'index.json'), JSON.stringify(indexEntries, null, 2));
console.log(`✓ Wrote public/data/index.json (${indexEntries.length} entries)`);

// Copy bosses.json to public/data/bosses.json
fs.copyFileSync(path.join(OVERRIDES_DIR, 'bosses.json'), path.join(PUBLIC_DATA, 'bosses.json'));
console.log(`✓ Wrote public/data/bosses.json`);

console.log('✓ All Pokédex data built successfully!');

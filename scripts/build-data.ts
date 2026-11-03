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

// Robust CSV parser that correctly handles quoted strings and commas
function parseCsv(filename: string): string[][] {
  const file = path.join(CACHE_CSV, filename);
  if (!fs.existsSync(file)) return [];
  const content = fs.readFileSync(file, 'utf-8');
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let insideQuotes = false;

  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    const nextChar = content[i + 1];
    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        currentField += '"';
        i++;
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === ',' && !insideQuotes) {
      currentRow.push(currentField);
      currentField = '';
    } else if ((char === '\r' || char === '\n') && !insideQuotes) {
      if (char === '\r' && nextChar === '\n') i++;
      currentRow.push(currentField);
      if (currentRow.length > 1 || currentRow[0] !== '') rows.push(currentRow);
      currentRow = [];
      currentField = '';
    } else {
      currentField += char;
    }
  }
  if (currentField || currentRow.length > 0) {
    currentRow.push(currentField);
    rows.push(currentRow);
  }
  return rows;
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
  machine?: string;
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
const speciesIdByName: { [nameLower: string]: number } = {};
for (const row of speciesNamesCsv.slice(1)) {
  const [speciesId, langId, name, genus] = row;
  const id = parseInt(speciesId, 10);
  if (langId === '9' && id <= 493) {
    speciesNames[id] = { name: name.trim(), genus: (genus || '').trim() };
    speciesIdByName[name.trim().toLowerCase()] = id;
  }
}

// 4. Overrides
const evolutionsOverride: any = JSON.parse(fs.readFileSync(path.join(OVERRIDES_DIR, 'evolutions.json'), 'utf-8'));
const encountersOverride: any[] = JSON.parse(fs.readFileSync(path.join(OVERRIDES_DIR, 'encounters.json'), 'utf-8'));
const legendariesOverride: any[] = JSON.parse(fs.readFileSync(path.join(OVERRIDES_DIR, 'legendaries.json'), 'utf-8'));
const movesetsOverride: any = JSON.parse(fs.readFileSync(path.join(OVERRIDES_DIR, 'movesets.json'), 'utf-8'));
const wildItemsOverride: any = JSON.parse(fs.readFileSync(path.join(OVERRIDES_DIR, 'wild_items.json'), 'utf-8'));
const trainerAbilitiesOverride: { [mon: string]: string } = JSON.parse(fs.readFileSync(path.join(OVERRIDES_DIR, 'trainer_abilities.json'), 'utf-8'));

// 5. Complete Vanilla Platinum Encounters Pipeline
const encountersCsv = parseCsv('encounters.csv');
const encounterSlotsCsv = parseCsv('encounter_slots.csv');
const encounterMethodsCsv = parseCsv('encounter_methods.csv');
const locationAreasCsv = parseCsv('location_areas.csv');
const locationAreaProseCsv = parseCsv('location_area_prose.csv');
const locationsCsv = parseCsv('locations.csv');
const locationNamesCsv = parseCsv('location_names.csv');
const condMapCsv = parseCsv('encounter_condition_value_map.csv');
const condValCsv = parseCsv('encounter_condition_values.csv');

const methodIdToName: { [id: string]: string } = {};
for (const r of encounterMethodsCsv.slice(1)) methodIdToName[r[0]] = r[1];

const slotMap: { [slotId: string]: { method: string; rarity: number } } = {};
for (const r of encounterSlotsCsv.slice(1)) {
  if (r[1] === '9') { // version_group_id 9 (Platinum)
    slotMap[r[0]] = { method: methodIdToName[r[2]] || 'walk', rarity: parseInt(r[4], 10) || 0 };
  }
}

const condValNames: { [id: string]: string } = {};
for (const r of condValCsv.slice(1)) condValNames[r[0]] = r[2];

const encConditions: { [encId: string]: string[] } = {};
for (const r of condMapCsv.slice(1)) {
  const encId = r[0];
  const val = condValNames[r[1]];
  if (!encConditions[encId]) encConditions[encId] = [];
  encConditions[encId].push(val);
}

const areaNamesMap: { [areaId: string]: string } = {};
for (const r of locationAreaProseCsv.slice(1)) {
  if (r[1] === '9') areaNamesMap[r[0]] = r[2];
}
const areaToLocationId: { [areaId: string]: string } = {};
for (const r of locationAreasCsv.slice(1)) areaToLocationId[r[0]] = r[1];
const locationNamesMap: { [locId: string]: string } = {};
for (const r of locationNamesCsv.slice(1)) {
  if (r[1] === '9') locationNamesMap[r[0]] = r[2];
}

function normalizeAreaName(rawArea: string): string {
  let name = rawArea || 'Sinnoh';
  name = name.replace(/^Road (\d+)/i, 'Route $1');
  name = name.replace(/Mount Coronet/gi, 'Mt. Coronet');
  name = name.replace(/ \(before Galactic intervention\)/gi, '');
  name = name.replace(/ \(after Galactic intervention\)/gi, '');
  name = name.replace(/\(south, towards Jubilife City\)/gi, 'South');
  name = name.replace(/\(north, towards Floaroma Town\)/gi, 'North');
  name = name.replace(/\(south, towards Pastoria City\)/gi, 'South');
  name = name.replace(/\(north, towards Hearthome City\)/gi, 'North');
  name = name.replace(/\(west, towards Eterna City\)/gi, 'West');
  name = name.replace(/\(east, towards Celestic Town\)/gi, 'East');
  name = name.replace(/\(north, towards Snowpoint City\)/gi, 'North');
  name = name.replace(/\(south, towards Solaceon Town\)/gi, 'South');
  name = name.replace(/\s+/g, ' ').trim();
  return name;
}

function getAreaName(areaId: string): string {
  let name = areaNamesMap[areaId];
  if (!name || name === '') {
    const locId = areaToLocationId[areaId];
    name = locationNamesMap[locId] || 'Sinnoh';
  }
  return normalizeAreaName(name);
}

// Areas where Refined Platinum changelog provides a full table replacement for walking
function isWalkingTableReplaced(area: string): boolean {
  const a = area.toLowerCase();
  return (
    a.includes('route 224') ||
    a.includes('route 225') ||
    a.includes('route 226') ||
    a.includes('route 227') ||
    a.includes('route 228') ||
    a.includes('route 229') ||
    a.includes('route 230') ||
    a.includes('stark mountain') ||
    a.includes('snowpoint temple') ||
    (a.includes('victory road') && a.includes('back')) ||
    a.includes('turnback cave')
  );
}

export interface LocationEntry {
  area: string;
  method: string;
  levels: string;
  rate: number;
  time: string;
  conditions: string;
  source: 'vanilla' | 'refined';
}

interface RawEncounterSlot {
  monId: number;
  area: string;
  method: string;
  rate: number;
  minLevel: number;
  maxLevel: number;
  time: string;
  conditions: string;
}

const rawVanillaSlots: RawEncounterSlot[] = [];

for (const r of encountersCsv.slice(1)) {
  const [encId, versionId, locationAreaId, encounterSlotId, pokemonIdStr, minLevel, maxLevel] = r;
  if (versionId !== '14') continue; // Platinum only
  const pId = parseInt(pokemonIdStr, 10);
  if (pId > 493) continue;

  const area = getAreaName(locationAreaId);
  const slot = slotMap[encounterSlotId] || { method: 'walk', rarity: 0 };
  const conds = encConditions[encId] || [];
  const minLvl = parseInt(minLevel, 10);
  const maxLvl = parseInt(maxLevel, 10);

  let method = slot.method;
  let time = 'Any';
  let conditions = '';

  if (conds.includes('radar-on')) {
    method = 'Poké Radar';
  } else if (conds.includes('swarm-yes')) {
    method = 'Swarm';
    conditions = 'Swarm active';
  } else if (conds.some(c => c.startsWith('slot2-') && c !== 'slot2-none')) {
    const gba = conds.find(c => c.startsWith('slot2-'))!;
    const cart = gba.replace('slot2-', '').replace(/^\w/, c => c.toUpperCase());
    method = `Dual-slot (${cart})`;
  } else if (conds.some(c => c.startsWith('great-marsh-daily-slot'))) {
    method = 'Great Marsh';
    conditions = 'Daily Great Marsh';
  } else if (conds.some(c => c.startsWith('backlot-mentioned'))) {
    method = 'Trophy Garden';
    conditions = 'Daily Trophy Garden';
  } else if (conds.some(c => c.startsWith('honey-tree-group'))) {
    method = 'Honey Tree';
  } else {
    // Normal encounter: ignore redundant cart-specific duplicates of default slots
    if (conds.some(c => c.startsWith('slot2-') && c !== 'slot2-none')) continue;
  }

  if (conds.includes('time-morning')) time = 'Morning';
  else if (conds.includes('time-day')) time = 'Day';
  else if (conds.includes('time-night')) time = 'Night';

  let cleanMethod = method;
  if (method === 'walk') cleanMethod = 'Walking';
  else if (method === 'surf') cleanMethod = 'Surfing';
  else if (method === 'old-rod') cleanMethod = 'Old Rod';
  else if (method === 'good-rod') cleanMethod = 'Good Rod';
  else if (method === 'super-rod') cleanMethod = 'Super Rod';
  else if (method === 'feebas-tile-fishing') cleanMethod = 'Super Rod (Feebas tile)';

  // Removals per Refined Platinum changelog:
  // Cranidos (408) & Shieldon (410) out of Oreburgh Gate
  if ((pId === 408 || pId === 410) && area.includes('Oreburgh Gate')) continue;
  // Spiritomb (442) out of Lost Tower
  if (pId === 442 && area.includes('Lost Tower')) continue;
  // Redundant Poke Radar removals per §5
  if (cleanMethod === 'Poké Radar') {
    if ((pId === 235 && (area.includes('208') || area.includes('212'))) ||
        (pId === 281 && area.includes('209')) ||
        ((pId === 30 || pId === 33) && (area.includes('221') || area.includes('Valor Lakefront'))) ||
        (pId === 180 && area.includes('222')) ||
        (pId === 324 && (area.includes('227') || area.includes('Stark Mountain'))) ||
        (pId === 202 && (area.includes('Verity') || area.includes('Valor')))) {
      continue;
    }
  }

  // Full table replacements for walking areas
  if (cleanMethod === 'Walking' && isWalkingTableReplaced(area)) continue;

  rawVanillaSlots.push({
    monId: pId,
    area,
    method: cleanMethod,
    rate: slot.rarity,
    minLevel: minLvl,
    maxLevel: maxLvl,
    time,
    conditions
  });
}

// Merge duplicate vanilla rows of same (monId, area, method, time, conditions), summing rates
const vanillaGrouped = new Map<string, RawEncounterSlot>();
for (const s of rawVanillaSlots) {
  const key = [s.monId, s.area, s.method, s.time, s.conditions].join('||');
  if (!vanillaGrouped.has(key)) {
    vanillaGrouped.set(key, { ...s });
  } else {
    const existing = vanillaGrouped.get(key)!;
    existing.rate += s.rate;
    existing.minLevel = Math.min(existing.minLevel, s.minLevel);
    existing.maxLevel = Math.max(existing.maxLevel, s.maxLevel);
  }
}

const locationsByPokemon: { [id: number]: LocationEntry[] } = {};
for (let id = 1; id <= 493; id++) locationsByPokemon[id] = [];

for (const g of vanillaGrouped.values()) {
  locationsByPokemon[g.monId].push({
    area: g.area,
    method: g.method,
    levels: g.minLevel === g.maxLevel ? String(g.minLevel) : `${g.minLevel}-${g.maxLevel}`,
    rate: g.rate,
    time: g.time,
    conditions: g.conditions,
    source: 'vanilla'
  });
}

// Add Refined Platinum additions from changelogs
for (const e of encountersOverride) {
  const monName = e.pokemon;
  const pId = speciesIdByName[monName.toLowerCase()];
  if (!pId) continue;

  let method = 'Walking';
  if (e.method === 'surf') method = 'Surfing';
  else if (e.method === 'fishing' || e.method === 'super_rod') method = 'Super Rod';
  else if (e.method === 'good_rod') method = 'Good Rod';
  else if (e.method === 'old_rod') method = 'Old Rod';
  else if (e.method === 'radar') method = 'Poké Radar';
  else if (e.method === 'starter') method = 'Surfing (Starter)';
  else if (e.method === 'swarm') method = 'Swarm';
  else if (e.method === 'dual_slot') method = 'Dual-slot';

  let levels = 'levels estimated';
  const a = e.location.toLowerCase();
  if (a.includes('route 224') || a.includes('route 225') || a.includes('route 226') ||
      a.includes('route 227') || a.includes('route 228') || a.includes('route 229') || a.includes('route 230')) {
    levels = '50-55 (levels estimated)';
  } else if (a.includes('stark mountain')) {
    levels = '53-58 (levels estimated)';
  } else if (a.includes('snowpoint temple')) {
    levels = '50-56 (levels estimated)';
  } else if (a.includes('victory road')) {
    levels = '45-52 (levels estimated)';
  } else if (a.includes('lake verity') || a.includes('lake valor') || a.includes('lake acuity')) {
    levels = '35-40 (levels estimated)';
  } else if (a.includes('turnback cave')) {
    levels = '50-65 (levels estimated)';
  } else if (a.includes('route 208') && monName === 'Smeargle') {
    levels = '18-20';
  } else if (a.includes('coronet') && monName === 'Riolu') {
    levels = '35-40 (levels estimated)';
  }

  locationsByPokemon[pId].push({
    area: normalizeAreaName(e.location),
    method,
    levels,
    rate: e.rate,
    time: e.timeOfDay || 'Any',
    conditions: e.notes || '',
    source: 'refined'
  });
}

// Add Static / Event Legendaries from changelog §4
for (const leg of legendariesOverride) {
  const pId = speciesIdByName[leg.pokemon.toLowerCase()];
  if (!pId) continue;

  locationsByPokemon[pId].push({
    area: normalizeAreaName(leg.location),
    method: 'Static / Event',
    levels: String(leg.level),
    rate: 100,
    time: 'Any',
    conditions: [leg.requirement, leg.npc ? `NPC: ${leg.npc}` : ''].filter(Boolean).join(' | '),
    source: 'refined'
  });
}

// Progression order weight function to sort locations (Route 201 -> postgame)
function getAreaProgressOrder(areaName: string): number {
  const a = areaName.toLowerCase();
  if (a.includes('201') || a.includes('verity')) return 10;
  if (a.includes('202')) return 20;
  if (a.includes('203') || a.includes('oreburgh')) return 30;
  if (a.includes('204') || a.includes('ravaged') || a.includes('floaroma') || a.includes('windworks')) return 40;
  if (a.includes('205') || a.includes('eterna forest') || a.includes('fuego')) return 50;
  if (a.includes('eterna')) return 55;
  if (a.includes('206') || a.includes('wayward')) return 60;
  if (a.includes('207')) return 70;
  if (a.includes('208') || a.includes('hearthome') || a.includes('amity')) return 80;
  if (a.includes('209') || a.includes('lost tower') || a.includes('solaceon')) return 90;
  if (a.includes('210 south') || a.includes('215') || a.includes('veilstone')) return 100;
  if (a.includes('214') || a.includes('ruin maniac') || a.includes('maniac tunnel') || a.includes('lakefront') || a.includes('valor')) return 110;
  if (a.includes('213') || a.includes('pastoria') || a.includes('great marsh')) return 120;
  if (a.includes('212') || a.includes('trophy garden') || a.includes('mansion')) return 130;
  if (a.includes('210') || a.includes('celestic')) return 140;
  if (a.includes('218') || a.includes('canalave') || a.includes('iron island')) return 150;
  if (a.includes('211')) return 160;
  if (a.includes('216') || a.includes('217') || a.includes('acuity') || a.includes('snowpoint city')) return 170;
  if (a.includes('coronet')) return 180;
  if (a.includes('distortion') || a.includes('sendoff') || a.includes('turnback')) return 190;
  if (a.includes('222') || a.includes('sunyshore')) return 200;
  if (a.includes('223') || a.includes('league') || a.includes('victory road')) return 210;
  if (a.includes('fight area') || a.includes('battle')) return 300;
  if (a.includes('225')) return 310;
  if (a.includes('survival') || a.includes('226')) return 320;
  if (a.includes('227')) return 330;
  if (a.includes('stark mountain')) return 340;
  if (a.includes('228')) return 350;
  if (a.includes('229')) return 360;
  if (a.includes('resort') || a.includes('230')) return 370;
  if (a.includes('224')) return 380;
  if (a.includes('snowpoint temple')) return 390;
  if (a.includes('fullmoon') || a.includes('newmoon') || a.includes('flower paradise') || a.includes('hall of origin')) return 400;
  return 500;
}

// Sort locations for every Pokémon by game progression
for (let id = 1; id <= 493; id++) {
  locationsByPokemon[id].sort((a, b) => {
    const diff = getAreaProgressOrder(a.area) - getAreaProgressOrder(b.area);
    if (diff !== 0) return diff;
    return a.area.localeCompare(b.area);
  });
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

// In Gen 4, Steel resists Dark and Ghost!
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
  Ghost: { Normal: 0, Psychic: 2, Ghost: 2, Dark: 0.5, Steel: 0.5 },
  Dragon: { Dragon: 2, Steel: 0.5 },
  Steel: { Fire: 0.5, Water: 0.5, Electric: 0.5, Ice: 2, Rock: 2, Steel: 0.5 },
  Dark: { Fighting: 0.5, Psychic: 2, Ghost: 2, Dark: 0.5, Steel: 0.5 }
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

// 8. How to Obtain generator for every species
function getHowToObtain(id: number, name: string, locationsCount: number): string {
  if (name === 'Eevee') return 'Gift from Bebe in Hearthome City (next to Pokémon Center) or Daily Trophy Garden';
  if (name === 'Porygon') return 'Gift from man in house behind Veilstone Pokémon Center or Daily Trophy Garden';
  if (name === 'Togepi') return 'Egg gift from Cynthia in Eterna City';
  if (name === 'Beldum') return 'Gift Poké Ball from Steven Stone in his home in the Survival Area (postgame)';
  if (name === 'Phione') return 'Breed Manaphy with Ditto at Solaceon Day Care';
  if (name === 'Manaphy') return 'Hatches from the Manaphy Egg (special event)';
  if (name === 'Cranidos') return 'Revive Skull Fossil at Oreburgh Mining Museum (or encounter at Victory Road B1F Back)';
  if (name === 'Shieldon') return 'Revive Armor Fossil at Oreburgh Mining Museum (or encounter at Victory Road B1F Back)';
  if (name === 'Omanyte') return 'Revive Helix Fossil at Oreburgh Mining Museum (or Super Rod in Oreburgh Gate B1F)';
  if (name === 'Kabuto') return 'Revive Dome Fossil at Oreburgh Mining Museum (or Super Rod in Oreburgh Gate B1F)';
  if (name === 'Aerodactyl') return 'Revive Old Amber at Oreburgh Mining Museum (or encounter at Victory Road B1F Back)';
  if (name === 'Lileep') return 'Revive Root Fossil at Oreburgh Mining Museum';
  if (name === 'Anorith') return 'Revive Claw Fossil at Oreburgh Mining Museum';
  if (['Turtwig', 'Chimchar', 'Piplup'].includes(name)) return 'Starter choice from Professor Rowan on Route 201 (or wild in the three lakes post-Byron)';
  if (['Bulbasaur', 'Charmander', 'Squirtle'].includes(name)) return 'Breed from final starter forms wild on postgame routes (Route 225/230)';
  if (['Chikorita', 'Cyndaquil', 'Totodile'].includes(name)) return 'Breed from final starter forms wild on postgame routes (Route 227/229)';
  if (['Treecko', 'Torchic', 'Mudkip'].includes(name)) return 'Breed from final starter forms wild on postgame routes (Route 226/Stark Mountain)';

  const evoOverrideLower: { [pre: string]: any[] } = {};
  for (const [k, v] of Object.entries(evolutionsOverride)) {
    evoOverrideLower[k.toLowerCase()] = v as any[];
  }

  // Check if evolved from a pre-evolution
  for (let preId = 1; preId <= 493; preId++) {
    const preRaw = JSON.parse(fs.readFileSync(path.join(CACHE_POKEPLATINUM, `${preId}.json`), 'utf-8'));
    const preName = preRaw.pokedex_data?.en?.name
      ? preRaw.pokedex_data.en.name.charAt(0).toUpperCase() + preRaw.pokedex_data.en.name.slice(1).toLowerCase()
      : `Pokemon #${preId}`;

    const overList = evoOverrideLower[preName.toLowerCase()] || [];
    const overMatch = overList.find((e: any) => e.target.toLowerCase() === name.toLowerCase());
    if (overMatch) {
      return `Evolve from ${preName} (${overMatch.notes || overMatch.method})`;
    }

    const evoList = preRaw.evolutions || [];
    for (const evo of evoList) {
      const targetSpecies = evo[2]?.replace('SPECIES_', '').replace(/_/g, ' ').toLowerCase();
      if (targetSpecies === name.toLowerCase()) {
        const trigger = evo[0]?.replace('EVO_', '').toLowerCase();
        const param = evo[1];
        if (trigger === 'level') return `Evolve from ${preName} (Level ${param})`;
        if (trigger === 'use_item') return `Evolve from ${preName} (Use ${param.replace('ITEM_', '').replace(/_/g, ' ')})`;
        if (trigger === 'trade') return `Evolve from ${preName} (Trade)`;
        if (trigger === 'friendship') return `Evolve from ${preName} (High Friendship)`;
        if (trigger === 'move') return `Evolve from ${preName} (Knows ${param.replace('MOVE_', '').replace(/_/g, ' ')})`;
        return `Evolve from ${preName}`;
      }
    }
  }

  if (locationsCount === 0) {
    if (name === 'Pidgey') return 'Breed from Pidgeotto (wild on Route 229) at Solaceon Day Care';
    if (name === 'Spearow') return 'Breed from Fearow (wild on Route 225/226/227) at Solaceon Day Care';
    if (name === 'Nidoran♀' || name === 'Nidoran♂') return 'Wild on Route 201 (Poké Radar) or breed';
    return 'Breed from its evolution at the Solaceon Day Care or transfer via Pal Park';
  }

  return 'Found in the wild (see locations below)';
}

// 9. Process All 493 Pokémon
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
const areasReverseIndex: {
  [area: string]: {
    id: number;
    name: string;
    sinnohId: number | null;
    types: string[];
    method: string;
    rate: number;
    levels: string;
    time: string;
    conditions: string;
    source: 'vanilla' | 'refined';
  }[];
} = {};

for (let id = 1; id <= 493; id++) {
  const pokeplatFile = path.join(CACHE_POKEPLATINUM, `${id}.json`);
  if (!fs.existsSync(pokeplatFile)) {
    console.warn(`Missing pokeplatinum file for #${id}`);
    continue;
  }

  const monRaw = JSON.parse(fs.readFileSync(pokeplatFile, 'utf-8'));
  const speciesMeta = speciesNames[id] || { name: monRaw.pokedex_data?.en?.name || `Pokemon #${id}`, genus: '' };
  const speciesName = speciesMeta.name;
  const sinnohNum = sinnohDexNumbers[id] || null;

  // Authoritative Types from pokeplatinum (reverting TYPE_ format)
  const types: string[] = monRaw.types
    .map((t: string) => t.replace('TYPE_', '').toLowerCase())
    .map((t: string) => t.charAt(0).toUpperCase() + t.slice(1));
  const uniqueTypes = types[0] === types[1] ? [types[0]] : [types[0], types[1]];

  // Authoritative Gen 4 Base Stats from pokeplatinum
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

  // Authoritative Gen 4 Abilities from pokeplatinum (slot 1 and 2 only)
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

  // Locations list for this species
  const monLocations: LocationEntry[] = locationsByPokemon[id] || [];

  // Legendary encounter check for legacy whereToFind format
  const legendaryData = legendariesOverride.find(l => l.pokemon.toLowerCase() === speciesName.toLowerCase());

  // Determine stage and preE4 availability
  let isPreE4 = sinnohNum !== null;
  if (speciesName === 'Smeargle') isPreE4 = true;

  let stage = 'post_dex';
  if (sinnohNum !== null) {
    if (sinnohNum <= 50) stage = 'Badges: 0-2';
    else if (sinnohNum <= 100) stage = 'Badges: 3-4';
    else if (sinnohNum <= 160) stage = 'Badges: 5-6';
    else stage = 'Badges: 7-8';
  }
  if (speciesName === 'Smeargle') stage = 'Badges: 2';
  if (legendaryData) {
    stage = legendaryData.stage;
  }

  // Generation calculation
  let generation = 1;
  if (id > 151 && id <= 251) generation = 2;
  else if (id > 251 && id <= 386) generation = 3;
  else if (id > 386) generation = 4;

  // Index entry
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

  // Populate reverse index: areas -> pokemon list
  for (const loc of monLocations) {
    if (!areasReverseIndex[loc.area]) areasReverseIndex[loc.area] = [];
    areasReverseIndex[loc.area].push({
      id,
      name: speciesName,
      sinnohId: sinnohNum,
      types: uniqueTypes,
      method: loc.method,
      rate: loc.rate,
      levels: loc.levels,
      time: loc.time,
      conditions: loc.conditions,
      source: loc.source
    });
  }

  // Wild Held Items
  let heldItems: { item: string; chance: number; notes?: string }[] = vanillaItemsByPokemon[id] || [];
  if (wildItemsOverride[speciesName]) {
    const overrides: any[] = wildItemsOverride[speciesName];
    const removes = overrides.filter(o => o.type === 'remove');
    const adds = overrides.filter(o => o.type === 'add');

    for (const rem of removes) {
      if (rem.item === 'ALL') heldItems = [];
      else heldItems = heldItems.filter(h => h.item.toLowerCase() !== rem.item.toLowerCase());
    }
    for (const add of adds) {
      heldItems.push({ item: add.item, chance: add.chance, notes: 'Refined Platinum Wild Held Item' });
    }
  }

  // Gen 4 Type Matchups
  const typeMatchups = calculateTypeMatchups(uniqueTypes);

  // Evolutions: Refined Platinum overrides take priority, fall back to vanilla
  let evolutions = evolutionsOverride[speciesName] || [];
  if (evolutions.length === 0 && monRaw.evolutions) {
    evolutions = monRaw.evolutions
      .map((e: any) => {
        const trigger = e[0]?.replace('EVO_', '').toLowerCase();
        let targetSpecies = e[2] || e[1];
        if (typeof targetSpecies === 'number') targetSpecies = `SPECIES_${targetSpecies}`;
        const targetClean = typeof targetSpecies === 'string'
          ? targetSpecies.replace('SPECIES_', '').replace(/_/g, ' ').toLowerCase()
          : '';
        const targetCapitalized = targetClean.split(' ').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

        let method = trigger;
        let item: string | undefined;
        let move: string | undefined;
        let level: number | undefined;

        if (trigger === 'level') {
          level = typeof e[1] === 'number' ? e[1] : parseInt(String(e[1] || '0').replace(/[^0-9]/g, ''), 10);
          method = `Level ${level}`;
        } else if (trigger === 'use_item') {
          item = typeof e[1] === 'string' ? e[1].replace('ITEM_', '').replace(/_/g, ' ') : undefined;
          method = `Use ${item}`;
        } else if (trigger === 'trade') {
          method = 'Trade';
        } else if (trigger === 'friendship') {
          method = 'High Friendship';
        } else if (trigger === 'move') {
          move = typeof e[1] === 'string' ? e[1].replace('MOVE_', '').replace(/_/g, ' ') : undefined;
          method = `Knows ${move}`;
        }

        return {
          method,
          level,
          item,
          move,
          target: targetCapitalized
        };
      })
      .filter((e: any) => e.target.length > 0);
  }

  // Movesets
  const formatMove = (moveNameRaw: string, level?: number) => {
    const clean = moveNameRaw.replace('MOVE_', '').replace(/_/g, ' ').toLowerCase();
    const info = movesMap[clean] || movesMap[clean.replace(/[^a-z0-9]/g, '')] || {
      name: clean.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
      type: 'Normal',
      category: 'Physical',
      power: null,
      accuracy: null,
      pp: 0,
      description: ''
    };
    return {
      name: info.name,
      type: info.type,
      category: info.category,
      power: info.power,
      accuracy: info.accuracy,
      pp: info.pp,
      description: info.description,
      level,
      machine: moveNameToMachine[info.name.toLowerCase()]
    };
  };

  const vanillaLevelUp = (monRaw.learnset?.by_level || []).map((entry: any) => {
    const [lvl, moveKey] = entry;
    return formatMove(moveKey, lvl);
  });

  let trainerLevelUp = [...vanillaLevelUp];
  if (movesetsOverride[speciesName]?.levelUp && Array.isArray(movesetsOverride[speciesName].levelUp)) {
    const updated = new Map<string, any>();
    for (const v of vanillaLevelUp) updated.set(v.name.toLowerCase(), v);
    for (const add of movesetsOverride[speciesName].levelUp) {
      const f = formatMove(add.move, add.level);
      updated.set(f.name.toLowerCase(), f);
    }
    trainerLevelUp = Array.from(updated.values()).sort((a, b) => (a.level || 0) - (b.level || 0));
  }

  const tmMovesList = (monRaw.learnset?.by_tm || []).map((tmKey: string) => {
    const rawNum = parseInt(tmKey.replace(/[^0-9]/g, ''), 10);
    const label = tmKey.startsWith('HM') ? `HM0${rawNum}` : `TM${rawNum < 10 ? '0' : ''}${rawNum}`;
    let matchedMoveName = '';
    for (const [mName, mLabel] of Object.entries(moveNameToMachine)) {
      if (mLabel === label) {
        matchedMoveName = mName;
        break;
      }
    }
    return formatMove(matchedMoveName);
  }).filter((m: any) => m.name && m.name !== 'Normal');

  const tutorMovesList = (monRaw.learnset?.by_tutor || []).map((tutorKey: string) => {
    return formatMove(tutorKey);
  });

  const howToObtain = getHowToObtain(id, speciesName, monLocations.length);

  // Detail JSON object
  const pokemonDetail = {
    id,
    sinnohId: sinnohNum,
    name: speciesName,
    genus: speciesMeta.genus || (monRaw.pokedex_data?.en?.category ? monRaw.pokedex_data.en.category.replace(' Pokémon', '') : ''),
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
    locations: monLocations,
    howToObtain,
    whereToFind: {
      encounters: monLocations.map(l => ({
        location: l.area,
        method: l.method,
        rate: l.rate,
        levels: l.levels,
        time: l.time,
        notes: l.conditions,
        source: l.source
      })),
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

// Sort areas reverse index by game progression and write public/data/areas.json
const sortedAreas: { [area: string]: any[] } = {};
const areaKeys = Object.keys(areasReverseIndex).sort((a, b) => {
  const diff = getAreaProgressOrder(a) - getAreaProgressOrder(b);
  if (diff !== 0) return diff;
  return a.localeCompare(b);
});

for (const k of areaKeys) {
  sortedAreas[k] = areasReverseIndex[k];
}

fs.writeFileSync(path.join(PUBLIC_DATA, 'areas.json'), JSON.stringify(sortedAreas, null, 2));
console.log(`✓ Wrote public/data/areas.json (${areaKeys.length} areas mapped)`);

// Copy bosses.json to public/data/bosses.json
fs.copyFileSync(path.join(OVERRIDES_DIR, 'bosses.json'), path.join(PUBLIC_DATA, 'bosses.json'));
console.log(`✓ Wrote public/data/bosses.json`);

console.log('✓ All Pokédex data built successfully!');

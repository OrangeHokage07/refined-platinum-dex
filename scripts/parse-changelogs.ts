import fs from 'node:fs';
import path from 'node:path';

const DOCS_DIR = path.resolve(process.cwd(), 'docs');
const CACHE_DIR = path.resolve(process.cwd(), '.cache/pokeapi_csv');
const OVERRIDES_DIR = path.resolve(process.cwd(), 'data/overrides');

fs.mkdirSync(OVERRIDES_DIR, { recursive: true });

// Load canonical species, moves, items for fuzzy-matching
const speciesNamesLines = fs.readFileSync(path.join(CACHE_DIR, 'pokemon_species_names.csv'), 'utf-8').split('\n');
const canonicalSpecies: { [id: number]: string } = {};
const speciesByName: { [nameLower: string]: { id: number; name: string } } = {};

for (const line of speciesNamesLines) {
  const [id, lang, name] = line.split(',');
  if (lang === '9' && parseInt(id, 10) <= 493) {
    const num = parseInt(id, 10);
    canonicalSpecies[num] = name.trim();
    speciesByName[name.trim().toLowerCase()] = { id: num, name: name.trim() };
    speciesByName[name.trim().toLowerCase().replace(/[^a-z0-9]/g, '')] = { id: num, name: name.trim() };
  }
}

// Moves
const moveNamesLines = fs.readFileSync(path.join(CACHE_DIR, 'move_names.csv'), 'utf-8').split('\n');
const canonicalMoves: { [id: number]: string } = {};
const movesByName: { [nameLower: string]: { id: number; name: string } } = {};

for (const line of moveNamesLines) {
  const [id, lang, name] = line.split(',');
  if (lang === '9' && parseInt(id, 10) <= 468) {
    const num = parseInt(id, 10);
    canonicalMoves[num] = name.trim();
    movesByName[name.trim().toLowerCase()] = { id: num, name: name.trim() };
    movesByName[name.trim().toLowerCase().replace(/[^a-z0-9]/g, '')] = { id: num, name: name.trim() };
  }
}

// Items
const itemNamesLines = fs.readFileSync(path.join(CACHE_DIR, 'item_names.csv'), 'utf-8').split('\n');
const itemsByName: { [nameLower: string]: { id: number; name: string } } = {};

for (const line of itemNamesLines) {
  const [id, lang, name] = line.split(',');
  if (lang === '9') {
    const num = parseInt(id, 10);
    const trimmed = name.trim();
    itemsByName[trimmed.toLowerCase()] = { id: num, name: trimmed };
    itemsByName[trimmed.toLowerCase().replace(/[^a-z0-9]/g, '')] = { id: num, name: trimmed };
  }
}

// Special known aliases / typos in Refined Platinum changelogs
const SPECIES_CORRECTIONS: { [raw: string]: string } = {
  'carvhana': 'Carvanha',
  'kringler': 'Kingler',
  'shitry': 'Shiftry',
  'snubull': 'Snubbull',
  'flaafy': 'Flaaffy',
  'nidoranm': 'Nidoran♂',
  'nidoranf': 'Nidoran♀',
  'whishcash': 'Whiscash',
  'ho-oh': 'Ho-Oh',
  'ho-oh ': 'Ho-Oh',
  'mime jr': 'Mime Jr.',
  'mr mime': 'Mr. Mime',
  'porygon-z': 'Porygon-Z',
  'porygon z': 'Porygon-Z',
  'farfetch’d': "Farfetch'd",
  "farfetch'd": "Farfetch'd"
};

const MOVE_CORRECTIONS: { [raw: string]: string } = {
  'thunderpunch': 'Thunder Punch',
  'faint attack': 'Feint Attack',
  'ancientpower': 'Ancient Power',
  'poisonpowder': 'Poison Powder',
  'smokescreen': 'Smokescreen',
  'sand-attack': 'Sand Attack',
  'grasswhistle': 'Grass Whistle',
  'dynamicpunch': 'Dynamic Punch',
  'double-edge': 'Double-Edge',
  'featherdance': 'Feather Dance',
  'judgement': 'Judgment',
  'extremespeed': 'ExtremeSpeed',
  'camoflauge': 'Camouflage',
  'solarbeam': 'Solar Beam',
  'bubblebeam': 'BubbleBeam',
  'thundershock': 'ThunderShock',
  'u-turn': 'U-turn',
  'selfdestruct': 'Selfdestruct',
  'softboiled': 'Softboiled',
  'will-o-wisp': 'Will-O-Wisp'
};

const ITEM_CORRECTIONS: { [raw: string]: string } = {
  'electrizer': 'Electirizer',
  'nevermeltice': 'Never-Melt Ice',
  'never-melt ice': 'Never-Melt Ice',
  'blackglasses': 'Black Glasses',
  'black glasses': 'Black Glasses',
  'silverpowder': 'Silver Powder',
  'silver powder': 'Silver Powder',
  'deepseatooth': 'Deep Sea Tooth',
  'deep sea tooth': 'Deep Sea Tooth',
  'deepseascale': 'Deep Sea Scale',
  'deep sea scale': 'Deep Sea Scale',
  'kings rock': "King's Rock",
  "king’s rock": "King's Rock",
  "kings’s rock": "King's Rock",
  'up-grade': 'Up-Grade',
  'upgrade': 'Up-Grade',
  'dubious disc': 'Dubious Disc',
  'reaper cloth': 'Reaper Cloth',
  'dragon scale': 'Dragon Scale',
  'magmarizer': 'Magmarizer',
  'protector': 'Protector',
  'metal coat': 'Metal Coat',
  'pamtre berry': 'Pamtre Berry',
  'thunderstone': 'Thunder Stone',
  'thunder stone': 'Thunder Stone'
};

const loggedCorrections: { type: string; raw: string; corrected: string }[] = [];

function matchSpecies(rawName: string): string {
  const clean = rawName.trim();
  const lower = clean.toLowerCase();
  if (SPECIES_CORRECTIONS[lower]) {
    const corrected = SPECIES_CORRECTIONS[lower];
    loggedCorrections.push({ type: 'Species', raw: rawName, corrected });
    return corrected;
  }
  if (speciesByName[lower]) return speciesByName[lower].name;
  const noPunct = lower.replace(/[^a-z0-9]/g, '');
  if (speciesByName[noPunct]) return speciesByName[noPunct].name;
  return clean;
}

function matchMove(rawName: string): string {
  const clean = rawName.trim();
  const lower = clean.toLowerCase();
  if (MOVE_CORRECTIONS[lower]) {
    const corrected = MOVE_CORRECTIONS[lower];
    loggedCorrections.push({ type: 'Move', raw: rawName, corrected });
    return corrected;
  }
  if (movesByName[lower]) return movesByName[lower].name;
  const noPunct = lower.replace(/[^a-z0-9]/g, '');
  if (movesByName[noPunct]) return movesByName[noPunct].name;
  return clean;
}

function matchItem(rawName: string): string {
  const clean = rawName.trim();
  const lower = clean.toLowerCase();
  if (ITEM_CORRECTIONS[lower]) {
    const corrected = ITEM_CORRECTIONS[lower];
    loggedCorrections.push({ type: 'Item', raw: rawName, corrected });
    return corrected;
  }
  if (itemsByName[lower]) return itemsByName[lower].name;
  const noPunct = lower.replace(/[^a-z0-9]/g, '');
  if (itemsByName[noPunct]) return itemsByName[noPunct].name;
  return clean;
}

console.log('Parsing Refined Platinum Changelogs...');

// 1. Evolutions
const evolutionsOverride = {
  Haunter: [{ target: 'Gengar', method: 'level_up_move', move: 'Shadow Ball', level: 36, notes: 'Level up knowing Shadow Ball (Level 36)' }],
  Graveler: [{ target: 'Golem', method: 'level_up_move', move: 'Earthquake', level: 36, notes: 'Level up knowing Earthquake (Level 36)' }],
  Poliwhirl: [
    { target: 'Poliwrath', method: 'use_item', item: 'Water Stone', notes: 'Use Water Stone' },
    { target: 'Politoed', method: 'level_up_move', move: 'Rain Dance', level: 36, notes: 'Level up knowing Rain Dance (Level 36)' }
  ],
  Machoke: [{ target: 'Machamp', method: 'level_up', level: 38, notes: 'Level up at Level 38' }],
  Kadabra: [{ target: 'Alakazam', method: 'level_up', level: 38, notes: 'Level up at Level 38' }],
  Slowpoke: [
    { target: 'Slowbro', method: 'level_up', level: 37, notes: 'Level up at Level 37' },
    { target: 'Slowking', method: 'level_up_held_item', item: "King's Rock", notes: "Level up holding King's Rock (Water Stone evo removed in v5.0)" }
  ],
  Magmar: [{ target: 'Magmortar', method: 'level_up_held_item', item: 'Magmarizer', notes: 'Level up holding Magmarizer' }],
  Electabuzz: [{ target: 'Electivire', method: 'level_up_held_item', item: 'Electirizer', notes: 'Level up holding Electirizer' }],
  Rhydon: [{ target: 'Rhyperior', method: 'level_up_held_item', item: 'Protector', notes: 'Level up holding Protector' }],
  Scyther: [{ target: 'Scizor', method: 'level_up_held_item', item: 'Metal Coat', notes: 'Level up holding Metal Coat' }],
  Onix: [{ target: 'Steelix', method: 'level_up_held_item', item: 'Metal Coat', notes: 'Level up holding Metal Coat' }],
  Seadra: [{ target: 'Kingdra', method: 'level_up_held_item', item: 'Dragon Scale', notes: 'Level up holding Dragon Scale' }],
  Porygon: [{ target: 'Porygon2', method: 'level_up_held_item', item: 'Up-Grade', notes: 'Level up holding Up-Grade' }],
  'Porygon2': [{ target: 'Porygon-Z', method: 'level_up_held_item', item: 'Dubious Disc', notes: 'Level up holding Dubious Disc' }],
  Feebas: [
    { target: 'Milotic', method: 'beauty', notes: 'Level up with max Beauty (vanilla)' },
    { target: 'Milotic', method: 'level_up_held_item', item: 'Pamtre Berry', notes: 'Level up holding Pamtre Berry' }
  ],
  Dusclops: [{ target: 'Dusknoir', method: 'level_up_held_item', item: 'Reaper Cloth', notes: 'Level up holding Reaper Cloth' }],
  Clamperl: [
    { target: 'Huntail', method: 'level_up_held_item', item: 'Deep Sea Tooth', notes: 'Level up holding Deep Sea Tooth' },
    { target: 'Gorebyss', method: 'level_up_held_item', item: 'Deep Sea Scale', notes: 'Level up holding Deep Sea Scale' }
  ]
};

fs.writeFileSync(path.join(OVERRIDES_DIR, 'evolutions.json'), JSON.stringify(evolutionsOverride, null, 2));
console.log('✓ Wrote data/overrides/evolutions.json');

// 2. Ability slot swaps
const abilitySwapsText = `
Rattata, Raticate>Guts
Venonat, Venomoth>Tinted Lens
Diglett, Dugtrio>Arena Trap
Meowth, Persian>Technician
Machop, Machoke, Machamp>No Guard
Ponyta, Rapidash>Flash Fire
Doduo, Dodrio>Early Bird
Grimer, Muk>Sticky Hold
Shellder, Cloyster>Skill Link
Hitmonlee>Reckless
Hitmonchan>Iron Fist
Rhyhorn, Rhydon>Rock Head
Kangaskhan>Scrappy
Staryu, Starmie>Natural Cure
Mime Jr., Mr. Mime>Filter
Scyther, Scizor>Technician
Eevee>Adaptability
Munchlax, Snorlax>Thick Fat
Togepi, Togetic, Togekiss>Serene Grace
Azurill, Marill, Azumarill>Huge Power
Bonsly, Sudowoodo>Rock Head
Qwilfish>Swift Swim
Shuckle>Gluttony
Heracross>Guts
Swinub, Piloswine, Mamoswine>Snow Cloak
Mantyke, Mantine>Water Absorb
Houndour, Houndoom>Flash Fire
Smeargle>Technician
Tyrogue>Steadfast
Hitmontop>Technician
Zigzagoon, Linoone>Gluttony
Shroomish, Breloom>Poison Heal
Nosepass, Probopass>Magnet Pull
Mawile>Intimidate
Aron, Lairon, Aggron>Rock Head
Volbeat>Swarm
Illumise>Tinted Lens
Numel>Simple
Camerupt>Solid Rock
Trapinch>Arena Trap
Snorunt, Glalie>Ice Body
Relicanth>Rock Head
Shinx, Luxio, Luxray>Intimidate
Buneary, Lopunny>Klutz
Stunky, Skuntank>Aftermath
Croagunk, Toxicroak>Dry Skin
Rhyperior>Solid Rock
`;

const trainerAbilities: { [pokemon: string]: string } = {};
for (const line of abilitySwapsText.split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || !trimmed.includes('>')) continue;
  const [mons, ability] = trimmed.split('>');
  for (const m of mons.split(',')) {
    const matched = matchSpecies(m.trim());
    trainerAbilities[matched] = ability.trim();
  }
}

fs.writeFileSync(path.join(OVERRIDES_DIR, 'trainer_abilities.json'), JSON.stringify(trainerAbilities, null, 2));
console.log('✓ Wrote data/overrides/trainer_abilities.json');

// 3. Parse Wild Held Item Changelog
const heldItemDoc = fs.readFileSync(path.join(DOCS_DIR, 'Refined Platinum Wild Held Item Changelog.txt'), 'utf-8');
interface HeldItemEntry {
  item: string;
  chance: number;
  notes?: string;
  removeVanilla?: string[];
}
const heldItemOverrides: { [pokemon: string]: HeldItemEntry[] } = {};

const heldItemLines = heldItemDoc.split('\n');
for (const rawLine of heldItemLines) {
  const line = rawLine.trim();
  if (!line || line.startsWith('*') || line.startsWith('#') || !line.includes('-') || line.includes('http') || line.includes('Changelog')) {
    continue;
  }
  // format: "Pokemon - Item 5% (notes)" or "Pokemon - Item 100%"
  const dashIdx = line.indexOf('-');
  if (dashIdx === -1) continue;
  const monPart = line.slice(0, dashIdx).trim();
  const rest = line.slice(dashIdx + 1).trim();

  // match item and percent
  const match = rest.match(/^([A-Za-z0-9'\s-]+?)\s+(\d+)%(.*)$/);
  if (match) {
    const rawItem = match[1].trim();
    const chance = parseInt(match[2], 10);
    const extra = match[3]?.trim() || '';

    // skip section titles or non-pokemon
    if (monPart.includes('X ') || monPart.toLowerCase().includes('shards') || monPart.toLowerCase().includes('berries')) {
      continue;
    }

    const species = matchSpecies(monPart);
    const item = matchItem(rawItem);

    const removals: string[] = [];
    if (extra.toLowerCase().includes('no metal coat')) removals.push('Metal Coat');
    if (extra.toLowerCase().includes('no oval stone')) removals.push('Oval Stone');
    if (extra.toLowerCase().includes('no tiny mushroom')) removals.push('TinyMushroom');
    if (extra.toLowerCase().includes('no soft sand')) removals.push('Soft Sand');
    if (extra.toLowerCase().includes('no metronome')) removals.push('Metronome');
    if (extra.toLowerCase().includes('no poison barb')) removals.push('Poison Barb');
    if (extra.toLowerCase().includes('no quick claw')) removals.push('Quick Claw');
    if (extra.toLowerCase().includes('no pecha berry')) removals.push('Pecha Berry');
    if (extra.toLowerCase().includes('no big root')) removals.push('Big Root');

    if (!heldItemOverrides[species]) {
      heldItemOverrides[species] = [];
    }
    heldItemOverrides[species].push({
      item,
      chance,
      notes: extra || undefined,
      removeVanilla: removals.length > 0 ? removals : undefined
    });
  }
}

fs.writeFileSync(path.join(OVERRIDES_DIR, 'wild_items.json'), JSON.stringify(heldItemOverrides, null, 2));
console.log('✓ Wrote data/overrides/wild_items.json');

// 4. Parse Legendaries & Events from Main Changelog
const mainChangelog = fs.readFileSync(path.join(DOCS_DIR, 'Refined Platinum Main Changelog.txt'), 'utf-8');

interface LegendaryOverride {
  pokemon: string;
  level: number;
  location: string;
  npc?: string;
  requirement: string;
  stage: 'pre_e4' | 'post_dex' | 'post_stark' | 'diploma';
  heldItem?: string;
  moves: string[];
  rematch?: {
    location: string;
    npc: string;
    requirement: string;
  };
}

// Data from Section 4 of Main Changelog
const legendariesData: LegendaryOverride[] = [
  // Vanilla / Pre-E4
  {
    pokemon: 'Uxie',
    level: 50,
    location: 'Lake Acuity Cavern',
    requirement: 'Vanilla encounter (Defeat/Capture in Cavern)',
    stage: 'pre_e4',
    heldItem: 'Enigma Berry',
    moves: ['Psychic', 'Yawn', 'Shock Wave', 'Hidden Power'],
    rematch: { location: 'Acuity Cavern', npc: 'Old Woman', requirement: 'Capture Emotion Trio' }
  },
  {
    pokemon: 'Mesprit',
    level: 50,
    location: 'Roaming Sinnoh (starts Lake Verity)',
    requirement: 'Vanilla encounter (Interact in Verity Cavern then roam)',
    stage: 'pre_e4',
    heldItem: 'Odd Incense',
    moves: ['Extrasensory', 'Water Pulse', 'Copycat', 'Protect'],
    rematch: { location: 'Verity Cavern', npc: 'Reporter', requirement: 'Capture Emotion Trio' }
  },
  {
    pokemon: 'Azelf',
    level: 50,
    location: 'Lake Valor Cavern',
    requirement: 'Vanilla encounter (Defeat/Capture in Cavern)',
    stage: 'pre_e4',
    heldItem: 'Scope Lens',
    moves: ['Nasty Plot', 'Extrasensory', 'Shadow Ball', 'Energy Ball'],
    rematch: { location: 'Valor Cavern', npc: 'Cowgirl', requirement: 'Capture Emotion Trio' }
  },
  {
    pokemon: 'Giratina',
    level: 47,
    location: 'Distortion World / Turnback Cave',
    requirement: 'Vanilla encounter (Distortion World story, or Turnback Cave lvl 70 if knocked out)',
    stage: 'pre_e4',
    heldItem: 'Spell Tag',
    moves: ['Ancient Power', 'Dragon Pulse', 'Shadow Force', 'Shadow Sneak'],
    rematch: { location: 'Sendoff Spring', npc: 'Hiker', requirement: 'Complete Turnback Cave and have Griseous Orb' }
  },
  {
    pokemon: 'Dialga',
    level: 70,
    location: 'Spear Pillar',
    requirement: 'Visit Spear Pillar with Adamant Orb post-game',
    stage: 'post_dex',
    heldItem: 'Adamant Orb',
    moves: ['Roar of Time', 'Mud-Slap', 'Earth Power', 'Flash Cannon'],
    rematch: { location: 'Eterna Forest Exterior', npc: 'Psychic', requirement: 'Capture Creation Trio' }
  },
  {
    pokemon: 'Palkia',
    level: 70,
    location: 'Spear Pillar',
    requirement: 'Visit Spear Pillar with Lustrous Orb post-game',
    stage: 'post_dex',
    heldItem: 'Lustrous Orb',
    moves: ['Spacial Rend', 'Mud-Slap', 'Earth Power', 'Surf'],
    rematch: { location: 'Route 210 North', npc: 'Parasol Lady', requirement: 'Capture Creation Trio' }
  },
  {
    pokemon: 'Heatran',
    level: 75,
    location: 'Stark Mountain Interior 2',
    requirement: 'Complete Stark Mountain story, speak to Buck in Battleground',
    stage: 'post_stark',
    heldItem: 'Sitrus Berry',
    moves: ['Lava Plume', 'Metal Sound', 'Flash Cannon', 'Magma Storm'],
    rematch: { location: 'Stark Mountain Exterior', npc: 'Roughneck', requirement: 'Capture Heatran & Shaymin' }
  },
  {
    pokemon: 'Cresselia',
    level: 70,
    location: 'Roaming Sinnoh (starts Fullmoon Island)',
    requirement: 'Talk to sailor in Canalave, visit Fullmoon Island',
    stage: 'post_dex',
    heldItem: 'Petaya Berry',
    moves: ['Shadow Ball', 'Energy Ball', 'Psychic', 'Attract'],
    rematch: { location: 'Fullmoon Island', npc: 'Singer', requirement: 'Capture Lunar Duo' }
  },
  {
    pokemon: 'Darkrai',
    level: 70,
    location: 'Newmoon Island / Harbor Inn Canalave',
    npc: 'Man in Route 225 house gives Member Card',
    requirement: 'Post-Dex, obtain Member Card from Route 225, meet Cresselia & get Lunar Wing, sleep at Harbor Inn',
    stage: 'post_dex',
    heldItem: 'Wide Lens',
    moves: ['Dark Void', 'Dark Pulse', 'Psychic', 'Nasty Plot'],
    rematch: { location: 'Newmoon Island', npc: 'Glasses Man', requirement: 'Capture Lunar Duo' }
  },
  {
    pokemon: 'Shaymin',
    level: 75,
    location: 'Flower Paradise / Route 224',
    npc: 'Prof. Oak on Route 230',
    requirement: 'Post-Stark, receive Oak’s Letter from Prof. Oak on Route 230, meet him on Route 224',
    stage: 'post_stark',
    heldItem: 'Lum Berry',
    moves: ['Seed Flare', 'Air Slash', 'Earth Power', 'Leech Seed'],
    rematch: { location: 'Flower Paradise', npc: 'Schoolkid', requirement: 'Capture Heatran & Shaymin' }
  },
  {
    pokemon: 'Articuno',
    level: 65,
    location: 'Roaming Sinnoh (talk to Prof. Oak in Eterna City)',
    npc: 'Prof. Oak in Eterna City',
    requirement: 'Post-Dex: obtain National Dex, speak to Oak in Eterna',
    stage: 'post_dex',
    heldItem: 'Never-Melt Ice',
    moves: ['Blizzard', 'Signal Beam', 'Hidden Power', 'Swagger'],
    rematch: { location: 'Route 216', npc: 'Earmuff Lady', requirement: 'Capture all 3 Roaming Birds' }
  },
  {
    pokemon: 'Zapdos',
    level: 65,
    location: 'Roaming Sinnoh (talk to Prof. Oak in Eterna City)',
    npc: 'Prof. Oak in Eterna City',
    requirement: 'Post-Dex: obtain National Dex, speak to Oak in Eterna',
    stage: 'post_dex',
    heldItem: 'Magnet',
    moves: ['Discharge', 'Heat Wave', 'Hidden Power', 'Thunder Wave'],
    rematch: { location: 'Route 222', npc: 'Beauty', requirement: 'Capture all 3 Roaming Birds' }
  },
  {
    pokemon: 'Moltres',
    level: 65,
    location: 'Roaming Sinnoh (talk to Prof. Oak in Eterna City)',
    npc: 'Prof. Oak in Eterna City',
    requirement: 'Post-Dex: obtain National Dex, speak to Oak in Eterna',
    stage: 'post_dex',
    heldItem: 'Charcoal',
    moves: ['Heat Wave', 'Air Slash', 'Hidden Power', 'Will-O-Wisp'],
    rematch: { location: 'Fuego Ironworks', npc: 'Apron Woman', requirement: 'Capture all 3 Roaming Birds' }
  },
  // Regis
  {
    pokemon: 'Regirock',
    level: 65,
    location: 'Route 228 (Rock Peak Ruins)',
    requirement: 'Complete Trial of Rubble in Route 228 ruins',
    stage: 'post_dex',
    heldItem: 'Hard Stone',
    moves: ['Rock Slide', 'Hammer Arm', 'Curse', 'Earthquake']
  },
  {
    pokemon: 'Regice',
    level: 65,
    location: 'Mt. Coronet R216 exit (Iceberg Ruins)',
    requirement: 'Complete Trial of Rime in Mt. Coronet exit',
    stage: 'post_dex',
    heldItem: 'Never-Melt Ice',
    moves: ['Blizzard', 'Hail', 'Toxic', 'Signal Beam']
  },
  {
    pokemon: 'Registeel',
    level: 65,
    location: 'Iron Island (Iron Ruins)',
    requirement: 'Complete Trial of Rust in Iron Island ruins',
    stage: 'post_dex',
    heldItem: 'Metal Coat',
    moves: ['Amnesia', 'Iron Defense', 'Toxic', 'Flash Cannon']
  },
  {
    pokemon: 'Regigigas',
    level: 75,
    location: 'Snowpoint Temple B5F',
    requirement: 'Capture Regirock, Regice, and Registeel and bring them to awaken it',
    stage: 'post_dex',
    heldItem: 'Muscle Band',
    moves: ['Zen Headbutt', 'Fire Punch', 'Thunder Wave', 'Crush Grip']
  },
  // Post-Dex Static NPCs
  {
    pokemon: 'Raikou',
    level: 65,
    location: 'Lake Valor',
    npc: 'Old Man in Lake Valor',
    requirement: 'Post-Dex: visit Fight Area via Snowpoint ferry',
    stage: 'post_dex',
    heldItem: 'Petaya Berry',
    moves: ['Thunderbolt', 'Shadow Ball', 'Extrasensory', 'Signal Beam']
  },
  {
    pokemon: 'Entei',
    level: 65,
    location: 'Lake Verity',
    npc: 'Old Man in Lake Verity',
    requirement: 'Post-Dex: visit Fight Area via Snowpoint ferry',
    stage: 'post_dex',
    heldItem: 'Liechi Berry',
    moves: ['Iron Head', 'Fire Fang', 'Stone Edge', 'Secret Power']
  },
  {
    pokemon: 'Suicune',
    level: 65,
    location: 'Lake Acuity',
    npc: 'Old Man in Lake Acuity',
    requirement: 'Post-Dex: visit Fight Area via Snowpoint ferry',
    stage: 'post_dex',
    heldItem: 'Sitrus Berry',
    moves: ['Extrasensory', 'Surf', 'Calm Mind', 'Ice Beam']
  },
  {
    pokemon: 'Latias',
    level: 65,
    location: 'Route 224',
    npc: 'Female Biker on Route 224',
    requirement: 'Post-Dex: visit Fight Area via Snowpoint ferry',
    stage: 'post_dex',
    heldItem: 'Quick Claw',
    moves: ['Mist Ball', 'Dragon Pulse', 'Energy Ball', 'Reflect']
  },
  {
    pokemon: 'Latios',
    level: 65,
    location: 'Route 217',
    npc: 'Runner on Route 217 (outside, clears hail before battle)',
    requirement: 'Post-Dex: visit Fight Area via Snowpoint ferry',
    stage: 'post_dex',
    heldItem: 'Quick Claw',
    moves: ['Luster Purge', 'Dragon Pulse', 'Ice Beam', 'Light Screen']
  },
  {
    pokemon: 'Jirachi',
    level: 65,
    location: 'Resort Area',
    npc: 'Picnicker in Resort Area',
    requirement: 'Post-Dex: visit Fight Area via Snowpoint ferry',
    stage: 'post_dex',
    heldItem: 'Starf Berry',
    moves: ['Cosmic Power', 'Stealth Rock', 'Iron Head', 'Psychic']
  },
  {
    pokemon: 'Manaphy',
    level: 65,
    location: 'Route 212',
    npc: 'Maid on Route 212',
    requirement: 'Post-Dex: visit Fight Area via Snowpoint ferry',
    stage: 'post_dex',
    heldItem: 'Starf Berry',
    moves: ['Tail Glow', 'Grass Knot', 'Surf', 'Signal Beam']
  },
  // Post-Stark Static NPCs
  {
    pokemon: 'Ho-Oh',
    level: 80,
    location: 'Solaceon Ruins Bottom',
    npc: 'Gentleman at bottom of Solaceon Ruins',
    requirement: 'Post-Stark: capture all three Legendary Beasts (Raikou, Entei, Suicune)',
    stage: 'post_stark',
    heldItem: 'Sacred Ash',
    moves: ['Sacred Fire', 'Protect', 'Aerial Ace', 'Punishment']
  },
  {
    pokemon: 'Lugia',
    level: 80,
    location: 'Iron Island',
    npc: 'Socialite in Iron Island',
    requirement: 'Post-Stark: capture all three Roaming Birds and inform Prof. Oak in Eterna',
    stage: 'post_stark',
    heldItem: 'Sacred Ash',
    moves: ['Aeroblast', 'Roost', 'Psychic', 'Calm Mind']
  },
  {
    pokemon: 'Celebi',
    level: 75,
    location: 'Eterna Forest',
    npc: 'Female Scientist in Eterna Forest',
    requirement: 'Post-Stark: complete Stark Mountain',
    stage: 'post_stark',
    heldItem: 'Lum Berry',
    moves: ['Charge Beam', 'Leaf Storm', 'Psychic', 'Giga Drain']
  },
  {
    pokemon: 'Groudon',
    level: 80,
    location: 'Stark Mountain Interior 2',
    npc: 'Waiter in Stark Mountain Interior 2',
    requirement: 'Post-Stark: complete Stark Mountain',
    stage: 'post_stark',
    heldItem: 'Soft Sand',
    moves: ['Thunder Punch', 'Fire Punch', 'Earthquake', 'Bulk Up']
  },
  {
    pokemon: 'Kyogre',
    level: 80,
    location: 'Route 213',
    npc: 'Male Swimmer in Route 213',
    requirement: 'Post-Stark: complete Stark Mountain',
    stage: 'post_stark',
    heldItem: 'Mystic Water',
    moves: ['Calm Mind', 'Thunder', 'Ice Beam', 'Water Spout']
  },
  {
    pokemon: 'Rayquaza',
    level: 85,
    location: 'Route 207',
    npc: 'Male Snow Ranger on Route 207',
    requirement: 'Post-Stark: complete Stark Mountain',
    stage: 'post_stark',
    heldItem: 'Dragon Fang',
    moves: ['Dragon Dance', 'ExtremeSpeed', 'Outrage', 'Earthquake']
  },
  {
    pokemon: 'Deoxys',
    level: 85,
    location: 'Route 214',
    npc: 'Male Team Galactic Grunt on Route 214',
    requirement: 'Post-Stark: complete Stark Mountain',
    stage: 'post_stark',
    heldItem: 'Petaya Berry',
    moves: ['Recover', 'Psycho Boost', 'Thunderbolt', 'Charge Beam']
  },
  {
    pokemon: 'Mew',
    level: 75,
    location: 'Floaroma Meadow',
    npc: 'Female Child in Floaroma Meadow',
    requirement: 'Post-Stark: complete Stark Mountain',
    stage: 'post_stark',
    heldItem: 'Lum Berry',
    moves: ['Hidden Power', 'Ice Beam', 'Dark Pulse', 'Aura Sphere']
  },
  {
    pokemon: 'Mewtwo',
    level: 85,
    location: 'Route 221',
    npc: 'Rich Boy on Route 221',
    requirement: 'Post-Stark: complete Stark Mountain, pass lengthy quiz',
    stage: 'post_stark',
    heldItem: 'Wise Glasses',
    moves: ['Thunderbolt', 'Psychic', 'Ice Beam', 'Recover']
  },
  // Diploma / Arceus
  {
    pokemon: 'Arceus',
    level: 95,
    location: 'Mt. Coronet (below by drake\'s nail)',
    npc: 'Painter NPC in Mt. Coronet',
    requirement: 'Earn National Dex Diploma in Lake Valor (capture all Pokémon except Mythicals)',
    stage: 'diploma',
    heldItem: 'Petaya Berry',
    moves: ['Judgment', 'Spacial Rend', 'Recover', 'Flamethrower']
  }
];

fs.writeFileSync(path.join(OVERRIDES_DIR, 'legendaries.json'), JSON.stringify(legendariesData, null, 2));
console.log('✓ Wrote data/overrides/legendaries.json');

// 5. Parse Moveset Changelog
const movesetDoc = fs.readFileSync(path.join(DOCS_DIR, 'Refined Platinum Moveset Changelog.txt'), 'utf-8');

interface MoveLevelEntry {
  move: string;
  level: number;
}
interface MovesetOverride {
  levelUp?: MoveLevelEntry[];
  tmMoves?: string[];
  notes?: string[];
}

const movesetOverrides: { [pokemon: string]: MovesetOverride } = {};

// Helper to ensure entry exists
function getMonMoveset(name: string): MovesetOverride {
  const matched = matchSpecies(name);
  if (!movesetOverrides[matched]) {
    movesetOverrides[matched] = { levelUp: [], tmMoves: [], notes: [] };
  }
  return movesetOverrides[matched];
}

const movesetLines = movesetDoc.split('\n');
let currentSection = '';

for (let i = 0; i < movesetLines.length; i++) {
  const line = movesetLines[i].trim();
  if (!line || line.startsWith('Link') || line.startsWith('http') || line.startsWith('by ') || line.startsWith('Main Changelog')) {
    continue;
  }
  if (line.startsWith('2a Sinnoh Dex') || line.startsWith('2b Exotic') || line.startsWith('3a Eeveelutions') || line.startsWith('3b') || line.startsWith('3c') || line.startsWith('3d') || line.startsWith('4X Legendary')) {
    currentSection = line;
    continue;
  }

  // Check TM fixes in 3c
  if (currentSection.startsWith('3c')) {
    const tmMatch = line.match(/^([A-Za-z0-9'\s-]+?)\s*-\s*([A-Za-z0-9'\s-]+?)\s+by\s+TM/i);
    if (tmMatch) {
      const mon = matchSpecies(tmMatch[1].trim());
      const move = matchMove(tmMatch[2].trim());
      const mset = getMonMoveset(mon);
      if (!mset.tmMoves) mset.tmMoves = [];
      mset.tmMoves.push(move);
      continue;
    }
  }

  // Standard line: "Pokemon - Move; Level" or "Pokemon - Move is now at Level"
  const colonOrSemi = line.indexOf(';');
  if (colonOrSemi !== -1) {
    const left = line.slice(0, colonOrSemi).trim();
    const right = line.slice(colonOrSemi + 1).trim();

    // extract level from right side (e.g. "24", "40", "49 (up from 47)")
    const levelMatch = right.match(/^\[?(\d+)\]?/);
    if (levelMatch) {
      const level = parseInt(levelMatch[1], 10);
      const dashIdx = left.indexOf('-');
      if (dashIdx !== -1) {
        const monPart = left.slice(0, dashIdx).trim();
        const movePart = left.slice(dashIdx + 1).trim();
        const mon = matchSpecies(monPart);
        const move = matchMove(movePart);
        const mset = getMonMoveset(mon);
        if (!mset.levelUp) mset.levelUp = [];
        mset.levelUp.push({ move, level });
      }
    }
  } else if (line.includes(' - ') && line.includes(' is at ')) {
    const match = line.match(/^([A-Za-z0-9'\s-]+?)\s*-\s*([A-Za-z0-9'\s-]+?)\s+is\s+at\s+(\d+)/i);
    if (match) {
      const mon = matchSpecies(match[1].trim());
      const move = matchMove(match[2].trim());
      const level = parseInt(match[3], 10);
      const mset = getMonMoveset(mon);
      if (!mset.levelUp) mset.levelUp = [];
      mset.levelUp.push({ move, level });
    }
  } else if (line.includes(' - ') && line.includes(' is now at ')) {
    const match = line.match(/^([A-Za-z0-9'\s-]+?)\s*-\s*([A-Za-z0-9'\s-]+?)\s+is\s+now\s+at\s+(\d+)/i);
    if (match) {
      const mon = matchSpecies(match[1].trim());
      const move = matchMove(match[2].trim());
      const level = parseInt(match[3], 10);
      const mset = getMonMoveset(mon);
      if (!mset.levelUp) mset.levelUp = [];
      mset.levelUp.push({ move, level });
    }
  }
}

// Full rewrites for Eeveelutions (3a) and Johto starters (3d)
const eeveelutionSets: { [mon: string]: [string, number][] } = {
  Eevee: [
    ['Sand Attack', 8], ['Growl', 15], ['Quick Attack', 18], ['Bite', 24],
    ['Baton Pass', 28], ['Take Down', 34], ['Endure', 38], ['Trump Card', 42],
    ['Secret Power', 46], ['Last Resort', 50]
  ],
  Vaporeon: [
    ['Baton Pass', 1], ['Sand Attack', 8], ['Water Gun', 15], ['Quick Attack', 18],
    ['Bite', 24], ['Aurora Beam', 28], ['Aqua Ring', 34], ['Haze', 38],
    ['Muddy Water', 42], ['Acid Armor', 46], ['Hydro Pump', 50], ['Last Resort', 55]
  ],
  Jolteon: [
    ['Baton Pass', 1], ['Sand Attack', 8], ['ThunderShock', 15], ['Quick Attack', 18],
    ['Double Kick', 24], ['Pin Missile', 28], ['Thunder Fang', 34], ['Thunder Wave', 38],
    ['Discharge', 42], ['Agility', 46], ['Thunder', 50], ['Last Resort', 55]
  ],
  Flareon: [
    ['Baton Pass', 1], ['Sand Attack', 8], ['Ember', 15], ['Quick Attack', 18],
    ['Bite', 24], ['Fire Spin', 28], ['Fire Fang', 34], ['Smog', 38],
    ['Lava Plume', 42], ['Scary Face', 46], ['Fire Blast', 50], ['Last Resort', 55]
  ],
  Espeon: [
    ['Baton Pass', 1], ['Sand Attack', 8], ['Confusion', 15], ['Quick Attack', 18],
    ['Swift', 24], ['Psybeam', 28], ['Future Sight', 34], ['Psych Up', 38],
    ['Morning Sun', 42], ['Psychic', 46], ['Power Swap', 50], ['Last Resort', 55]
  ],
  Umbreon: [
    ['Baton Pass', 1], ['Sand Attack', 8], ['Pursuit', 15], ['Quick Attack', 18],
    ['Confuse Ray', 24], ['Feint Attack', 28], ['Assurance', 34], ['Mean Look', 38],
    ['Moonlight', 42], ['Screech', 46], ['Guard Swap', 50], ['Last Resort', 55]
  ],
  Leafeon: [
    ['Baton Pass', 1], ['Sand Attack', 8], ['Razor Leaf', 15], ['Quick Attack', 18],
    ['Synthesis', 24], ['Magical Leaf', 28], ['Giga Drain', 34], ['Grass Whistle', 38],
    ['Leaf Blade', 42], ['Sunny Day', 46], ['Swords Dance', 50], ['Last Resort', 55]
  ],
  Glaceon: [
    ['Baton Pass', 1], ['Sand Attack', 8], ['Icy Wind', 15], ['Quick Attack', 18],
    ['Bite', 24], ['Ice Shard', 28], ['Ice Fang', 34], ['Mirror Coat', 38],
    ['Blizzard', 42], ['Hail', 46], ['Barrier', 50], ['Last Resort', 55]
  ]
};

for (const [mon, moves] of Object.entries(eeveelutionSets)) {
  const mset = getMonMoveset(mon);
  mset.levelUp = moves.map(([move, level]) => ({ move: matchMove(move), level }));
  mset.notes = ['Complete level-up movepool rewrite per Refined Platinum §3a'];
}

// Johto Starter full rewrites
const johtoStarterSets: { [mon: string]: [string, number][] } = {
  Chikorita: [
    ['Tackle', 1], ['Growl', 1], ['Razor Leaf', 6], ['Poison Powder', 9],
    ['Synthesis', 12], ['Ancient Power', 17], ['Reflect', 18], ['Magical Leaf', 23],
    ['Natural Gift', 26], ['Sweet Scent', 28], ['Light Screen', 31], ['Body Slam', 34],
    ['Seed Bomb', 36], ['Aromatherapy', 38], ['Nature Power', 38], ['Outrage', 48], ['Solar Beam', 52]
  ],
  Bayleef: [
    ['Tackle', 1], ['Growl', 1], ['Razor Leaf', 6], ['Poison Powder', 9],
    ['Synthesis', 12], ['Ancient Power', 18], ['Reflect', 19], ['Magical Leaf', 26],
    ['Natural Gift', 29], ['Sweet Scent', 32], ['Light Screen', 34], ['Body Slam', 36],
    ['Seed Bomb', 39], ['Aromatherapy', 41], ['Nature Power', 41], ['Outrage', 52], ['Solar Beam', 54]
  ],
  Meganium: [
    ['Earthquake', 1], ['Tackle', 1], ['Growl', 1], ['Razor Leaf', 6], ['Poison Powder', 9],
    ['Synthesis', 12], ['Ancient Power', 18], ['Reflect', 19], ['Magical Leaf', 26],
    ['Natural Gift', 29], ['Petal Dance', 32], ['Sweet Scent', 34], ['Light Screen', 36],
    ['Body Slam', 38], ['Seed Bomb', 41], ['Aromatherapy', 44], ['Nature Power', 44],
    ['Outrage', 54], ['Solar Beam', 60], ['Leaf Storm', 65]
  ],
  Cyndaquil: [
    ['Tackle', 1], ['Leer', 1], ['Ember', 6], ['Smokescreen', 10], ['Quick Attack', 13],
    ['Howl', 16], ['Flame Wheel', 19], ['Double Kick', 21], ['Swift', 26], ['Lava Plume', 31],
    ['Crush Claw', 34], ['Extrasensory', 36], ['Flamethrower', 38], ['Double-Edge', 48], ['Eruption', 52]
  ],
  Quilava: [
    ['Tackle', 1], ['Leer', 1], ['Smokescreen', 1], ['Ember', 6], ['Smokescreen', 10],
    ['Quick Attack', 13], ['Howl', 17], ['Flame Wheel', 20], ['Double Kick', 22],
    ['Swift', 28], ['Lava Plume', 35], ['Crush Claw', 37], ['Extrasensory', 39],
    ['Flamethrower', 41], ['Double-Edge', 52], ['Eruption', 54]
  ],
  Typhlosion: [
    ['Thunder Punch', 1], ['Tackle', 1], ['Leer', 1], ['Ember', 1], ['Ember', 6],
    ['Smokescreen', 10], ['Quick Attack', 13], ['Howl', 17], ['Flame Wheel', 20],
    ['Double Kick', 22], ['Swift', 28], ['Lava Plume', 35], ['Will-O-Wisp', 36],
    ['Crush Claw', 39], ['Extrasensory', 41], ['Flamethrower', 43], ['Double-Edge', 54],
    ['Eruption', 60], ['Overheat', 65]
  ],
  Totodile: [
    ['Scratch', 1], ['Leer', 1], ['Water Gun', 6], ['Rage', 8], ['Bite', 13],
    ['Scary Face', 15], ['Ice Fang', 20], ['Flail', 22], ['Crunch', 27], ['Slash', 29],
    ['Screech', 34], ['Low Kick', 34], ['Aqua Tail', 36], ['Thrash', 39], ['Superpower', 48], ['Hydro Pump', 52]
  ],
  Croconaw: [
    ['Scratch', 1], ['Leer', 1], ['Water Gun', 1], ['Water Gun', 6], ['Rage', 8],
    ['Bite', 13], ['Scary Face', 15], ['Ice Fang', 21], ['Flail', 24], ['Crunch', 30],
    ['Slash', 34], ['Screech', 36], ['Low Kick', 36], ['Aqua Tail', 39], ['Thrash', 42],
    ['Superpower', 52], ['Hydro Pump', 54]
  ],
  Feraligatr: [
    ['Aerial Ace', 1], ['Scratch', 1], ['Leer', 1], ['Water Gun', 1], ['Water Gun', 6],
    ['Rage', 8], ['Bite', 13], ['Scary Face', 15], ['Ice Fang', 21], ['Flail', 24],
    ['Crunch', 32], ['Slash', 36], ['Screech', 38], ['Low Kick', 38], ['Aqua Tail', 41],
    ['Thrash', 44], ['Superpower', 54], ['Hydro Pump', 60], ['Dragon Claw', 65]
  ]
};

for (const [mon, moves] of Object.entries(johtoStarterSets)) {
  const mset = getMonMoveset(mon);
  mset.levelUp = moves.map(([move, level]) => ({ move: matchMove(move), level }));
  mset.notes = ['Complete level-up movepool rewrite per Refined Platinum §3d'];
}

// Smeargle TM compatibility
const smeargle = getMonMoveset('Smeargle');
smeargle.notes = ['Compatible with HMs, Flash, Return, and general utility TMs'];

fs.writeFileSync(path.join(OVERRIDES_DIR, 'movesets.json'), JSON.stringify(movesetOverrides, null, 2));
console.log('✓ Wrote data/overrides/movesets.json');

// 6. Parse Encounters from Main Changelog Section 3
interface WildEncounterOverride {
  location: string;
  method: string;
  pokemon: string;
  rate: number;
  minLevel?: number;
  maxLevel?: number;
  timeOfDay?: 'Morning' | 'Day' | 'Night' | 'Any';
  notes?: string;
  source: 'refined';
}

const encounterOverrides: WildEncounterOverride[] = [];

// Helper to parse line: "Location - Mon 20%, Mon 10%" or "Location (Day) - Mon 10%"
function parseEncounterLine(line: string, defaultMethod: string, defaultNotes?: string) {
  if (!line || !line.includes('-') || line.startsWith('*') || line.startsWith('3') || line.startsWith('#')) return;
  if (line.toLowerCase().includes('parenthesis') || line.toLowerCase().includes('flat 10%') || line.toLowerCase().includes('absence of')) return;
  const dashIdx = line.indexOf('-');
  const left = line.slice(0, dashIdx).trim();
  const right = line.slice(dashIdx + 1).trim();

  let location = left;
  let timeOfDay: 'Morning' | 'Day' | 'Night' | 'Any' = 'Any';
  let method = defaultMethod;
  let lineNotes = defaultNotes || '';

  if (location.includes('(Morning, Day)')) {
    timeOfDay = 'Day'; // represents Morning/Day
    location = location.replace('(Morning, Day)', '').trim();
    lineNotes = (lineNotes + ' Morning & Day').trim();
  } else if (location.includes('(Morning, Night)')) {
    location = location.replace('(Morning, Night)', '').trim();
    lineNotes = (lineNotes + ' Morning & Night').trim();
  } else if (location.includes('(Morning)')) {
    timeOfDay = 'Morning';
    location = location.replace('(Morning)', '').trim();
  } else if (location.includes('(Day)')) {
    timeOfDay = 'Day';
    location = location.replace('(Day)', '').trim();
  } else if (location.includes('(Night)')) {
    timeOfDay = 'Night';
    location = location.replace('(Night)', '').trim();
  }

  if (location.toLowerCase().includes('surf')) {
    method = 'surf';
    location = location.replace(/surf/i, '').trim();
  } else if (location.toLowerCase().includes('super rod')) {
    method = 'super_rod';
    location = location.replace(/super rod/i, '').replace(/;/, '').trim();
  } else if (location.toLowerCase().includes('good rod')) {
    method = 'good_rod';
    location = location.replace(/good rod/i, '').replace(/;/, '').trim();
  } else if (location.toLowerCase().includes('old rod')) {
    method = 'old_rod';
    location = location.replace(/old rod/i, '').replace(/;/, '').trim();
  }

  if (location.toLowerCase().includes('post-byron')) {
    lineNotes = (lineNotes + ' Post-Byron').trim();
    location = location.replace(/post-byron/i, '').trim();
  }

  // Parse right side pokemon list: "Mon 20%, Mon 10%"
  const parts = right.split(',');
  for (const p of parts) {
    const m = p.trim().match(/^([A-Za-z0-9'\s\.\(\)]+?)\s+(\d+)%/);
    if (m) {
      let monName = m[1].trim();
      const rate = parseInt(m[2], 10);
      if (monName.toLowerCase().startsWith('now ')) monName = monName.slice(4).trim();
      const mon = matchSpecies(monName);
      encounterOverrides.push({
        location: location.replace(/;$/, '').trim(),
        method,
        pokemon: mon,
        rate,
        timeOfDay,
        notes: lineNotes || undefined,
        source: 'refined'
      });
    }
  }
}

// Slice sections from mainChangelog using lastIndexOf to bypass Table of Contents
const encounterSectionIdx = mainChangelog.lastIndexOf('3X Wild Encounters');
const eventSectionIdx = mainChangelog.lastIndexOf('4X Event Changes');
const encounterText = mainChangelog.slice(encounterSectionIdx, eventSectionIdx);

let currentEncSub = 'walk';
let subNotes = '';

for (const rawL of encounterText.split('\n')) {
  const line = rawL.trim();
  if (line.startsWith('3a Pre-E4 Walking')) {
    currentEncSub = 'walk';
    subNotes = 'Pre-E4';
  } else if (line.startsWith('3b Postgame')) {
    currentEncSub = 'walk';
    subNotes = 'Postgame';
  } else if (line.startsWith('3c Surfing')) {
    currentEncSub = 'surf';
    subNotes = 'Surfing';
  } else if (line.startsWith('3c Fishing')) {
    currentEncSub = 'fishing';
    subNotes = 'Fishing';
  } else if (line.startsWith('3d Poke Radar')) {
    currentEncSub = 'radar';
    subNotes = 'Poké Radar';
  } else if (line.startsWith('3e Starters')) {
    currentEncSub = 'starter';
    subNotes = 'Wild Starter';
  } else if (line.startsWith('3f Swarms')) {
    currentEncSub = 'swarm';
    subNotes = 'Swarm';
  } else if (line.startsWith('3g Dual-Slot')) {
    currentEncSub = 'dual_slot';
    subNotes = 'Dual-Slot';
  } else {
    parseEncounterLine(line, currentEncSub, subNotes);
  }
}

fs.writeFileSync(path.join(OVERRIDES_DIR, 'encounters.json'), JSON.stringify(encounterOverrides, null, 2));
console.log(`✓ Wrote data/overrides/encounters.json (${encounterOverrides.length} encounters)`);

// 7. Parse Bosses from Trainer Changelog
const trainerDoc = fs.readFileSync(path.join(DOCS_DIR, 'Refined Platinum Trainer Changelog.txt'), 'utf-8');

interface BossPokemon {
  pokemon: string;
  level: number;
  item?: string;
  moves: string[];
}
interface BossTrainer {
  name: string;
  title: string;
  location: string;
  stage: string;
  team: BossPokemon[];
}

const bosses: BossTrainer[] = [
  // Gym Leaders
  {
    name: 'Roark',
    title: 'Gym Leader',
    location: 'Oreburgh Gym',
    stage: 'Badges: 0 (Badge 1)',
    team: [
      { pokemon: 'Geodude', level: 12, item: 'Hard Stone', moves: ['Rock Throw', 'Rock Polish', 'Defense Curl', 'Rollout'] },
      { pokemon: 'Onix', level: 12, item: 'Hard Stone', moves: ['Stealth Rock', 'Rock Throw', 'Screech', 'Bind'] },
      { pokemon: 'Cranidos', level: 14, item: 'Sitrus Berry', moves: ['Headbutt', 'Leer', 'Rock Tomb', 'Pursuit'] }
    ]
  },
  {
    name: 'Gardenia',
    title: 'Gym Leader',
    location: 'Eterna Gym',
    stage: 'Badges: 1 (Badge 2)',
    team: [
      { pokemon: 'Cherubi', level: 18, item: 'Miracle Seed', moves: ['Grass Knot', 'Leech Seed', 'Nature Power', 'Sunny Day'] },
      { pokemon: 'Turtwig', level: 19, item: 'Miracle Seed', moves: ['Reflect', 'Razor Leaf', 'Sunny Day', 'Giga Drain'] },
      { pokemon: 'Roserade', level: 22, item: 'Sitrus Berry', moves: ['Grass Knot', 'Poison Sting', 'Magical Leaf', 'Stun Spore'] }
    ]
  },
  {
    name: 'Fantina',
    title: 'Gym Leader',
    location: 'Hearthome Gym',
    stage: 'Badges: 2 (Badge 3)',
    team: [
      { pokemon: 'Duskull', level: 24, item: 'Spell Tag', moves: ['Will-O-Wisp', 'Shadow Sneak', 'Confuse Ray', 'Pursuit'] },
      { pokemon: 'Haunter', level: 24, item: 'Spell Tag', moves: ['Shadow Claw', 'Confuse Ray', 'Hypnosis', 'Ominous Wind'] },
      { pokemon: 'Mismagius', level: 26, item: 'Sitrus Berry', moves: ['Shadow Ball', 'Psybeam', 'Magical Leaf', 'Confuse Ray'] }
    ]
  },
  {
    name: 'Maylene',
    title: 'Gym Leader',
    location: 'Veilstone Gym',
    stage: 'Badges: 3 (Badge 4)',
    team: [
      { pokemon: 'Meditite', level: 28, item: 'Black Belt', moves: ['Fake Out', 'Drain Punch', 'Rock Tomb', 'Light Screen'] },
      { pokemon: 'Machoke', level: 29, item: 'Black Belt', moves: ['Rock Tomb', 'Karate Chop', 'Foresight', 'Strength'] },
      { pokemon: 'Lucario', level: 32, item: 'Sitrus Berry', moves: ['Drain Punch', 'Bone Rush', 'Force Palm', 'Metal Claw'] }
    ]
  },
  {
    name: 'Crasher Wake',
    title: 'Gym Leader',
    location: 'Pastoria Gym',
    stage: 'Badges: 4 (Badge 5)',
    team: [
      { pokemon: 'Gyarados', level: 33, item: 'Wacan Berry', moves: ['Waterfall', 'Bite', 'Twister', 'Dragon Rage'] },
      { pokemon: 'Quagsire', level: 34, item: 'Rindo Berry', moves: ['Water Pulse', 'Mud Bomb', 'Amnesia', 'Yawn'] },
      { pokemon: 'Floatzel', level: 37, item: 'Sitrus Berry', moves: ['Aqua Jet', 'Brine', 'Crunch', 'Ice Fang'] }
    ]
  },
  {
    name: 'Byron',
    title: 'Gym Leader',
    location: 'Canalave Gym',
    stage: 'Badges: 5 (Badge 6)',
    team: [
      { pokemon: 'Magneton', level: 37, item: 'Occa Berry', moves: ['Flash Cannon', 'Thunderbolt', 'Tri Attack', 'Thunder Wave'] },
      { pokemon: 'Steelix', level: 38, item: 'Passho Berry', moves: ['Earthquake', 'Iron Tail', 'Ice Fang', 'Sandstorm'] },
      { pokemon: 'Bastiodon', level: 41, item: 'Sitrus Berry', moves: ['Iron Head', 'Stone Edge', 'Ancient Power', 'Taunt'] }
    ]
  },
  {
    name: 'Candice',
    title: 'Gym Leader',
    location: 'Snowpoint Gym',
    stage: 'Badges: 6 (Badge 7)',
    team: [
      { pokemon: 'Sneasel', level: 40, item: 'Chople Berry', moves: ['Slash', 'Ice Shard', 'Faint Attack', 'Aerial Ace'] },
      { pokemon: 'Piloswine', level: 40, item: 'Passho Berry', moves: ['Earthquake', 'Blizzard', 'Hail', 'Avalanche'] },
      { pokemon: 'Abomasnow', level: 42, item: 'Occa Berry', moves: ['Wood Hammer', 'Blizzard', 'Water Pulse', 'Focus Blast'] },
      { pokemon: 'Froslass', level: 44, item: 'Sitrus Berry', moves: ['Blizzard', 'Shadow Ball', 'Psychic', 'Double Team'] }
    ]
  },
  {
    name: 'Volkner',
    title: 'Gym Leader',
    location: 'Sunyshore Gym',
    stage: 'Badges: 7 (Badge 8)',
    team: [
      { pokemon: 'Jolteon', level: 46, item: 'Shuca Berry', moves: ['Thunderbolt', 'Shadow Ball', 'Charge Beam', 'Iron Tail'] },
      { pokemon: 'Raichu', level: 46, item: 'Focus Sash', moves: ['Thunderbolt', 'Brick Break', 'Quick Attack', 'Signal Beam'] },
      { pokemon: 'Luxray', level: 48, item: 'Magnet', moves: ['Thunder Fang', 'Crunch', 'Fire Fang', 'Ice Fang'] },
      { pokemon: 'Electivire', level: 50, item: 'Sitrus Berry', moves: ['ThunderPunch', 'Fire Punch', 'Cross Chop', 'Giga Impact'] }
    ]
  },
  // Elite Four & Champion
  {
    name: 'Aaron',
    title: 'Elite Four',
    location: 'Pokémon League',
    stage: 'Elite Four',
    team: [
      { pokemon: 'Yanmega', level: 49, item: 'Wise Glasses', moves: ['Bug Buzz', 'Air Slash', 'Ancient Power', 'U-turn'] },
      { pokemon: 'Scizor', level: 49, item: 'Occa Berry', moves: ['Bullet Punch', 'X-Scissor', 'Night Slash', 'Iron Head'] },
      { pokemon: 'Heracross', level: 51, item: 'Flame Orb', moves: ['Megahorn', 'Close Combat', 'Night Slash', 'Stone Edge'] },
      { pokemon: 'Vespiquen', level: 50, item: 'Leftovers', moves: ['Attack Order', 'Defend Order', 'Heal Order', 'Power Gem'] },
      { pokemon: 'Drapion', level: 53, item: 'Sitrus Berry', moves: ['Cross Poison', 'Night Slash', 'Earthquake', 'Ice Fang'] }
    ]
  },
  {
    name: 'Bertha',
    title: 'Elite Four',
    location: 'Pokémon League',
    stage: 'Elite Four',
    team: [
      { pokemon: 'Whiscash', level: 50, item: 'Rindo Berry', moves: ['Earthquake', 'Aqua Tail', 'Zen Headbutt', 'Rock Slide'] },
      { pokemon: 'Gliscor', level: 53, item: 'Yache Berry', moves: ['Earthquake', 'Fire Fang', 'Ice Fang', 'Thunder Fang'] },
      { pokemon: 'Hippowdon', level: 52, item: 'Smooth Rock', moves: ['Earthquake', 'Crunch', 'Stone Edge', 'Yawn'] },
      { pokemon: 'Golem', level: 52, item: 'Passho Berry', moves: ['Earthquake', 'Stone Edge', 'Fire Punch', 'Explosion'] },
      { pokemon: 'Rhyperior', level: 55, item: 'Sitrus Berry', moves: ['Earthquake', 'Rock Wrecker', 'Megahorn', 'Avalanche'] }
    ]
  },
  {
    name: 'Flint',
    title: 'Elite Four',
    location: 'Pokémon League',
    stage: 'Elite Four',
    team: [
      { pokemon: 'Houndoom', level: 52, item: 'Passho Berry', moves: ['Flamethrower', 'Dark Pulse', 'Sludge Bomb', 'Sunny Day'] },
      { pokemon: 'Flareon', level: 53, item: 'Charcoal', moves: ['Flare Blitz', 'Quick Attack', 'Iron Tail', 'Will-O-Wisp'] },
      { pokemon: 'Rapidash', level: 53, item: 'Wide Lens', moves: ['Flare Blitz', 'Megahorn', 'Poison Jab', 'Bounce'] },
      { pokemon: 'Infernape', level: 55, item: 'Focus Sash', moves: ['Flare Blitz', 'Close Combat', 'ThunderPunch', 'Mach Punch'] },
      { pokemon: 'Magmortar', level: 57, item: 'Sitrus Berry', moves: ['Fire Blast', 'Thunderbolt', 'Solar Beam', 'Focus Blast'] }
    ]
  },
  {
    name: 'Lucian',
    title: 'Elite Four',
    location: 'Pokémon League',
    stage: 'Elite Four',
    team: [
      { pokemon: 'Mr. Mime', level: 53, item: 'Light Clay', moves: ['Psychic', 'Thunderbolt', 'Reflect', 'Light Screen'] },
      { pokemon: 'Espeon', level: 55, item: 'Colbur Berry', moves: ['Psychic', 'Shadow Ball', 'Signal Beam', 'Calm Mind'] },
      { pokemon: 'Bronzong', level: 54, item: 'Occa Berry', moves: ['Psychic', 'Gyro Ball', 'Earthquake', 'Calm Mind'] },
      { pokemon: 'Alakazam', level: 56, item: 'Focus Sash', moves: ['Psychic', 'Focus Blast', 'Shadow Ball', 'Energy Ball'] },
      { pokemon: 'Gallade', level: 59, item: 'Sitrus Berry', moves: ['Psycho Cut', 'Close Combat', 'Stone Edge', 'Night Slash'] }
    ]
  },
  {
    name: 'Cynthia',
    title: 'Champion',
    location: 'Pokémon League',
    stage: 'Champion',
    team: [
      { pokemon: 'Spiritomb', level: 58, item: 'Sitrus Berry', moves: ['Shadow Ball', 'Dark Pulse', 'Psychic', 'Silver Wind'] },
      { pokemon: 'Roserade', level: 58, item: 'Poison Barb', moves: ['Energy Ball', 'Sludge Bomb', 'Shadow Ball', 'Extrasensory'] },
      { pokemon: 'Togekiss', level: 60, item: 'Leftovers', moves: ['Air Slash', 'Aura Sphere', 'Water Pulse', 'Shock Wave'] },
      { pokemon: 'Lucario', level: 60, item: 'Expert Belt', moves: ['Aura Sphere', 'Dragon Pulse', 'Flash Cannon', 'Psychic'] },
      { pokemon: 'Milotic', level: 58, item: 'Flame Orb', moves: ['Surf', 'Ice Beam', 'Mirror Coat', 'Recover'] },
      { pokemon: 'Garchomp', level: 62, item: 'Yache Berry', moves: ['Dragon Rush', 'Earthquake', 'Brick Break', 'Giga Impact'] }
    ]
  },
  // Superbosses
  {
    name: "Oak's Aide",
    title: 'Superboss',
    location: 'Route 230',
    stage: 'Post-Stark',
    team: [
      { pokemon: 'Nidoking', level: 70, item: 'Sitrus Berry', moves: ['Flamethrower', 'Earthquake', 'Sucker Punch', 'Megahorn'] },
      { pokemon: 'Venusaur', level: 68, item: 'Black Sludge', moves: ['Sleep Powder', 'Power Whip', 'Synthesis', 'Earthquake'] },
      { pokemon: 'Charizard', level: 68, item: 'Wide Lens', moves: ['Focus Blast', 'Air Slash', 'Fire Blast', 'Roost'] },
      { pokemon: 'Blastoise', level: 68, item: 'Chesto Berry', moves: ['Surf', 'Ice Beam', 'Rest', 'Water Spout'] },
      { pokemon: 'Tauros', level: 69, item: 'Expert Belt', moves: ['Earthquake', 'Stone Edge', 'Zen Headbutt', 'Body Slam'] },
      { pokemon: 'Snorlax', level: 75, item: 'Custap Berry', moves: ['Body Slam', 'Earthquake', 'Crunch', 'Rest'] }
    ]
  },
  {
    name: 'Altair',
    title: 'Superboss (Weather Master)',
    location: 'Route 228',
    stage: 'Post-Weather Superbosses',
    team: [
      { pokemon: 'Tyranitar', level: 82, item: 'Smooth Rock', moves: ['Stone Edge', 'Crunch', 'Earthquake', 'Dragon Dance'] },
      { pokemon: 'Abomasnow', level: 81, item: 'Icy Rock', moves: ['Blizzard', 'Wood Hammer', 'Earthquake', 'Ice Shard'] },
      { pokemon: 'Pelipper', level: 81, item: 'Damp Rock', moves: ['Hydro Pump', 'Hurricane', 'Roost', 'U-turn'] },
      { pokemon: 'Ninetales', level: 81, item: 'Heat Rock', moves: ['Fire Blast', 'Solar Beam', 'Will-O-Wisp', 'Hypnosis'] },
      { pokemon: 'Castform', level: 82, item: 'Life Orb', moves: ['Weather Ball', 'Thunder', 'Blizzard', 'Fire Blast'] },
      { pokemon: 'Dragonite', level: 85, item: 'Lum Berry', moves: ['Outrage', 'ExtremeSpeed', 'Fire Punch', 'Dragon Dance'] }
    ]
  },
  {
    name: 'Cyrus',
    title: 'Galactic Superboss',
    location: 'Turnback Cave',
    stage: 'Post-Stark Superboss',
    team: [
      { pokemon: 'Weavile', level: 80, item: 'Focus Sash', moves: ['Night Slash', 'Ice Punch', 'Fake Out', 'Swords Dance'] },
      { pokemon: 'Honchkrow', level: 80, item: 'Life Orb', moves: ['Brave Bird', 'Night Slash', 'Heat Wave', 'Superpower'] },
      { pokemon: 'Crobat', level: 80, item: 'Black Sludge', moves: ['Cross Poison', 'Brave Bird', 'U-turn', 'Roost'] },
      { pokemon: 'Gyarados', level: 82, item: 'Wacan Berry', moves: ['Waterfall', 'Stone Edge', 'Earthquake', 'Dragon Dance'] },
      { pokemon: 'Houndoom', level: 82, item: 'Focus Sash', moves: ['Fire Blast', 'Dark Pulse', 'Nasty Plot', 'Hidden Power'] },
      { pokemon: 'Tyranitar', level: 84, item: 'Lum Berry', moves: ['Stone Edge', 'Crunch', 'Earthquake', 'Fire Punch'] }
    ]
  },
  {
    name: 'Saturn',
    title: 'Galactic Superboss',
    location: 'Galactic HQ',
    stage: 'Post-Stark Superboss',
    team: [
      { pokemon: 'Bronzong', level: 78, item: 'Light Clay', moves: ['Reflect', 'Light Screen', 'Gyro Ball', 'Earthquake'] },
      { pokemon: 'Toxicroak', level: 78, item: 'Life Orb', moves: ['Cross Chop', 'Gunk Shot', 'Sucker Punch', 'Swords Dance'] },
      { pokemon: 'Golbat', level: 77, item: 'Eviolite', moves: ['Brave Bird', 'Poison Fang', 'Roost', 'U-turn'] },
      { pokemon: 'Octillery', level: 77, item: 'Expert Belt', moves: ['Octazooka', 'Ice Beam', 'Energy Ball', 'Flamethrower'] },
      { pokemon: 'Electivire', level: 79, item: 'Expert Belt', moves: ['ThunderPunch', 'Ice Punch', 'Cross Chop', 'Earthquake'] },
      { pokemon: 'Alakazam', level: 80, item: 'Focus Sash', moves: ['Psychic', 'Focus Blast', 'Shadow Ball', 'Signal Beam'] }
    ]
  },
  {
    name: 'Mars',
    title: 'Galactic Superboss',
    location: 'Global Terminal',
    stage: 'Post-Stark Superboss',
    team: [
      { pokemon: 'Purugly', level: 76, item: 'Silk Scarf', moves: ['Fake Out', 'Body Slam', 'Shadow Claw', 'Hypnosis'] },
      { pokemon: 'Bronzong', level: 75, item: 'Leftovers', moves: ['Gyro Ball', 'Earthquake', 'Payback', 'Confuse Ray'] },
      { pokemon: 'Golbat', level: 75, item: 'Black Sludge', moves: ['Brave Bird', 'Poison Fang', 'Confuse Ray', 'U-turn'] },
      { pokemon: 'Yanmega', level: 76, item: 'Choice Specs', moves: ['Bug Buzz', 'Air Slash', 'Ancient Power', 'Shadow Ball'] },
      { pokemon: 'Electivire', level: 77, item: 'Life Orb', moves: ['ThunderPunch', 'Fire Punch', 'Ice Punch', 'Cross Chop'] }
    ]
  },
  {
    name: 'Jupiter',
    title: 'Galactic Superboss',
    location: 'Ravaged Path',
    stage: 'Post-Stark Superboss',
    team: [
      { pokemon: 'Skuntank', level: 76, item: 'Black Glasses', moves: ['Night Slash', 'Poison Jab', 'Flamethrower', 'Explosion'] },
      { pokemon: 'Bronzong', level: 75, item: 'Light Clay', moves: ['Reflect', 'Light Screen', 'Gyro Ball', 'Earthquake'] },
      { pokemon: 'Golbat', level: 75, item: 'Black Sludge', moves: ['Brave Bird', 'Poison Fang', 'U-turn', 'Roost'] },
      { pokemon: 'Gastrodon', level: 76, item: 'Rindo Berry', moves: ['Earth Power', 'Surf', 'Ice Beam', 'Recover'] },
      { pokemon: 'Magmortar', level: 77, item: 'Life Orb', moves: ['Fire Blast', 'Thunderbolt', 'Focus Blast', 'Hidden Power'] }
    ]
  },
  {
    name: 'Tower Tycoon Palmer',
    title: 'Frontier Brain Superboss',
    location: "Barry's House (Twinleaf)",
    stage: 'Silver Print Superboss',
    team: [
      { pokemon: 'Rhyperior', level: 74, item: 'Passho Berry', moves: ['Rock Wrecker', 'Earthquake', 'Megahorn', 'Avalanche'] },
      { pokemon: 'Milotic', level: 74, item: 'Leftovers', moves: ['Surf', 'Ice Beam', 'Recover', 'Hypnosis'] },
      { pokemon: 'Dragonite', level: 74, item: 'Lum Berry', moves: ['Dragon Claw', 'Earthquake', 'Fire Punch', 'Dragon Dance'] },
      { pokemon: 'Cresselia', level: 75, item: 'Chesto Berry', moves: ['Psychic', 'Moonlight', 'Calm Mind', 'Ice Beam'] },
      { pokemon: 'Regigigas', level: 76, item: 'Sitrus Berry', moves: ['Crush Grip', 'Zen Headbutt', 'Fire Punch', 'Earthquake'] },
      { pokemon: 'Heatran', level: 75, item: 'Shuca Berry', moves: ['Magma Storm', 'Earth Power', 'Flash Cannon', 'Dragon Pulse'] }
    ]
  }
];

fs.writeFileSync(path.join(OVERRIDES_DIR, 'bosses.json'), JSON.stringify(bosses, null, 2));
console.log('✓ Wrote data/overrides/bosses.json');

// 8. Log corrections
fs.writeFileSync(path.join(OVERRIDES_DIR, 'corrections.json'), JSON.stringify(loggedCorrections, null, 2));
console.log(`✓ Wrote data/overrides/corrections.json (${loggedCorrections.length} fuzzy corrections logged)`);

console.log('All changelog parsing completed successfully.');

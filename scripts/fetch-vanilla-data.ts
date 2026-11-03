import fs from 'node:fs';
import path from 'node:path';

const CACHE_DIR = path.resolve(process.cwd(), '.cache/pokeapi_csv');

const CSV_FILES = [
  'pokemon.csv',
  'pokemon_species.csv',
  'pokemon_species_names.csv',
  'pokemon_stats.csv',
  'stats.csv',
  'pokemon_types.csv',
  'pokemon_types_past.csv',
  'types.csv',
  'pokemon_abilities.csv',
  'abilities.csv',
  'ability_names.csv',
  'pokemon_evolution.csv',
  'evolution_triggers.csv',
  'pokemon_moves.csv',
  'pokemon_move_methods.csv',
  'moves.csv',
  'move_names.csv',
  'move_changelog.csv',
  'move_damage_classes.csv',
  'items.csv',
  'item_names.csv',
  'machines.csv',
  'version_groups.csv',
  'versions.csv',
  'encounters.csv',
  'encounter_slots.csv',
  'encounter_methods.csv',
  'encounter_condition_value_map.csv',
  'encounter_condition_values.csv',
  'location_areas.csv',
  'location_area_prose.csv',
  'locations.csv',
  'location_names.csv',
  'pokemon_dex_numbers.csv',
  'pokedexes.csv',
  'pokemon_items.csv'
];

const BASE_URL = 'https://raw.githubusercontent.com/PokeAPI/pokeapi/master/data/v2/csv/';

async function downloadFile(fileName: string, retries = 3): Promise<void> {
  const filePath = path.join(CACHE_DIR, fileName);
  if (fs.existsSync(filePath) && fs.statSync(filePath).size > 0) {
    return;
  }

  const url = `${BASE_URL}${fileName}`;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`Downloading ${fileName} (attempt ${attempt})...`);
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`Failed to fetch ${url}: HTTP ${res.status}`);
      }
      const text = await res.text();
      fs.writeFileSync(filePath, text, 'utf-8');
      console.log(`✓ Saved ${fileName} (${(text.length / 1024).toFixed(1)} KB)`);
      return;
    } catch (err) {
      if (attempt === retries) {
        throw err;
      }
      await new Promise(r => setTimeout(r, 1000 * attempt));
    }
  }
}

async function main() {
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }

  console.log(`Starting download of ${CSV_FILES.length} PokéAPI CSVs...`);
  // Download concurrently in batches of 6
  const batchSize = 6;
  for (let i = 0; i < CSV_FILES.length; i += batchSize) {
    const batch = CSV_FILES.slice(i, i + batchSize);
    await Promise.all(batch.map(file => downloadFile(file)));
  }

  console.log('All PokéAPI CSV files successfully verified and cached.');
}

main().catch(err => {
  console.error('Error fetching PokéAPI CSVs:', err);
  process.exit(1);
});


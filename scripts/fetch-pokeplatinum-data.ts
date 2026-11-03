import fs from 'node:fs';
import path from 'node:path';

const CACHE_DIR = path.resolve(process.cwd(), '.cache/pokeplatinum');

// Read pokemon.csv to get the 493 species
const pokemonCsv = fs.readFileSync(path.resolve(process.cwd(), '.cache/pokeapi_csv/pokemon.csv'), 'utf-8');
const lines = pokemonCsv.split('\n').filter(l => l.trim().length > 0).slice(1);

interface SpeciesMap {
  id: number;
  pokeapiName: string;
  pokeplatinumFolder: string;
}

const speciesList: SpeciesMap[] = [];

for (const line of lines) {
  const parts = line.split(',');
  const id = parseInt(parts[0], 10);
  if (id > 493) break;
  const pokeapiName = parts[1];
  let folder = pokeapiName.replace(/-/g, '_');
  if (pokeapiName === 'deoxys-normal') folder = 'deoxys';
  else if (pokeapiName === 'wormadam-plant') folder = 'wormadam';
  else if (pokeapiName === 'giratina-altered') folder = 'giratina';
  else if (pokeapiName === 'shaymin-land') folder = 'shaymin';
  else if (pokeapiName === 'farfetchd') folder = 'farfetchd';
  else if (pokeapiName === 'mr-mime') folder = 'mr_mime';
  else if (pokeapiName === 'mime-jr') folder = 'mime_jr';
  else if (pokeapiName === 'porygon-z') folder = 'porygon_z';
  else if (pokeapiName === 'ho-oh') folder = 'ho_oh';

  speciesList.push({ id, pokeapiName, pokeplatinumFolder: folder });
}

// Add alternate forms
const alternateForms = [
  { id: 10001, pokeapiName: 'deoxys-attack', pokeplatinumFolder: 'deoxys_attack' },
  { id: 10002, pokeapiName: 'deoxys-defense', pokeplatinumFolder: 'deoxys_defense' },
  { id: 10003, pokeapiName: 'deoxys-speed', pokeplatinumFolder: 'deoxys_speed' },
  { id: 10004, pokeapiName: 'wormadam-sandy', pokeplatinumFolder: 'wormadam_sandy' },
  { id: 10005, pokeapiName: 'wormadam-trash', pokeplatinumFolder: 'wormadam_trash' },
  { id: 10006, pokeapiName: 'shaymin-sky', pokeplatinumFolder: 'shaymin_sky' },
  { id: 10007, pokeapiName: 'giratina-origin', pokeplatinumFolder: 'giratina_origin' },
  { id: 10008, pokeapiName: 'rotom-heat', pokeplatinumFolder: 'rotom_heat' },
  { id: 10009, pokeapiName: 'rotom-wash', pokeplatinumFolder: 'rotom_wash' },
  { id: 10010, pokeapiName: 'rotom-frost', pokeplatinumFolder: 'rotom_frost' },
  { id: 10011, pokeapiName: 'rotom-fan', pokeplatinumFolder: 'rotom_fan' },
  { id: 10012, pokeapiName: 'rotom-mow', pokeplatinumFolder: 'rotom_mow' },
  { id: 10013, pokeapiName: 'shellos-east', pokeplatinumFolder: 'shellos_east' },
  { id: 10014, pokeapiName: 'gastrodon-east', pokeplatinumFolder: 'gastrodon_east' }
];

async function downloadData(item: { id: number; pokeplatinumFolder: string }, retries = 3): Promise<boolean> {
  const destPath = path.join(CACHE_DIR, `${item.id}.json`);
  if (fs.existsSync(destPath) && fs.statSync(destPath).size > 0) {
    return true;
  }

  const url = `https://raw.githubusercontent.com/pret/pokeplatinum/main/res/pokemon/${item.pokeplatinumFolder}/data.json`;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url);
      if (res.status === 404) {
        // Some alternate forms may not have separate folders; that is fine
        return false;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      fs.writeFileSync(destPath, text, 'utf-8');
      return true;
    } catch (err) {
      if (attempt === retries) return false;
      await new Promise(r => setTimeout(r, 500 * attempt));
    }
  }
  return false;
}

async function main() {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  const allToFetch = [...speciesList, ...alternateForms];
  console.log(`Fetching ${allToFetch.length} data.json files from pret/pokeplatinum...`);

  const concurrency = 25;
  let downloaded = 0;
  for (let i = 0; i < allToFetch.length; i += concurrency) {
    const chunk = allToFetch.slice(i, i + concurrency);
    await Promise.all(
      chunk.map(async item => {
        const ok = await downloadData(item);
        if (ok) downloaded++;
      })
    );
  }

  console.log(`Downloaded ${downloaded} files from pret/pokeplatinum.`);

  // Verify all 1-493 exist
  let missing = 0;
  for (let id = 1; id <= 493; id++) {
    const file = path.join(CACHE_DIR, `${id}.json`);
    if (!fs.existsSync(file)) {
      console.warn(`Missing pokeplatinum data for #${id}`);
      missing++;
    }
  }

  if (missing === 0) {
    console.log(`✓ All 493 Pokémon data.json files from pret/pokeplatinum cached successfully!`);
  } else {
    console.warn(`Warning: ${missing} Pokémon files missing in pokeplatinum cache.`);
  }
}

main().catch(err => {
  console.error('Error fetching pokeplatinum data:', err);
  process.exit(1);
});

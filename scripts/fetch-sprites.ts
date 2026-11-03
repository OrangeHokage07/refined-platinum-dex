import fs from 'node:fs';
import path from 'node:path';

const SPRITES_DIR = path.resolve(process.cwd(), 'public/sprites/pokemon');
const SHINY_DIR = path.resolve(SPRITES_DIR, 'shiny');

const BASE_URL = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-iv/platinum/';

const FORM_IDS = [
  10001, 10002, 10003, // Deoxys Attack, Defense, Speed
  10004, 10005,        // Wormadam Sandy, Trash
  10006,               // Shaymin Sky
  10007,               // Giratina Origin
  10008, 10009, 10010, 10011, 10012, // Rotom Heat, Wash, Frost, Fan, Mow
  10013, 10014         // Shellos East, Gastrodon East
];

async function downloadSprite(url: string, destPath: string, retries = 3): Promise<boolean> {
  if (fs.existsSync(destPath) && fs.statSync(destPath).size > 0) {
    return true;
  }

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url);
      if (res.status === 404) {
        return false;
      }
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const buffer = Buffer.from(await res.arrayBuffer());
      fs.writeFileSync(destPath, buffer);
      return true;
    } catch (err) {
      if (attempt === retries) {
        console.warn(`Failed to download ${url}:`, err);
        return false;
      }
      await new Promise(r => setTimeout(r, 500 * attempt));
    }
  }
  return false;
}

async function main() {
  fs.mkdirSync(SPRITES_DIR, { recursive: true });
  fs.mkdirSync(SHINY_DIR, { recursive: true });

  const tasks: { url: string; dest: string; id: number; shiny: boolean }[] = [];

  // IDs 1 to 493
  for (let id = 1; id <= 493; id++) {
    tasks.push({
      url: `${BASE_URL}${id}.png`,
      dest: path.join(SPRITES_DIR, `${id}.png`),
      id,
      shiny: false
    });
    tasks.push({
      url: `${BASE_URL}shiny/${id}.png`,
      dest: path.join(SHINY_DIR, `${id}.png`),
      id,
      shiny: true
    });
  }

  // Alternate forms
  for (const formId of FORM_IDS) {
    tasks.push({
      url: `${BASE_URL}${formId}.png`,
      dest: path.join(SPRITES_DIR, `${formId}.png`),
      id: formId,
      shiny: false
    });
    tasks.push({
      url: `${BASE_URL}shiny/${formId}.png`,
      dest: path.join(SHINY_DIR, `${formId}.png`),
      id: formId,
      shiny: true
    });
  }

  console.log(`Downloading ${tasks.length} sprites with concurrency...`);

  const concurrency = 20;
  let completed = 0;
  let missing = 0;

  for (let i = 0; i < tasks.length; i += concurrency) {
    const chunk = tasks.slice(i, i + concurrency);
    await Promise.all(
      chunk.map(async task => {
        const ok = await downloadSprite(task.url, task.dest);
        if (!ok) {
          missing++;
          if (!task.shiny && task.id <= 493) {
            console.error(`CRITICAL: Front sprite for Pokémon #${task.id} could not be downloaded!`);
          }
        }
        completed++;
      })
    );
    if ((i + concurrency) % 100 === 0 || i + concurrency >= tasks.length) {
      process.stdout.write(`Downloaded ${completed}/${tasks.length} sprites...\r`);
    }
  }

  console.log(`\nSprite download complete.`);

  // Verify all 493 front sprites exist
  let missingFront = 0;
  for (let id = 1; id <= 493; id++) {
    const file = path.join(SPRITES_DIR, `${id}.png`);
    if (!fs.existsSync(file) || fs.statSync(file).size === 0) {
      console.error(`Missing front sprite for ID ${id}`);
      missingFront++;
    }
  }

  if (missingFront > 0) {
    console.error(`Verification FAILED: ${missingFront} front sprites are missing!`);
    process.exit(1);
  } else {
    console.log(`✓ Verification PASSED: All 493 Gen 4 front sprites are present!`);
  }
}

main().catch(err => {
  console.error('Sprite fetching error:', err);
  process.exit(1);
});

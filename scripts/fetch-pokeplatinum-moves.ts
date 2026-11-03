import fs from 'node:fs';
import path from 'node:path';

const CACHE_DIR = path.resolve(process.cwd(), '.cache/pokeplatinum_moves');

async function main() {
  fs.mkdirSync(CACHE_DIR, { recursive: true });

  const treeRes = await fetch('https://api.github.com/repos/pret/pokeplatinum/git/trees/main?recursive=1');
  const tree = (await treeRes.json()) as { tree: { path: string }[] };
  const moveFiles = tree.tree.filter(f => f.path.match(/^res\/moves\/[a-z0-9_]+\/data\.json$/));

  console.log(`Downloading ${moveFiles.length} move data files from pret/pokeplatinum...`);

  const concurrency = 25;
  let downloaded = 0;

  for (let i = 0; i < moveFiles.length; i += concurrency) {
    const chunk = moveFiles.slice(i, i + concurrency);
    await Promise.all(
      chunk.map(async f => {
        const moveName = f.path.split('/')[2];
        const dest = path.join(CACHE_DIR, `${moveName}.json`);
        if (fs.existsSync(dest) && fs.statSync(dest).size > 0) {
          downloaded++;
          return;
        }

        const url = `https://raw.githubusercontent.com/pret/pokeplatinum/main/${f.path}`;
        for (let attempt = 1; attempt <= 3; attempt++) {
          try {
            const res = await fetch(url);
            if (res.ok) {
              const text = await res.text();
              fs.writeFileSync(dest, text, 'utf-8');
              downloaded++;
              return;
            }
          } catch (e) {
            await new Promise(r => setTimeout(r, 400 * attempt));
          }
        }
      })
    );
  }

  console.log(`✓ Cached ${downloaded}/${moveFiles.length} moves.`);
}

main().catch(console.error);


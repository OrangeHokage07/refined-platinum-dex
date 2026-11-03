import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const ROOT_DIR = process.cwd();
const DIST_DIR = path.resolve(ROOT_DIR, 'dist');
const TEMP_WORKTREE = path.resolve(ROOT_DIR, '.gh-pages-temp');

function run(cmd: string, cwd = ROOT_DIR) {
  console.log(`> ${cmd}`);
  return execSync(cmd, { cwd, stdio: 'inherit' });
}

async function main() {
  console.log('Ensuring dist is fresh and built with base /refined-platinum-dex/...');
  process.env.VITE_BASE = '/refined-platinum-dex/';
  process.env.NODE_ENV = 'production';
  run('npm run build');

  // Add .nojekyll in dist so GitHub Pages does not ignore files
  fs.writeFileSync(path.join(DIST_DIR, '.nojekyll'), '');

  // Clean up any stale temp worktree
  if (fs.existsSync(TEMP_WORKTREE)) {
    try {
      run(`git worktree remove --force ${TEMP_WORKTREE}`);
    } catch (e) {
      fs.rmSync(TEMP_WORKTREE, { recursive: true, force: true });
    }
  }

  console.log('Creating worktree for gh-pages branch...');
  run(`git worktree add -B gh-pages "${TEMP_WORKTREE}"`);

  // Remove old files in worktree except .git
  const filesInWorktree = fs.readdirSync(TEMP_WORKTREE);
  for (const f of filesInWorktree) {
    if (f === '.git') continue;
    fs.rmSync(path.join(TEMP_WORKTREE, f), { recursive: true, force: true });
  }

  // Copy dist contents to worktree
  console.log('Copying built assets to gh-pages branch...');
  fs.cpSync(DIST_DIR, TEMP_WORKTREE, { recursive: true });

  // Commit and push
  console.log('Committing and pushing to origin/gh-pages...');
  run('git add -A', TEMP_WORKTREE);
  run('git commit -m "deploy: update GitHub Pages build [skip ci]"', TEMP_WORKTREE);
  run('git push -f origin gh-pages', TEMP_WORKTREE);

  // Clean up worktree
  run(`git worktree remove --force "${TEMP_WORKTREE}"`);

  // Update GitHub Pages setting to branch gh-pages
  console.log('Configuring GitHub Pages to serve from gh-pages branch...');
  try {
    run('gh api -X PUT repos/OrangeHokage07/refined-platinum-dex/pages -F "build_type=legacy" -F "source[branch]=gh-pages" -F "source[path]=/"');
  } catch (err) {
    console.warn('Pages update note:', err);
  }

  console.log('✓ Successfully deployed to GitHub Pages!');
  console.log('Live URL: https://orangehokage07.github.io/refined-platinum-dex/');
}

main().catch(err => {
  console.error('Deployment error:', err);
  process.exit(1);
});


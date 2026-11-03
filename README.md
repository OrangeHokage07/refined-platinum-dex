# Refined Platinum Dex

An offline-first, Sinnoh-styled Progressive Web App (PWA) Pokédex built specifically for the ROM hack **Pokémon Refined Platinum** (Gen 4, 493 Pokémon), tailored for iPhone (iOS Safari, portrait mode, 393×852 viewport).

Designed to be played seamlessly alongside emulator sessions (e.g. Delta).

---

## iPhone Installation (3 Simple Steps)

1. **Open the URL in Safari**: Open `https://OrangeHokage07.github.io/refined-platinum-dex/` (or scan `qrcode.png`).
2. **Add to Home Screen**: Tap the Safari **Share** button (box with an arrow pointing up) at the bottom of the screen, scroll down, and tap **"Add to Home Screen"**.
3. **Open Once While Online**: Tap the new **Refined Dex** icon on your iPhone home screen once while connected to the internet. The service worker precaches all code, data, and 1,000+ sprites. Once loaded, the app works **100% offline in Airplane Mode**.

---

## Features

- **Sinnoh Device Shell**: Authentic Gen 4 Sinnoh Pokédex casing in glossy red with glass lens, LEDs, speaker holes, and tactile D-pad controls.
- **Fast 60fps Virtualized List**: Ultra-smooth scrolling through all 493 Pokémon with minimal memory footprint.
- **Instant Search & Filters**: Search by name or Dex number; filter by Type, Seen/Caught/Uncaught, Generation, "Available Pre-E4", or "Obtainable Now" based on your current badge stage.
- **Detailed Pokémon Breakdown**:
  - Sinnoh & National numbers, category, height, weight, gender ratio, catch rate, egg groups.
  - Large pixel-rendered front sprite with tap-to-toggle **Shiny** view.
  - **Base Stats** bars with total BST.
  - **Gen 4 Defensive Type Matchups** (17 types, no Fairy, authentic Gen 4 Steel resistances to Dark & Ghost).
  - **Interactive Evolution Chains** featuring Refined Platinum evolution methods (trade item level-ups, move-based triggers, Level 38 Kadabra/Machoke, Pamtre Berry Milotic).
  - **Where to Find Locations**: Grouped by route/area, method, encounter rate %, level range, time-of-day, and `★ Refined Platinum` addition badges.
  - **Movesets**: Complete Level-up, TM/HM, and Tutor moves with power, accuracy, PP, category icons, and tap-for-description.
  - **Trainer vs Base Patch Toggle**: Switch between the Trainer Patch movepools and vanilla Base Patch learnsets in Settings.
- **Trainer Bosses & Superbosses**: Dedicated guide to Gym Leaders, Elite Four, Champion Cynthia, and post-game Superbosses (Oak's Aide, Altair, Cyrus, Saturn, Mars, Jupiter, Palmer) with teams, levels, items, and movesets.
- **Rock-Solid Persistence**:
  - Instant asynchronous auto-saving to **IndexedDB** (`idb-keyval`) on every tap (Seen, Caught, personal notes).
  - Storage persistence requested via `navigator.storage.persist()`.
  - Versioned schema with migration logic so updates never erase user data.
  - **Export & Import Progress**: Save backups to iOS Files / Share Sheet, restore from JSON, and automatic warning if last backup was over 14 days ago.

---

## Local Development & Data Pipeline

```bash
# Install dependencies
npm install

# Download vanilla data from PokéAPI & pokeplatinum
npm run fetch:vanilla
npm run fetch:sprites

# Parse Refined Platinum changelogs into /data/overrides/
npm run parse:changelogs

# Build public/data/ JSON files
npm run data

# Run validation suite
npm run validate

# Development server
npm run dev

# Production build
npm run build

# Preview build locally
npm run preview
```

---

## Redeploying After Changes

Pushing changes to `main` or `master` automatically triggers the GitHub Actions workflow (`.github/workflows/deploy.yml`), which validates data, builds the production PWA, and deploys to GitHub Pages.


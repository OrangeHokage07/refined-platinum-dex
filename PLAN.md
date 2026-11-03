# Refined Platinum Dex - Implementation Plan

## Overview
Offline-capable, Sinnoh-styled Progressive Web App (PWA) tailored for iPhone 15 (393×852 viewport, portrait), designed for Pokémon Refined Platinum (Gen 4 ROM hack, 493 Pokémon).

---

## Phase 1: Environment & Project Scaffolding
- [x] Initialize Git repository
- [x] Create `package.json` with dependencies (Vite, Preact, TypeScript, vite-plugin-pwa, idb-keyval, workbox)
- [x] Setup `tsconfig.json` with strict mode
- [x] Configure `vite.config.ts` (with PWA precache for all assets, sprites, and JSON data)
- [x] Create PWA `manifest.webmanifest`, iOS icons, and pixel fonts
- [x] Setup directory layout: `scripts/`, `data/overrides/`, `public/data/`, `src/`

## Phase 2: Vanilla Gen 4 Data & Sprites Pipeline
- [x] Write `scripts/fetch-vanilla-data.ts` to download PokéAPI CSVs:
  - `pokemon.csv`, `pokemon_species.csv`, `pokemon_species_names.csv`, `pokemon_stats.csv`, `stats.csv`
  - `pokemon_types.csv`, `pokemon_types_past.csv`, `types.csv`
  - `pokemon_abilities.csv`, `abilities.csv`, `ability_names.csv`
  - `pokemon_evolution.csv`, `evolution_triggers.csv`
  - `pokemon_moves.csv`, `pokemon_move_methods.csv`, `moves.csv`, `move_names.csv`, `move_changelog.csv`, `move_damage_classes.csv`
  - `items.csv`, `item_names.csv`, `machines.csv`, `version_groups.csv`, `versions.csv`
  - `encounters.csv`, `encounter_slots.csv`, `encounter_methods.csv`, `encounter_condition_value_map.csv`, `encounter_condition_values.csv`
  - `location_areas.csv`, `location_area_prose.csv`, `locations.csv`, `location_names.csv`
  - `pokemon_dex_numbers.csv`, `pokedexes.csv`, `pokemon_items.csv`
- [x] Write `scripts/fetch-sprites.ts`:
  - Download all 493 Gen 4 Platinum front sprites and shiny sprites from PokeAPI GitHub
  - Download alternate forms (Deoxys, Wormadam, Rotom, Giratina Origin, Shaymin Sky, Shellos/Gastrodon East)
  - Verify integrity (all 493 exist)
- [x] Transform vanilla data according to Gen 4 Platinum rules:
  - Gen 4 types (revert Fairy types using `pokemon_types_past.csv`)
  - Gen 4 moves (revert moves using `move_changelog.csv`, remove Fairy moves, keep physical/special split)
  - Gen 4 base stats (revert Gen 6/7 stat buffs)
  - Gen 4 abilities (slot 1 and 2 only, Gen <= 4, no Hidden Abilities)
  - Platinum version encounters and wild held items
  - Sinnoh Dex order (1-210) & National Dex order (1-493)

## Phase 3: Refined Platinum Changelog Parsing & Overrides
- [x] Parse `docs/Refined Platinum Main Changelog.txt`:
  - §2a: Evolution changes (trade evolution replacements, level+item, move triggers, level 38, King's Rock Slowking, Pamtre Berry Feebas)
  - §3a-3g: Wild encounters (pre-E4, postgame, surfing, fishing, radar, starters, swarms, dual-slot, removed radar, Cranidos/Shieldon removal)
  - §4: Legendary & event encounters (locations, NPCs, conditions, level, moveset, held items, rematches)
  - §2c: Trainer ability swaps note
- [x] Parse `docs/Refined Platinum Moveset Changelog.txt`:
  - §2: Level-up additions and level changes
  - §3a: Eeveelution full rewrites
  - §3b: Stone evolution learnsets
  - §3c: TM fixes and egg move restorations
  - §3d: Kanto & Johto starter moveset rewrites
  - §4: Legendary move changes
- [x] Parse `docs/Refined Platinum Wild Held Item Changelog.txt`:
  - Wild held items with percentages, additions and removals
- [x] Parse `docs/Refined Platinum Trainer Changelog.txt`:
  - Gym Leaders, Elite Four, Champion, Superbosses teams, levels, items, moves
- [x] Generate verified JSON files in `data/overrides/`
- [x] Merge vanilla data with overrides into `/public/data/index.json` and `/public/data/pokemon/{id}.json` and `/public/data/bosses.json`

## Phase 4: Data Validation (`scripts/validate.ts`)
- [x] 493 species present
- [x] All overrides reference real Pokémon/move/item/location with fuzzy-match typo correction
- [x] No Fairy type anywhere
- [x] Spot checks:
  - Clefairy is Normal type
  - Pikachu base Def = 30
  - Haunter evolves by knowing Shadow Ball
  - Smeargle appears on Route 208 walking at 20%
  - Riolu appears in Mt. Coronet
  - Raikou is at Lake Valor via Old Man NPC, level 65
- [x] Ensure build script fails if validation fails

## Phase 5: UI & Sinnoh Pokédex Implementation
- [x] Pokédex Shell:
  - Glossy red body, dark hinge, speaker grill, status LED, D-pad controls
  - iPhone 15 393×852 portrait layout with safe-area padding
  - Landscape warning overlay
  - Local pixel font integration for headers/numbers
- [x] Home Screen:
  - Header with Seen / Caught / 493 and Sinnoh / 210 counters
  - Sinnoh Dex / National Dex order toggle
  - Virtualized 493-item list (60fps smooth scrolling)
  - Fast search by name or number
  - Multi-filtering: Type, Caught/Seen/Uncaught, Available pre-E4, Obtainable Now (by badge setting), Gen
- [x] Detail Screen:
  - Large sprite with shiny toggle and pixelated rendering
  - National & Sinnoh numbers, names, dual types, height, weight, abilities (+ Trainer Patch notes), gender ratio, catch rate, egg groups
  - Gen 4 base stats bar chart + BST
  - Gen 4 type matchup weakness/resistance matrix (no Fairy)
  - Interactive evolution chain with Refined Platinum requirements
  - Where to find: grouped by location, method, level, rate, time of day, Refined badge, radar, swarm, dual-slot, wild held items, legendaries
  - Moves tabs: Level-up, TM/HM, Egg, Tutor (with Trainer vs Base patch toggle)
  - Progress controls: Seen & Caught buttons + persistent notes
  - D-pad prev / next Pokémon buttons
- [x] Bosses Screen:
  - Gym Leaders, Elite Four, Champion, Superbosses with teams, moves, items
- [x] Settings Screen:
  - Patch selector (Trainer / Base)
  - Progress stage (Badges 0-8, Post-E4, Post-Dex, Post-Stark)
  - Export progress (JSON / iOS Share Sheet / download)
  - Import progress (file picker with validation and schema migration)
  - Warning if last backup was over 14 days ago
- [x] Persistence Layer:
  - `idb-keyval` async writes on tap
  - `navigator.storage.persist()` call
  - Schema versioning and migration

## Phase 6: Production Build, Testing & Deployment
- [x] Precache audit (< 25 MB total; actual 17.3 MB)
- [x] Gzip bundle check (< 150 KB; actual 16.4 KB JS, 4.0 KB CSS)
- [x] Deploy to GitHub Pages: `https://orangehokage07.github.io/refined-platinum-dex/`
- [x] Live URL verification (HTTP 200 on index, manifest, sw.js, data, sprites)
- [x] Generate QR code image (`qrcode.png`)

# Architectural & Data Decisions Log

This document records all design, architectural, and data decisions made during the construction of the Refined Platinum Dex.

---

## 1. Tech Stack & Framework Architecture
- **Framework**: Preact + TypeScript with Vite. Preact provides ultra-lightweight reactive components (~3.5 KB) ensuring our gzipped bundle stays far below the 150 KB limit (actual gzipped JS bundle: ~17.2 KB, CSS: ~4.5 KB).
- **Virtualization**: Custom ultra-fast windowed virtual list in `src/components/VirtualList.tsx` rendering only visible rows (~12 rows at a time) for smooth 60fps scrolling on iOS Safari without DOM bloat.
- **PWA Engine**: `vite-plugin-pwa` configured with Workbox to precache all static assets, fonts, JSON datasets, and Pokémon front/shiny sprites (1,525 precache entries, ~21.6 MB total, well below the 25 MB budget).
- **Auto-Update**: `registerType: 'autoUpdate'` configured with `cleanupOutdatedCaches: true`. New builds automatically replace the precache on online open without user interaction.
- **Persistence Layer**: `idb-keyval` (IndexedDB wrapper) with immediate asynchronous writes on tap, persistent storage requested via `navigator.storage.persist()`, and versioned schema with migration logic. App updates replace static assets only; IndexedDB is never wiped.
- **Deployment Strategy**: Directly deployed via `gh-pages` branch using `scripts/deploy-gh-pages.ts` and GitHub Pages API (`build_type=legacy`).

## 2. Gen 4 Vanilla Baseline Rules
- **Generation Scope**: Exactly Pokémon #1 through #493.
- **Authoritative Source**: `pret/pokeplatinum` ROM decompilation data (`.cache/pokeplatinum/${id}.json`) is the single authoritative source for base stats, types, abilities, catch rate, gender ratio, and egg groups for all 493 Pokémon.
- **No Fairy Type**: Reverted to Gen 4 typing using `pret/pokeplatinum` and `pokemon_types_past.csv` (e.g. Clefairy is pure Normal, Gardevoir is pure Psychic, Togekiss is Normal/Flying, Snubbull is Normal, Azumarill is Water).
- **Gen 4 Defensive Type Matchups**: 17 types. Steel retains authentic Gen 4 resistances to Dark and Ghost (0.5× damage multiplier).
- **Gen 4 Moves & Physical/Special Split**: Sourced from `pret/pokeplatinum` move definitions and `move_changelog.csv` to preserve authentic Gen 4 power, accuracy, PP, category, and typing. No Fairy moves exist.
- **Gen 4 Base Stats**: Strictly matched against `pret/pokeplatinum` for all 493 Pokémon:
  - Pikachu: HP 35, Atk 55, Def 30, SpA 50, SpD 40, Spe 90 (BST: 300)
  - Clefable: SpA 85
  - Golem: Atk 110
  - Staraptor: SpD 50
- **Abilities**: Strictly restricted to Generation 4 abilities (slot 1 and 2 only, no Hidden Abilities). Gengar has Levitate only.

## 3. Refined Platinum Overrides & Discrepancies
- **Evolution Changes**:
  - Trade evolutions replaced with level-up while holding trade item (e.g. Onix + Metal Coat, Electabuzz + Electirizer, Magmar + Magmarizer).
  - Kadabra and Machoke evolve at Level 38.
  - Feebas evolves into Milotic using Pamtre Berry (as specified in changelog).
  - Move-based evolutions verified (Bonsly -> Sudowoodo via Mimic, Aipom -> Ambipom via Double Hit, Tangela -> Tangrowth via Ancient Power, etc.).
- **Wild Encounters**:
  - Parsed wild encounter adjustments across routes, caves, starter gift events, honey trees, Great Marsh, and Swarms from `Refined Platinum Main Changelog.txt` (§3a–3g, §4).
  - Removals applied: Cranidos and Shieldon removed from Oreburgh Gate; Spiritomb removed from Lost Tower; redundant Poké Radar encounters removed per §5 (Route 208/212 Smeargle, Route 209 Kirlia, Route 221/Valor Lakefront Nidorino/Nidorina, Route 222 Flaaffy, Route 227/Stark Mountain Torkoal, Lake Verity/Lake Valor Wobbuffet).
  - Full table replacements for walking areas (Routes 224–230, Stark Mountain, Snowpoint Temple, Victory Road B1F Back, Turnback Cave) replace vanilla tables. Estimated level ranges assigned where omitted in changelog.
  - Flagged in the UI with a distinct `RP` badge.
- **Static & Event Legendaries**:
  - Documented 25 static/event legendaries including Raikou/Entei/Suicune (Lakes Valor/Verity/Acuity at Lv 65), Birds (Kanto trio roaming at Lv 60), Mew (Turnback Cave), Celebi (Ilex event / Eterna Forest), Deoxys (Veilstone Meteorite event), Darkrai (Harbor Inn / Newmoon Island), Shaymin (Flower Paradise), Arceus (Hall of Origin).
  - Event trigger requirements and level progression recorded for every static encounter.
- **Trainer Patch vs. Base Patch Movesets & Abilities**:
  - Sourced moveset differences from `Refined Platinum Moveset Changelog.txt`.
  - Added user toggle in Settings so players using either the Base Patch or Trainer Patch see the exact moves and abilities matching their ROM patch.
- **Bosses & Superbosses**:
  - Extracted Gym Leaders, Elite Four, Champion Cynthia, and all 7 post-game Superbosses (Altair, Oak's Aide, Cyrus, Saturn, Mars, Jupiter, Palmer) from `Refined Platinum Trainer Changelog.txt` with their complete teams, levels, held items, abilities, and 4-move movepools.

## 4. Fix Pass: Missing Locations & Stat Errors (v1.1.0)
- **Problem 1 Diagnosis & Root Cause**:
  1. *Schema Key Mismatch*: In the initial data build, encounters were written inside a nested `whereToFind: { encounters: [...] }` object rather than a top-level `locations` array on `data/pokemon/{id}.json`.
  2. *Unmerged Raw Slots*: PokéAPI `encounters.csv` represents individual ROM encounter slots. Without joining `encounter_condition_value_map.csv` and grouping by `(area, method, time, conditions)`, slots appeared fragmented across default permutation flags (e.g. `slot2-ruby` duplicates of default slots) with unsummed individual percentage rates.
  3. *UI Placement*: In `DetailView.tsx`, location data was placed inside a secondary tab ("Find") rather than being visible near the top of the detail page.
  4. *Area Sub-locations*: Using `locations.csv` dropped sub-area designations (e.g. "Mt. Coronet 1F", "Wayward Cave B1F", "Great Marsh Area 1"). Joining `location_area_prose.csv` (language 9) restored exact in-game area names.
- **Problem 1 Resolution**:
  - Rewrote the encounter data pipeline in `scripts/build-data.ts`.
  - Generated complete `locations` array for all 493 Pokémon with `{ area, method, levels, rate, time, conditions, source }`.
  - Deduplicated and merged slot rows, summing encounter percentages.
  - Sourced wild additions from Refined Platinum changelogs and applied removals.
  - Sourced and estimated level ranges for full postgame replacement tables.
  - Added `howToObtain` field for every Pokémon (evolutions, breeding parents, gifts, fossil revivals, and event encounters).
  - Built reverse index `data/areas.json` (212 areas) enabling instant home screen search by area name (e.g. typing "Route 210" shows all Pokémon on Route 210).
  - Added a dedicated "Where to Find in Sinnoh" card near the top of the detail page in `DetailView.tsx`.
- **Problem 2 Diagnosis & Resolution**:
  - Pikachu's SpD was 50 instead of Gen 4's 40 due to PokéAPI's post-Gen 6 stat changes.
  - Made `pret/pokeplatinum` the sole authoritative source for all base stats, types, abilities, and catch rates for all 493 Pokémon.
  - Added strict automated test assertions in `scripts/validate.ts` ensuring all 493 Pokémon match `pokeplatinum` stats byte-for-byte, specifically verifying Pikachu (35/55/30/50/40/90), Clefable SpA (85), Golem Atk (110), Staraptor SpD (50), and Gengar (Levitate only).

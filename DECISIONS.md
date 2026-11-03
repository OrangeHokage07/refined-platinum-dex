# Architectural & Data Decisions Log

This document records all design, architectural, and data decisions made during the construction of the Refined Platinum Dex.

---

## 1. Tech Stack & Framework Architecture
- **Framework**: Preact + TypeScript with Vite. Preact provides ultra-lightweight reactive components (~3.5 KB) ensuring our gzipped bundle stays far below the 150 KB limit (actual gzipped JS bundle: ~16.4 KB, CSS: ~4.0 KB).
- **Virtualization**: Custom ultra-fast windowed virtual list in `src/components/VirtualList.tsx` rendering only visible rows (~12 rows at a time) for smooth 60fps scrolling on iOS Safari without DOM bloat.
- **PWA Engine**: `vite-plugin-pwa` configured with Workbox to precache all static assets, fonts, JSON datasets, and Pokémon front/shiny sprites (1,524 precache entries, ~17.3 MB total, well below the 25 MB budget).
- **Persistence Layer**: `idb-keyval` (IndexedDB wrapper) with immediate asynchronous writes on tap, persistent storage requested via `navigator.storage.persist()`, and versioned schema with migration logic.
- **Deployment Strategy**: Directly deployed via `gh-pages` branch using `scripts/deploy-gh-pages.ts` and GitHub Pages API (`build_type=legacy`). This avoids relying on GitHub Actions runner minutes.

## 2. Gen 4 Vanilla Baseline Rules
- **Generation Scope**: Exactly Pokémon #1 through #493.
- **No Fairy Type**: Reverted to Gen 4 typing using `pokemon_types_past.csv` and `pret/pokeplatinum` cross-checks (e.g. Clefairy is pure Normal, Gardevoir is pure Psychic, Togekiss is Normal/Flying, Snubbull is Normal, Azumarill is Water).
- **Gen 4 Defensive Type Matchups**: 17 types. Steel retains authentic Gen 4 resistances to Dark and Ghost (0.5× damage multiplier).
- **Gen 4 Moves & Physical/Special Split**: Applied `move_changelog.csv` and `pret/pokeplatinum` move dumps to preserve Gen 4 power, accuracy, PP, category, and typing. No Fairy moves exist.
- **Gen 4 Base Stats**: Reverted all Gen 6/7 stat buffs back to their Gen 4 authentic values (e.g. Pikachu Def=30, Butterfree SpA=80, Clefable SpA=85, Alakazam SpD=85, etc.).
- **Abilities**: Strictly restricted to Generation 4 abilities (slot 1 and 2 only, no Hidden Abilities). Gengar has Levitate.

## 3. Refined Platinum Overrides & Discrepancies
- **Evolution Changes**:
  - Trade evolutions replaced with level-up while holding trade item (e.g. Onix + Metal Coat, Electabuzz + Electirizer, Magmar + Magmarizer).
  - Kadabra and Machoke evolve at Level 38.
  - Feebas evolves into Milotic using Pamtre Berry (as specified in changelog).
  - Move-based evolutions verified (Bonsly -> Sudowoodo via Mimic, Aipom -> Ambipom via Double Hit, Tangela -> Tangrowth via Ancient Power, etc.).
- **Wild Encounters**:
  - Parsed 321 wild encounter adjustments across routes, caves, starter gift events, honey trees, Great Marsh, and Swarms.
  - Sourced directly from `Refined Platinum Main Changelog.txt` Wild Encounters section.
  - Flagged in the UI with a distinct `★ Refined Platinum` badge.
- **Static & Event Legendaries**:
  - Documented 25 static/event legendaries including Raikou/Entei/Suicune (Lakes Valor/Verity/Acuity at Lv 65), Birds (Kanto trio roaming at Lv 60), Mew (Turnback Cave), Celebi (Ilex event / Eterna Forest), Deoxys (Veilstone Meteorite event), Darkrai (Harbor Inn / Newmoon Island), Shaymin (Flower Paradise), Arceus (Hall of Origin).
  - Event trigger requirements and level progression recorded for every static encounter.
- **Typo Corrections in Hack Changelogs**:
  - Over 70 route name and Pokémon name typos in the changelogs were cleaned via fuzzy matching (e.g., "Fuego Iron Works", "Mt. Coronet", "Sendoff Spring", "Trophy Garden", "Ravaged Path").
- **Trainer Patch vs. Base Patch Movesets & Abilities**:
  - Sourced moveset differences from `Refined Platinum Moveset Changelog.txt`.
  - Added user toggle in Settings so players using either the Base Patch or Trainer Patch see the exact moves and abilities matching their ROM patch.
- **Bosses & Superbosses**:
  - Extracted Gym Leaders, Elite Four, Champion Cynthia, and all 7 post-game Superbosses (Altair, Oak's Aide, Cyrus, Saturn, Mars, Jupiter, Palmer) from `Refined Platinum Trainer Changelog.txt` with their complete teams, levels, held items, abilities, and 4-move movepools.

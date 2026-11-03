# Architectural & Data Decisions Log

This document records all design, architectural, and data decisions made during the construction of the Refined Platinum Dex.

---

## 1. Tech Stack & Framework Architecture
- **Framework**: Preact + TypeScript with Vite. Preact provides ultra-lightweight reactive components (~3.5 KB) ensuring our gzipped bundle stays far below the 150 KB limit while providing robust virtual list rendering, state management, and tab switching.
- **PWA Engine**: `vite-plugin-pwa` configured with Workbox to precache all static assets, fonts, JSON datasets, and Pokémon front/shiny sprites.
- **Persistence Layer**: `idb-keyval` (IndexedDB wrapper) with immediate asynchronous writes on tap, persistent storage requested via `navigator.storage.persist()`, and versioned schema with migration logic.

## 2. Gen 4 Vanilla Baseline Rules
- **Generation scope**: Exactly Pokémon #1 through #493.
- **No Fairy Type**: Reverted to Gen 4 typing using `pokemon_types_past.csv` (e.g. Clefairy is pure Normal, Gardevoir is pure Psychic, Togekiss is Normal/Flying, Snubbull is Normal, Azumarill is Water).
- **Gen 4 Moves & Physical/Special Split**: Applied `move_changelog.csv` to revert move power, accuracy, PP, and typing to Generation 4 standards. No Fairy moves exist.
- **Gen 4 Base Stats**: Reverted all Gen 6/7 stat buffs back to their Gen 4 authentic values (e.g. Pikachu Def=30, Butterfree SpA=80, Clefable SpA=85, Alakazam SpD=85, etc.).
- **Abilities**: Strictly restricted to Generation 4 abilities (slot 1 and 2 only, no Hidden Abilities). Gengar has Levitate.
- **Encounters & Learnsets**: Sourced from Platinum version and Platinum version group in PokéAPI data.

## 3. Refined Platinum Overrides & Discrepancies
- *Entries will be logged here as data is parsed and merged.*

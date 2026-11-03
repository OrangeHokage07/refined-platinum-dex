export interface BaseStats {
  hp: number;
  attack: number;
  defense: number;
  specialAttack: number;
  specialDefense: number;
  speed: number;
  bst: number;
}

export interface IndexPokemon {
  id: number;
  sinnohId: number | null;
  name: string;
  types: string[];
  sprite: string;
  shinySprite: string;
  baseStats: BaseStats;
  preE4: boolean;
  generation: number;
  stage: string;
}

export interface MoveDetail {
  name: string;
  type: string;
  category: 'Physical' | 'Special' | 'Status';
  power: number | null;
  accuracy: number | null;
  pp: number;
  description: string;
  level?: number;
  machine?: string;
}

export interface EvolutionStep {
  method: string;
  level?: number;
  item?: string;
  move?: string;
  target: string;
  notes?: string;
}

export interface WildEncounter {
  location: string;
  method: string;
  rate: number;
  minLevel?: number;
  maxLevel?: number;
  timeOfDay?: string;
  notes?: string;
  source: 'vanilla' | 'refined';
}

export interface LegendaryInfo {
  pokemon: string;
  level: number;
  location: string;
  npc?: string;
  requirement: string;
  stage: string;
  heldItem?: string;
  moves: string[];
  rematch?: {
    location: string;
    npc: string;
    requirement: string;
  };
}

export interface WildHeldItem {
  item: string;
  chance: number;
  notes?: string;
}

export interface PokemonDetail {
  id: number;
  sinnohId: number | null;
  name: string;
  genus: string;
  flavorText: string;
  types: string[];
  height: { meters: number; inches: number };
  weight: { kg: number; lbs: number };
  abilities: string[];
  trainerAbilityNote: string | null;
  catchRate: number;
  genderRatio: string;
  eggGroups: string[];
  baseStats: BaseStats;
  typeMatchups: { [type: string]: number };
  evolutions: EvolutionStep[];
  whereToFind: {
    encounters: WildEncounter[];
    legendary: LegendaryInfo | null;
  };
  heldItems: WildHeldItem[];
  moves: {
    trainer: {
      levelUp: MoveDetail[];
      tmHm: MoveDetail[];
      tutor: MoveDetail[];
    };
    base: {
      levelUp: MoveDetail[];
      tmHm: MoveDetail[];
      tutor: MoveDetail[];
    };
  };
}

export type PatchType = 'trainer' | 'base';

export type GameStage =
  | 'badge_0'
  | 'badge_1'
  | 'badge_2'
  | 'badge_3'
  | 'badge_4'
  | 'badge_5'
  | 'badge_6'
  | 'badge_7'
  | 'badge_8'
  | 'post_e4'
  | 'post_dex'
  | 'post_stark';

export interface UserProgress {
  schemaVersion: number;
  seen: { [id: number]: boolean };
  caught: { [id: number]: boolean };
  notes: { [id: number]: string };
  lastBackupDate: string;
  patch: PatchType;
  gameStage: GameStage;
}

export interface FilterOptions {
  query: string;
  type: string | null;
  status: 'all' | 'caught' | 'seen' | 'uncaught';
  preE4Only: boolean;
  obtainableNow: boolean;
  gen: number | null;
  orderMode: 'sinnoh' | 'national';
}

export interface BossPokemon {
  pokemon: string;
  level: number;
  item?: string;
  moves: string[];
}

export interface BossTrainer {
  name: string;
  title: string;
  location: string;
  stage: string;
  team: BossPokemon[];
}


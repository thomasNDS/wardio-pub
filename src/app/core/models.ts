// Raw shapes as served in curated.json (ids reference Data Dragon).

export type Role = 'top' | 'jungle' | 'mid' | 'bot' | 'support';
export const ROLES: Role[] = ['top', 'jungle', 'mid', 'bot', 'support'];
export const ROLE_LABEL: Record<Role, string> = {
  top: 'Top',
  jungle: 'Jungle',
  mid: 'Mid',
  bot: 'Bot',
  support: 'Support',
};

export interface TierRaw {
  champion: string;
  tier: string;
  win_rate?: number;
  wr_change?: number;
  pick_rate?: number;
  ban_rate?: number;
  matches?: number;
}

export interface CounterRaw {
  champion: string;
  win_rate: number;
}

export interface RunesRaw {
  primary_tree_id?: number;
  secondary_tree_id?: number;
  rune_ids?: number[];
  shard_ids?: number[];
}

// One build variant (Blitz-style, e.g. "AP" vs "Heal & Shield"), each with its
// own runes / spells / items / skill order and a win rate.
export interface BuildVariantRaw {
  name?: string;
  win_rate?: number;
  games?: number;
  runes?: RunesRaw;
  spell_ids?: number[];
  starting_item_ids?: number[];
  core_item_ids?: number[];
  situational_item_ids?: number[];
  skill_order?: string;
  skill_levels?: string;
}

export interface RecRaw {
  champion: string;
  role: Role;
  // Multiple named build variants (preferred). When absent, the top-level
  // fields below form a single unnamed build (backward compatible).
  builds?: BuildVariantRaw[];
  runes?: RunesRaw;
  spell_ids?: number[];
  starting_item_ids?: number[];
  core_item_ids?: number[];
  situational_item_ids?: number[];
  skill_order?: string;
  skill_levels?: string;
  counters?: CounterRaw[];
  // Average damage-to-champions split (percentages), from Riot match data.
  damage_share?: { physical?: number; magic?: number; true?: number };
  strengths?: string[];
  weaknesses?: string[];
  insights?: string[];
  similar?: string[];
  tips?: string[];
}

export interface DatasetRaw {
  format: number;
  patch: string;
  generated_at?: string;
  tiers?: Partial<Record<Role, TierRaw[]>>;
  recommendations?: RecRaw[];
}

// Resolved shapes for the UI (names/icons from Data Dragon).

export interface ChampRatings {
  attack: number;
  defense: number;
  magic: number;
  difficulty: number;
}

export interface ChampStats {
  hp: number;
  armor: number;
  mr: number;
  ad: number;
  as: number;
  ms: number;
  range: number;
}

export interface Champ {
  key: string;
  name: string;
  title: string;
  tags: string[];
  portrait: string;
  ratings: ChampRatings;
  stats: ChampStats;
}

export interface TierRow {
  rank: number;
  key: string;
  name: string;
  role: Role;
  portrait: string;
  tier: string;
  winRate?: number;
  wrChange?: number;
  pickRate?: number;
  banRate?: number;
  matches?: number;
}

export interface DuelRow {
  key: string;
  name: string;
  portrait: string;
  winRate: number;
  favourable: boolean;
}

export interface RuneRow {
  name: string;
  tree: string;
  keystone: boolean;
  icon: string;
}

export interface ItemRow {
  name: string;
  cost?: number;
  icon: string;
}

export interface SpellRow {
  name: string;
  icon: string;
}

export interface AbilityRow {
  slot: string; // P · Q · W · E · R
  name: string;
  description: string;
  cooldown: string; // "12/11/10/9/8" or ""
  icon: string;
}

// A resolved build variant for the UI.
export interface BuildVariant {
  name: string;
  winRate?: number;
  primaryTree: string;
  secondaryTree: string;
  runes: RuneRow[];
  spells: SpellRow[];
  starting: ItemRow[];
  core: ItemRow[];
  situational: ItemRow[];
  skillPriority: string[];
  skillLevels: string[];
}

// Win rate (and tier) for one position the champion is played in.
export interface RoleStat {
  role: Role;
  tier?: string;
  winRate?: number;
}

export interface Detail {
  champ: Champ;
  role: Role;
  roles: Role[];
  // Win rate at each position, for the position selector.
  roleStats: RoleStat[];
  tier?: string;
  winRate?: number;
  wrChange?: number;
  pickRate?: number;
  banRate?: number;
  matches?: number;
  // Build variants for the selected role, sorted by win rate (best first).
  variants: BuildVariant[];
  // Damage split (physical / magic / true, percentages summing ~100).
  damage?: { physical: number; magic: number; true: number };
  weak: DuelRow[]; // champions that counter this one (worst first)
  strong: DuelRow[]; // champions this one is strong against (best first)
  strengths: string[];
  weaknesses: string[];
  insights: string[];
  similar: Champ[];
  tips: string[];
}

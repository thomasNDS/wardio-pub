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

export interface RecRaw {
  champion: string;
  role: Role;
  runes?: RunesRaw;
  spell_ids?: number[];
  starting_item_ids?: number[];
  core_item_ids?: number[];
  situational_item_ids?: number[];
  skill_order?: string;
  skill_levels?: string;
  counters?: CounterRaw[];
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

export interface Champ {
  key: string;
  name: string;
  title: string;
  tags: string[];
  portrait: string;
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

export interface Detail {
  champ: Champ;
  role: Role;
  roles: Role[];
  tier?: string;
  winRate?: number;
  wrChange?: number;
  pickRate?: number;
  banRate?: number;
  matches?: number;
  primaryTree: string;
  secondaryTree: string;
  runes: RuneRow[];
  spells: SpellRow[];
  starting: ItemRow[];
  core: ItemRow[];
  situational: ItemRow[];
  skillPriority: string[];
  skillLevels: string[];
  duels: DuelRow[];
  strengths: string[];
  weaknesses: string[];
  insights: string[];
  similar: Champ[];
  tips: string[];
}

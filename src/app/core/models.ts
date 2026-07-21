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
  wr_change?: number; // format 1 spelling
  d_win_rate?: number; // format 2 spelling
  pick_rate?: number;
  ban_rate?: number;
  matches?: number;
}

export interface CounterRaw {
  champion: string;
  win_rate: number;
  games?: number;
}

export interface RunesRaw {
  primary_tree_id?: number;
  secondary_tree_id?: number;
  rune_ids?: number[];
  shard_ids?: number[];
}

// ---- format 1 (legacy) -----------------------------------------------------

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
  builds?: BuildVariantRaw[];
  runes?: RunesRaw;
  spell_ids?: number[];
  starting_item_ids?: number[];
  core_item_ids?: number[];
  situational_item_ids?: number[];
  skill_order?: string;
  skill_levels?: string;
  counters?: CounterRaw[];
  damage_share?: { physical?: number; magic?: number; true?: number };
  strengths?: string[];
  weaknesses?: string[];
  insights?: string[];
  similar?: string[];
  tips?: string[];
}

// ---- format 2 (consolidated contract, docs/BLITZ-PARITY.md §3) -------------

export interface ItemEntryRaw {
  id: number;
  win_rate?: number;
  games?: number;
}

export interface SpellComboRaw {
  spell_ids?: number[];
  win_rate?: number;
  games?: number;
}

export interface SkillsRaw {
  order?: string;
  levels?: string;
  win_rate?: number;
  games?: number;
}

export interface ItemsRaw {
  starting?: ItemEntryRaw[];
  boots?: ItemEntryRaw[];
  core?: ItemEntryRaw[];
  situational?: ItemEntryRaw[];
}

export interface VariantRaw {
  label?: string;
  keystone_id?: number;
  win_rate?: number;
  games?: number;
  runes?: RunesRaw;
  rune_alts?: unknown[];
  spells?: SpellComboRaw[];
  skills?: SkillsRaw;
  items?: ItemsRaw;
}

export interface CountersRaw {
  weak?: CounterRaw[];
  strong?: CounterRaw[];
}

export interface SynergyRaw {
  champion: string;
  role?: Role;
  win_rate?: number;
  games?: number;
}

// One consolidated build (per champion|role), everything the build page needs.
export interface BuildRaw {
  win_rate?: number;
  d_win_rate?: number;
  pick_rate?: number;
  ban_rate?: number;
  matches?: number;
  damage_share?: { physical?: number; magic?: number; true?: number };
  variants?: VariantRaw[];
  counters?: CountersRaw;
  synergies?: SynergyRaw[];
  pro_builds?: unknown[];
  strengths?: string[];
  weaknesses?: string[];
  insights?: string[];
  tips?: string[];
}

export interface SegmentRaw {
  id: string;
  queue?: string;
  rank?: string;
  region?: string;
}

// A game mode (ARAM…) carries its own tiers (role→rows, ARAM uses "all") + builds.
export interface ModeRaw {
  sample?: { matches?: number };
  tiers?: Record<string, TierRaw[]>;
  builds?: Record<string, BuildRaw>;
}

// Served in curated.json. `tiers`/`builds` are polymorphic across formats:
// format 1 → tiers is Role→rows and recommendations[] carries builds; format 2
// → tiers is segId→Role→rows and builds is segId→"champ|role"→build. The
// service normalizes both into one internal shape.
export interface DatasetRaw {
  format: number;
  patch: string;
  generated_at?: string;
  /** How much data is behind every figure — shown, not assumed. */
  sample?: { players?: number; matches?: number };
  segments?: SegmentRaw[];
  tiers?: Record<string, unknown>;
  recommendations?: RecRaw[];
  builds?: Record<string, Record<string, BuildRaw>>;
  modes?: Record<string, ModeRaw>;
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

// A best-duo partner (same team), with the pair's win rate.
export interface SynergyRow {
  key: string;
  name: string;
  portrait: string;
  role: Role;
  winRate: number;
  games?: number;
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
  synergies: SynergyRow[]; // best same-team partners (best win rate first)
  strengths: string[];
  weaknesses: string[];
  insights: string[];
  similar: Champ[];
  tips: string[];
}

import { Injectable, signal } from '@angular/core';
import {
  AbilityRow,
  BuildVariant,
  Champ,
  DatasetRaw,
  Detail,
  DuelRow,
  ItemRow,
  Role,
  RoleStat,
  ROLES,
  ROLE_LABEL,
  RuneRow,
  SpellRow,
  TierRow,
} from './models';

const DDRAGON = 'https://ddragon.leagueoflegends.com';

interface RuneMeta {
  name: string;
  icon: string;
  treeId: number;
}

@Injectable({ providedIn: 'root' })
export class DataService {
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly patch = signal('');

  private dataset: DatasetRaw | null = null;
  private version = '';
  private locale = 'en_US';
  private ddLoaded = false;
  private readonly champByKey = new Map<string, Champ>();
  private readonly itemById = new Map<number, ItemRow>();
  private readonly spellById = new Map<number, SpellRow>();
  private readonly runeById = new Map<number, RuneMeta>();
  private readonly treeById = new Map<number, string>();
  private readonly keystoneIds = new Set<number>();
  private started = false;

  private localeFor(lang: string): string {
    return (
      { en: 'en_US', fr: 'fr_FR', es: 'es_ES' }[lang] ?? 'en_US'
    );
  }

  /** Switch the Data Dragon locale; re-fetches and re-resolves once loaded so
   * champion titles, item / rune / spell names and ability text follow the UI
   * language. Toggling `loading` makes the components' computeds re-run. */
  setActiveLang(lang: string): void {
    const loc = this.localeFor(lang);
    if (loc === this.locale) return;
    this.locale = loc;
    if (this.ddLoaded) {
      this.loading.set(true);
      void this.loadDdragon().finally(() => this.loading.set(false));
    }
  }

  async load(): Promise<void> {
    if (this.started) return;
    this.started = true;
    try {
      const dsUrl = new URL('curated.json', document.baseURI).toString();
      const [ds, versions] = await Promise.all([
        this.json<DatasetRaw>(dsUrl),
        this.json<string[]>(`${DDRAGON}/api/versions.json`),
      ]);
      this.dataset = ds;
      this.version = versions[0];
      await this.loadDdragon();
      this.patch.set(ds.patch || this.version);
      this.ddLoaded = true;
    } catch (e: unknown) {
      this.error.set(e instanceof Error ? e.message : 'failed to load data');
    } finally {
      this.loading.set(false);
    }
  }

  private async loadDdragon(): Promise<void> {
    const cdn = `${DDRAGON}/cdn/${this.version}`;
    const loc = this.locale;
    const [champs, items, summoners, runes] = await Promise.all([
      this.json<any>(`${cdn}/data/${loc}/champion.json`),
      this.json<any>(`${cdn}/data/${loc}/item.json`),
      this.json<any>(`${cdn}/data/${loc}/summoner.json`),
      this.json<any[]>(`${cdn}/data/${loc}/runesReforged.json`),
    ]);
    this.champByKey.clear();
    this.itemById.clear();
    this.spellById.clear();
    this.runeById.clear();
    this.treeById.clear();
    this.keystoneIds.clear();
    this.abilitiesCache.clear();

    for (const c of Object.values<any>(champs.data)) {
        const s = c.stats ?? {};
        this.champByKey.set(c.id, {
          key: c.id,
          name: c.name,
          title: c.title ?? '',
          tags: c.tags ?? [],
          portrait: `${cdn}/img/champion/${c.image.full}`,
          ratings: {
            attack: c.info?.attack ?? 0,
            defense: c.info?.defense ?? 0,
            magic: c.info?.magic ?? 0,
            difficulty: c.info?.difficulty ?? 0,
          },
          stats: {
            hp: s.hp ?? 0,
            armor: s.armor ?? 0,
            mr: s.spellblock ?? 0,
            ad: s.attackdamage ?? 0,
            as: s.attackspeed ?? 0,
            ms: s.movespeed ?? 0,
            range: s.attackrange ?? 0,
          },
        });
      }
      for (const [id, it] of Object.entries<any>(items.data)) {
        this.itemById.set(Number(id), {
          name: it.name,
          cost: it.gold?.total,
          icon: `${cdn}/img/item/${id}.png`,
        });
      }
      for (const s of Object.values<any>(summoners.data)) {
        this.spellById.set(Number(s.key), {
          name: s.name,
          icon: `${cdn}/img/spell/${s.image.full}`,
        });
      }
    for (const tree of runes) {
      this.treeById.set(tree.id, tree.name);
      tree.slots.forEach((slot: any, si: number) => {
        for (const rune of slot.runes) {
          this.runeById.set(rune.id, {
            name: rune.name,
            icon: `${DDRAGON}/cdn/img/${rune.icon}`,
            treeId: tree.id,
          });
          if (si === 0) this.keystoneIds.add(rune.id);
        }
      });
    }
  }

  private async json<T>(url: string): Promise<T> {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`${res.status} for ${url}`);
    return (await res.json()) as T;
  }

  private name(key: string): string {
    return this.champByKey.get(key)?.name ?? key;
  }
  private portrait(key: string): string {
    return this.champByKey.get(key)?.portrait ?? '';
  }

  champions(): Champ[] {
    return [...this.champByKey.values()].sort((a, b) =>
      a.name.localeCompare(b.name),
    );
  }

  /** Tier rows for a role (curated order = rank), or every role when null. */
  tierList(role: Role | null): TierRow[] {
    const tiers = this.dataset?.tiers ?? {};
    const rows: TierRow[] = [];
    const roles = role ? [role] : ROLES;
    for (const r of roles) {
      (tiers[r] ?? []).forEach((t, i) => {
        rows.push({
          rank: i + 1,
          key: t.champion,
          name: this.name(t.champion),
          role: r,
          portrait: this.portrait(t.champion),
          tier: t.tier,
          winRate: t.win_rate,
          wrChange: t.wr_change,
          pickRate: t.pick_rate,
          banRate: t.ban_rate,
          matches: t.matches,
        });
      });
    }
    return rows;
  }

  detail(key: string, role?: Role): Detail | null {
    if (!this.dataset) return null;
    const recs = this.dataset.recommendations ?? [];
    const tiers = this.dataset.tiers ?? {};
    const rolesPlayed = ROLES.filter((r) =>
      (tiers[r] ?? []).some((t) => eqKey(t.champion, key)),
    );
    const wanted = role ?? rolesPlayed[0];
    const rec =
      recs.find((r) => eqKey(r.champion, key) && r.role === wanted) ??
      recs.find((r) => eqKey(r.champion, key));
    const champ =
      this.champByKey.get(key) ??
      [...this.champByKey.values()].find((c) => eqKey(c.key, key));
    if (!champ) return null;
    const activeRole = rec?.role ?? wanted ?? rolesPlayed[0] ?? 'mid';
    const tierRow = (tiers[activeRole] ?? []).find((t) => eqKey(t.champion, key));

    // --- Build variants (Blitz-style, sorted by win rate best-first) ---------
    const items = (ids?: number[]): ItemRow[] =>
      (ids ?? [])
        .map((id) => this.itemById.get(id))
        .filter((it): it is ItemRow => !!it);
    const spellsOf = (ids?: number[]): SpellRow[] =>
      (ids ?? [])
        .map((id) => this.spellById.get(id))
        .filter((s): s is SpellRow => !!s);
    const runesOf = (rn?: RecRaw['runes']): RuneRow[] =>
      (rn?.rune_ids ?? [])
        .map((id) => {
          const m = this.runeById.get(id);
          if (!m) return null;
          return {
            name: m.name,
            tree: this.treeById.get(m.treeId) ?? '',
            keystone: this.keystoneIds.has(id),
            icon: m.icon,
          } as RuneRow;
        })
        .filter((r): r is RuneRow => !!r);
    const resolveBuild = (b: any, i: number): BuildVariant => ({
      name: b.name || (i === 0 ? 'Build' : `Build ${i + 1}`),
      winRate: b.win_rate,
      primaryTree: this.treeById.get(b.runes?.primary_tree_id ?? -1) ?? '',
      secondaryTree: this.treeById.get(b.runes?.secondary_tree_id ?? -1) ?? '',
      runes: runesOf(b.runes),
      spells: spellsOf(b.spell_ids),
      starting: items(b.starting_item_ids),
      core: items(b.core_item_ids),
      situational: items(b.situational_item_ids),
      skillPriority: (b.skill_order ?? '').split(''),
      skillLevels: (b.skill_levels
        ? b.skill_levels
        : deriveSkillLevels(b.skill_order ?? '')
      ).split(''),
    });
    const rawBuilds = rec?.builds?.length
      ? rec.builds
      : rec
        ? [
            {
              runes: rec.runes,
              spell_ids: rec.spell_ids,
              starting_item_ids: rec.starting_item_ids,
              core_item_ids: rec.core_item_ids,
              situational_item_ids: rec.situational_item_ids,
              skill_order: rec.skill_order,
              skill_levels: rec.skill_levels,
            },
          ]
        : [];
    const variants = rawBuilds
      .map((b, i) => resolveBuild(b, i))
      .sort((a, b) => (b.winRate ?? 0) - (a.winRate ?? 0))
      .slice(0, 3);

    // --- Matchups: counters (weak) + strong-against (inverted) ---------------
    const weak: DuelRow[] = (rec?.counters ?? [])
      .map((c) => ({
        key: c.champion,
        name: this.name(c.champion),
        portrait: this.portrait(c.champion),
        winRate: c.win_rate,
        favourable: c.win_rate >= 50,
      }))
      .sort((a, b) => a.winRate - b.winRate);
    const seen = new Set(weak.map((d) => d.key.toLowerCase()));
    const strong: DuelRow[] = [];
    for (const other of recs) {
      const c = (other.counters ?? []).find((x) => eqKey(x.champion, key));
      if (c && !seen.has(other.champion.toLowerCase())) {
        seen.add(other.champion.toLowerCase());
        strong.push({
          key: other.champion,
          name: this.name(other.champion),
          portrait: this.portrait(other.champion),
          winRate: 100 - c.win_rate,
          favourable: 100 - c.win_rate >= 50,
        });
      }
    }
    strong.sort((a, b) => b.winRate - a.winRate);

    const similar: Champ[] =
      rec?.similar && rec.similar.length
        ? rec.similar
            .map((k) => this.champByKey.get(k))
            .filter((c): c is Champ => !!c)
        : this.similarByTags(champ);

    // Win rate at each position the champion is played.
    const roleStats: RoleStat[] = rolesPlayed.map((r) => {
      const tr = (tiers[r] ?? []).find((t) => eqKey(t.champion, key));
      return { role: r, tier: tr?.tier, winRate: tr?.win_rate };
    });

    return {
      champ,
      role: activeRole,
      roles: rolesPlayed.length ? rolesPlayed : [activeRole],
      roleStats: roleStats.length
        ? roleStats
        : [{ role: activeRole, tier: tierRow?.tier, winRate: tierRow?.win_rate }],
      tier: tierRow?.tier,
      winRate: tierRow?.win_rate,
      wrChange: tierRow?.wr_change,
      pickRate: tierRow?.pick_rate,
      banRate: tierRow?.ban_rate,
      matches: tierRow?.matches,
      variants,
      damage: rec?.damage_share
        ? {
            physical: rec.damage_share.physical ?? 0,
            magic: rec.damage_share.magic ?? 0,
            true: rec.damage_share.true ?? 0,
          }
        : undefined,
      weak,
      strong,
      strengths: rec?.strengths ?? [],
      weaknesses: rec?.weaknesses ?? [],
      insights: rec?.insights ?? [],
      similar,
      tips: rec?.tips ?? [],
    };
  }

  roleLabel(r: Role): string {
    return ROLE_LABEL[r];
  }

  private readonly abilitiesCache = new Map<string, AbilityRow[]>();

  /** Per-champion abilities (passive + Q/W/E/R) from the full Data Dragon
   * champion file, cached. Empty on any failure. */
  async abilities(key: string): Promise<AbilityRow[]> {
    if (!this.version) return [];
    const champ =
      this.champByKey.get(key) ??
      [...this.champByKey.values()].find((c) => eqKey(c.key, key));
    const realKey = champ?.key ?? key;
    const cached = this.abilitiesCache.get(realKey);
    if (cached) return cached;
    try {
      const cdn = `${DDRAGON}/cdn/${this.version}`;
      const doc = await this.json<any>(
        `${cdn}/data/${this.locale}/champion/${realKey}.json`,
      );
      const c = doc.data[realKey];
      const strip = (s: string): string =>
        (s ?? '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
      const rows: AbilityRow[] = [];
      if (c.passive)
        rows.push({
          slot: 'P',
          name: c.passive.name,
          description: strip(c.passive.description),
          cooldown: '',
          icon: `${cdn}/img/passive/${c.passive.image.full}`,
        });
      const slots = ['Q', 'W', 'E', 'R'];
      (c.spells ?? []).forEach((sp: any, i: number) =>
        rows.push({
          slot: slots[i] ?? '',
          name: sp.name,
          description: strip(sp.description),
          cooldown: sp.cooldownBurn ?? '',
          icon: `${cdn}/img/spell/${sp.image.full}`,
        }),
      );
      this.abilitiesCache.set(realKey, rows);
      return rows;
    } catch {
      return [];
    }
  }

  private similarByTags(champ: Champ): Champ[] {
    if (!champ.tags.length) return [];
    return [...this.champByKey.values()]
      .filter((c) => c.key !== champ.key)
      .map((c) => ({
        c,
        shared: c.tags.filter((t) => champ.tags.includes(t)).length,
      }))
      .filter((x) => x.shared > 0)
      .sort((a, b) => b.shared - a.shared || a.c.name.localeCompare(b.c.name))
      .slice(0, 5)
      .map((x) => x.c);
  }
}

function eqKey(a: string, b: string): boolean {
  return a.toLowerCase() === b.toLowerCase();
}

/** Canonical 18-level order from a priority string (e.g. "QEW"). */
export function deriveSkillLevels(priority: string): string {
  const basics = priority.split('').filter((c) => 'QWE'.includes(c));
  if (!basics.length) return '';
  const alloc: string[] = [...basics];
  for (const b of basics) for (let i = 0; i < 4; i++) alloc.push(b);
  let n = 0;
  const out: string[] = [];
  for (let level = 1; level <= 18; level++) {
    if (level === 6 || level === 11 || level === 16) out.push('R');
    else out.push(alloc[n++] ?? basics[0]);
  }
  return out.join('');
}

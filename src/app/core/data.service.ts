import { Injectable, signal } from '@angular/core';
import {
  AbilityRow,
  BuildRaw,
  BuildVariant,
  Champ,
  CounterRaw,
  DatasetRaw,
  Detail,
  DuelRow,
  ItemRow,
  RecRaw,
  Role,
  RoleStat,
  ROLES,
  ROLE_LABEL,
  RuneRow,
  SpellRow,
  TierRaw,
  TierRow,
  VariantRaw,
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
  /** Normalized (format-agnostic) views built on load: format 1 and the
   * consolidated format 2 both flatten into these. */
  private tiersByRole: Partial<Record<Role, TierRaw[]>> = {};
  private readonly buildByKey = new Map<string, BuildRaw>(); // "champLower|role"
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
      this.normalize(ds);
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

  private firstSegment<T>(map?: Record<string, T>): T | undefined {
    if (!map) return undefined;
    return map['default'] ?? Object.values(map)[0];
  }

  /** Flatten format 1 or the consolidated format 2 into `tiersByRole` +
   * `buildByKey`, so the rest of the service is format-agnostic. */
  private normalize(ds: DatasetRaw): void {
    this.tiersByRole = {};
    this.buildByKey.clear();
    if ((ds.format ?? 1) >= 2) {
      const tseg =
        this.firstSegment<Partial<Record<Role, TierRaw[]>>>(
          ds.tiers as Record<string, Partial<Record<Role, TierRaw[]>>> | undefined,
        ) ?? {};
      for (const r of ROLES) this.tiersByRole[r] = tseg[r] ?? [];
      const bseg = this.firstSegment<Record<string, BuildRaw>>(ds.builds) ?? {};
      for (const [k, b] of Object.entries(bseg)) {
        const [champ, role] = k.split('|');
        if (champ && role) this.buildByKey.set(`${champ.toLowerCase()}|${role}`, b);
      }
    } else {
      const tiers = (ds.tiers ?? {}) as Partial<Record<Role, TierRaw[]>>;
      for (const r of ROLES) this.tiersByRole[r] = tiers[r] ?? [];
      for (const rec of ds.recommendations ?? [])
        this.buildByKey.set(`${rec.champion.toLowerCase()}|${rec.role}`, this.recToBuild(rec));
    }
  }

  /** Adapt a legacy format-1 recommendation into the format-2 build shape. */
  private recToBuild(rec: RecRaw): BuildRaw {
    const asVariant = (b: {
      name?: string;
      win_rate?: number;
      runes?: RecRaw['runes'];
      spell_ids?: number[];
      starting_item_ids?: number[];
      core_item_ids?: number[];
      situational_item_ids?: number[];
      skill_order?: string;
      skill_levels?: string;
    }): VariantRaw => ({
      label: b.name,
      win_rate: b.win_rate,
      keystone_id: b.runes?.rune_ids?.[0],
      runes: b.runes,
      spells: b.spell_ids ? [{ spell_ids: b.spell_ids }] : [],
      skills: { order: b.skill_order, levels: b.skill_levels },
      items: {
        starting: (b.starting_item_ids ?? []).map((id) => ({ id })),
        core: (b.core_item_ids ?? []).map((id) => ({ id })),
        situational: (b.situational_item_ids ?? []).map((id) => ({ id })),
      },
    });
    const variants = rec.builds?.length ? rec.builds.map(asVariant) : [asVariant(rec)];
    const counters = rec.counters ?? [];
    return {
      damage_share: rec.damage_share,
      variants,
      counters: {
        weak: [...counters].sort((a, b) => a.win_rate - b.win_rate),
        strong: [...counters].filter((c) => c.win_rate >= 50).sort((a, b) => b.win_rate - a.win_rate),
      },
      strengths: rec.strengths,
      weaknesses: rec.weaknesses,
      insights: rec.insights,
      tips: rec.tips,
    };
  }

  /** Tier rows for a role (rank order = list order), or every role when null. */
  tierList(role: Role | null): TierRow[] {
    const rows: TierRow[] = [];
    const roles = role ? [role] : ROLES;
    for (const r of roles) {
      (this.tiersByRole[r] ?? []).forEach((t, i) => {
        rows.push({
          rank: i + 1,
          key: t.champion,
          name: this.name(t.champion),
          role: r,
          portrait: this.portrait(t.champion),
          tier: t.tier,
          winRate: t.win_rate,
          wrChange: t.d_win_rate ?? t.wr_change,
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
    const keyL = key.toLowerCase();
    const rolesPlayed = ROLES.filter((r) =>
      (this.tiersByRole[r] ?? []).some((t) => eqKey(t.champion, key)),
    );
    const wanted = role ?? rolesPlayed[0];
    const build =
      this.buildByKey.get(`${keyL}|${wanted}`) ??
      rolesPlayed.map((r) => this.buildByKey.get(`${keyL}|${r}`)).find(Boolean);
    const champ =
      this.champByKey.get(key) ??
      [...this.champByKey.values()].find((c) => eqKey(c.key, key));
    if (!champ) return null;
    const activeRole = wanted ?? rolesPlayed[0] ?? 'mid';
    const tierRow = (this.tiersByRole[activeRole] ?? []).find((t) => eqKey(t.champion, key));

    // --- Build variants (win-rate-sorted, best first) ------------------------
    const items = (ids?: number[]): ItemRow[] =>
      (ids ?? [])
        .map((id) => this.itemById.get(id))
        .filter((it): it is ItemRow => !!it);
    const spellsOf = (ids?: number[]): SpellRow[] =>
      (ids ?? [])
        .map((id) => this.spellById.get(id))
        .filter((s): s is SpellRow => !!s);
    const runesOf = (rn?: {
      rune_ids?: number[];
    }): RuneRow[] =>
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
    const resolveVariant = (v: VariantRaw, i: number): BuildVariant => {
      const order = v.skills?.order ?? '';
      return {
        name: v.label || (i === 0 ? 'Build' : `Build ${i + 1}`),
        winRate: v.win_rate,
        primaryTree: this.treeById.get(v.runes?.primary_tree_id ?? -1) ?? '',
        secondaryTree: this.treeById.get(v.runes?.secondary_tree_id ?? -1) ?? '',
        runes: runesOf(v.runes),
        spells: spellsOf(v.spells?.[0]?.spell_ids),
        starting: items(v.items?.starting?.map((e) => e.id)),
        core: items(v.items?.core?.map((e) => e.id)),
        situational: items(v.items?.situational?.map((e) => e.id)),
        skillPriority: order.split(''),
        skillLevels: (v.skills?.levels ? v.skills.levels : deriveSkillLevels(order)).split(''),
      };
    };
    const variants = (build?.variants ?? [])
      .map(resolveVariant)
      .sort((a, b) => (b.winRate ?? 0) - (a.winRate ?? 0))
      .slice(0, 3);

    // --- Matchups: weak (counters) + strong-against, both from the build -----
    const toDuel = (c: CounterRaw): DuelRow => ({
      key: c.champion,
      name: this.name(c.champion),
      portrait: this.portrait(c.champion),
      winRate: c.win_rate,
      favourable: c.win_rate >= 50,
    });
    const weak = (build?.counters?.weak ?? []).map(toDuel).sort((a, b) => a.winRate - b.winRate);
    const strong = (build?.counters?.strong ?? []).map(toDuel).sort((a, b) => b.winRate - a.winRate);

    const similar = this.similarByTags(champ);

    // Win rate at each position the champion is played.
    const roleStats: RoleStat[] = rolesPlayed.map((r) => {
      const tr = (this.tiersByRole[r] ?? []).find((t) => eqKey(t.champion, key));
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
      wrChange: tierRow?.d_win_rate ?? tierRow?.wr_change,
      pickRate: tierRow?.pick_rate,
      banRate: tierRow?.ban_rate,
      matches: tierRow?.matches,
      variants,
      damage: build?.damage_share
        ? {
            physical: build.damage_share.physical ?? 0,
            magic: build.damage_share.magic ?? 0,
            true: build.damage_share.true ?? 0,
          }
        : undefined,
      weak,
      strong,
      strengths: build?.strengths ?? [],
      weaknesses: build?.weaknesses ?? [],
      insights: build?.insights ?? [],
      similar,
      tips: build?.tips ?? [],
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

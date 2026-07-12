import { Injectable, signal } from '@angular/core';
import {
  Champ,
  DatasetRaw,
  Detail,
  DuelRow,
  ItemRow,
  Role,
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
  private readonly champByKey = new Map<string, Champ>();
  private readonly itemById = new Map<number, ItemRow>();
  private readonly spellById = new Map<number, SpellRow>();
  private readonly runeById = new Map<number, RuneMeta>();
  private readonly treeById = new Map<number, string>();
  private readonly keystoneIds = new Set<number>();
  private started = false;

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
      const cdn = `${DDRAGON}/cdn/${this.version}`;

      const [champs, items, summoners, runes] = await Promise.all([
        this.json<any>(`${cdn}/data/en_US/champion.json`),
        this.json<any>(`${cdn}/data/en_US/item.json`),
        this.json<any>(`${cdn}/data/en_US/summoner.json`),
        this.json<any[]>(`${cdn}/data/en_US/runesReforged.json`),
      ]);

      for (const c of Object.values<any>(champs.data)) {
        this.champByKey.set(c.id, {
          key: c.id,
          name: c.name,
          title: c.title ?? '',
          tags: c.tags ?? [],
          portrait: `${cdn}/img/champion/${c.image.full}`,
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
      this.patch.set(ds.patch || this.version);
    } catch (e: unknown) {
      this.error.set(e instanceof Error ? e.message : 'failed to load data');
    } finally {
      this.loading.set(false);
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

    const runes: RuneRow[] = (rec?.runes?.rune_ids ?? [])
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

    const spells: SpellRow[] = (rec?.spell_ids ?? [])
      .map((id) => this.spellById.get(id))
      .filter((s): s is SpellRow => !!s);
    const items = (ids?: number[]): ItemRow[] =>
      (ids ?? [])
        .map((id) => this.itemById.get(id))
        .filter((it): it is ItemRow => !!it);

    const skillPriority = (rec?.skill_order ?? '').split('');
    const skillLevels = (rec?.skill_levels
      ? rec.skill_levels
      : deriveSkillLevels(rec?.skill_order ?? '')
    ).split('');

    // Counters (worst first) + inverted favourable matchups from other recs.
    const weak: DuelRow[] = (rec?.counters ?? []).map((c) => ({
      key: c.champion,
      name: this.name(c.champion),
      portrait: this.portrait(c.champion),
      winRate: c.win_rate,
      favourable: c.win_rate >= 50,
    }));
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
    const duels = [...weak, ...strong].sort((a, b) => a.winRate - b.winRate);

    const similar: Champ[] =
      rec?.similar && rec.similar.length
        ? rec.similar
            .map((k) => this.champByKey.get(k))
            .filter((c): c is Champ => !!c)
        : this.similarByTags(champ);

    return {
      champ,
      role: activeRole,
      roles: rolesPlayed.length ? rolesPlayed : [activeRole],
      tier: tierRow?.tier,
      winRate: tierRow?.win_rate,
      wrChange: tierRow?.wr_change,
      pickRate: tierRow?.pick_rate,
      banRate: tierRow?.ban_rate,
      matches: tierRow?.matches,
      primaryTree: this.treeById.get(rec?.runes?.primary_tree_id ?? -1) ?? '',
      secondaryTree:
        this.treeById.get(rec?.runes?.secondary_tree_id ?? -1) ?? '',
      runes,
      spells,
      starting: items(rec?.starting_item_ids),
      core: items(rec?.core_item_ids),
      situational: items(rec?.situational_item_ids),
      skillPriority,
      skillLevels,
      duels,
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

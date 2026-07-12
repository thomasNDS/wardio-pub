import {
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { Meta, Title } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { DataService } from '../../core/data.service';
import { AbilityRow, DuelRow, Role, ROLE_LABEL } from '../../core/models';

@Component({
  selector: 'app-champion-detail',
  imports: [RouterLink, NgTemplateOutlet, TranslocoPipe],
  template: `
    <a
      routerLink="/champions"
      class="inline-flex items-center gap-1.5 text-sm font-semibold text-gold hover:underline"
      >← {{ 'detail.back' | transloco }}</a
    >

    @if (data.loading()) {
      <p class="mt-10 text-center text-dim">{{ 'detail.loading' | transloco }}</p>
    } @else if (detail(); as d) {
      <!-- Header -->
      <div class="mt-4 flex items-center gap-4 hex-panel p-4">
        <img [src]="d.champ.portrait" alt="" class="h-16 w-16 rounded-lg border border-gold" />
        <div>
          <h1 class="text-2xl font-extrabold">{{ d.champ.name }}</h1>
          @if (d.champ.title) { <p class="text-sm text-dim">{{ d.champ.title }}</p> }
        </div>
        <div class="ml-auto flex flex-wrap gap-1.5">
          @for (t of d.champ.tags; track t) {
            <span class="rounded-full border border-cyan/40 bg-cyan/10 px-2.5 py-0.5 text-[11px] font-semibold text-cyan">{{ t }}</span>
          }
        </div>
      </div>

      <!-- Positions: win rate at each role; selecting one drives the build. -->
      @if (d.roleStats.length > 1) {
        <div class="mt-3 flex flex-wrap items-center gap-2">
          <span class="text-[11px] font-semibold uppercase tracking-wide text-dim">{{ 'detail.positions' | transloco }}</span>
          @for (rs of d.roleStats; track rs.role) {
            <button type="button" (click)="setRole(rs.role)" [class]="chip(rs.role === d.role)">
              {{ label(rs.role) }}
              @if (rs.winRate != null) { <span class="ml-1 text-cyan">{{ pct(rs.winRate) }}</span> }
            </button>
          }
        </div>
      }

      <!-- Stat strip for the selected role -->
      @if (d.winRate != null) {
        <div class="mt-4 grid grid-cols-3 gap-y-3 hex-panel p-4 sm:grid-cols-6">
          <div class="text-center"><div class="lbl">{{ 'cols.tier' | transloco }}</div><div class="text-lg font-extrabold text-gold">{{ d.tier ?? '—' }}</div></div>
          <div class="text-center"><div class="lbl">{{ 'cols.win' | transloco }}</div><div class="text-lg font-extrabold text-cyan">{{ pct(d.winRate) }}</div></div>
          <div class="text-center"><div class="lbl">{{ 'cols.wr' | transloco }}</div><div class="text-lg font-extrabold" [class]="deltaClass(d.wrChange)">{{ delta(d.wrChange) }}</div></div>
          <div class="text-center"><div class="lbl">{{ 'cols.pick' | transloco }}</div><div class="text-lg font-extrabold">{{ pct(d.pickRate) }}</div></div>
          <div class="text-center"><div class="lbl">{{ 'cols.ban' | transloco }}</div><div class="text-lg font-extrabold">{{ pct(d.banRate) }}</div></div>
          <div class="text-center"><div class="lbl">{{ 'cols.matches' | transloco }}</div><div class="text-lg font-extrabold">{{ matches(d.matches) }}</div></div>
        </div>
      }

      <div class="mt-4 grid gap-4 lg:grid-cols-[3fr_2fr]">
        <!-- Left: build (per selected variant) -->
        <div class="flex flex-col gap-4">
          <!-- Build variants, sorted by win rate -->
          @if (d.variants.length > 1) {
            <div class="flex flex-wrap items-center gap-2">
              <span class="text-[11px] font-semibold uppercase tracking-wide text-dim">{{ 'detail.builds' | transloco }}</span>
              @for (v of d.variants; track $index) {
                <button type="button" (click)="setVariant($index)" [class]="chip($index === variantIndex())">
                  {{ v.name }}
                  @if (v.winRate != null) { <span class="ml-1 text-cyan">{{ pct(v.winRate) }}</span> }
                </button>
              }
            </div>
          }

          @if (variant(); as v) {
            @if (v.runes.length) {
              <section class="hex-panel p-4">
                <h2 class="section-title">{{ 'detail.runes' | transloco }} · {{ v.primaryTree }} / {{ v.secondaryTree }}</h2>
                <div class="mt-2 flex flex-col gap-1.5">
                  @for (r of v.runes; track $index) {
                    <div class="flex items-center gap-2.5">
                      <img [src]="r.icon" alt="" class="h-6 w-6 rounded-full bg-black/30" />
                      <span [class.font-bold]="r.keystone">{{ r.name }}</span>
                      <span class="ml-auto text-[11px] text-dim">{{ r.tree }}</span>
                    </div>
                  }
                </div>
              </section>
            }

            @if (v.spells.length) {
              <section class="hex-panel p-4">
                <h2 class="section-title">{{ 'detail.spells' | transloco }}</h2>
                <div class="mt-2 flex gap-2.5">
                  @for (s of v.spells; track s.name) {
                    <div class="flex items-center gap-2 rounded-hex border border-cyan/30 bg-cyan/10 px-2 py-1.5">
                      <img [src]="s.icon" alt="" class="h-6 w-6 rounded" />
                      <span class="text-xs font-semibold">{{ s.name }}</span>
                    </div>
                  }
                </div>
              </section>
            }

            @if (v.skillPriority.length || v.skillLevels.length) {
              <section class="hex-panel p-4">
                <h2 class="section-title">{{ 'detail.skillOrder' | transloco }}</h2>
                @if (v.skillPriority.length) {
                  <div class="mt-2 flex items-center gap-2">
                    @for (s of v.skillPriority; track $index) {
                      @if ($index > 0) { <span class="text-dim">→</span> }
                      <span [class]="skillBadge($index === 0)">{{ s }}</span>
                    }
                  </div>
                }
                @if (v.skillLevels.length) {
                  <div class="mt-3 flex flex-wrap gap-1">
                    @for (s of v.skillLevels; track $index) {
                      <div [class]="levelCell(s === 'R')">
                        <div class="text-[13px] font-black leading-none" [class.text-gold]="s === 'R'">{{ s }}</div>
                        <div class="text-[9px] text-dim">{{ $index + 1 }}</div>
                      </div>
                    }
                  </div>
                }
              </section>
            }

            @if (v.starting.length || v.core.length) {
              <section class="hex-panel p-4">
                <h2 class="section-title">{{ 'detail.buildOrder' | transloco }}</h2>
                @if (v.starting.length) {
                  <p class="mt-2 text-[11px] text-dim">{{ 'detail.starting' | transloco }}</p>
                  <div class="mt-1 flex flex-wrap gap-2">
                    @for (it of v.starting; track $index) { <ng-container [ngTemplateOutlet]="itemPill" [ngTemplateOutletContext]="{ $implicit: it }" /> }
                  </div>
                }
                @if (v.core.length) {
                  <p class="mt-3 text-[11px] text-dim">{{ 'detail.core' | transloco }}</p>
                  <div class="mt-1 flex flex-wrap items-center gap-2">
                    @for (it of v.core; track $index) {
                      @if ($index > 0) { <span class="text-dim">→</span> }
                      <ng-container [ngTemplateOutlet]="itemPill" [ngTemplateOutletContext]="{ $implicit: it }" />
                    }
                  </div>
                }
                @if (v.situational.length) {
                  <p class="mt-3 text-[11px] text-dim">{{ 'detail.situational' | transloco }}</p>
                  <div class="mt-1 flex flex-wrap gap-2">
                    @for (it of v.situational; track $index) { <ng-container [ngTemplateOutlet]="itemPill" [ngTemplateOutletContext]="{ $implicit: it }" /> }
                  </div>
                }
              </section>
            }
          }

          @if (abilities().length) {
            <section class="hex-panel p-4">
              <h2 class="section-title">{{ 'detail.abilities' | transloco }}</h2>
              <div class="mt-2 flex flex-wrap gap-2">
                @for (a of abilities(); track $index) {
                  <div
                    class="relative h-12 w-12 rounded-md border"
                    [class]="abilityHovered() === $index ? 'border-cyan' : 'border-line'"
                    (mouseenter)="abilityHovered.set($index)"
                    (mouseleave)="abilityHovered.set(-1)"
                  >
                    <img [src]="a.icon" alt="" class="h-full w-full rounded-md" />
                    <span class="absolute -bottom-1 -left-1 grid h-4 w-4 place-items-center rounded border border-gold/60 bg-bg text-[9px] font-black text-gold">{{ a.slot }}</span>
                  </div>
                }
              </div>
              @if (abilityHovered() >= 0 && abilityHovered() < abilities().length) {
                <div class="mt-3 rounded-hex border border-line bg-card p-3">
                  <div class="flex items-center gap-2">
                    <span class="font-bold">{{ abilities()[abilityHovered()].slot }} · {{ abilities()[abilityHovered()].name }}</span>
                    @if (abilities()[abilityHovered()].cooldown) {
                      <span class="ml-auto text-xs font-semibold text-cyan">CD {{ abilities()[abilityHovered()].cooldown }}</span>
                    }
                  </div>
                  <p class="mt-1 text-xs text-dim">{{ abilities()[abilityHovered()].description }}</p>
                </div>
              } @else {
                <p class="mt-2 text-[11px] text-dim">{{ 'detail.hoverAbility' | transloco }}</p>
              }
            </section>
          }

          @if (d.damage; as dmg) {
            <section class="hex-panel p-4">
              <h2 class="section-title">{{ 'detail.damage' | transloco }}</h2>
              <div class="mt-2 flex h-3 overflow-hidden rounded-full bg-card">
                <div class="bg-neg" [style.width.%]="dmg.physical"></div>
                <div class="bg-cyan" [style.width.%]="dmg.magic"></div>
                <div class="bg-ink/80" [style.width.%]="dmg.true"></div>
              </div>
              <div class="mt-1.5 flex justify-between text-[11px] font-semibold">
                <span class="text-neg">{{ 'detail.physical' | transloco }} {{ dmg.physical }}%</span>
                <span class="text-cyan">{{ 'detail.magicDmg' | transloco }} {{ dmg.magic }}%</span>
                <span class="text-dim">{{ 'detail.trueDmg' | transloco }} {{ dmg.true }}%</span>
              </div>
            </section>
          }

          @if (d.strengths.length || d.weaknesses.length) {
            <div class="grid gap-4 sm:grid-cols-2">
              @if (d.strengths.length) {
                <section class="hex-panel p-4">
                  <h2 class="section-title">{{ 'detail.strengths' | transloco }}</h2>
                  @for (s of d.strengths; track $index) { <p class="mt-1.5 flex gap-2 text-sm text-dim"><span class="text-pos">▲</span>{{ s }}</p> }
                </section>
              }
              @if (d.weaknesses.length) {
                <section class="hex-panel p-4">
                  <h2 class="section-title">{{ 'detail.weaknesses' | transloco }}</h2>
                  @for (w of d.weaknesses; track $index) { <p class="mt-1.5 flex gap-2 text-sm text-dim"><span class="text-neg">▼</span>{{ w }}</p> }
                </section>
              }
            </div>
          }

          @if (d.insights.length) {
            <section class="hex-panel p-4">
              <h2 class="section-title">{{ 'detail.insights' | transloco }}</h2>
              @for (i of d.insights; track $index) { <p class="mt-1.5 flex gap-2 text-sm text-dim"><span class="text-cyan">◆</span>{{ i }}</p> }
            </section>
          }
        </div>

        <!-- Right: counters (two tabs) · similar · tips -->
        <div class="flex flex-col gap-4">
          <section class="hex-panel p-4">
            <div class="flex gap-2">
              <button type="button" (click)="setCounterTab(0)" [class]="tabPill(counterTab() === 0)">{{ 'detail.counters' | transloco }}</button>
              <button type="button" (click)="setCounterTab(1)" [class]="tabPill(counterTab() === 1)">{{ 'detail.strongAgainst' | transloco }}</button>
            </div>
            @if (pageRows().length) {
              <div class="mt-3 flex flex-col gap-1.5">
                @for (m of pageRows(); track m.key) {
                  <a [routerLink]="['/champions', m.key]" class="flex items-center gap-2.5 rounded-hex border border-line bg-card px-2 py-1.5 hover:border-cyan/40">
                    <img [src]="m.portrait" alt="" class="h-7 w-7 rounded border border-line" />
                    <span class="text-sm font-semibold">{{ m.name }}</span>
                    <span class="ml-auto w-12 text-right text-sm font-bold" [class]="m.favourable ? 'text-pos' : 'text-neg'">{{ m.winRate.toFixed(1) }}%</span>
                  </a>
                }
              </div>
              @if (pageCount() > 1) {
                <div class="mt-3 flex items-center gap-3">
                  <button type="button" (click)="prev()" [disabled]="page() === 0" [class]="pager(page() === 0)">◀</button>
                  <span class="flex-1 text-center text-xs text-dim">{{ 'detail.page' | transloco }} {{ page() + 1 }} / {{ pageCount() }}</span>
                  <button type="button" (click)="next()" [disabled]="page() >= pageCount() - 1" [class]="pager(page() >= pageCount() - 1)">▶</button>
                </div>
              }
            } @else {
              <p class="mt-3 text-sm text-dim">{{ 'detail.noMatchup' | transloco }}</p>
            }
          </section>

          @if (d.similar.length) {
            <section class="hex-panel p-4">
              <h2 class="section-title">{{ 'detail.similar' | transloco }}</h2>
              <div class="mt-2 flex flex-wrap gap-2">
                @for (c of d.similar; track c.key) {
                  <a [routerLink]="['/champions', c.key]" class="flex w-16 flex-col items-center gap-1.5 rounded-hex border border-line bg-card p-1.5 hover:border-cyan/40">
                    <img [src]="c.portrait" alt="" class="h-11 w-11 rounded" />
                    <span class="truncate text-[11px] font-semibold">{{ c.name }}</span>
                  </a>
                }
              </div>
            </section>
          }

          @if (d.tips.length) {
            <section class="hex-panel p-4">
              <h2 class="section-title">{{ 'detail.tips' | transloco }}</h2>
              @for (t of d.tips; track $index) { <p class="mt-1.5 flex gap-2 text-sm text-dim"><span class="text-cyan">◆</span>{{ t }}</p> }
            </section>
          }
        </div>
      </div>
    } @else {
      <p class="mt-10 text-center text-dim">{{ 'detail.noChampion' | transloco }}</p>
    }

    <ng-template #itemPill let-it>
      <div class="flex items-center gap-2 rounded-hex border border-line bg-card px-2 py-1.5">
        <img [src]="it.icon" alt="" class="h-6 w-6 rounded" />
        <span class="text-[13px]">{{ it.name }}</span>
        @if (it.cost != null) { <span class="text-xs font-semibold text-gold">{{ it.cost }}g</span> }
      </div>
    </ng-template>
  `,
  styles: [
    `
      .lbl {
        font-size: 10px;
        font-weight: 600;
        letter-spacing: 0.4px;
        text-transform: uppercase;
        color: var(--color-dim);
      }
      .section-title {
        font-size: 12px;
        font-weight: 700;
        letter-spacing: 0.5px;
        text-transform: uppercase;
        color: var(--color-dim);
      }
    `,
  ],
})
export class ChampionDetail {
  readonly data = inject(DataService);
  readonly key = input.required<string>();
  readonly role = signal<Role | null>(null);
  readonly variantIndex = signal(0);
  readonly counterTab = signal(0);
  readonly page = signal(0);
  readonly abilities = signal<AbilityRow[]>([]);
  readonly abilityHovered = signal(-1);
  private readonly pageSize = 10;

  readonly detail = computed(() => {
    this.data.loading();
    return this.data.detail(this.key(), this.role() ?? undefined);
  });

  readonly variant = computed(() => {
    const vs = this.detail()?.variants ?? [];
    if (!vs.length) return undefined;
    return vs[Math.min(this.variantIndex(), vs.length - 1)];
  });

  private readonly counterList = computed<DuelRow[]>(() => {
    const d = this.detail();
    if (!d) return [];
    return this.counterTab() === 0 ? d.weak : d.strong;
  });
  readonly pageCount = computed(() =>
    Math.max(1, Math.ceil(this.counterList().length / this.pageSize)),
  );
  readonly pageRows = computed(() => {
    const start = this.page() * this.pageSize;
    return this.counterList().slice(start, start + this.pageSize);
  });

  private readonly title = inject(Title);
  private readonly meta = inject(Meta);

  constructor() {
    effect(() => {
      const d = this.detail();
      if (!d) return;
      this.title.setTitle(`${d.champ.name} build, runes & counters — Wardio`);
      const wr = d.winRate != null ? `, ${d.winRate.toFixed(1)}% win rate` : '';
      this.meta.updateTag({
        name: 'description',
        content:
          `${d.champ.name} ${ROLE_LABEL[d.role]} build: best runes, items, ` +
          `skill order and counters${d.tier ? ` (${d.tier} tier${wr})` : ''}.`,
      });
    });
    effect(() => {
      const k = this.key();
      if (this.data.loading()) return;
      this.abilityHovered.set(-1);
      this.abilities.set([]);
      void this.data.abilities(k).then((a) => this.abilities.set(a));
    });
  }

  setRole(r: Role): void {
    this.role.set(r);
    this.variantIndex.set(0);
    this.counterTab.set(0);
    this.page.set(0);
  }
  setVariant(i: number): void {
    this.variantIndex.set(i);
  }
  setCounterTab(t: number): void {
    this.counterTab.set(t);
    this.page.set(0);
  }
  prev(): void {
    this.page.update((p) => Math.max(0, p - 1));
  }
  next(): void {
    this.page.update((p) => Math.min(this.pageCount() - 1, p + 1));
  }
  label(r: Role): string {
    return ROLE_LABEL[r];
  }

  chip(active: boolean): string {
    return 'hex-chip ' + (active ? 'is-on' : 'is-off');
  }
  tabPill(active: boolean): string {
    return (
      'flex-1 rounded-hex border px-3 py-1.5 text-xs font-bold ' +
      (active
        ? 'border-cyan/60 bg-cyan/12 text-cyan'
        : 'border-line bg-card text-dim hover:text-ink')
    );
  }
  skillBadge(lead: boolean): string {
    return (
      'grid h-6 w-6 place-items-center rounded-[6px] border text-[13px] font-black ' +
      (lead ? 'border-gold bg-gold text-bg' : 'border-gold/40 bg-gold/10 text-gold')
    );
  }
  levelCell(ult: boolean): string {
    return (
      'flex h-10 w-6 flex-col items-center justify-center gap-0.5 rounded-[5px] border ' +
      (ult ? 'border-gold/55 bg-gold/15' : 'border-line bg-card')
    );
  }
  pager(disabled: boolean): string {
    return (
      'grid h-7 w-8 place-items-center rounded-[6px] border border-line text-cyan ' +
      (disabled ? 'opacity-40' : 'bg-card hover:border-cyan/40')
    );
  }
  pct(v?: number): string {
    return v == null ? '—' : v.toFixed(1) + '%';
  }
  delta(v?: number): string {
    return v == null || v === 0 ? '—' : (v > 0 ? '+' : '') + v.toFixed(1);
  }
  deltaClass(v?: number): string {
    if (v == null || v === 0) return 'text-dim';
    return v > 0 ? 'text-pos' : 'text-neg';
  }
  matches(n?: number): string {
    return n == null || n === 0 ? '—' : n.toLocaleString('en-US');
  }
}

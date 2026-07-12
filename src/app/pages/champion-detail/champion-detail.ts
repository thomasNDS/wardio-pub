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
import { AbilityRow, Detail, Role, ROLE_LABEL } from '../../core/models';

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
      <div
        class="mt-4 flex items-center gap-4 hex-panel p-4"
      >
        <img
          [src]="d.champ.portrait"
          alt=""
          class="h-16 w-16 rounded-lg border border-gold"
        />
        <div>
          <h1 class="text-2xl font-extrabold">{{ d.champ.name }}</h1>
          @if (d.champ.title) {
            <p class="text-sm text-dim">{{ d.champ.title }}</p>
          }
        </div>
        <div class="ml-auto flex flex-wrap gap-1.5">
          @for (t of d.champ.tags; track t) {
            <span
              class="rounded-full border border-gold/40 bg-gold/10 px-2.5 py-0.5 text-[11px] font-semibold text-gold"
              >{{ t }}</span
            >
          }
        </div>
      </div>

      <!-- Role tabs -->
      @if (d.roles.length > 1) {
        <div class="mt-3 flex flex-wrap gap-2">
          @for (r of d.roles; track r) {
            <button
              type="button"
              (click)="role.set(r)"
              [class]="tab(r === d.role)"
            >
              {{ label(r) }}
            </button>
          }
        </div>
      }

      <!-- Stat strip -->
      @if (d.winRate != null) {
        <div
          class="mt-4 grid grid-cols-3 gap-y-3 hex-panel p-4 sm:grid-cols-6"
        >
          <div class="text-center">
            <div class="text-[10px] font-semibold uppercase tracking-wide text-dim">{{ 'cols.tier' | transloco }}</div>
            <div class="text-lg font-extrabold text-gold">{{ d.tier ?? '—' }}</div>
          </div>
          <div class="text-center">
            <div class="text-[10px] font-semibold uppercase tracking-wide text-dim">{{ 'cols.win' | transloco }}</div>
            <div class="text-lg font-extrabold">{{ pct(d.winRate) }}</div>
          </div>
          <div class="text-center">
            <div class="text-[10px] font-semibold uppercase tracking-wide text-dim">{{ 'cols.wr' | transloco }}</div>
            <div class="text-lg font-extrabold" [class]="deltaClass(d.wrChange)">{{ delta(d.wrChange) }}</div>
          </div>
          <div class="text-center">
            <div class="text-[10px] font-semibold uppercase tracking-wide text-dim">{{ 'cols.pick' | transloco }}</div>
            <div class="text-lg font-extrabold">{{ pct(d.pickRate) }}</div>
          </div>
          <div class="text-center">
            <div class="text-[10px] font-semibold uppercase tracking-wide text-dim">{{ 'cols.ban' | transloco }}</div>
            <div class="text-lg font-extrabold">{{ pct(d.banRate) }}</div>
          </div>
          <div class="text-center">
            <div class="text-[10px] font-semibold uppercase tracking-wide text-dim">{{ 'cols.matches' | transloco }}</div>
            <div class="text-lg font-extrabold">{{ matches(d.matches) }}</div>
          </div>
        </div>
      }

      <div class="mt-4 grid gap-4 lg:grid-cols-[3fr_2fr]">
        <!-- Left: build -->
        <div class="flex flex-col gap-4">
          <!-- Champion stats (real Data Dragon): ratings + base stats. -->
          <section class="hex-panel p-4">
            <h2 class="section-title">{{ 'detail.champStats' | transloco }}</h2>
            <div class="mt-3 grid gap-x-6 gap-y-2.5 sm:grid-cols-2">
              @for (r of ratings(d); track r.key) {
                <div class="flex items-center gap-3">
                  <span class="w-20 text-xs text-dim">{{ 'stats.' + r.key | transloco }}</span>
                  <div class="h-2 flex-1 overflow-hidden rounded-full bg-card">
                    <div
                      class="h-full rounded-full"
                      [class]="r.color"
                      [style.width.%]="r.value * 10"
                    ></div>
                  </div>
                  <span class="w-5 text-right text-xs font-semibold">{{ r.value }}</span>
                </div>
              }
            </div>
            <div class="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-4">
              @for (s of baseStats(d); track s.label) {
                <div class="flex items-baseline justify-between border-b border-line/60 pb-1">
                  <span class="text-[11px] uppercase tracking-wide text-dim">{{ s.label }}</span>
                  <span class="text-sm font-semibold">{{ s.value }}</span>
                </div>
              }
            </div>
          </section>

          @if (d.runes.length) {
            <section class="hex-panel p-4">
              <h2 class="section-title">
                {{ 'detail.runes' | transloco }} · {{ d.primaryTree }} / {{ d.secondaryTree }}
              </h2>
              <div class="mt-2 flex flex-col gap-1.5">
                @for (r of d.runes; track $index) {
                  <div class="flex items-center gap-2.5">
                    <img [src]="r.icon" alt="" class="h-6 w-6 rounded-full bg-black/30" />
                    <span [class.font-bold]="r.keystone">{{ r.name }}</span>
                    <span class="ml-auto text-[11px] text-dim">{{ r.tree }}</span>
                  </div>
                }
              </div>
            </section>
          }

          @if (d.spells.length) {
            <section class="hex-panel p-4">
              <h2 class="section-title">{{ 'detail.spells' | transloco }}</h2>
              <div class="mt-2 flex gap-2.5">
                @for (s of d.spells; track s.name) {
                  <div class="flex items-center gap-2 rounded-hex border border-gold/30 bg-gold/10 px-2 py-1.5">
                    <img [src]="s.icon" alt="" class="h-6 w-6 rounded" />
                    <span class="text-xs font-semibold">{{ s.name }}</span>
                  </div>
                }
              </div>
            </section>
          }

          @if (d.skillPriority.length || d.skillLevels.length) {
            <section class="hex-panel p-4">
              <h2 class="section-title">{{ 'detail.skillOrder' | transloco }}</h2>
              @if (d.skillPriority.length) {
                <div class="mt-2 flex items-center gap-2">
                  @for (s of d.skillPriority; track $index) {
                    @if ($index > 0) { <span class="text-dim">→</span> }
                    <span [class]="skillBadge($index === 0)">{{ s }}</span>
                  }
                </div>
              }
              @if (d.skillLevels.length) {
                <div class="mt-3 flex flex-wrap gap-1">
                  @for (s of d.skillLevels; track $index) {
                    <div [class]="levelCell(s === 'R')">
                      <div class="text-[13px] font-black leading-none" [class.text-gold]="s === 'R'">{{ s }}</div>
                      <div class="text-[9px] text-dim">{{ $index + 1 }}</div>
                    </div>
                  }
                </div>
              }
            </section>
          }

          @if (d.starting.length || d.core.length) {
            <section class="hex-panel p-4">
              <h2 class="section-title">{{ 'detail.buildOrder' | transloco }}</h2>
              @if (d.starting.length) {
                <p class="mt-2 text-[11px] text-dim">{{ 'detail.starting' | transloco }}</p>
                <div class="mt-1 flex flex-wrap gap-2">
                  @for (it of d.starting; track $index) {
                    <ng-container [ngTemplateOutlet]="itemPill" [ngTemplateOutletContext]="{ $implicit: it }" />
                  }
                </div>
              }
              @if (d.core.length) {
                <p class="mt-3 text-[11px] text-dim">{{ 'detail.core' | transloco }}</p>
                <div class="mt-1 flex flex-wrap items-center gap-2">
                  @for (it of d.core; track $index) {
                    @if ($index > 0) { <span class="text-dim">→</span> }
                    <ng-container [ngTemplateOutlet]="itemPill" [ngTemplateOutletContext]="{ $implicit: it }" />
                  }
                </div>
              }
              @if (d.situational.length) {
                <p class="mt-3 text-[11px] text-dim">{{ 'detail.situational' | transloco }}</p>
                <div class="mt-1 flex flex-wrap gap-2">
                  @for (it of d.situational; track $index) {
                    <ng-container [ngTemplateOutlet]="itemPill" [ngTemplateOutletContext]="{ $implicit: it }" />
                  }
                </div>
              }
            </section>
          }

          @if (abilities().length) {
            <section class="hex-panel p-4">
              <h2 class="section-title">{{ 'detail.abilities' | transloco }}</h2>
              <div class="mt-2 flex flex-wrap gap-2">
                @for (a of abilities(); track $index) {
                  <div
                    class="relative h-12 w-12 rounded-md border"
                    [class]="abilityHovered() === $index ? 'border-gold' : 'border-line'"
                    (mouseenter)="abilityHovered.set($index)"
                    (mouseleave)="abilityHovered.set(-1)"
                  >
                    <img [src]="a.icon" alt="" class="h-full w-full rounded-md" />
                    <span
                      class="absolute -bottom-1 -left-1 grid h-4 w-4 place-items-center rounded border border-gold/60 bg-bg text-[9px] font-black text-gold"
                      >{{ a.slot }}</span
                    >
                  </div>
                }
              </div>
              @if (abilityHovered() >= 0 && abilityHovered() < abilities().length) {
                <div class="mt-3 rounded-hex border border-line bg-card p-3">
                  <div class="flex items-center gap-2">
                    <span class="font-bold"
                      >{{ abilities()[abilityHovered()].slot }} ·
                      {{ abilities()[abilityHovered()].name }}</span
                    >
                    @if (abilities()[abilityHovered()].cooldown) {
                      <span class="ml-auto text-xs font-semibold text-cyan"
                        >CD {{ abilities()[abilityHovered()].cooldown }}</span
                      >
                    }
                  </div>
                  <p class="mt-1 text-xs text-dim">
                    {{ abilities()[abilityHovered()].description }}
                  </p>
                </div>
              } @else {
                <p class="mt-2 text-[11px] text-dim">
                  {{ 'detail.hoverAbility' | transloco }}
                </p>
              }
            </section>
          }

          @if (d.strengths.length || d.weaknesses.length) {
            <div class="grid gap-4 sm:grid-cols-2">
              @if (d.strengths.length) {
                <section class="hex-panel p-4">
                  <h2 class="section-title">{{ 'detail.strengths' | transloco }}</h2>
                  @for (s of d.strengths; track $index) {
                    <p class="mt-1.5 flex gap-2 text-sm text-dim"><span class="text-pos">▲</span>{{ s }}</p>
                  }
                </section>
              }
              @if (d.weaknesses.length) {
                <section class="hex-panel p-4">
                  <h2 class="section-title">{{ 'detail.weaknesses' | transloco }}</h2>
                  @for (w of d.weaknesses; track $index) {
                    <p class="mt-1.5 flex gap-2 text-sm text-dim"><span class="text-neg">▼</span>{{ w }}</p>
                  }
                </section>
              }
            </div>
          }

          @if (d.insights.length) {
            <section class="hex-panel p-4">
              <h2 class="section-title">{{ 'detail.insights' | transloco }}</h2>
              @for (i of d.insights; track $index) {
                <p class="mt-1.5 flex gap-2 text-sm text-dim"><span class="text-gold">•</span>{{ i }}</p>
              }
            </section>
          }
        </div>

        <!-- Right: counters + similar -->
        <div class="flex flex-col gap-4">
          <section class="hex-panel p-4">
            <h2 class="section-title">{{ 'detail.counters' | transloco }}</h2>
            @if (d.duels.length) {
              <div class="mt-2 flex flex-col gap-1.5">
                @for (m of pageRows(); track m.key) {
                  <a
                    [routerLink]="['/champions', m.key]"
                    class="flex items-center gap-2.5 rounded-hex border border-line bg-card px-2 py-1.5 hover:border-gold/40"
                  >
                    <img [src]="m.portrait" alt="" class="h-7 w-7 rounded border border-line" />
                    <span class="text-sm font-semibold">{{ m.name }}</span>
                    <span class="ml-auto text-[11px] font-semibold" [class]="m.favourable ? 'text-pos' : 'text-neg'">
                      {{ (m.favourable ? 'detail.favourable' : 'detail.counter') | transloco }}
                    </span>
                    <span class="w-12 text-right text-sm font-bold" [class]="m.favourable ? 'text-pos' : 'text-neg'">
                      {{ m.winRate.toFixed(1) }}%
                    </span>
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
              <p class="mt-2 text-sm text-dim">{{ 'detail.noMatchup' | transloco }}</p>
            }
          </section>

          @if (d.similar.length) {
            <section class="hex-panel p-4">
              <h2 class="section-title">{{ 'detail.similar' | transloco }}</h2>
              <div class="mt-2 flex flex-wrap gap-2">
                @for (c of d.similar; track c.key) {
                  <a
                    [routerLink]="['/champions', c.key]"
                    class="flex w-16 flex-col items-center gap-1.5 rounded-hex border border-line bg-card p-1.5 hover:border-gold/40"
                  >
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
              @for (t of d.tips; track $index) {
                <p class="mt-1.5 flex gap-2 text-sm text-dim"><span class="text-gold">•</span>{{ t }}</p>
              }
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
  readonly page = signal(0);
  readonly abilities = signal<AbilityRow[]>([]);
  readonly abilityHovered = signal(-1);
  private readonly pageSize = 10;

  readonly detail = computed(() => {
    this.data.loading();
    return this.data.detail(this.key(), this.role() ?? undefined);
  });

  private readonly title = inject(Title);
  private readonly meta = inject(Meta);

  constructor() {
    // Per-champion title + description for SEO.
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
    // Load per-champion abilities once static data is in.
    effect(() => {
      const k = this.key();
      if (this.data.loading()) return;
      this.abilityHovered.set(-1);
      this.abilities.set([]);
      void this.data.abilities(k).then((a) => this.abilities.set(a));
    });
  }

  readonly pageCount = computed(() =>
    Math.max(1, Math.ceil((this.detail()?.duels.length ?? 0) / this.pageSize)),
  );
  readonly pageRows = computed(() => {
    const duels = this.detail()?.duels ?? [];
    const start = this.page() * this.pageSize;
    return duels.slice(start, start + this.pageSize);
  });

  prev(): void {
    this.page.update((p) => Math.max(0, p - 1));
  }
  next(): void {
    this.page.update((p) => Math.min(this.pageCount() - 1, p + 1));
  }
  label(r: Role): string {
    return ROLE_LABEL[r];
  }

  ratings(d: Detail): { key: string; value: number; color: string }[] {
    const r = d.champ.ratings;
    return [
      { key: 'attack', value: r.attack, color: 'bg-neg' },
      { key: 'defense', value: r.defense, color: 'bg-pos' },
      { key: 'magic', value: r.magic, color: 'bg-cyan' },
      { key: 'difficulty', value: r.difficulty, color: 'bg-gold' },
    ];
  }
  baseStats(d: Detail): { label: string; value: string }[] {
    const s = d.champ.stats;
    const n = (v: number): string => (Number.isInteger(v) ? `${v}` : v.toFixed(0));
    return [
      { label: 'HP', value: n(s.hp) },
      { label: 'Armor', value: n(s.armor) },
      { label: 'MR', value: n(s.mr) },
      { label: 'AD', value: n(s.ad) },
      { label: 'AS', value: s.as.toFixed(3) },
      { label: 'MS', value: n(s.ms) },
      { label: 'Range', value: n(s.range) },
    ];
  }

  tab(active: boolean): string {
    return 'hex-chip ' + (active ? 'is-on' : 'is-off');
  }
  skillBadge(lead: boolean): string {
    return (
      'grid h-6 w-6 place-items-center rounded-[6px] border text-[13px] font-black ' +
      (lead
        ? 'border-gold bg-gold text-bg'
        : 'border-gold/40 bg-gold/10 text-gold')
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
      'grid h-7 w-8 place-items-center rounded-[6px] border border-line text-gold ' +
      (disabled ? 'opacity-40' : 'bg-card hover:border-gold/40')
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

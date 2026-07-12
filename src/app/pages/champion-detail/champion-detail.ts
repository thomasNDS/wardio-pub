import { Component, computed, inject, input, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { RouterLink } from '@angular/router';
import { DataService } from '../../core/data.service';
import { Role, ROLE_LABEL } from '../../core/models';

@Component({
  selector: 'app-champion-detail',
  imports: [RouterLink, NgTemplateOutlet],
  template: `
    <a
      routerLink="/champions"
      class="inline-flex items-center gap-1.5 text-sm font-semibold text-gold hover:underline"
      >← All champions</a
    >

    @if (data.loading()) {
      <p class="mt-10 text-center text-dim">Loading…</p>
    } @else if (detail(); as d) {
      <!-- Header -->
      <div
        class="mt-4 flex items-center gap-4 rounded-hex border border-line bg-surface p-4"
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
          class="mt-4 grid grid-cols-3 gap-y-3 rounded-hex border border-line bg-surface p-4 sm:grid-cols-6"
        >
          <div class="text-center">
            <div class="text-[10px] font-semibold uppercase tracking-wide text-dim">Tier</div>
            <div class="text-lg font-extrabold text-gold">{{ d.tier ?? '—' }}</div>
          </div>
          <div class="text-center">
            <div class="text-[10px] font-semibold uppercase tracking-wide text-dim">Win rate</div>
            <div class="text-lg font-extrabold">{{ pct(d.winRate) }}</div>
          </div>
          <div class="text-center">
            <div class="text-[10px] font-semibold uppercase tracking-wide text-dim">Δ WR</div>
            <div class="text-lg font-extrabold" [class]="deltaClass(d.wrChange)">{{ delta(d.wrChange) }}</div>
          </div>
          <div class="text-center">
            <div class="text-[10px] font-semibold uppercase tracking-wide text-dim">Pick rate</div>
            <div class="text-lg font-extrabold">{{ pct(d.pickRate) }}</div>
          </div>
          <div class="text-center">
            <div class="text-[10px] font-semibold uppercase tracking-wide text-dim">Ban rate</div>
            <div class="text-lg font-extrabold">{{ pct(d.banRate) }}</div>
          </div>
          <div class="text-center">
            <div class="text-[10px] font-semibold uppercase tracking-wide text-dim">Matches</div>
            <div class="text-lg font-extrabold">{{ matches(d.matches) }}</div>
          </div>
        </div>
      }

      <div class="mt-4 grid gap-4 lg:grid-cols-[3fr_2fr]">
        <!-- Left: build -->
        <div class="flex flex-col gap-4">
          @if (d.runes.length) {
            <section class="rounded-hex border border-line bg-surface p-4">
              <h2 class="section-title">
                Runes · {{ d.primaryTree }} / {{ d.secondaryTree }}
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
            <section class="rounded-hex border border-line bg-surface p-4">
              <h2 class="section-title">Summoner spells</h2>
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
            <section class="rounded-hex border border-line bg-surface p-4">
              <h2 class="section-title">Skill order</h2>
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
            <section class="rounded-hex border border-line bg-surface p-4">
              <h2 class="section-title">Build order</h2>
              @if (d.starting.length) {
                <p class="mt-2 text-[11px] text-dim">Starting</p>
                <div class="mt-1 flex flex-wrap gap-2">
                  @for (it of d.starting; track $index) {
                    <ng-container [ngTemplateOutlet]="itemPill" [ngTemplateOutletContext]="{ $implicit: it }" />
                  }
                </div>
              }
              @if (d.core.length) {
                <p class="mt-3 text-[11px] text-dim">Core</p>
                <div class="mt-1 flex flex-wrap items-center gap-2">
                  @for (it of d.core; track $index) {
                    @if ($index > 0) { <span class="text-dim">→</span> }
                    <ng-container [ngTemplateOutlet]="itemPill" [ngTemplateOutletContext]="{ $implicit: it }" />
                  }
                </div>
              }
              @if (d.situational.length) {
                <p class="mt-3 text-[11px] text-dim">Situational</p>
                <div class="mt-1 flex flex-wrap gap-2">
                  @for (it of d.situational; track $index) {
                    <ng-container [ngTemplateOutlet]="itemPill" [ngTemplateOutletContext]="{ $implicit: it }" />
                  }
                </div>
              }
            </section>
          }

          @if (d.strengths.length || d.weaknesses.length) {
            <div class="grid gap-4 sm:grid-cols-2">
              @if (d.strengths.length) {
                <section class="rounded-hex border border-line bg-surface p-4">
                  <h2 class="section-title">Strengths</h2>
                  @for (s of d.strengths; track $index) {
                    <p class="mt-1.5 flex gap-2 text-sm text-dim"><span class="text-pos">▲</span>{{ s }}</p>
                  }
                </section>
              }
              @if (d.weaknesses.length) {
                <section class="rounded-hex border border-line bg-surface p-4">
                  <h2 class="section-title">Weaknesses</h2>
                  @for (w of d.weaknesses; track $index) {
                    <p class="mt-1.5 flex gap-2 text-sm text-dim"><span class="text-neg">▼</span>{{ w }}</p>
                  }
                </section>
              }
            </div>
          }

          @if (d.insights.length) {
            <section class="rounded-hex border border-line bg-surface p-4">
              <h2 class="section-title">Key insights</h2>
              @for (i of d.insights; track $index) {
                <p class="mt-1.5 flex gap-2 text-sm text-dim"><span class="text-gold">•</span>{{ i }}</p>
              }
            </section>
          }
        </div>

        <!-- Right: counters + similar -->
        <div class="flex flex-col gap-4">
          <section class="rounded-hex border border-line bg-surface p-4">
            <h2 class="section-title">Counters</h2>
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
                      {{ m.favourable ? 'Favourable' : 'Counter' }}
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
                  <span class="flex-1 text-center text-xs text-dim">Page {{ page() + 1 }} / {{ pageCount() }}</span>
                  <button type="button" (click)="next()" [disabled]="page() >= pageCount() - 1" [class]="pager(page() >= pageCount() - 1)">▶</button>
                </div>
              }
            } @else {
              <p class="mt-2 text-sm text-dim">No matchup data yet.</p>
            }
          </section>

          @if (d.similar.length) {
            <section class="rounded-hex border border-line bg-surface p-4">
              <h2 class="section-title">Similar champions</h2>
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
            <section class="rounded-hex border border-line bg-surface p-4">
              <h2 class="section-title">Tips</h2>
              @for (t of d.tips; track $index) {
                <p class="mt-1.5 flex gap-2 text-sm text-dim"><span class="text-gold">•</span>{{ t }}</p>
              }
            </section>
          }
        </div>
      </div>
    } @else {
      <p class="mt-10 text-center text-dim">No data for this champion yet.</p>
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
  private readonly pageSize = 10;

  readonly detail = computed(() => {
    this.data.loading();
    return this.data.detail(this.key(), this.role() ?? undefined);
  });

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

  tab(active: boolean): string {
    return (
      'rounded-hex border px-3.5 py-1.5 text-xs font-semibold ' +
      (active
        ? 'border-gold/60 bg-gold/15 text-gold'
        : 'border-line bg-card text-dim hover:text-ink')
    );
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

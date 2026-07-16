import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { DataService } from '../../core/data.service';
import { Role, ROLES, ROLE_LABEL, TierRow } from '../../core/models';

type SortCol = 'tier' | 'win' | 'wr' | 'pick' | 'ban' | 'matches';

@Component({
  selector: 'app-champions',
  imports: [RouterLink, TranslocoPipe],
  template: `
    <div class="flex flex-wrap items-end justify-between gap-3">
      <h1 class="text-3xl font-extrabold">{{ 'champions.title' | transloco }}</h1>
      <span class="text-xs text-dim"
        >{{ 'common.patch' | transloco }} {{ data.patch() || '—' }}</span
      >
    </div>

    <!-- Blitz-style filter bar. Role + search filter live; queue / rank /
         region are the meta brackets (one bracket of data until aggregation). -->
    <div class="mt-4 flex flex-wrap items-center gap-2">
      <select #q (change)="setQueue(q.value)" [class]="select">
        @for (m of queues; track m) { <option [selected]="m === queue()">{{ m }}</option> }
      </select>
      <select #rk (change)="data.setSegment(rk.value)" [class]="select" [disabled]="data.mode() === 'aram'">
        @for (s of data.segments(); track s.id) {
          <option [value]="s.id" [selected]="s.id === data.segment()">{{ rankLabel(s.rank) }}</option>
        }
      </select>
      <select #rg (change)="region.set(rg.value)" [class]="select">
        @for (r of regions; track r) { <option [selected]="r === region()">{{ r }}</option> }
      </select>
      <input
        #s
        (input)="search.set(s.value)"
        [placeholder]="'champions.search' | transloco"
        class="min-w-[150px] flex-1 rounded-hex border border-line bg-card px-3 py-1.5 text-sm text-ink placeholder:text-dim/70 transition-colors focus:border-gold/60 focus:outline-none"
      />
    </div>

    @if (data.mode() !== 'aram') {
      <div class="mt-2 flex flex-wrap gap-1.5">
        <button type="button" (click)="setRole(null)" [class]="chip(role() === null)">
          {{ 'champions.allRoles' | transloco }}
        </button>
        @for (r of roles; track r) {
          <button type="button" (click)="setRole(r)" [class]="chip(role() === r)">
            {{ label(r) }}
          </button>
        }
      </div>
    }

    @if (data.loading()) {
      <p class="mt-10 text-center text-dim">{{ 'champions.loading' | transloco }}</p>
    } @else {
      <div class="mt-5 overflow-x-auto">
        <table class="w-full min-w-[720px] border-separate border-spacing-y-1.5">
          <thead>
            <tr class="text-[11px] font-semibold uppercase tracking-wide text-dim">
              <th class="px-3 text-left">#</th>
              <th class="cursor-pointer px-2 text-left" (click)="sort('tier')">{{ 'cols.tier' | transloco }}</th>
              <th class="px-2 text-left">{{ 'cols.champion' | transloco }}</th>
              @if (data.mode() !== 'aram') {
                <th class="px-2 text-left">{{ 'cols.role' | transloco }}</th>
              }
              <th class="cursor-pointer px-2 text-right" (click)="sort('win')">{{ 'cols.win' | transloco }}</th>
              <th class="cursor-pointer px-2 text-right" (click)="sort('wr')">{{ 'cols.wr' | transloco }}</th>
              <th class="cursor-pointer px-2 text-right" (click)="sort('pick')">{{ 'cols.pick' | transloco }}</th>
              <th class="cursor-pointer px-2 text-right" (click)="sort('ban')">{{ 'cols.ban' | transloco }}</th>
              <th class="cursor-pointer px-3 text-right" (click)="sort('matches')">{{ 'cols.matches' | transloco }}</th>
            </tr>
          </thead>
          <tbody>
            @for (row of rows(); track row.key + row.role) {
              <tr
                class="group cursor-pointer"
                [routerLink]="['/champions', row.key]"
              >
                <td class="rounded-l-hex border-y border-l border-line bg-card px-3 text-sm text-dim group-hover:border-gold/40">
                  {{ row.rank }}
                </td>
                <td class="border-y border-line bg-card px-2 group-hover:border-gold/40">
                  <span [class]="tierBadge(row.tier)">{{ row.tier }}</span>
                </td>
                <td class="border-y border-line bg-card px-2 py-2 group-hover:border-gold/40">
                  <div class="flex items-center gap-2.5">
                    <img
                      [src]="row.portrait"
                      alt=""
                      loading="lazy"
                      class="h-7 w-7 rounded border border-line"
                    />
                    <span class="font-semibold">{{ row.name }}</span>
                  </div>
                </td>
                @if (data.mode() !== 'aram') {
                  <td class="border-y border-line bg-card px-2 text-sm text-dim group-hover:border-gold/40">
                    {{ label(row.role) }}
                  </td>
                }
                <td
                  class="border-y border-line bg-card px-2 text-right text-sm font-semibold group-hover:border-gold/40"
                  [class.text-pos]="(row.winRate ?? 0) >= 50"
                  [class.text-neg]="(row.winRate ?? 0) < 50"
                >
                  {{ pct(row.winRate) }}
                </td>
                <td
                  class="border-y border-line bg-card px-2 text-right text-xs group-hover:border-gold/40"
                  [class]="deltaClass(row.wrChange)"
                >
                  {{ delta(row.wrChange) }}
                </td>
                <td class="border-y border-line bg-card px-2 text-right text-sm group-hover:border-gold/40">
                  {{ pct(row.pickRate) }}
                </td>
                <td class="border-y border-line bg-card px-2 text-right text-sm text-dim group-hover:border-gold/40">
                  {{ pct(row.banRate) }}
                </td>
                <td class="rounded-r-hex border-y border-r border-line bg-card px-3 text-right text-xs text-dim group-hover:border-gold/40">
                  {{ matches(row.matches) }}
                </td>
              </tr>
            }
          </tbody>
        </table>
        @if (rows().length === 0) {
          <p class="mt-8 text-center text-dim">{{ 'champions.noData' | transloco }}</p>
        }
      </div>
    }
  `,
})
export class Champions {
  readonly data = inject(DataService);
  readonly roles = ROLES;
  readonly role = signal<Role | null>(null);
  readonly search = signal('');
  readonly queue = signal('Ranked');
  readonly region = signal('World');
  readonly queues = ['Ranked', 'ARAM', 'URF', 'Arena', 'Nexus Blitz'];
  readonly regions = [
    'World', 'EUW', 'EUNE', 'NA', 'KR', 'BR', 'LAN', 'LAS', 'OCE', 'TR', 'RU', 'JP',
  ];
  // Hextech-styled native select (double edge via ring + inner border).
  readonly select =
    'rounded-hex border border-line bg-card px-3 py-1.5 text-sm font-semibold ' +
    'text-ink shadow-[inset_0_0_0_1px_rgba(240,192,90,0.08)] ' +
    'hover:border-gold/40 focus:border-gold/60 focus:outline-none';
  // Default: sort by win rate, highest first.
  private readonly sortCol = signal<SortCol | null>('win');
  private readonly sortDesc = signal(true);

  readonly rows = computed<TierRow[]>(() => {
    this.data.loading(); // recompute once data lands
    const needle = this.search().trim().toLowerCase();
    let rows = this.data.tierList(this.role());
    if (needle) rows = rows.filter((r) => r.name.toLowerCase().includes(needle));
    const col = this.sortCol();
    if (!col) return rows;
    const val = (r: TierRow): number => {
      switch (col) {
        case 'tier':
          return 'DCBAS'.indexOf(r.tier);
        case 'win':
          return r.winRate ?? -1;
        case 'wr':
          return r.wrChange ?? -999;
        case 'pick':
          return r.pickRate ?? -1;
        case 'ban':
          return r.banRate ?? -1;
        case 'matches':
          return r.matches ?? -1;
        default:
          return 0;
      }
    };
    const dir = this.sortDesc() ? -1 : 1;
    return [...rows].sort((a, b) => (val(a) - val(b)) * dir);
  });

  setRole(r: Role | null): void {
    this.role.set(r);
  }
  /** The queue selector doubles as the mode toggle: ARAM has its own dataset;
   * other queues fall back to Ranked until their aggregation lands. */
  setQueue(v: string): void {
    this.queue.set(v);
    this.role.set(null);
    this.data.setMode(v === 'ARAM' ? 'aram' : 'ranked');
  }
  sort(col: SortCol): void {
    if (this.sortCol() === col) this.sortDesc.update((d) => !d);
    else {
      this.sortCol.set(col);
      this.sortDesc.set(true);
    }
  }
  label(r: Role): string {
    return ROLE_LABEL[r];
  }
  /** Pretty label for a segment's rank bracket (e.g. "high_elo" → "High Elo"). */
  rankLabel(rank?: string): string {
    if (!rank) return 'All';
    if (rank === 'high_elo') return 'High Elo';
    return rank.charAt(0).toUpperCase() + rank.slice(1);
  }

  chip(active: boolean): string {
    return 'hex-chip ' + (active ? 'is-on' : 'is-off');
  }
  tierBadge(t: string): string {
    const map: Record<string, string> = {
      S: 'border-gold/60 text-gold',
      A: 'border-cyan/60 text-cyan',
      B: 'border-pos/50 text-pos',
      C: 'border-line text-dim',
      D: 'border-neg/50 text-neg',
    };
    return (
      'inline-grid h-6 w-6 place-items-center rounded border text-xs font-black ' +
      (map[t] ?? 'border-line text-dim')
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

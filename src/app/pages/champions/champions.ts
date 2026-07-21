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

    <!-- Only the modes and brackets that actually have data are offered. A
         selector that changes nothing is worse than no selector: it tells the
         reader they are looking at a segment they are not. -->
    <div class="mt-4 flex flex-wrap items-center gap-2">
      <label class="sr-only" for="f-queue">{{ 'champions.queue' | transloco }}</label>
      <select id="f-queue" #q (change)="setQueue(q.value)" [class]="select">
        @for (m of queues; track m) { <option [selected]="m === queue()">{{ m }}</option> }
      </select>
      @if (data.mode() !== 'aram' && data.segments().length > 1) {
        <label class="sr-only" for="f-rank">{{ 'champions.rank' | transloco }}</label>
        <select id="f-rank" #rk (change)="data.setSegment(rk.value)" [class]="select">
          @for (s of data.segments(); track s.id) {
            <option [value]="s.id" [selected]="s.id === data.segment()">{{ rankLabel(s.rank) }}</option>
          }
        </select>
      }
      <label class="sr-only" for="f-search">{{ 'champions.search' | transloco }}</label>
      <input
        id="f-search"
        #s
        (input)="search.set(s.value)"
        [placeholder]="'champions.search' | transloco"
        class="min-w-[150px] flex-1 rounded-hex border border-line bg-card px-3 py-1.5 text-sm text-ink placeholder:text-dim/70 transition-colors focus:border-gold/60 focus:outline-none"
      />
    </div>

    <!-- Which population these figures describe, and how big it is. Stating it
         is the only thing that makes a one-decimal win rate readable. -->
    @if (data.provenance(); as prov) {
      <p class="mt-2 text-xs text-dim">{{ prov }}</p>
    }

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
              <th scope="col" class="px-3 text-left">#</th>
              <!-- Sortable headers are buttons, and they announce their state:
                   a bare (click) on a <th> is invisible to keyboard and to a
                   screen reader, which is how this table shipped. -->
              <th scope="col" class="px-2 text-left" [attr.aria-sort]="ariaSort('tier')">
                <button type="button" class="cursor-pointer uppercase tracking-wide" (click)="sort('tier')">
                  {{ 'cols.tier' | transloco }}
                </button>
              </th>
              <th scope="col" class="px-2 text-left">{{ 'cols.champion' | transloco }}</th>
              @if (data.mode() !== 'aram') {
                <th scope="col" class="px-2 text-left">{{ 'cols.role' | transloco }}</th>
              }
              @for (c of sortable; track c.col) {
                <th
                  scope="col"
                  [class]="c.col === 'matches' ? 'px-3 text-right' : 'px-2 text-right'"
                  [attr.aria-sort]="ariaSort(c.col)"
                >
                  <button type="button" class="cursor-pointer uppercase tracking-wide" (click)="sort(c.col)">
                    {{ c.label | transloco }}
                  </button>
                </th>
              }
            </tr>
          </thead>
          <tbody>
            @for (row of rows(); track row.key + row.role) {
              <tr class="group">
                <td class="rounded-l-hex border-y border-l border-line bg-card px-3 text-sm text-dim group-hover:border-gold/40">
                  {{ $index + 1 }}
                </td>
                <td class="border-y border-line bg-card px-2 group-hover:border-gold/40">
                  <span [class]="tierBadge(row.tier)">{{ row.tier }}</span>
                </td>
                <td class="border-y border-line bg-card px-2 py-2 group-hover:border-gold/40">
                  <!-- A real anchor, not a clickable <tr>: RouterLink on a row
                       emits no href, so the champion pages were reachable
                       neither by keyboard nor by a crawler. -->
                  <a
                    [routerLink]="['/champions', row.key]"
                    class="flex items-center gap-2.5 rounded-hex focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold/70"
                  >
                    <img
                      [src]="row.portrait"
                      alt=""
                      loading="lazy"
                      width="28"
                      height="28"
                      class="h-7 w-7 rounded border border-line"
                    />
                    <span class="font-semibold">{{ row.name }}</span>
                  </a>
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
  // The two modes the pipeline actually aggregates. URF, Arena and Nexus
  // Blitz used to be offered and silently served ranked solo data; the region
  // selector offered twelve regions and filtered by none of them.
  readonly queues = ['Ranked', 'ARAM'];
  // Hextech-styled native select (double edge via ring + inner border).
  readonly select =
    'rounded-hex border border-line bg-card px-3 py-1.5 text-sm font-semibold ' +
    'text-ink shadow-[inset_0_0_0_1px_rgba(240,192,90,0.08)] ' +
    'hover:border-gold/40 focus:border-gold/60 focus:outline-none';
  // The numeric columns, declared once so the header row and the sort state
  // cannot drift apart.
  readonly sortable: ReadonlyArray<{ col: SortCol; label: string }> = [
    { col: 'win', label: 'cols.win' },
    { col: 'wr', label: 'cols.wr' },
    { col: 'pick', label: 'cols.pick' },
    { col: 'ban', label: 'cols.ban' },
    { col: 'matches', label: 'cols.matches' },
  ];
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
  /** What a screen reader reads out of the header cell. */
  ariaSort(col: SortCol): 'ascending' | 'descending' | 'none' {
    if (this.sortCol() !== col) return 'none';
    return this.sortDesc() ? 'descending' : 'ascending';
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

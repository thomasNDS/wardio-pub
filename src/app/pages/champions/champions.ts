import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DataService } from '../../core/data.service';
import { Role, ROLES, ROLE_LABEL, TierRow } from '../../core/models';

type SortCol = 'tier' | 'win' | 'wr' | 'pick' | 'ban' | 'matches';

@Component({
  selector: 'app-champions',
  imports: [RouterLink],
  template: `
    <h1 class="text-3xl font-extrabold">Champions</h1>

    <div class="mt-4 flex flex-wrap gap-2">
      <button
        type="button"
        (click)="setRole(null)"
        [class]="chip(role() === null)"
      >
        All roles
      </button>
      @for (r of roles; track r) {
        <button type="button" (click)="setRole(r)" [class]="chip(role() === r)">
          {{ label(r) }}
        </button>
      }
    </div>

    @if (data.loading()) {
      <p class="mt-10 text-center text-dim">Loading champions…</p>
    } @else {
      <div class="mt-5 overflow-x-auto">
        <table class="w-full min-w-[720px] border-separate border-spacing-y-1.5">
          <thead>
            <tr class="text-[11px] font-semibold uppercase tracking-wide text-dim">
              <th class="px-3 text-left">#</th>
              <th class="cursor-pointer px-2 text-left" (click)="sort('tier')">Tier</th>
              <th class="px-2 text-left">Champion</th>
              <th class="px-2 text-left">Role</th>
              <th class="cursor-pointer px-2 text-right" (click)="sort('win')">Win</th>
              <th class="cursor-pointer px-2 text-right" (click)="sort('wr')">Δ WR</th>
              <th class="cursor-pointer px-2 text-right" (click)="sort('pick')">Pick</th>
              <th class="cursor-pointer px-2 text-right" (click)="sort('ban')">Ban</th>
              <th class="cursor-pointer px-3 text-right" (click)="sort('matches')">Matches</th>
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
                <td class="border-y border-line bg-card px-2 text-sm text-dim group-hover:border-gold/40">
                  {{ label(row.role) }}
                </td>
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
          <p class="mt-8 text-center text-dim">No tier data for this role yet.</p>
        }
      </div>
    }
  `,
})
export class Champions {
  readonly data = inject(DataService);
  readonly roles = ROLES;
  readonly role = signal<Role | null>(null);
  private readonly sortCol = signal<SortCol | null>(null);
  private readonly sortDesc = signal(true);

  readonly rows = computed<TierRow[]>(() => {
    this.data.loading(); // recompute once data lands
    const rows = this.data.tierList(this.role());
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

  chip(active: boolean): string {
    return (
      'rounded-hex border px-3.5 py-1.5 text-xs font-semibold ' +
      (active
        ? 'border-gold/60 bg-gold/15 text-gold'
        : 'border-line bg-card text-dim hover:text-ink')
    );
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

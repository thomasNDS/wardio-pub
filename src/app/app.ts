import { Component, inject, OnInit } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { DataService } from './core/data.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="min-h-screen flex flex-col">
      <header
        class="sticky top-0 z-20 border-b border-line bg-bg/85 backdrop-blur"
      >
        <div
          class="mx-auto flex max-w-6xl items-center gap-6 px-5 py-3"
        >
          <a routerLink="/" class="flex items-center gap-2.5 shrink-0">
            <span
              class="grid h-8 w-8 place-items-center rounded-[7px] border border-gold bg-gold/10 text-lg font-black text-gold"
              >W</span
            >
            <span class="text-xl font-extrabold tracking-wide text-gold"
              >Wardio</span
            >
          </a>
          <nav class="flex items-center gap-1 text-sm font-semibold">
            <a
              routerLink="/"
              routerLinkActive="text-gold bg-gold/10"
              [routerLinkActiveOptions]="{ exact: true }"
              class="rounded-hex px-3 py-1.5 text-dim hover:text-ink"
              >Home</a
            >
            <a
              routerLink="/champions"
              routerLinkActive="text-gold bg-gold/10"
              class="rounded-hex px-3 py-1.5 text-dim hover:text-ink"
              >Champions</a
            >
          </nav>
          <span class="ml-auto text-xs text-dim">
            @if (data.patch()) { Patch {{ data.patch() }} }
          </span>
        </div>
      </header>

      @if (data.error()) {
        <div
          class="mx-auto mt-4 w-full max-w-6xl rounded-hex border border-neg/40 bg-neg/10 px-4 py-3 text-sm text-neg"
        >
          Couldn't load the dataset: {{ data.error() }}
        </div>
      }

      <main class="mx-auto w-full max-w-6xl flex-1 px-5 py-8">
        <router-outlet />
      </main>

      <footer class="border-t border-line px-5 py-6 text-center text-xs text-dim">
        Wardio — by Ygar Studio ·
        <a class="text-cyan hover:underline" href="./curated.json">dataset</a>
        <p class="mx-auto mt-2 max-w-2xl text-[11px] text-dim/70">
          Not endorsed by Riot Games. League of Legends and Riot Games are
          trademarks or registered trademarks of Riot Games, Inc.
        </p>
      </footer>
    </div>
  `,
})
export class App implements OnInit {
  readonly data = inject(DataService);
  ngOnInit(): void {
    void this.data.load();
  }
}

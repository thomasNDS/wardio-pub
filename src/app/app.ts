import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { DataService } from './core/data.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, TranslocoPipe],
  template: `
    <div class="min-h-screen flex flex-col">
      <header
        class="sticky top-0 z-20 border-b border-line bg-bg/85 backdrop-blur"
      >
        <div class="mx-auto flex max-w-6xl items-center gap-6 px-5 py-3">
          <a routerLink="/" class="flex items-center gap-2.5 shrink-0">
            <img src="logo.png" alt="Wardio" class="h-9 w-9" />
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
              >{{ 'nav.home' | transloco }}</a
            >
            <a
              routerLink="/champions"
              routerLinkActive="text-gold bg-gold/10"
              class="rounded-hex px-3 py-1.5 text-dim hover:text-ink"
              >{{ 'nav.champions' | transloco }}</a
            >
          </nav>
          <div class="ml-auto flex items-center gap-3">
            <div class="flex items-center gap-0.5 text-[11px] font-bold">
              @for (l of langs; track l) {
                <button
                  type="button"
                  (click)="setLang(l)"
                  class="rounded px-1.5 py-0.5 uppercase"
                  [class]="
                    l === lang() ? 'text-gold' : 'text-dim hover:text-ink'
                  "
                >
                  {{ l }}
                </button>
              }
            </div>
            <span class="text-xs text-dim">
              @if (data.patch()) {
                {{ 'common.patch' | transloco }} {{ data.patch() }}
              }
            </span>
          </div>
        </div>
      </header>

      @if (data.error()) {
        <div
          class="mx-auto mt-4 w-full max-w-6xl rounded-hex border border-neg/40 bg-neg/10 px-4 py-3 text-sm text-neg"
        >
          {{ data.error() }}
        </div>
      }

      <main class="mx-auto w-full max-w-6xl flex-1 px-5 py-8">
        <router-outlet />
      </main>

      <footer class="border-t border-line px-5 py-6 text-center text-xs text-dim">
        Wardio — {{ 'footer.by' | transloco }}
        <p class="mx-auto mt-2 max-w-2xl text-[11px] text-dim/70">
          {{ 'footer.disclaimer' | transloco }}
        </p>
      </footer>
    </div>
  `,
})
export class App implements OnInit {
  readonly data = inject(DataService);
  private readonly transloco = inject(TranslocoService);
  readonly langs = ['en', 'fr', 'es'];
  readonly lang = signal(this.transloco.getActiveLang());

  ngOnInit(): void {
    // Set the language (and Data Dragon locale) before the first data load.
    this.setLang(this.detectLang());
    void this.data.load();
  }

  setLang(l: string): void {
    this.transloco.setActiveLang(l);
    this.lang.set(l);
    document.documentElement.lang = l;
    this.data.setActiveLang(l);
    try {
      localStorage.setItem('wardio.lang', l);
    } catch {
      /* private mode — fall back to per-session only */
    }
  }

  private detectLang(): string {
    let saved: string | null = null;
    try {
      saved = localStorage.getItem('wardio.lang');
    } catch {
      /* ignore */
    }
    if (saved && this.langs.includes(saved)) return saved;
    const nav = (navigator.language || 'en').slice(0, 2).toLowerCase();
    return this.langs.includes(nav) ? nav : 'en';
  }
}

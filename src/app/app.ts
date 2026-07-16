import {
  Component,
  computed,
  HostListener,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { DataService } from './core/data.service';
import { ReleaseService } from './core/release.service';

interface LangOption {
  code: string;
  label: string;
  flag: string;
}

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
              class="rounded-hex px-3 py-1.5 text-dim transition-colors hover:text-gold"
              >{{ 'nav.home' | transloco }}</a
            >
            <a
              routerLink="/champions"
              routerLinkActive="text-gold bg-gold/10"
              class="rounded-hex px-3 py-1.5 text-dim transition-colors hover:text-gold"
              >{{ 'nav.champions' | transloco }}</a
            >
          </nav>
          <div class="ml-auto flex items-center gap-3">
            @if (release.latest(); as rel) {
              <a
                [href]="rel.installerUrl"
                class="hidden items-center gap-1.5 rounded-hex border border-gold/50 bg-gold/10 px-3 py-1.5 text-xs font-bold text-gold hover:bg-gold/20 sm:flex"
                [title]="'download.title' | transloco: { version: rel.version }"
              >
                <span aria-hidden="true">↓</span>
                {{ 'download.cta' | transloco }}
              </a>
            }
            <div class="relative">
              <button
                type="button"
                (click)="toggleLang($event)"
                class="flex items-center gap-1.5 rounded-hex border border-line bg-card px-2 py-1 text-xs font-bold transition-colors hover:border-gold/40"
                [attr.aria-expanded]="langOpen()"
                aria-haspopup="listbox"
              >
                <img [src]="current().flag" [alt]="current().label" class="h-3.5 w-5 rounded-[2px] object-cover" />
                <span class="uppercase text-dim">{{ current().code }}</span>
                <span class="text-[9px] text-dim">▾</span>
              </button>
              @if (langOpen()) {
                <ul
                  class="absolute right-0 z-30 mt-1.5 w-40 overflow-hidden rounded-hex border border-line bg-bg shadow-lg"
                  role="listbox"
                >
                  @for (l of langs; track l.code) {
                    <li>
                      <button
                        type="button"
                        (click)="setLang(l.code); langOpen.set(false)"
                        class="flex w-full items-center gap-2.5 px-3 py-2 text-sm hover:bg-gold/10"
                        [class]="l.code === lang() ? 'font-bold text-gold' : 'text-dim'"
                        role="option"
                        [attr.aria-selected]="l.code === lang()"
                      >
                        <img [src]="l.flag" [alt]="l.label" class="h-4 w-6 rounded-[2px] object-cover" />
                        <span>{{ l.label }}</span>
                        @if (l.code === lang()) { <span class="ml-auto text-cyan">✓</span> }
                      </button>
                    </li>
                  }
                </ul>
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
  readonly release = inject(ReleaseService);
  private readonly transloco = inject(TranslocoService);
  readonly langs: LangOption[] = [
    { code: 'en', label: 'English', flag: 'flags/gb.svg' },
    { code: 'fr', label: 'Français', flag: 'flags/fr.svg' },
    { code: 'es', label: 'Español', flag: 'flags/es.svg' },
  ];
  private readonly langCodes = this.langs.map((l) => l.code);
  readonly lang = signal(this.transloco.getActiveLang());
  readonly langOpen = signal(false);
  readonly current = computed(
    () => this.langs.find((l) => l.code === this.lang()) ?? this.langs[0],
  );

  ngOnInit(): void {
    // Set the language (and Data Dragon locale) before the first data load.
    this.setLang(this.detectLang());
    void this.data.load();
    void this.release.load();
  }

  toggleLang(e: Event): void {
    e.stopPropagation();
    this.langOpen.update((v) => !v);
  }

  /** Any click outside the open toggle closes the menu. */
  @HostListener('document:click')
  onDocumentClick(): void {
    this.langOpen.set(false);
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
    if (saved && this.langCodes.includes(saved)) return saved;
    const nav = (navigator.language || 'en').slice(0, 2).toLowerCase();
    return this.langCodes.includes(nav) ? nav : 'en';
  }
}

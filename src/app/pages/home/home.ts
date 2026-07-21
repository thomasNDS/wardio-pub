import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';

@Component({
  selector: 'app-home',
  imports: [RouterLink, TranslocoPipe],
  template: `
    <section class="py-12 text-center">
      <img src="logo.png" alt="" class="mx-auto h-16 w-16" />
      <h1 class="mt-4 text-5xl font-extrabold tracking-tight">
        <span class="text-gold">Wardio</span>
      </h1>
      <p class="mx-auto mt-4 max-w-2xl text-lg text-dim">
        {{ 'home.tagline' | transloco }}
      </p>
      <div class="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <a routerLink="/champions" class="hex-cta">{{ 'home.browse' | transloco }}</a>
      </div>
    </section>

    <section class="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      @for (f of features; track f) {
        <div class="hex-panel p-4">
          <h3 class="text-sm font-bold text-gold">
            {{ 'home.features.' + f + '.t' | transloco }}
          </h3>
          <p class="mt-1 text-sm text-dim">
            {{ 'home.features.' + f + '.b' | transloco }}
          </p>
        </div>
      }
    </section>
  `,
})
export class Home {
  readonly features = ['tiers', 'builds', 'matchups', 'modes'];
}

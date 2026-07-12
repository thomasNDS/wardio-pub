import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-home',
  imports: [RouterLink],
  template: `
    <section class="py-10 text-center">
      <span
        class="inline-block rounded-full border border-cyan/40 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-cyan"
        >League of Legends companion</span
      >
      <h1 class="mt-5 text-5xl font-extrabold tracking-tight">
        <span class="text-gold">Wardio</span>
      </h1>
      <p class="mx-auto mt-4 max-w-2xl text-lg text-dim">
        Meta runes, builds and tier lists in champion select, a live in-game
        overlay with objective timers, and your own profile synced from the
        client. This site explores the same public data the app uses.
      </p>
      <div class="mt-7 flex justify-center gap-3">
        <a
          routerLink="/champions"
          class="rounded-hex bg-gold px-5 py-2.5 text-sm font-bold text-bg hover:brightness-110"
          >Browse champions</a
        >
        <a
          href="./curated.json"
          class="rounded-hex border border-line px-5 py-2.5 text-sm font-semibold text-ink hover:border-cyan/50"
          >View the dataset</a
        >
      </div>
    </section>

    <section class="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      @for (f of features; track f.title) {
        <div class="rounded-hex border border-line bg-surface p-4">
          <h3 class="text-sm font-bold text-gold">{{ f.title }}</h3>
          <p class="mt-1 text-sm text-dim">{{ f.body }}</p>
        </div>
      }
    </section>

    <section
      class="mt-6 rounded-hex border border-line bg-card p-6"
    >
      <span
        class="text-[11px] font-bold uppercase tracking-wider text-cyan"
        >Public data</span
      >
      <h2 class="mt-1 text-xl font-bold">Recommendation dataset</h2>
      <p class="mt-1 text-sm text-dim">
        Runes, builds, tier list and counters as a single static JSON, refreshed
        weekly. The app fetches it directly — so can you.
      </p>
      <a
        href="./curated.json"
        class="mt-3 inline-block overflow-x-auto rounded-[5px] border border-line bg-black/40 px-3 py-2 font-mono text-[13px] text-cyan"
        >thomasnds.github.io/wardio-pub/curated.json</a
      >
    </section>
  `,
})
export class Home {
  readonly features = [
    {
      title: 'Pre-game',
      body: 'Runes, spells, item path, skill order, tier and counters for your pick — with one-click rune import.',
    },
    {
      title: 'Champions',
      body: 'Blitz-style build pages and a sortable tier list across every role.',
    },
    {
      title: 'In-game',
      body: 'Transparent overlay with Dragon / Baron / Herald timers and a live scoreboard.',
    },
    {
      title: 'Profile',
      body: 'Your Riot ID, level and ranked, auto-synced from the running client.',
    },
  ];
}

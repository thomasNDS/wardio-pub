# wardio-pub

Public site + data endpoint for **Wardio**, a desktop League of Legends
companion (private app repo: `ygar-studio/wardio-app`).

A **data explorer** — Angular 22 + Tailwind CSS 4 + spartan.ng, same Hextech
palette as the app — reading the public dataset and Data Dragon:

- **Site** — <https://ygar-studio.github.io/wardio-pub/> (home · tier list · champion pages)
- **Dataset** — <https://ygar-studio.github.io/wardio-pub/curated.json>

## Build & deploy

GitHub Actions (`.github/workflows/deploy.yml`) builds the Angular app and
deploys it to Pages on every push to `main`. One-time: **Settings › Pages ›
Source = "GitHub Actions"**.

Local dev (needs Node ≥ 20 and npm registry access):

```bash
npm install
npm start          # http://localhost:4200
npm run build      # dist/wardio-pub/browser
```

## `public/curated.json` is generated

It is produced and pushed automatically by the pipeline in `wardio-app`
(`pipeline/generate.mjs` + the `publish-dataset` workflow), **weekly**. Don't
hand-edit it — change the source in `wardio-app/data/curated.json`.

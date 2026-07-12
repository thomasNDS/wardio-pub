# wardio-pub

Public site + data endpoint for **Wardio**, a desktop League of Legends
companion (private app repo: `thomasNDS/wardio-app`).

Served by **GitHub Pages** from `main` (root):

- **Site** — <https://thomasnds.github.io/wardio-pub/>
- **Dataset** — <https://thomasnds.github.io/wardio-pub/curated.json>
  (runes / builds / tier list / counters — the app fetches this directly)

## Don't hand-edit `curated.json`

It is **generated and pushed automatically** by the pipeline in `wardio-app`
(`pipeline/generate.mjs` + the `publish-dataset` workflow), refreshed **weekly**.
Manual edits here are overwritten on the next run — change the source in
`wardio-app/data/curated.json` instead.

## One-time setup

- **Pages**: Settings → Pages → Source = `main` / `/ (root)`.
- The push comes from `wardio-app`'s Action using a repo secret
  (`WARDIO_PUB_TOKEN`, a PAT with `repo` scope on this repo).

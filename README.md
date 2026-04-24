# ruizhou03.github.io

Serves Rui Zhou's English academic homepage at <https://ruizhou03.github.io>.

## How this repo is maintained

**This repo is a deployment target, not a source of truth.** `index.html` and
everything under `files/en/` are synced automatically from the Chinese blog
repo, where the English page lives at `/en/`:

- Source repo: <https://github.com/zirconeey/zirconeey.github.io>
- Source paths: `en/index.html`, `files/en/**`
- Sync mechanism: GitHub Actions workflow
  `.github/workflows/sync-english-site.yml` in the source repo, triggered on
  every push that touches those paths

**Do not edit `index.html` or `files/en/*` directly in this repo.** Any manual
commit to those paths will be overwritten the next time the source repo syncs.
Edit the English page at `zirconeey/zirconeey.github.io` instead.

## What lives only in this repo

- `drafts/CV/` — LaTeX source for the CV PDF (built output synced via the
  pipeline above). Private working files; not published to the site.

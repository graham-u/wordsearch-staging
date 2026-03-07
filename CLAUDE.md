# Word Search PWA

A word search game for an elderly UK user, installed as a PWA on a tablet.

## Key Files

- `DESIGN.md` — Full spec and architecture documentation
- `app.js` — Game logic, puzzle generation, touch handling, navigation
- `words.js` — Themed word lists (28 categories)
- `style.css` — Layout and styles
- `index.html` — App shell
- `sw.js` — Service worker (network-first caching)
- `tests/` — Automated test suite (see Running Automated Tests below)

## Version Bumping

**Every push that changes user-facing files requires a version bump.** User-facing files are: `app.js`, `words.js`, `style.css`, `index.html`, `sw.js`, `manifest.json`, `icon.svg`. Pushes that only change non-deployed files (`CLAUDE.md`, `DESIGN.md`, `TODO.md`, `tests/`, `.github/`) do not need a bump.

Bump in **two places** simultaneously (in the same commit as the user-facing changes):

1. `index.html` — the `<div id="version">v8</div>` element (user-visible)
2. `sw.js` — the `CACHE_NAME = "wordsearch-v8"` constant (triggers cache refresh)

Both must use the same version number. The version number tells the user which build they're running (visible bottom-right corner).

A **pre-push hook** (`.githooks/pre-push`) enforces this — it blocks pushes that change user-facing files without bumping both version locations. After a fresh clone, activate hooks with:

```bash
git config core.hooksPath .githooks
```

## Deployment

There are two deployment targets — **staging** and **production** — both using GitHub Pages. Always deploy to staging first, test, then promote to production.

| Environment | Repo | URL |
|-------------|------|-----|
| Staging | `graham-u/wordsearch-staging` | https://graham-u.github.io/wordsearch-staging/ |
| Production | `graham-u/wordsearch` | https://graham-u.github.io/wordsearch/ |

Both repos use the same `main` branch and the same Pages workflow. The staging repo is configured as a git remote called `staging`.

```bash
# 1. Deploy to staging
git push staging main
run_id=$(gh run list --repo graham-u/wordsearch-staging --limit 1 --json databaseId -q '.[0].databaseId') && gh run watch "$run_id" --repo graham-u/wordsearch-staging --exit-status

# 2. Test on the staging URL, then deploy to production
git push origin main
run_id=$(gh run list --limit 1 --json databaseId -q '.[0].databaseId') && gh run watch "$run_id" --exit-status
```

**Never push directly to production without deploying to staging first.** The production URL is installed as a PWA on the end user's tablet.

## Testing Locally

```bash
python3 -m http.server 8085  # start local server (avoid ports 8080-8081, used by mitmproxy)
```

## Running Automated Tests

**The full test suite must pass before committing and pushing.** If a change is truly trivial (e.g. a comment-only edit), confirm with the user before skipping tests.

Requires dev-browser server and local HTTP server. Start the server as a background task before running tests, and stop it with `TaskStop` afterwards:

```bash
# 1. Start local server (use run_in_background, note the task ID)
python3 -m http.server 8085

# 2. Run full test suite
cd ~/.claude/skills/dev-browser && npx tsx ~/projects/wordsearch/tests/run-all.mjs

# 3. Stop the server using TaskStop with the background task ID
```

Individual test files can also be run directly:

```bash
cd ~/.claude/skills/dev-browser && npx tsx ~/projects/wordsearch/tests/<file>.mjs
```

Test files: `smoke.mjs`, `wordlists.mjs`, `puzzle.mjs`, `gameplay.mjs`, `hints.mjs`, `navigation.mjs`

## Audience

The target user is an elderly person in the UK. All word lists use British English spellings and UK-centric references. UI should be clear, simple, with large touch targets.

## Device & Orientation

The app runs as a PWA on a tablet in **portrait mode**. Always test and evaluate layout in portrait orientation.

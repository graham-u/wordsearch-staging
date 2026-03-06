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

1. `index.html` — the `<div id="version">v6</div>` element (user-visible)
2. `sw.js` — the `CACHE_NAME = "wordsearch-v6"` constant (triggers cache refresh)

Both must use the same version number. The version number tells the user which build they're running (visible bottom-right corner).

## Deployment

Push to `main` triggers GitHub Pages deployment via `.github/workflows/pages.yml`. After pushing, monitor the deployment to confirm it succeeds:

```bash
run_id=$(gh run list --limit 1 --json databaseId -q '.[0].databaseId') && gh run watch "$run_id" --exit-status
```

Live at: https://graham-u.github.io/wordsearch/

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

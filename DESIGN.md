# Word Search PWA — Design Document

## Overview

A progressive web app word search game designed for an elderly UK user. Installed as a home screen icon on a tablet. Played in portrait mode.

## Architecture

Pure vanilla HTML/CSS/JS — no build tools, no frameworks. Served as static files via GitHub Pages.

### Files

| File | Purpose |
|------|---------|
| `index.html` | App shell, PWA meta tags, layout |
| `style.css` | All styles, responsive layout, dialogs |
| `app.js` | Game logic, puzzle generation, touch handling, navigation |
| `words.js` | Themed word lists (28 categories, 30-40 words each) |
| `sw.js` | Service worker — network-first caching for offline support |
| `manifest.json` | PWA manifest for home screen installation |
| `icon.svg` | App icon |
| `tests/navigation.mjs` | Automated navigation test (runs via dev-browser/Playwright) |

## Game Mechanics

### Puzzle Generation

1. **Category selection**: Categories are shuffled into a random order. The game cycles through them sequentially, reshuffling when exhausted. This prevents back-to-back repeats.

2. **Word selection**: 9 words are picked at random from the current category. Words must be <= 8 letters (grid size).

3. **Grid placement**: Words are placed on an 8x8 grid. Longer words are placed first (they're harder to fit). Each word tries random directions (horizontal, vertical, diagonal — all 8 directions including reversed) and random positions. Words may overlap if the shared letter matches. If placement fails after 20 attempts, a different category is tried (up to 5 categories). If all categories fail, an error is shown.

4. **Fill**: Empty cells are filled with random letters A-Z.

### Word Lists (`words.js`)

- Stored as `WORD_LISTS` object, keyed by category name (e.g. `"Animals"`, `"Fruit"`)
- 28 categories, each with 30-40 words
- All words 3-8 characters, uppercase
- UK spellings and references (COLOUR not COLOR, LORRY not TRUCK)
- Targeted at elderly UK audience — common, recognisable words only

### Touch Interaction

- **Drag to select**: User presses on a grid cell and drags to another. The selection snaps to valid lines (horizontal, vertical, or 45-degree diagonal).
- **Visual feedback**: Selected cells are highlighted blue during drag. An SVG line overlay shows the selection path.
- **Word matching**: On pointer up, the selected letters are compared against all unfound words (both forwards and reversed). If matched, the word is marked found.
- **Found state**: Found words get a coloured SVG line through them (cycling through 8 colours) and cells turn green. The word in the list gets a strikethrough.

### Hints

- Tapping an unfound word in the word list shows a confirmation dialog ("Show hint for X?")
- If confirmed, the first letter's position in the grid flashes yellow for 1.5 seconds

### Puzzle Navigation

Uses an **array + cursor** model (not a stack):

- `puzzles[]` — array of all active puzzle objects (up to 6: current + 5 others)
- `puzzleIdx` — index of the currently displayed puzzle

**Previous button**: Moves cursor left in the array. Disabled when at position 0. No puzzles are lost.

**Next button**:
- If there are puzzles ahead of the cursor (user went back and is now going forward again), moves cursor right to the next existing puzzle.
- If at the end of the array, generates a brand new puzzle and appends it.
- If the array exceeds 6 puzzles, the oldest is trimmed from the front.

**Confirmation**: Both buttons show "Leave this puzzle?" if the current puzzle is partially complete (at least 1 word found but not all).

**Completion**: When all 9 words are found, the completed puzzle is removed from the array, a "Well Done!" overlay shows for 2 seconds, then a new puzzle is generated.

### PWA / Offline

- **Service worker** (`sw.js`): Network-first strategy. Tries to fetch from network; on success, updates the cache. Falls back to cache when offline.
- **Cache versioning**: Cache name includes a version string (e.g. `wordsearch-v4`). Old caches are deleted on service worker activation.
- **Update button**: Small "Update" link in bottom-left corner. Unregisters the service worker, clears all caches, and reloads — forcing a full fresh fetch.
- **Version indicator**: Tiny version label in bottom-right corner for verifying which version is running.

## UI Layout (Portrait)

```
┌─────────────────────────┐
│        Header           │  Blue bar: title, puzzle number, theme name
├─────────────────────────┤
│      Word List          │  3×3 grid of tags, tappable for hints
├─────────────────────────┤
│                         │
│                         │
│     8×8 Letter Grid     │  Square, centred, large touch-friendly cells
│                         │
│                         │
├─────────────────────────┤
│  [Previous] [Next Puzzle]│  Navigation buttons
├─────────────────────────┤
│ Update              v4  │  Tiny footer: update button + version
└─────────────────────────┘
```

## Deployment

Two GitHub Pages deployments from separate repos, both using the same workflow:

| Environment | Repo | URL |
|-------------|------|-----|
| Staging | `graham-u/wordsearch-staging` | https://graham-u.github.io/wordsearch-staging/ |
| Production | `graham-u/wordsearch` | https://graham-u.github.io/wordsearch/ |

The staging repo is a git remote called `staging` in the local checkout. Workflow: push to staging first (`git push staging main`), test, then push to production (`git push origin main`). Deployment takes ~15-20 seconds per environment.

## Testing

`tests/navigation.mjs` tests the puzzle navigation system via Playwright (dev-browser skill). It verifies:
- Forward navigation builds the puzzle array
- Backward navigation preserves progress on all puzzles
- Forward through existing puzzles doesn't generate duplicates
- New puzzles are generated only when at the end of the array
- Max puzzle limit is enforced (oldest trimmed)
- Completing a puzzle removes it from the array

Run with: `cd ~/.claude/skills/dev-browser && npx tsx ~/projects/wordsearch/tests/navigation.mjs`
(Requires local server on port 8085 and dev-browser server running.)
